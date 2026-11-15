import { query, getConnection } from '../config/database';
import { obtenerConfiguracionImpresora, crearInstanciaPrinter, imprimirMock, getModoImpresion } from '../config/printer';
import logger from '../utils/logger';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface ItemImpresion {
  id_detalle_pedidos: number;
  productoNombre: string;
  cantidad: number;
  nota: string | null;
}

export const imprimirComandas = async (pedidoId: number, ronda: number = 1) => {
  try {
    // Obtener datos del pedido
    const pedidos = await query<any[]>(
      `SELECT p.*, 
       GROUP_CONCAT(DISTINCT m.numero_mesa ORDER BY m.numero_mesa SEPARATOR ' y ') as mesas,
       mz.nombre as mozoNombre
       FROM pedidos p
       LEFT JOIN pedido_mesas pm ON p.id_pedidos = pm.pedidoId
       LEFT JOIN mesas m ON pm.mesaId = m.id_mesa
       LEFT JOIN mozos mz ON p.mozoId = mz.id_mozo
       WHERE p.id_pedidos = ?
       GROUP BY p.id_pedidos`,
      [pedidoId]
    );

    if (pedidos.length === 0) {
      throw new Error('Pedido no encontrado');
    }

    const pedido = pedidos[0];

    // Obtener ítems de esta ronda agrupados por área
    const items = await query<any[]>(
      `SELECT dp.*, prod.nombre as productoNombre, a.id_area, a.nombre as areaNombre
       FROM detalle_pedidos dp
       JOIN productos prod ON dp.productoId = prod.id_producto
       JOIN areas a ON dp.areaId = a.id_area
       WHERE dp.pedidoId = ? AND dp.ronda = ? AND dp.anulado = FALSE
       ORDER BY a.id_area, dp.id_detalle_pedidos`,
      [pedidoId, ronda]
    );

    if (items.length === 0) {
      logger.warn(`No hay ítems para imprimir en pedido ${pedidoId}, ronda ${ronda}`);
      return { message: 'No hay ítems para imprimir' };
    }

    // Agrupar por área
    const itemsPorArea = new Map<number, any[]>();
    items.forEach(item => {
      if (!itemsPorArea.has(item.areaId)) {
        itemsPorArea.set(item.areaId, []);
      }
      itemsPorArea.get(item.areaId)!.push(item);
    });

    // Imprimir en cada área en paralelo
    const promesas = Array.from(itemsPorArea.entries()).map(([areaId, itemsArea]) => {
      return imprimirComanda(pedidoId, areaId, pedido, itemsArea, ronda);
    });

    const resultados = await Promise.all(promesas);

    return {
      message: 'Comandas enviadas a impresión',
      resultados
    };

  } catch (error: any) {
    logger.error('Error al imprimir comandas:', error);
    throw error;
  }
};

const imprimirComanda = async (
  pedidoId: number,
  areaId: number,
  pedido: any,
  items: any[],
  ronda: number
) => {
  const connection = await getConnection();

  try {
    // Obtener configuración de impresora
    const printerConfig = await obtenerConfiguracionImpresora(areaId);

    if (!printerConfig) {
      logger.error(`No hay impresora configurada para área ${areaId}`);
      return { areaId, estado: 'ERROR', error: 'Impresora no configurada' };
    }

    // Registrar impresión
    const [impresionResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO impresiones (pedidoId, impresoraId, areaId, ronda, estado, intentos, creadoEn) 
       VALUES (?, ?, ?, ?, 'PENDIENTE', 0, NOW())`,
      [pedidoId, printerConfig.id_impresoras, areaId, ronda]
    );

    const impresionId = impresionResult.insertId;

    // Generar contenido de comanda
    const titulo = pedido.tipo === 'MESA' 
      ? `MESA ${pedido.mesas || 'N/A'}`
      : pedido.tipo;

    const subtitulo = ronda > 1 ? 'AGREGADO' : '';

    let contenido = '';
    contenido += '========================================\n';
    contenido += `       ${titulo}\n`;
    if (subtitulo) {
      contenido += `       ${subtitulo}\n`;
    }
    contenido += '========================================\n';
    contenido += `Mozo: ${pedido.mozoNombre}\n`;
    contenido += `Hora: ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}\n`;
    contenido += '----------------------------------------\n';

    items.forEach(item => {
      contenido += `${item.cantidad}x ${item.productoNombre}\n`;
      if (item.nota) {
        contenido += `   Nota: ${item.nota}\n`;
      }
      contenido += '\n';
    });

    contenido += '----------------------------------------\n';

    // Imprimir según modo
    if (getModoImpresion() === 'mock') {
      imprimirMock(contenido, printerConfig.nombre);

      await connection.query(
        'UPDATE impresiones SET estado = "IMPRESA", intentos = intentos + 1 WHERE id_impresiones = ?',
        [impresionId]
      );

      return { areaId, estado: 'IMPRESA', impresora: printerConfig.nombre };

    } else {
      // Modo producción: imprimir en impresora física
      const printer = crearInstanciaPrinter(printerConfig.ip, printerConfig.puerto);

      printer.alignCenter();
      printer.setTextDoubleHeight();
      printer.bold(true);
      printer.println(titulo);
      if (subtitulo) {
        printer.println(subtitulo);
      }
      printer.bold(false);
      printer.setTextNormal();
      printer.drawLine();

      printer.alignLeft();
      printer.println(`Mozo: ${pedido.mozoNombre}`);
      printer.println(`Hora: ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`);
      printer.drawLine();

      items.forEach(item => {
        printer.println(`${item.cantidad}x ${item.productoNombre}`);
        if (item.nota) {
          printer.println(`   Nota: ${item.nota}`);
        }
        printer.newLine();
      });

      printer.drawLine();
      printer.cut();

      await printer.execute();

      await connection.query(
        'UPDATE impresiones SET estado = "IMPRESA", intentos = intentos + 1 WHERE id_impresiones = ?',
        [impresionId]
      );

      return { areaId, estado: 'IMPRESA', impresora: printerConfig.nombre };
    }

  } catch (error: any) {
    logger.error(`Error al imprimir en área ${areaId}:`, error.message);

    await connection.query(
      'UPDATE impresiones SET estado = "ERROR", error = ?, intentos = intentos + 1 WHERE id_impresiones = ?',
      [error.message, impresionId]
    );

    return { areaId, estado: 'ERROR', error: error.message };

  } finally {
    connection.release();
  }
};

export const imprimirAnulacion = async (itemId: number) => {
  try {
    const items = await query<any[]>(
      `SELECT dp.*, prod.nombre as productoNombre, a.nombre as areaNombre,
       p.tipo, mz.nombre as mozoNombre,
       GROUP_CONCAT(DISTINCT m.numero_mesa ORDER BY m.numero_mesa SEPARATOR ' y ') as mesas
       FROM detalle_pedidos dp
       JOIN productos prod ON dp.productoId = prod.id_producto
       JOIN areas a ON dp.areaId = a.id_area
       JOIN pedidos p ON dp.pedidoId = p.id_pedidos
       LEFT JOIN pedido_mesas pm ON p.id_pedidos = pm.pedidoId
       LEFT JOIN mesas m ON pm.mesaId = m.id_mesa
       LEFT JOIN mozos mz ON p.mozoId = mz.id_mozo
       WHERE dp.id_detalle_pedidos = ?
       GROUP BY dp.id_detalle_pedidos`,
      [itemId]
    );

    if (items.length === 0) {
      throw new Error('Ítem no encontrado');
    }

    const item = items[0];

    const printerConfig = await obtenerConfiguracionImpresora(item.areaId);
    if (!printerConfig) {
      logger.warn(`No hay impresora para área ${item.areaId}`);
      return;
    }

    const titulo = item.tipo === 'MESA' 
      ? `MESA ${item.mesas || 'N/A'}`
      : item.tipo;

    let contenido = '';
    contenido += '========================================\n';
    contenido += '       ⚠️  ANULADO  ⚠️\n';
    contenido += '========================================\n';
    contenido += `${titulo}\n`;
    contenido += '----------------------------------------\n';
    contenido += `${item.cantidad}x ${item.productoNombre}\n\n`;
    contenido += `Motivo: ${item.motivoAnulacion || 'No especificado'}\n`;
    contenido += '========================================\n';

    if (getModoImpresion() === 'mock') {
      imprimirMock(contenido, `${printerConfig.nombre} - ANULACIÓN`);
    } else {
      const printer = crearInstanciaPrinter(printerConfig.ip, printerConfig.puerto);

      printer.alignCenter();
      printer.setTextDoubleHeight();
      printer.bold(true);
      printer.println('⚠️  ANULADO  ⚠️');
      printer.bold(false);
      printer.setTextNormal();
      printer.drawLine();

      printer.alignLeft();
      printer.println(titulo);
      printer.drawLine();
      printer.println(`${item.cantidad}x ${item.productoNombre}`);
      printer.newLine();
      printer.println(`Motivo: ${item.motivoAnulacion || 'No especificado'}`);
      printer.drawLine();
      printer.cut();

      await printer.execute();
    }

    logger.info(`Ticket de anulación impreso para ítem ${itemId}`);

  } catch (error: any) {
    logger.error('Error al imprimir anulación:', error.message);
  }
};

export const reintentarImpresion = async (impresionId: number) => {
  const impresiones = await query<any[]>(
    'SELECT * FROM impresiones WHERE id_impresiones = ? AND estado = "ERROR" AND intentos < 3',
    [impresionId]
  );

  if (impresiones.length === 0) {
    throw new Error('Impresión no encontrada o ya procesada');
  }

  const impresion = impresiones[0];

  // Volver a imprimir
  await imprimirComandas(impresion.pedidoId, impresion.ronda);

  return { message: 'Reintento de impresión iniciado' };
};
