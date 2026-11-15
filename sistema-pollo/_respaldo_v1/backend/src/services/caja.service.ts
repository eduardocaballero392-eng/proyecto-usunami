import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface TurnoCaja {
  id_caja: number;
  usuarioId: number;
  montoInicial: number;
  montoFinal: number | null;
  apertura: Date;
  cierre: Date | null;
}

export interface Pago {
  id_pago: number;
  pedidoId: number;
  turnoCajaId: number | null;
  metodo: 'EFECTIVO' | 'YAPE' | 'PLIN';
  monto: number;
  creadoEn: Date;
}

export interface ResumenTurno {
  turno: TurnoCaja;
  totalVentas: number;
  totalEfectivo: number;
  totalYape: number;
  totalPlin: number;
  cantidadPedidos: number;
}

class CajaService {
  async abrirTurno(usuarioId: number, montoInicial: number): Promise<TurnoCaja> {
    // Verificar que no haya un turno abierto
    const [turnos] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM turnos_caja WHERE usuarioId = ? AND cierre IS NULL',
      [usuarioId]
    );

    if (turnos.length > 0) {
      throw new ValidationError('Ya existe un turno abierto para este usuario');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO turnos_caja (usuarioId, montoInicial) VALUES (?, ?)',
      [usuarioId, montoInicial]
    );

    const [nuevos] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM turnos_caja WHERE id_caja = ?',
      [result.insertId]
    );

    return nuevos[0] as TurnoCaja;
  }

  async cerrarTurno(id: number, montoFinal: number): Promise<TurnoCaja> {
    const [turnos] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM turnos_caja WHERE id_caja = ?',
      [id]
    );

    if (turnos.length === 0) {
      throw new NotFoundError('Turno no encontrado');
    }

    const turno = turnos[0];
    if (turno.cierre) {
      throw new ValidationError('El turno ya está cerrado');
    }

    await pool.query(
      'UPDATE turnos_caja SET montoFinal = ?, cierre = NOW() WHERE id_caja = ?',
      [montoFinal, id]
    );

    const [actualizado] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM turnos_caja WHERE id_caja = ?',
      [id]
    );

    return actualizado[0] as TurnoCaja;
  }

  async getTurnoActual(usuarioId: number): Promise<TurnoCaja | null> {
    const [turnos] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM turnos_caja WHERE usuarioId = ? AND cierre IS NULL ORDER BY apertura DESC LIMIT 1',
      [usuarioId]
    );

    return turnos.length > 0 ? (turnos[0] as TurnoCaja) : null;
  }

  async getResumenTurno(id: number): Promise<ResumenTurno> {
    const [turnos] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM turnos_caja WHERE id_caja = ?',
      [id]
    );

    if (turnos.length === 0) {
      throw new NotFoundError('Turno no encontrado');
    }

    const turno = turnos[0] as TurnoCaja;

    const [resumen] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT p.id_pago) as cantidadPedidos,
        COALESCE(SUM(p.monto), 0) as totalVentas,
        COALESCE(SUM(CASE WHEN p.metodo = 'EFECTIVO' THEN p.monto ELSE 0 END), 0) as totalEfectivo,
        COALESCE(SUM(CASE WHEN p.metodo = 'YAPE' THEN p.monto ELSE 0 END), 0) as totalYape,
        COALESCE(SUM(CASE WHEN p.metodo = 'PLIN' THEN p.monto ELSE 0 END), 0) as totalPlin
      FROM pagos p
      WHERE p.turnoCajaId = ?`,
      [id]
    );

    return {
      turno,
      totalVentas: parseFloat(resumen[0].totalVentas) || 0,
      totalEfectivo: parseFloat(resumen[0].totalEfectivo) || 0,
      totalYape: parseFloat(resumen[0].totalYape) || 0,
      totalPlin: parseFloat(resumen[0].totalPlin) || 0,
      cantidadPedidos: parseInt(resumen[0].cantidadPedidos) || 0,
    };
  }

  async registrarPago(
    pedidoId: number,
    metodo: 'EFECTIVO' | 'YAPE' | 'PLIN',
    monto: number,
    turnoCajaId?: number
  ): Promise<Pago> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO pagos (pedidoId, turnoCajaId, metodo, monto) VALUES (?, ?, ?, ?)',
      [pedidoId, turnoCajaId || null, metodo, monto]
    );

    // Actualizar estado del pedido a PAGADO
    await pool.query(
      'UPDATE pedidos SET estado = ? WHERE id_pedidos = ?',
      ['PAGADO', pedidoId]
    );

    const [nuevo] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM pagos WHERE id_pago = ?',
      [result.insertId]
    );

    return nuevo[0] as Pago;
  }

  async getPagosByPedido(pedidoId: number): Promise<Pago[]> {
    const [pagos] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM pagos WHERE pedidoId = ? ORDER BY creadoEn DESC',
      [pedidoId]
    );

    return pagos as Pago[];
  }

  async getTurnos(limit: number = 20): Promise<TurnoCaja[]> {
    const [turnos] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, u.nombre as usuarioNombre 
       FROM turnos_caja t 
       INNER JOIN usuarios u ON t.usuarioId = u.id_usuarios 
       ORDER BY t.apertura DESC 
       LIMIT ?`,
      [limit]
    );

    return turnos as TurnoCaja[];
  }
}

export default new CajaService();
