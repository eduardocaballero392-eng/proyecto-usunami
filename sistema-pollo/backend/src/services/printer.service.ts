  import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';
import { consultarUno, ejecutar, consultar } from '../config/database';
import { env } from '../config/env';
import { NotFoundError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';
import { RowDataPacket } from 'mysql2';
import fs from 'fs';
import path from 'path';
import { bleServer } from './ble-server.service';

/**
 * SERVICIO DE IMPRESIÓN TÉRMICA CON node-thermal-printer
 * 
 * INTEGRACIÓN CON SISTEMA EXISTENTE:
 * - Se integra con la tabla `impresiones` para registro de intentos y errores
 * - Usa las variables de entorno del sistema (PRINTER_MODE, etc.)
 * - Compatible con el worker de reintentos existente
 * 
 * Modos de operación (variable PRINTER_MODE del env):
 * - 'mock': Simula la impresión, guarda en logs (desarrollo)
 * - 'bluetooth': Conecta a impresoras reales vía Bluetooth, COM o TCP/IP (producción)
 * 
 * Tipos de conexión soportados:
 * - TCP: Impresoras de red (tcp://IP:PUERTO)
 * - BLUETOOTH: Impresoras Bluetooth BLE persistentes (usa ble-server.service.ts)
 * - COM: Impresoras USB/Serial (COM3, COM4, etc.)
 * 
 * MODO BLE-SERVER (Recomendado para Bluetooth):
 * - Mantiene conexiones persistentes con las impresoras
 * - Impresión rápida (100-200ms vs 3-5 segundos)
 * - No depende de puertos COM que cambian
 * - Reconexión automática si se pierde señal
 * 
 * USO:
 * - Para imprimir un pedido específico: imprimirPedidoConThermalPrinter(pedidoId, areaId, tipo)
 * - Para pruebas: imprimirPrueba(areaId)
 * - Para verificar conexión: verificarConexionImpresora(areaId)
 */

const DIR_LOGS = path.resolve(process.cwd(), 'logs');

interface DatosPedido {
  id_pedidos: number;
  tipo: 'MESA' | 'PARA_LLEVAR' | 'DELIVERY';
  observacion: string | null;
  mozoNombre: string;
  mesas: string | null;
  total: number;
  creadoEn: Date;
}

interface ItemPedido {
  cantidad: number;
  productoNombre: string;
  precio: number;
  nota: string | null;
  opciones: string | null;
  anulado: boolean;
}

interface DatosImpresora {
  id_impresoras: number;
  nombre: string;
  ip: string;
  puerto: number;
  areaNombre: string;
  tipo_conexion: 'TCP' | 'BLUETOOTH' | 'COM';
  nombre_bluetooth: string | null;
  puerto_com: string | null;
}

/**
 * Obtiene los datos completos del pedido para impresión
 */
const obtenerDatosPedido = async (pedidoId: number): Promise<{ pedido: DatosPedido; items: ItemPedido[] }> => {
  // Obtener datos del pedido
  const pedido = await consultarUno<DatosPedido>(
    `SELECT p.id_pedidos, p.tipo, p.observacion, u.nombre AS mozoNombre,
            GROUP_CONCAT(m.numero ORDER BY m.numero SEPARATOR ', ') AS mesas,
            SUM(CASE WHEN d.anulado = 0 THEN d.cantidad * d.precio ELSE 0 END) AS total,
            p.creadoEn
       FROM pedidos p
       JOIN usuarios u ON u.id_usuarios = p.usuarioId
       LEFT JOIN pedido_mesas pm ON pm.pedidoId = p.id_pedidos
       LEFT JOIN mesas m ON m.id_mesas = pm.mesaId
       LEFT JOIN detalle_pedidos d ON d.pedidoId = p.id_pedidos
      WHERE p.id_pedidos = ?
      GROUP BY p.id_pedidos`,
    [pedidoId]
  );

  if (!pedido) {
    throw new NotFoundError(`Pedido ${pedidoId} no encontrado`);
  }

  // Obtener items del pedido usando consultar (retorna array)
  const items = await consultar<ItemPedido>(
    `SELECT d.cantidad, pr.nombre AS productoNombre, d.precio, d.nota, d.anulado,
            (SELECT GROUP_CONCAT(o.nombre SEPARATOR ', ')
               FROM detalle_pedido_opciones dpo
               JOIN opciones_producto op ON op.id_opciones_producto = dpo.opcionId
              WHERE dpo.detallePedidoId = d.id_detalle_pedidos) AS opciones
       FROM detalle_pedidos d
       JOIN productos pr ON pr.id_productos = d.productoId
      WHERE d.pedidoId = ?
      ORDER BY d.id_detalle_pedidos`,
    [pedidoId]
  );

  return { pedido, items };
};

/**
 * Obtiene los datos de la impresora asociada al área
 * Integrado con la tabla de impresoras y áreas existente
 * Soporta TCP/IP, Bluetooth y COM
 */
const obtenerImpresora = async (areaId: number): Promise<DatosImpresora> => {
  const impresora = await consultarUno<DatosImpresora>(
    `SELECT i.id_impresoras, i.nombre, i.ip, i.puerto, a.nombre AS areaNombre,
            i.tipo_conexion, i.nombre_bluetooth, i.puerto_com
       FROM impresoras i
       JOIN areas a ON a.id_areas = i.areaId
      WHERE i.areaId = ? AND i.activa = 1
      LIMIT 1`,
    [areaId]
  );

  if (!impresora) {
    throw new NotFoundError(`No hay impresora activa configurada para área ${areaId}`);
  }

  // Validar configuración según tipo
  if (impresora.tipo_conexion === 'BLUETOOTH' && !impresora.nombre_bluetooth) {
    throw new ValidationError(`Impresora ${impresora.nombre} configurada como BLUETOOTH pero falta nombre_bluetooth`);
  }

  if (impresora.tipo_conexion === 'COM' && !impresora.puerto_com) {
    throw new ValidationError(`Impresora ${impresora.nombre} configurada como COM pero falta puerto_com`);
  }

  return impresora;
};

/**
 * Registra impresión en modo MOCK (simulación)
 * Compatible con el sistema de logs existente
 */
const registrarMock = (texto: string, destino: string) => {
  const cabecera = `\n----- [MOCK THERMAL] ${destino} · ${new Date().toISOString()} -----\n`;
  logger.info(`[Thermal Printer MOCK] Impresión simulada en ${destino}`);
  try {
    fs.mkdirSync(DIR_LOGS, { recursive: true});
    const archivo = path.join(DIR_LOGS, `impresiones-${new Date().toISOString().slice(0, 10)}.log`);
    fs.appendFileSync(archivo, cabecera + texto + '\n');
  } catch (e) {
    logger.warn('No se pudo escribir el log de impresión', { error: (e as Error).message });
  }
};

/**
 * Formatea un número como precio en soles
 */
const formatoPrecio = (precio: number): string => {
  return `S/ ${precio.toFixed(2)}`;
};

/**
 * Formatea una fecha en formato legible
 */
const formatoFecha = (fecha: Date): string => {
  const f = new Date(fecha);
  const dia = f.getDate().toString().padStart(2, '0');
  const mes = (f.getMonth() + 1).toString().padStart(2, '0');
  const anio = f.getFullYear();
  const hora = f.getHours().toString().padStart(2, '0');
  const min = f.getMinutes().toString().padStart(2, '0');
  return `${dia}/${mes}/${anio} ${hora}:${min}`;
};

/**
 * Imprime usando el servidor BLE persistente (más rápido)
 * Solo para impresoras Bluetooth
 */
const imprimirConBLEServer = async (
  impresora: DatosImpresora,
  printer: ThermalPrinter
): Promise<void> => {
  if (!impresora.nombre_bluetooth) {
    throw new ValidationError('Impresora Bluetooth sin nombre configurado');
  }

  logger.info(`[BLE Server] Enviando a ${impresora.nombre_bluetooth} vía servidor persistente`);

  // Asegurar que la impresora está registrada y conectada
  bleServer.registerPrinter(impresora.nombre_bluetooth);
  await bleServer.ensureConnection(impresora.nombre_bluetooth);

  // Esperar un momento si acabamos de registrar
  if (!bleServer.isConnected(impresora.nombre_bluetooth)) {
    logger.info(`[BLE Server] Esperando conexión con ${impresora.nombre_bluetooth}...`);
    
    // Esperar hasta 10 segundos para que conecte
    const maxWait = 10000;
    const checkInterval = 500;
    let waited = 0;

    while (!bleServer.isConnected(impresora.nombre_bluetooth) && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (!bleServer.isConnected(impresora.nombre_bluetooth)) {
      throw new ValidationError(`No se pudo conectar a ${impresora.nombre_bluetooth} después de ${maxWait}ms`);
    }
  }

  // Obtener datos raw del thermal printer
  const buffer = printer.getBuffer();
  
  // Enviar via BLE server
  await bleServer.write(impresora.nombre_bluetooth, buffer);
  
  logger.info(`[BLE Server] ✅ Impresión enviada a ${impresora.nombre_bluetooth} (${buffer.length} bytes)`);
};

/**
 * Obtiene el estado de conexión de una impresora
 * INTEGRADO CON EL SISTEMA EXISTENTE
 * Soporta TCP, Bluetooth y COM
 * 
 * @param areaId - ID del área cuya impresora se quiere verificar
 * @returns Promise<{ conectada: boolean; mensaje: string }>
 */
export const verificarConexionImpresora = async (areaId: number): Promise<{ conectada: boolean; mensaje: string }> => {
  if (env.impresion.modo === 'mock') {
    return {
      conectada: true,
      mensaje: 'Modo MOCK: Simulación activa (no hay impresora real conectada)',
    };
  }

  try {
    const impresora = await obtenerImpresora(areaId);
    
    // Determinar interface según tipo de conexión
    let printerInterface: string;
    let infoConexion: string;
    
    switch (impresora.tipo_conexion) {
      case 'BLUETOOTH':
        printerInterface = `bluetooth://${impresora.nombre_bluetooth}`;
        infoConexion = `Bluetooth: ${impresora.nombre_bluetooth}`;
        break;
      case 'COM':
        printerInterface = `${impresora.puerto_com}`;
        infoConexion = `Puerto COM: ${impresora.puerto_com}`;
        break;
      case 'TCP':
      default:
        printerInterface = `tcp://${impresora.ip}:${impresora.puerto}`;
        infoConexion = `TCP/IP: ${impresora.ip}:${impresora.puerto}`;
        break;
    }
    
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: printerInterface,
      characterSet: CharacterSet.PC858_EURO,
      removeSpecialCharacters: false,
      width: env.impresion.anchoCaracteres,
      options: {
        timeout: env.impresion.timeoutMs,
      },
    });

    // Intenta obtener el estado de la impresora
    const isConnected = await printer.isPrinterConnected();

    return {
      conectada: isConnected,
      mensaje: isConnected
        ? `Conectada a ${impresora.nombre} (${infoConexion})`
        : `No se pudo conectar a ${impresora.nombre} (${infoConexion})`,
    };
  } catch (error) {
    return {
      conectada: false,
      mensaje: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
};

/**
 * Imprime un ticket de pedido completo (comanda de cocina o boleta)
 * INTEGRADO CON EL SISTEMA EXISTENTE
 * 
 * @param pedidoId - ID del pedido a imprimir
 * @param areaId - ID del área de producción (para obtener la impresora)
 * @param tipo - Tipo de ticket: 'COMANDA' o 'BOLETA'
 * @param impresionId - (Opcional) ID de registro en tabla impresiones para actualizar estado
 * @returns Promise<void>
 */
export const imprimirTicket = async (
  pedidoId: number,
  areaId: number,
  tipo: 'COMANDA' | 'BOLETA' = 'COMANDA',
  impresionId?: number
): Promise<void> => {
  logger.info(`[Thermal Printer] Iniciando impresión de ${tipo}`, { pedidoId, areaId, impresionId });

  // 1. Obtener datos del pedido
  const { pedido, items } = await obtenerDatosPedido(pedidoId);

  // 2. Obtener impresora del área
  const impresora = await obtenerImpresora(areaId);

  // 3. Modo MOCK: Solo simular y guardar en logs
  if (env.impresion.modo === 'mock') {
    const lineas: string[] = [];
    lineas.push('='.repeat(env.impresion.anchoCaracteres));
    lineas.push('           LA PARRILLITA');
    lineas.push('      Anticuchería & Parrillas');
    lineas.push('');
    lineas.push(`        ${tipo === 'BOLETA' ? 'BOLETA DE VENTA' : 'COMANDA DE COCINA'}`);
    lineas.push('-'.repeat(env.impresion.anchoCaracteres));
    lineas.push(`Pedido: #${pedido.id_pedidos.toString().padStart(5, '0')}`);
    lineas.push(`Fecha: ${formatoFecha(pedido.creadoEn)}`);
    lineas.push(`Mozo: ${pedido.mozoNombre}`);
    
    if (pedido.mesas) {
      lineas.push(`Mesa(s): ${pedido.mesas}`);
    } else if (pedido.tipo === 'PARA_LLEVAR') {
      lineas.push('** PARA LLEVAR **');
    } else if (pedido.tipo === 'DELIVERY') {
      lineas.push('** DELIVERY **');
    }
    
    if (pedido.observacion) {
      lineas.push(`Obs: ${pedido.observacion}`);
    }
    
    lineas.push('-'.repeat(env.impresion.anchoCaracteres));
    lineas.push('CANT  PRODUCTO                  PRECIO');
    lineas.push('-'.repeat(env.impresion.anchoCaracteres));
    
    items.forEach((item) => {
      if (item.anulado) return;
      const cant = item.cantidad.toString().padEnd(6);
      const precio = formatoPrecio(item.precio * item.cantidad).padStart(10);
      const maxNombre = env.impresion.anchoCaracteres - cant.length - precio.length - 2;
      let nombre = item.productoNombre;
      if (nombre.length > maxNombre) {
        nombre = nombre.substring(0, maxNombre - 3) + '...';
      }
      lineas.push(`${cant}${nombre.padEnd(maxNombre)}${precio}`);
      
      if (item.opciones) {
        lineas.push(`      + ${item.opciones}`);
      }
      if (item.nota) {
        lineas.push(`      NOTA: ${item.nota}`);
      }
    });

    if (tipo === 'BOLETA') {
      lineas.push('-'.repeat(env.impresion.anchoCaracteres));
      lineas.push(`TOTAL: ${formatoPrecio(pedido.total)}`.padStart(env.impresion.anchoCaracteres));
      lineas.push('');
      lineas.push('¡Gracias por su preferencia!');
      lineas.push('Vuelva pronto');
    }
    
    lineas.push('');
    lineas.push('='.repeat(env.impresion.anchoCaracteres));

    const textoCompleto = lineas.join('\n');
    registrarMock(textoCompleto, `${impresora.nombre} (${impresora.areaNombre})`);
    
    // Actualizar estado en BD si hay ID de impresión
    if (impresionId) {
      await ejecutar(
        "UPDATE impresiones SET estado = 'IMPRESA', impresoraId = ?, intentos = intentos + 1, error = NULL WHERE id_impresiones = ?",
        [impresora.id_impresoras, impresionId]
      );
    }
    
    return;
  }

  // 4. Modo NETWORK/BLUETOOTH: Impresión real
  try {
    logger.info(`[Thermal Printer] Conectando a ${impresora.nombre} (${impresora.tipo_conexion})`, {
      tipo: impresora.tipo_conexion,
      nombre_bluetooth: impresora.nombre_bluetooth,
      puerto_com: impresora.puerto_com,
      ip: impresora.ip,
    });

    // Determinar interface según tipo de conexión
    let printerInterface: string;
    let usarBLEServer = false;
    
    switch (impresora.tipo_conexion) {
      case 'BLUETOOTH':
        // Usar BLE-server persistente (más rápido y confiable)
        printerInterface = ''; // No se usa en modo BLE-server
        usarBLEServer = true;
        logger.info(`[Thermal Printer] Usando BLE-server persistente: ${impresora.nombre_bluetooth}`);
        break;
        
      case 'COM':
        // Puerto COM (USB/Serial)
        printerInterface = `${impresora.puerto_com}`;
        logger.info(`[Thermal Printer] Usando Puerto COM: ${impresora.puerto_com}`);
        break;
        
      case 'TCP':
      default:
        // TCP/IP (red)
        printerInterface = `tcp://${impresora.ip}:${impresora.puerto}`;
        logger.info(`[Thermal Printer] Usando TCP/IP: ${impresora.ip}:${impresora.puerto}`);
        break;
    }

    // Crear instancia de impresora (solo para generar el contenido)
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: usarBLEServer ? 'tcp://127.0.0.1:9100' : printerInterface, // Dummy interface para BLE
      characterSet: CharacterSet.PC858_EURO,
      removeSpecialCharacters: false,
      lineCharacter: '-',
      breakLine: BreakLine.WORD,
      width: env.impresion.anchoCaracteres,
      options: {
        timeout: env.impresion.timeoutMs,
      },
    });

    // --- DISEÑO DEL TICKET OPTIMIZADO PARA 80MM ---

    // Encabezado
    printer.alignCenter();
    printer.setTextDoubleHeight();
    printer.setTextDoubleWidth();
    printer.bold(true);
    printer.println('LA PARRILLITA');
    printer.bold(false);
    printer.setTextNormal();
    
    printer.println('Anticucheria & Parrillas');
    printer.newLine();

    // Tipo de documento
    if (tipo === 'BOLETA') {
      printer.bold(true);
      printer.println('BOLETA DE VENTA');
      printer.bold(false);
    } else {
      printer.bold(true);
      printer.println('COMANDA DE COCINA');
      printer.bold(false);
    }

    printer.drawLine();

    // Información del pedido
    printer.alignLeft();
    printer.println(`Pedido: #${pedido.id_pedidos.toString().padStart(5, '0')}`);
    printer.println(`Fecha: ${formatoFecha(pedido.creadoEn)}`);
    printer.println(`Mozo: ${pedido.mozoNombre}`);

    // Mesa o tipo de servicio
    if (pedido.mesas) {
      printer.bold(true);
      printer.println(`Mesa(s): ${pedido.mesas}`);
      printer.bold(false);
    } else if (pedido.tipo === 'PARA_LLEVAR') {
      printer.bold(true);
      printer.println('** PARA LLEVAR **');
      printer.bold(false);
    } else if (pedido.tipo === 'DELIVERY') {
      printer.bold(true);
      printer.println('** DELIVERY **');
      printer.bold(false);
    }

    // Observación general
    if (pedido.observacion) {
      printer.println(`Obs: ${pedido.observacion}`);
    }

    printer.drawLine();

    // Lista de productos
    printer.println('CANT  PRODUCTO                  PRECIO');
    printer.drawLine();

    items.forEach((item) => {
      if (item.anulado) return;

      const cant = item.cantidad.toString().padEnd(6);
      const precio = formatoPrecio(item.precio * item.cantidad).padStart(10);
      const maxNombre = env.impresion.anchoCaracteres - cant.length - precio.length - 2;
      let nombre = item.productoNombre;
      
      if (nombre.length > maxNombre) {
        nombre = nombre.substring(0, maxNombre - 3) + '...';
      }

      printer.println(`${cant}${nombre.padEnd(maxNombre)}${precio}`);

      if (item.opciones) {
        printer.println(`      + ${item.opciones}`);
      }

      if (item.nota) {
        printer.bold(true);
        printer.println(`      NOTA: ${item.nota}`);
        printer.bold(false);
      }
    });

    // Total (solo en boletas)
    if (tipo === 'BOLETA') {
      printer.drawLine();
      printer.setTextDoubleHeight();
      printer.bold(true);
      printer.alignRight();
      printer.println(`TOTAL: ${formatoPrecio(pedido.total)}`);
      printer.bold(false);
      printer.setTextNormal();
      printer.alignLeft();
      printer.newLine();
      printer.alignCenter();
      printer.println('¡Gracias por su preferencia!');
      printer.println('Vuelva pronto');
    }

    printer.newLine();
    printer.drawLine();
    printer.newLine();
    printer.newLine();

    // Corte del papel
    printer.cut();

    // Enviar a la impresora
    if (usarBLEServer) {
      // Usar servidor BLE persistente (rápido)
      await imprimirConBLEServer(impresora, printer);
    } else {
      // Usar conexión directa (TCP/COM)
      await printer.execute();
    }
    
    logger.info(`[Thermal Printer] Ticket ${tipo} enviado exitosamente`, {
      pedidoId,
      impresora: impresora.nombre,
      area: impresora.areaNombre,
      metodo: usarBLEServer ? 'BLE-server' : impresora.tipo_conexion,
    });

    // Actualizar estado en BD si hay ID de impresión
    if (impresionId) {
      await ejecutar(
        "UPDATE impresiones SET estado = 'IMPRESA', impresoraId = ?, intentos = intentos + 1, error = NULL WHERE id_impresiones = ?",
        [impresora.id_impresoras, impresionId]
      );
    }

  } catch (error) {
    const mensajeError = error instanceof Error ? error.message : String(error);
    logger.error(`[Thermal Printer] Error al imprimir ticket`, {
      pedidoId,
      areaId,
      tipo,
      impresora: impresora.nombre,
      error: mensajeError,
    });

    // Actualizar estado de error en BD si hay ID de impresión
    if (impresionId) {
      await ejecutar(
        "UPDATE impresiones SET estado = 'ERROR', impresoraId = ?, intentos = intentos + 1, error = ? WHERE id_impresiones = ?",
        [impresora.id_impresoras, mensajeError.slice(0, 250), impresionId]
      );
    }

    throw new ValidationError(`Error al imprimir: ${mensajeError}`);
  }
};

/**
 * Imprime un ticket de prueba para verificar la conexión con la impresora
 * INTEGRADO CON EL SISTEMA EXISTENTE
 * 
 * @param areaId - ID del área cuya impresora se quiere probar
 * @returns Promise<void>
 */
export const imprimirPrueba = async (areaId: number): Promise<void> => {
  logger.info(`[Thermal Printer] Iniciando impresión de prueba para área ${areaId}`);

  const impresora = await obtenerImpresora(areaId);

  if (env.impresion.modo === 'mock') {
    const lineas: string[] = [];
    lineas.push('='.repeat(env.impresion.anchoCaracteres));
    lineas.push('           LA PARRILLITA');
    lineas.push('');
    lineas.push('=== IMPRESION DE PRUEBA ===');
    lineas.push('');
    lineas.push(`Impresora: ${impresora.nombre}`);
    lineas.push(`IP: ${impresora.ip}:${impresora.puerto}`);
    lineas.push(`Fecha: ${formatoFecha(new Date())}`);
    lineas.push('');
    lineas.push('Si puede leer esto,');
    lineas.push('la impresora funciona correctamente');
    lineas.push('');
    lineas.push('='.repeat(env.impresion.anchoCaracteres));

    registrarMock(lineas.join('\n'), `${impresora.nombre} (${impresora.areaNombre})`);
    return;
  }

  try {
    // Determinar interface según tipo de conexión
    let printerInterface: string;
    let infoConexion: string;
    let usarBLEServer = false;
    
    switch (impresora.tipo_conexion) {
      case 'BLUETOOTH':
        printerInterface = ''; // No se usa en modo BLE-server
        infoConexion = `Bluetooth: ${impresora.nombre_bluetooth}`;
        usarBLEServer = true;
        break;
      case 'COM':
        printerInterface = `${impresora.puerto_com}`;
        infoConexion = `Puerto COM: ${impresora.puerto_com}`;
        break;
      case 'TCP':
      default:
        printerInterface = `tcp://${impresora.ip}:${impresora.puerto}`;
        infoConexion = `TCP/IP: ${impresora.ip}:${impresora.puerto}`;
        break;
    }

    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: usarBLEServer ? 'tcp://127.0.0.1:9100' : printerInterface,
      characterSet: CharacterSet.PC858_EURO,
      removeSpecialCharacters: false,
      lineCharacter: '-',
      breakLine: BreakLine.WORD,
      width: env.impresion.anchoCaracteres,
      options: {
        timeout: env.impresion.timeoutMs,
      },
    });

    printer.alignCenter();
    printer.setTextDoubleHeight();
    printer.bold(true);
    printer.println('LA PARRILLITA');
    printer.bold(false);
    printer.setTextNormal();
    printer.newLine();
    printer.println('=== IMPRESION DE PRUEBA ===');
    printer.newLine();
    printer.alignLeft();
    printer.println(`Impresora: ${impresora.nombre}`);
    printer.println(`Area: ${impresora.areaNombre}`);
    printer.println(`Tipo: ${impresora.tipo_conexion}`);
    printer.println(`Conexion: ${infoConexion}`);
    printer.println(`Modo: ${usarBLEServer ? 'BLE-server persistente' : 'Directo'}`);
    printer.println(`Fecha: ${formatoFecha(new Date())}`);
    printer.newLine();
    printer.alignCenter();
    printer.println('Si puede leer esto,');
    printer.println('la impresora funciona correctamente');
    printer.newLine();
    printer.newLine();
    printer.cut();

    // Enviar a la impresora
    if (usarBLEServer) {
      await imprimirConBLEServer(impresora, printer);
    } else {
      await printer.execute();
    }
    
    logger.info(`[Thermal Printer] Prueba enviada exitosamente a ${impresora.nombre}`);

  } catch (error) {
    const mensajeError = error instanceof Error ? error.message : String(error);
    logger.error(`[Thermal Printer] Error en impresión de prueba`, {
      areaId,
      error: mensajeError,
    });
    throw new ValidationError(`Error al imprimir prueba: ${mensajeError}`);
  }
};

/**
 * Obtiene el estado del servidor BLE y sus conexiones
 * Útil para debugging y monitoreo
 */
export const obtenerEstadoBLEServer = (): Record<string, any> => {
  return bleServer.getStatus();
};
