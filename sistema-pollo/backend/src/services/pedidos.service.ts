import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Conexion, consultar, enTransaccion } from '../config/database';
import { TipoPedido, UsuarioSesion } from '../types';
import { aCentimos, aNumero, deCentimos } from '../utils/dinero';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';
import * as impresion from './impresion.service';
import * as plantillas from '../printing/plantillas';

export interface ItemSolicitud {
  productoId: number;
  cantidad: number;
  nota?: string;
  opciones?: number[];
}

export interface CrearPedidoDatos {
  tipo: TipoPedido;
  mesas?: number[]; // id_mesas
  observacion?: string;
  items: ItemSolicitud[];
}

// --- Helpers internos ----------------------------------------------------------

/**
 * Bloquea las filas de las mesas (FOR UPDATE) y verifica que no estén en otro pedido abierto.
 * El bloqueo serializa a dos mozos que intentan tomar la misma mesa al mismo tiempo.
 */
const reservarMesas = async (conn: Conexion, mesas: number[], excluirPedidoId?: number) => {
  const unicas = [...new Set(mesas)];
  const ph = unicas.map(() => '?').join(',');
  const [existentes] = await conn.query<RowDataPacket[]>(
    `SELECT id_mesas, numero FROM mesas WHERE id_mesas IN (${ph}) AND activo = 1 FOR UPDATE`,
    unicas
  );
  if (existentes.length !== unicas.length) throw new ValidationError('Alguna mesa no existe o está inactiva');

  const [ocupadas] = await conn.query<RowDataPacket[]>(
    `SELECT m.numero FROM pedido_mesas pm
       JOIN pedidos p ON p.id_pedidos = pm.pedidoId
       JOIN mesas m ON m.id_mesas = pm.mesaId
      WHERE pm.mesaId IN (${ph}) AND p.estado = 'ABIERTO' ${excluirPedidoId ? 'AND p.id_pedidos <> ?' : ''}`,
    excluirPedidoId ? [...unicas, excluirPedidoId] : unicas
  );
  if (ocupadas.length) {
    throw new ConflictError(`La mesa ${ocupadas.map((o) => o.numero).join(', ')} ya tiene un pedido abierto`);
  }
  return unicas;
};

/** Inserta ítems con precios congelados. Devuelve el subtotal en céntimos. */
const insertarItems = async (conn: Conexion, pedidoId: number, tipo: TipoPedido, ronda: number, items: ItemSolicitud[]) => {
  const idsProductos = [...new Set(items.map((i) => i.productoId))];
  const [productos] = await conn.query<RowDataPacket[]>(
    `SELECT id_productos, nombre, precio, recargoLlevar, areaId FROM productos
      WHERE id_productos IN (${idsProductos.map(() => '?').join(',')}) AND activo = 1`,
    idsProductos
  );
  const mapaProductos = new Map(productos.map((p) => [p.id_productos as number, p]));

  const idsOpciones = [...new Set(items.flatMap((i) => i.opciones ?? []))];
  const mapaOpciones = new Map<number, RowDataPacket>();
  if (idsOpciones.length) {
    const [ops] = await conn.query<RowDataPacket[]>(
      `SELECT id_opciones_producto, productoId, nombre, precioExtra FROM opciones_producto
        WHERE id_opciones_producto IN (${idsOpciones.map(() => '?').join(',')}) AND activa = 1`,
      idsOpciones
    );
    ops.forEach((o) => mapaOpciones.set(o.id_opciones_producto, o));
  }

  let subtotal = 0;
  for (const item of items) {
    const prod = mapaProductos.get(item.productoId);
    if (!prod) throw new ValidationError(`El producto #${item.productoId} no existe o no está disponible`);

    const opciones = (item.opciones ?? []).map((id) => {
      const o = mapaOpciones.get(id);
      if (!o || o.productoId !== prod.id_productos) {
        throw new ValidationError(`Opción no válida para ${prod.nombre}`);
      }
      return o;
    });

    const precioCent = aCentimos(prod.precio) + opciones.reduce((s, o) => s + aCentimos(o.precioExtra), 0);
    const recargoCent = tipo === 'LLEVAR' ? aCentimos(prod.recargoLlevar) : 0;
    subtotal += item.cantidad * (precioCent + recargoCent);

    const [res] = await conn.query<ResultSetHeader>(
      `INSERT INTO detalle_pedidos (pedidoId, productoId, areaId, cantidad, precioUnitario, recargoUnitario, ronda, nota)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [pedidoId, prod.id_productos, prod.areaId, item.cantidad, deCentimos(precioCent), deCentimos(recargoCent), ronda, item.nota?.trim() || null]
    );
    for (const o of opciones) {
      await conn.query(
        'INSERT INTO detalle_pedido_opciones (detallePedidoId, opcionId, nombre, precioExtra) VALUES (?, ?, ?, ?)',
        [res.insertId, o.id_opciones_producto, o.nombre, o.precioExtra]
      );
    }
  }
  return subtotal;
};

/** Total = Σ cantidad × (precio + recargo) de ítems NO anulados. */
const recalcularTotal = async (conn: Conexion, pedidoId: number): Promise<number> => {
  const [f] = await conn.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(cantidad * (precioUnitario + recargoUnitario)), 0) AS total
       FROM detalle_pedidos WHERE pedidoId = ? AND anulado = 0`,
    [pedidoId]
  );
  const total = aNumero(f[0].total);
  await conn.query('UPDATE pedidos SET total = ? WHERE id_pedidos = ?', [total, pedidoId]);
  return total;
};

/** Bloquea el pedido y valida que esté abierto y que el usuario pueda operarlo. */
const bloquearPedidoAbierto = async (conn: Conexion, pedidoId: number, usuario: UsuarioSesion) => {
  const [f] = await conn.query<RowDataPacket[]>('SELECT * FROM pedidos WHERE id_pedidos = ? FOR UPDATE', [pedidoId]);
  const pedido = f[0];
  if (!pedido) throw new NotFoundError('Pedido no encontrado');
  if (pedido.estado !== 'ABIERTO') throw new ConflictError(`El pedido ya está ${String(pedido.estado).toLowerCase()}`);
  if (usuario.rol === 'MOZO' && pedido.usuarioId !== usuario.id) {
    throw new ForbiddenError('Este pedido pertenece a otro mozo');
  }
  return pedido;
};

// --- Casos de uso --------------------------------------------------------------

/** RF-005..RF-007: crea el pedido y encola sus comandas en una sola transacción. */
export const crearPedido = async (datos: CrearPedidoDatos, usuario: UsuarioSesion) => {
  if (!datos.items?.length) throw new ValidationError('El pedido debe tener al menos un producto');
  const mesas = datos.mesas ?? [];
  if (datos.tipo === 'MESA' && mesas.length === 0) throw new ValidationError('Selecciona al menos una mesa');
  if (datos.tipo !== 'MESA' && mesas.length > 0) throw new ValidationError('Un pedido para llevar o delivery no lleva mesa');

  const { pedidoId, total, impresiones } = await enTransaccion(async (conn) => {
    if (datos.tipo === 'MESA') await reservarMesas(conn, mesas);

    const [res] = await conn.query<ResultSetHeader>(
      'INSERT INTO pedidos (usuarioId, tipo, observacion) VALUES (?, ?, ?)',
      [usuario.id, datos.tipo, datos.observacion?.trim() || null]
    );
    const pedidoId = res.insertId;

    for (const mesaId of new Set(mesas)) {
      await conn.query('INSERT INTO pedido_mesas (pedidoId, mesaId) VALUES (?, ?)', [pedidoId, mesaId]);
    }
    await insertarItems(conn, pedidoId, datos.tipo, 1, datos.items);
    const total = await recalcularTotal(conn, pedidoId);
    const impresiones = await impresion.encolarComandas(conn, pedidoId, [1]);
    return { pedidoId, total, impresiones };
  });

  impresion.procesarEnSegundoPlano(impresiones);
  return { id_pedidos: pedidoId, total, mensaje: 'Pedido enviado correctamente' };
};

/** RF-009 / RF-011: agrega ítems en una nueva ronda e imprime sólo lo nuevo. */
export const agregarItems = async (pedidoId: number, items: ItemSolicitud[], usuario: UsuarioSesion) => {
  if (!items?.length) throw new ValidationError('Agrega al menos un producto');

  const resultado = await enTransaccion(async (conn) => {
    const pedido = await bloquearPedidoAbierto(conn, pedidoId, usuario);
    const [f] = await conn.query<RowDataPacket[]>(
      'SELECT COALESCE(MAX(ronda), 0) + 1 AS ronda FROM detalle_pedidos WHERE pedidoId = ?',
      [pedidoId]
    );
    const ronda = Number(f[0].ronda);
    await insertarItems(conn, pedidoId, pedido.tipo, ronda, items);
    const total = await recalcularTotal(conn, pedidoId);
    const impresiones = await impresion.encolarComandas(conn, pedidoId, [ronda]);
    return { ronda, total, impresiones };
  });

  impresion.procesarEnSegundoPlano(resultado.impresiones);
  return { ronda: resultado.ronda, total: resultado.total, mensaje: 'Productos agregados' };
};

/** RF-011: mover el pedido a otra(s) mesa(s). */
export const cambiarMesas = async (pedidoId: number, mesas: number[], usuario: UsuarioSesion) => {
  if (!mesas?.length) throw new ValidationError('Selecciona al menos una mesa');
  return enTransaccion(async (conn) => {
    const pedido = await bloquearPedidoAbierto(conn, pedidoId, usuario);
    if (pedido.tipo !== 'MESA') throw new ValidationError('Sólo los pedidos en mesa tienen mesa asignada');
    const unicas = await reservarMesas(conn, mesas, pedidoId);
    await conn.query('DELETE FROM pedido_mesas WHERE pedidoId = ?', [pedidoId]);
    for (const mesaId of unicas) {
      await conn.query('INSERT INTO pedido_mesas (pedidoId, mesaId) VALUES (?, ?)', [pedidoId, mesaId]);
    }
    return { mensaje: 'Mesa actualizada' };
  });
};

/** RF-012: anular un ítem ya enviado (CAJERO/ADMIN, con motivo) + ticket de anulación. */
export const anularItem = async (pedidoId: number, itemId: number, motivo: string, usuario: UsuarioSesion) => {
  const res = await enTransaccion(async (conn) => {
    await bloquearPedidoAbierto(conn, pedidoId, usuario);
    const [f] = await conn.query<RowDataPacket[]>(
      `SELECT d.*, pr.nombre AS productoNombre FROM detalle_pedidos d
         JOIN productos pr ON pr.id_productos = d.productoId
        WHERE d.id_detalle_pedidos = ? AND d.pedidoId = ?`,
      [itemId, pedidoId]
    );
    const item = f[0];
    if (!item) throw new NotFoundError('Ítem no encontrado en este pedido');
    if (item.anulado) throw new ConflictError('El ítem ya estaba anulado');

    await conn.query(
      'UPDATE detalle_pedidos SET anulado = 1, anuladoPor = ?, anuladoEn = NOW(), motivoAnulacion = ? WHERE id_detalle_pedidos = ?',
      [usuario.id, motivo, itemId]
    );
    const total = await recalcularTotal(conn, pedidoId);

    const cab = await impresion.cabeceraPedido(conn, pedidoId);
    const doc = plantillas.anulacion(cab, { cantidad: item.cantidad, productoNombre: item.productoNombre }, motivo, usuario.nombre);
    const idImp = await impresion.encolar(conn, { pedidoId, areaId: item.areaId, tipo: 'ANULACION', doc });
    return { total, idImp };
  });

  impresion.procesarEnSegundoPlano([res.idImp]);
  return { total: res.total, mensaje: 'Ítem anulado' };
};

/** RF-006 excepción: quitar el recargo "para llevar" de un ítem (cliente trae su envase). */
export const quitarRecargo = async (pedidoId: number, itemId: number, usuario: UsuarioSesion) =>
  enTransaccion(async (conn) => {
    await bloquearPedidoAbierto(conn, pedidoId, usuario);
    const [res] = await conn.query<ResultSetHeader>(
      'UPDATE detalle_pedidos SET recargoUnitario = 0 WHERE id_detalle_pedidos = ? AND pedidoId = ? AND anulado = 0',
      [itemId, pedidoId]
    );
    if (!res.affectedRows) throw new NotFoundError('Ítem no encontrado');
    return { total: await recalcularTotal(conn, pedidoId), mensaje: 'Recargo retirado' };
  });

/** RF-025: anular un pedido completo (ADMIN). Libera sus mesas. */
export const anularPedido = async (pedidoId: number, motivo: string, usuario: UsuarioSesion) =>
  enTransaccion(async (conn) => {
    await bloquearPedidoAbierto(conn, pedidoId, usuario);
    await conn.query(
      "UPDATE pedidos SET estado = 'ANULADO', anuladoPor = ?, anuladoEn = NOW(), motivoAnulacion = ? WHERE id_pedidos = ?",
      [usuario.id, motivo, pedidoId]
    );
    return { mensaje: 'Pedido anulado' };
  });

/** RF-013: reimprimir la comanda completa (todos los ítems vigentes, por área). */
export const reimprimir = async (pedidoId: number) => {
  const ids = await enTransaccion((conn) => impresion.encolarComandas(conn, pedidoId, null));
  if (!ids.length) throw new ValidationError('El pedido no tiene ítems para imprimir');
  impresion.procesarEnSegundoPlano(ids);
  return { mensaje: 'Reimprimiendo comandas' };
};

// --- Consultas -----------------------------------------------------------------

const detallar = async (pedidos: RowDataPacket[]) => {
  if (!pedidos.length) return [];
  const ids = pedidos.map((p) => p.id_pedidos);
  const ph = ids.map(() => '?').join(',');
  const [items, impresiones] = await Promise.all([
    consultar(
      `SELECT d.id_detalle_pedidos, d.pedidoId, d.productoId, pr.nombre AS productoNombre, a.nombre AS areaNombre,
              d.cantidad, d.precioUnitario, d.recargoUnitario, d.ronda, d.nota, d.anulado, d.motivoAnulacion,
              (SELECT GROUP_CONCAT(o.nombre SEPARATOR ', ') FROM detalle_pedido_opciones o
                WHERE o.detallePedidoId = d.id_detalle_pedidos) AS opciones
         FROM detalle_pedidos d
         JOIN productos pr ON pr.id_productos = d.productoId
         JOIN areas a ON a.id_areas = d.areaId
        WHERE d.pedidoId IN (${ph})
        ORDER BY d.ronda, d.id_detalle_pedidos`,
      ids
    ),
    consultar(
      `SELECT i.pedidoId, i.id_impresiones, a.nombre AS area, i.tipo, i.ronda, i.estado, i.error
         FROM impresiones i JOIN areas a ON a.id_areas = i.areaId
        WHERE i.pedidoId IN (${ph}) ORDER BY i.id_impresiones`,
      ids
    ),
  ]);
  return pedidos.map((p) => ({
    ...p,
    total: aNumero(p.total),
    mesas: p.mesas ? String(p.mesas).split(',').map(Number) : [],
    items: items
      .filter((i) => i.pedidoId === p.id_pedidos)
      .map((i) => ({
        ...i,
        precioUnitario: aNumero(i.precioUnitario),
        recargoUnitario: aNumero(i.recargoUnitario),
        anulado: Boolean(i.anulado),
      })),
    impresiones: impresiones.filter((i) => i.pedidoId === p.id_pedidos),
  }));
};

const SELECT_PEDIDO = `
  SELECT p.id_pedidos, p.usuarioId, u.nombre AS mozoNombre, p.tipo, p.estado, p.total, p.observacion,
         p.creadoEn, p.pagadoEn, p.motivoAnulacion,
         GROUP_CONCAT(m.numero ORDER BY m.numero) AS mesas
    FROM pedidos p
    JOIN usuarios u ON u.id_usuarios = p.usuarioId
    LEFT JOIN pedido_mesas pm ON pm.pedidoId = p.id_pedidos
    LEFT JOIN mesas m ON m.id_mesas = pm.mesaId`;

/** Pedidos abiertos: el mozo ve los suyos; caja/admin ven todos. */
export const listarActivos = async (usuario: UsuarioSesion) => {
  const soloMios = usuario.rol === 'MOZO';
  const pedidos = await consultar(
    `${SELECT_PEDIDO} WHERE p.estado = 'ABIERTO' ${soloMios ? 'AND p.usuarioId = ?' : ''}
      GROUP BY p.id_pedidos ORDER BY p.creadoEn`,
    soloMios ? [usuario.id] : []
  );
  return detallar(pedidos);
};

export const obtenerPedido = async (pedidoId: number, usuario: UsuarioSesion) => {
  const pedidos = await consultar(`${SELECT_PEDIDO} WHERE p.id_pedidos = ? GROUP BY p.id_pedidos`, [pedidoId]);
  if (!pedidos.length) throw new NotFoundError('Pedido no encontrado');
  if (usuario.rol === 'MOZO' && pedidos[0].usuarioId !== usuario.id) throw new ForbiddenError();
  const [p] = await detallar(pedidos);
  const pagos = await consultar('SELECT metodo, monto, montoRecibido, vuelto, creadoEn FROM pagos WHERE pedidoId = ?', [pedidoId]);
  const comprobante = await consultar('SELECT serie, numero, total, creadoEn FROM comprobantes WHERE pedidoId = ?', [pedidoId]);
  return { ...p, pagos, comprobante: comprobante[0] ?? null };
};
