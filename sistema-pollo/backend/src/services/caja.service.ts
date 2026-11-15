import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Conexion, consultar, consultarUno, enTransaccion } from '../config/database';
import { MetodoPago, UsuarioSesion } from '../types';
import { aCentimos, aNumero, deCentimos, formatear } from '../utils/dinero';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import * as impresion from './impresion.service';
import * as plantillas from '../printing/plantillas';

export interface PagoSolicitud {
  metodo: MetodoPago;
  monto: number; // monto aplicado al pedido
  montoRecibido?: number; // sólo EFECTIVO: lo que entregó el cliente
}

const SERIE_BOLETA = 'B001';

// --- Turnos -------------------------------------------------------------------

const turnoAbierto = async (conn: Conexion | null, usuarioId: number) => {
  const sql = 'SELECT * FROM turnos_caja WHERE usuarioId = ? AND cierre IS NULL LIMIT 1';
  if (conn) {
    const [f] = await conn.query<RowDataPacket[]>(sql + ' FOR UPDATE', [usuarioId]);
    return f[0] ?? null;
  }
  return consultarUno(sql, [usuarioId]);
};

/** Totales por método de un turno. */
const totalesTurno = async (turnoId: number) => {
  const f = await consultarUno<{ efectivo: string; yape: string; plin: string; pedidos: number }>(
    `SELECT COALESCE(SUM(CASE WHEN metodo = 'EFECTIVO' THEN monto END), 0) AS efectivo,
            COALESCE(SUM(CASE WHEN metodo = 'YAPE' THEN monto END), 0) AS yape,
            COALESCE(SUM(CASE WHEN metodo = 'PLIN' THEN monto END), 0) AS plin,
            COUNT(DISTINCT pedidoId) AS pedidos
       FROM pagos WHERE turnoCajaId = ?`,
    [turnoId]
  );
  return {
    efectivo: aNumero(f?.efectivo),
    yape: aNumero(f?.yape),
    plin: aNumero(f?.plin),
    pedidos: Number(f?.pedidos ?? 0),
  };
};

/** RF-020 */
export const abrirTurno = async (usuario: UsuarioSesion, montoInicial: number) => {
  try {
    const { insertId } = await enTransaccion(async (conn) => {
      if (await turnoAbierto(conn, usuario.id)) throw new ConflictError('Ya tienes un turno abierto');
      const [res] = await conn.query<ResultSetHeader>(
        'INSERT INTO turnos_caja (usuarioId, montoInicial) VALUES (?, ?)',
        [usuario.id, aNumero(montoInicial)]
      );
      return res;
    });
    return obtenerTurno(insertId);
  } catch (e) {
    // El índice único (usuarioId, abierto) también lo impide ante peticiones simultáneas
    if ((e as { code?: string }).code === 'ER_DUP_ENTRY') throw new ConflictError('Ya tienes un turno abierto');
    throw e;
  }
};

export const obtenerTurno = async (id: number) => {
  const t = await consultarUno<RowDataPacket>(
    `SELECT t.*, u.nombre AS cajero FROM turnos_caja t JOIN usuarios u ON u.id_usuarios = t.usuarioId
      WHERE t.id_turnos_caja = ?`,
    [id]
  );
  if (!t) throw new NotFoundError('Turno no encontrado');
  const totales = await totalesTurno(id);
  const montoInicial = aNumero(t.montoInicial);
  return {
    id_turnos_caja: t.id_turnos_caja,
    usuarioId: t.usuarioId,
    cajero: t.cajero,
    apertura: t.apertura,
    cierre: t.cierre,
    montoInicial,
    montoFinal: t.montoFinal !== null ? aNumero(t.montoFinal) : null,
    montoEsperado: t.montoEsperado !== null ? aNumero(t.montoEsperado) : deCentimos(aCentimos(montoInicial) + aCentimos(totales.efectivo)),
    diferencia: t.diferencia !== null ? aNumero(t.diferencia) : null,
    ...totales,
    totalVentas: deCentimos(aCentimos(totales.efectivo) + aCentimos(totales.yape) + aCentimos(totales.plin)),
  };
};

export const turnoActual = async (usuario: UsuarioSesion) => {
  const t = await turnoAbierto(null, usuario.id);
  return t ? obtenerTurno(t.id_turnos_caja) : null;
};

/** RF-021: cierre con cuadre. Bloquea si quedan pedidos abiertos y nadie más tiene caja abierta. */
export const cerrarTurno = async (usuario: UsuarioSesion, montoFinal: number) => {
  const { turnoId, idImp } = await enTransaccion(async (conn) => {
    const turno = await turnoAbierto(conn, usuario.id);
    if (!turno) throw new ConflictError('No tienes un turno abierto');

    const [[abiertos], [otrasCajas]] = await Promise.all([
      conn.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM pedidos WHERE estado = 'ABIERTO'"),
      conn.query<RowDataPacket[]>(
        'SELECT COUNT(*) AS n FROM turnos_caja WHERE cierre IS NULL AND id_turnos_caja <> ?',
        [turno.id_turnos_caja]
      ),
    ]);
    if (Number(abiertos[0].n) > 0 && Number(otrasCajas[0].n) === 0) {
      throw new ConflictError(
        `Hay ${abiertos[0].n} pedido(s) sin cobrar. Cóbralos o anúlalos antes de cerrar la última caja.`
      );
    }

    const totales = await totalesTurno(turno.id_turnos_caja);
    const esperadoC = aCentimos(turno.montoInicial) + aCentimos(totales.efectivo);
    const finalC = aCentimos(montoFinal);
    await conn.query(
      'UPDATE turnos_caja SET cierre = NOW(), montoFinal = ?, montoEsperado = ?, diferencia = ? WHERE id_turnos_caja = ?',
      [deCentimos(finalC), deCentimos(esperadoC), deCentimos(finalC - esperadoC), turno.id_turnos_caja]
    );

    const [[t]] = await conn.query<RowDataPacket[]>(
      `SELECT t.*, u.nombre AS cajero FROM turnos_caja t JOIN usuarios u ON u.id_usuarios = t.usuarioId
        WHERE t.id_turnos_caja = ?`,
      [turno.id_turnos_caja]
    );
    const doc = plantillas.cierreCaja({
      id_turnos_caja: t.id_turnos_caja,
      cajero: t.cajero,
      apertura: t.apertura,
      cierre: t.cierre,
      montoInicial: aNumero(t.montoInicial),
      ...totales,
      montoEsperado: aNumero(t.montoEsperado),
      montoFinal: aNumero(t.montoFinal),
      diferencia: aNumero(t.diferencia),
    });
    const idImp = await impresion.encolar(conn, { pedidoId: null, areaId: await impresion.areaCaja(conn), tipo: 'CIERRE_CAJA', doc });
    return { turnoId: turno.id_turnos_caja as number, idImp };
  });
  impresion.procesarEnSegundoPlano([idImp]);
  return obtenerTurno(turnoId);
};

// --- Cobro ----------------------------------------------------------------------

/**
 * RF-022 / RF-023 / RF-024: cobro en una sola transacción.
 *   pedido FOR UPDATE → valida Σpagos = total → inserta pagos → numera boleta (serie FOR UPDATE)
 *   → marca PAGADO (libera mesas) → encola boleta en impresora de Caja.
 */
export const cobrar = async (pedidoId: number, pagos: PagoSolicitud[], usuario: UsuarioSesion) => {
  if (!pagos?.length) throw new ValidationError('Registra al menos un pago');

  const resultado = await enTransaccion(async (conn) => {
    const turno = await turnoAbierto(conn, usuario.id);
    if (!turno) throw new ConflictError('Abre tu turno de caja antes de cobrar');

    const [[pedido]] = await conn.query<RowDataPacket[]>('SELECT * FROM pedidos WHERE id_pedidos = ? FOR UPDATE', [pedidoId]);
    if (!pedido) throw new NotFoundError('Pedido no encontrado');
    if (pedido.estado !== 'ABIERTO') throw new ConflictError(`El pedido ya está ${String(pedido.estado).toLowerCase()}`);

    const totalC = aCentimos(pedido.total);
    if (totalC <= 0) throw new ValidationError('El pedido no tiene importe. Anúlalo en lugar de cobrarlo.');

    const pagosCalc = pagos.map((p) => {
      const montoC = aCentimos(p.monto);
      if (montoC <= 0) throw new ValidationError('Cada pago debe ser mayor a 0');
      let recibidoC: number | null = null;
      let vueltoC = 0;
      if (p.metodo === 'EFECTIVO') {
        recibidoC = aCentimos(p.montoRecibido ?? p.monto);
        if (recibidoC < montoC) throw new ValidationError('El efectivo recibido es menor al monto a pagar');
        vueltoC = recibidoC - montoC;
      }
      return { metodo: p.metodo, montoC, recibidoC, vueltoC };
    });

    const sumaC = pagosCalc.reduce((s, p) => s + p.montoC, 0);
    if (sumaC !== totalC) {
      throw new ValidationError(`Los pagos suman S/ ${formatear(deCentimos(sumaC))} pero el total es S/ ${formatear(deCentimos(totalC))}`);
    }

    for (const p of pagosCalc) {
      await conn.query(
        'INSERT INTO pagos (pedidoId, turnoCajaId, metodo, monto, montoRecibido, vuelto) VALUES (?, ?, ?, ?, ?, ?)',
        [pedidoId, turno.id_turnos_caja, p.metodo, deCentimos(p.montoC), p.recibidoC !== null ? deCentimos(p.recibidoC) : null, deCentimos(p.vueltoC)]
      );
    }

    // Numeración correlativa sin saltos (el bloqueo FOR UPDATE serializa cobros simultáneos)
    const [[serie]] = await conn.query<RowDataPacket[]>(
      'SELECT serie, siguienteNumero FROM series WHERE serie = ? AND activa = 1 FOR UPDATE',
      [SERIE_BOLETA]
    );
    if (!serie) throw new ValidationError(`La serie ${SERIE_BOLETA} no existe o está inactiva`);
    const numero = Number(serie.siguienteNumero);
    await conn.query('INSERT INTO comprobantes (pedidoId, serie, numero, total) VALUES (?, ?, ?, ?)', [
      pedidoId,
      SERIE_BOLETA,
      numero,
      deCentimos(totalC),
    ]);
    await conn.query('UPDATE series SET siguienteNumero = siguienteNumero + 1 WHERE serie = ?', [SERIE_BOLETA]);

    await conn.query("UPDATE pedidos SET estado = 'PAGADO', pagadoEn = NOW() WHERE id_pedidos = ?", [pedidoId]);

    // Boleta
    const cab = await impresion.cabeceraPedido(conn, pedidoId);
    const [items] = await conn.query<RowDataPacket[]>(
      `SELECT d.cantidad, pr.nombre AS descripcion, d.precioUnitario, d.recargoUnitario
         FROM detalle_pedidos d JOIN productos pr ON pr.id_productos = d.productoId
        WHERE d.pedidoId = ? AND d.anulado = 0 ORDER BY d.id_detalle_pedidos`,
      [pedidoId]
    );
    const doc = plantillas.boleta(
      SERIE_BOLETA,
      numero,
      cab,
      items.map((i) => ({
        cantidad: i.cantidad,
        descripcion: i.descripcion,
        precioUnitario: aNumero(i.precioUnitario),
        recargoUnitario: aNumero(i.recargoUnitario),
      })),
      deCentimos(totalC),
      pagosCalc.map((p) => ({
        metodo: p.metodo,
        monto: deCentimos(p.montoC),
        montoRecibido: p.recibidoC !== null ? deCentimos(p.recibidoC) : null,
        vuelto: deCentimos(p.vueltoC),
      }))
    );
    const idImp = await impresion.encolar(conn, { pedidoId, areaId: await impresion.areaCaja(conn), tipo: 'BOLETA', doc });

    return {
      comprobante: `${SERIE_BOLETA}-${String(numero).padStart(8, '0')}`,
      total: deCentimos(totalC),
      vuelto: deCentimos(pagosCalc.reduce((s, p) => s + p.vueltoC, 0)),
      idImp,
    };
  });

  impresion.procesarEnSegundoPlano([resultado.idImp]);
  return {
    mensaje: 'Cobro realizado correctamente',
    comprobante: resultado.comprobante,
    total: resultado.total,
    vuelto: resultado.vuelto,
  };
};

/** RF-033: historial de turnos (filtros por cajero y fechas). */
export const listarTurnos = async (filtros: { usuarioId?: number; inicio: string; fin: string }) => {
  const params: unknown[] = [filtros.inicio, filtros.fin];
  const porCajero = filtros.usuarioId ? 'AND t.usuarioId = ?' : '';
  if (filtros.usuarioId) params.push(filtros.usuarioId);
  const filas = await consultar(
    `SELECT t.id_turnos_caja, u.nombre AS cajero, t.apertura, t.cierre, t.montoInicial, t.montoEsperado,
            t.montoFinal, t.diferencia,
            COALESCE(SUM(CASE WHEN pg.metodo = 'EFECTIVO' THEN pg.monto END), 0) AS efectivo,
            COALESCE(SUM(CASE WHEN pg.metodo = 'YAPE' THEN pg.monto END), 0) AS yape,
            COALESCE(SUM(CASE WHEN pg.metodo = 'PLIN' THEN pg.monto END), 0) AS plin,
            COUNT(DISTINCT pg.pedidoId) AS pedidos
       FROM turnos_caja t
       JOIN usuarios u ON u.id_usuarios = t.usuarioId
       LEFT JOIN pagos pg ON pg.turnoCajaId = t.id_turnos_caja
      WHERE t.apertura >= ? AND t.apertura < ? ${porCajero}
      GROUP BY t.id_turnos_caja
      ORDER BY t.apertura DESC`,
    params
  );
  return filas.map((f) => ({
    ...f,
    montoInicial: aNumero(f.montoInicial),
    montoEsperado: f.montoEsperado !== null ? aNumero(f.montoEsperado) : null,
    montoFinal: f.montoFinal !== null ? aNumero(f.montoFinal) : null,
    diferencia: f.diferencia !== null ? aNumero(f.diferencia) : null,
    efectivo: aNumero(f.efectivo),
    yape: aNumero(f.yape),
    plin: aNumero(f.plin),
    pedidos: Number(f.pedidos),
  }));
};
