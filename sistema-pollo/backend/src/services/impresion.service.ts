import fs from 'fs';
import path from 'path';
import { consultar, consultarUno, ejecutar, Conexion } from '../config/database';
import { env } from '../config/env';
import { aEscPos, aTexto, Documento, enviarAImpresora } from '../printing/documento';
import * as plantillas from '../printing/plantillas';
import { CabeceraPedido, ItemImpresion } from '../printing/plantillas';
import { NotFoundError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';
import { RowDataPacket } from 'mysql2';

/**
 * COLA DE IMPRESIÓN PERSISTENTE (RF-007, RF-010)
 *   1. Dentro de la transacción del pedido se INSERTA la impresión como PENDIENTE.
 *   2. Tras el COMMIT se procesa en segundo plano (el mozo ya recibió su respuesta).
 *   3. Si falla → ERROR + intentos++. Un worker reintenta cada N segundos hasta el máximo.
 *   4. Si el servidor se reinicia, las PENDIENTE huérfanas se retoman.
 */

type TipoImpresion = 'COMANDA' | 'ANULACION' | 'BOLETA' | 'CIERRE_CAJA' | 'PRUEBA';

const DIR_LOGS = path.resolve(process.cwd(), 'logs');
const enProceso = new Set<number>();

// --- Encolar ---------------------------------------------------------------

export const encolar = async (
  conn: Conexion,
  datos: { pedidoId: number | null; areaId: number; tipo: TipoImpresion; ronda?: number | null; doc: Documento }
): Promise<number> => {
  const [res] = await conn.query<import('mysql2').ResultSetHeader>(
    'INSERT INTO impresiones (pedidoId, areaId, tipo, ronda, contenido) VALUES (?, ?, ?, ?, ?)',
    [datos.pedidoId, datos.areaId, datos.tipo, datos.ronda ?? null, JSON.stringify(datos.doc)]
  );
  return res.insertId;
};

/** Datos de cabecera del pedido para cualquier ticket. */
export const cabeceraPedido = async (conn: Conexion, pedidoId: number): Promise<CabeceraPedido> => {
  const [filas] = await conn.query<RowDataPacket[]>(
    `SELECT p.id_pedidos, p.tipo, p.observacion, u.nombre AS mozoNombre,
            GROUP_CONCAT(m.numero ORDER BY m.numero) AS mesas
       FROM pedidos p
       JOIN usuarios u ON u.id_usuarios = p.usuarioId
       LEFT JOIN pedido_mesas pm ON pm.pedidoId = p.id_pedidos
       LEFT JOIN mesas m ON m.id_mesas = pm.mesaId
      WHERE p.id_pedidos = ?
      GROUP BY p.id_pedidos`,
    [pedidoId]
  );
  const f = filas[0];
  if (!f) throw new NotFoundError('Pedido no encontrado');
  return {
    id_pedidos: f.id_pedidos,
    tipo: f.tipo,
    observacion: f.observacion,
    mozoNombre: f.mozoNombre,
    mesas: f.mesas ? String(f.mesas).split(',').map(Number) : [],
  };
};

/**
 * Encola una comanda por cada área con ítems en la(s) ronda(s) indicadas.
 * rondas = null → todas (reimpresión completa, RF-013).
 */
export const encolarComandas = async (conn: Conexion, pedidoId: number, rondas: number[] | null): Promise<number[]> => {
  const cab = await cabeceraPedido(conn, pedidoId);
  const filtroRonda = rondas ? `AND d.ronda IN (${rondas.map(() => '?').join(',')})` : '';
  const [items] = await conn.query<RowDataPacket[]>(
    `SELECT d.id_detalle_pedidos, d.areaId, a.nombre AS areaNombre, d.cantidad, d.nota, d.ronda,
            pr.nombre AS productoNombre,
            (SELECT GROUP_CONCAT(o.nombre SEPARATOR '||') FROM detalle_pedido_opciones o
              WHERE o.detallePedidoId = d.id_detalle_pedidos) AS opciones
       FROM detalle_pedidos d
       JOIN productos pr ON pr.id_productos = d.productoId
       JOIN areas a ON a.id_areas = d.areaId
      WHERE d.pedidoId = ? AND d.anulado = 0 ${filtroRonda}
      ORDER BY d.areaId, d.id_detalle_pedidos`,
    [pedidoId, ...(rondas ?? [])]
  );

  const porArea = new Map<number, { nombre: string; items: ItemImpresion[] }>();
  for (const i of items) {
    if (!porArea.has(i.areaId)) porArea.set(i.areaId, { nombre: i.areaNombre, items: [] });
    porArea.get(i.areaId)!.items.push({
      cantidad: i.cantidad,
      productoNombre: i.productoNombre,
      nota: i.nota,
      opciones: i.opciones ? String(i.opciones).split('||') : [],
    });
  }

  const rondaTitulo = rondas && rondas.length === 1 ? rondas[0] : 1;
  const ids: number[] = [];
  for (const [areaId, grupo] of porArea) {
    const doc = plantillas.comanda(cab, grupo.items, rondaTitulo, grupo.nombre);
    ids.push(await encolar(conn, { pedidoId, areaId, tipo: 'COMANDA', ronda: rondaTitulo, doc }));
  }
  return ids;
};

/** Área configurada como CAJA (boletas y cierres). */
export const areaCaja = async (conn: Conexion): Promise<number> => {
  const [f] = await conn.query<RowDataPacket[]>("SELECT id_areas FROM areas WHERE nombre = 'CAJA' LIMIT 1");
  if (!f[0]) throw new ValidationError('No existe el área CAJA. Créala en Administración → Áreas.');
  return f[0].id_areas;
};

// --- Procesar --------------------------------------------------------------

const registrarMock = (texto: string, destino: string) => {
  const cabecera = `\n----- [MOCK] ${destino} · ${new Date().toISOString()} -----\n`;
  logger.info(`Impresión simulada en ${destino}`);
  try {
    fs.mkdirSync(DIR_LOGS, { recursive: true });
    const archivo = path.join(DIR_LOGS, `impresiones-${new Date().toISOString().slice(0, 10)}.log`);
    fs.appendFileSync(archivo, cabecera + texto + '\n');
  } catch (e) {
    logger.warn('No se pudo escribir el log de impresión', { error: (e as Error).message });
  }
};

/** Intenta imprimir una impresión de la cola. Nunca lanza excepción. */
export const procesar = async (id: number): Promise<boolean> => {
  if (enProceso.has(id)) return false;
  enProceso.add(id);
  try {
    const imp = await consultarUno<{ id_impresiones: number; areaId: number; contenido: string; estado: string; areaNombre: string }>(
      `SELECT i.id_impresiones, i.areaId, i.contenido, i.estado, a.nombre AS areaNombre
         FROM impresiones i JOIN areas a ON a.id_areas = i.areaId WHERE i.id_impresiones = ?`,
      [id]
    );
    if (!imp || imp.estado === 'IMPRESA') return true;

    const impresora = await consultarUno<{ id_impresoras: number; nombre: string; ip: string; puerto: number }>(
      'SELECT id_impresoras, nombre, ip, puerto FROM impresoras WHERE areaId = ? AND activa = 1 ORDER BY id_impresoras LIMIT 1',
      [imp.areaId]
    );

    try {
      if (!impresora) throw new Error(`No hay impresora activa para el área ${imp.areaNombre}`);
      const doc = JSON.parse(imp.contenido) as Documento;
      if (env.impresion.modo === 'mock') {
        registrarMock(aTexto(doc, env.impresion.anchoCaracteres), `${impresora.nombre} (${imp.areaNombre})`);
      } else {
        await enviarAImpresora(impresora.ip, impresora.puerto, aEscPos(doc, env.impresion.anchoCaracteres), env.impresion.timeoutMs);
      }
      await ejecutar(
        "UPDATE impresiones SET estado = 'IMPRESA', impresoraId = ?, intentos = intentos + 1, error = NULL WHERE id_impresiones = ?",
        [impresora.id_impresoras, id]
      );
      return true;
    } catch (e) {
      const mensaje = (e as Error).message.slice(0, 250);
      logger.warn('Fallo de impresión', { id, area: imp.areaNombre, error: mensaje });
      await ejecutar(
        "UPDATE impresiones SET estado = 'ERROR', impresoraId = ?, intentos = intentos + 1, error = ? WHERE id_impresiones = ?",
        [impresora?.id_impresoras ?? null, mensaje, id]
      );
      return false;
    }
  } catch (e) {
    logger.error('Error procesando impresión', { id, error: (e as Error).message });
    return false;
  } finally {
    enProceso.delete(id);
  }
};

/** Procesa en segundo plano, sin bloquear la respuesta HTTP. */
export const procesarEnSegundoPlano = (ids: number[]) => {
  setImmediate(async () => {
    for (const id of ids) await procesar(id);
  });
};

// --- Worker de reintentos ----------------------------------------------------

let temporizador: NodeJS.Timeout | null = null;

export const iniciarWorker = () => {
  const ciclo = async () => {
    try {
      const pendientes = await consultar<{ id_impresiones: number }>(
        `SELECT id_impresiones FROM impresiones
          WHERE (estado = 'ERROR' AND intentos < ? AND actualizadoEn <= NOW() - INTERVAL ? SECOND)
             OR (estado = 'PENDIENTE' AND creadoEn <= NOW() - INTERVAL 60 SECOND)
          ORDER BY id_impresiones LIMIT 20`,
        [env.impresion.maxIntentos, env.impresion.esperaReintentoSeg]
      );
      for (const p of pendientes) await procesar(p.id_impresiones);
    } catch (e) {
      logger.error('Worker de impresión', { error: (e as Error).message });
    }
  };
  temporizador = setInterval(ciclo, 10_000);
  logger.info('Worker de impresión iniciado', { modo: env.impresion.modo });
};

export const detenerWorker = () => {
  if (temporizador) clearInterval(temporizador);
};

// --- Consultas para la UI --------------------------------------------------

export const listar = (estado?: string, pedidoId?: number) => {
  const filtros: string[] = [];
  const params: unknown[] = [];
  if (estado) {
    filtros.push('i.estado = ?');
    params.push(estado);
  }
  if (pedidoId) {
    filtros.push('i.pedidoId = ?');
    params.push(pedidoId);
  }
  return consultar(
    `SELECT i.id_impresiones, i.pedidoId, i.tipo, i.ronda, i.estado, i.intentos, i.error, i.creadoEn, i.actualizadoEn,
            a.nombre AS area, imp.nombre AS impresora
       FROM impresiones i
       JOIN areas a ON a.id_areas = i.areaId
       LEFT JOIN impresoras imp ON imp.id_impresoras = i.impresoraId
      ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''}
      ORDER BY i.id_impresiones DESC LIMIT 200`,
    params
  );
};

export const vistaPrevia = async (id: number) => {
  const imp = await consultarUno<{ contenido: string }>('SELECT contenido FROM impresiones WHERE id_impresiones = ?', [id]);
  if (!imp) throw new NotFoundError('Impresión no encontrada');
  return aTexto(JSON.parse(imp.contenido), env.impresion.anchoCaracteres);
};

/** Botón "Reintentar impresión" (ignora el límite de intentos automáticos). */
export const reintentar = async (id: number) => {
  const ok = await procesar(id);
  return { impresa: ok };
};
