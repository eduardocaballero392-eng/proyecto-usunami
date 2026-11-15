import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export interface VentasPorProducto {
  productoId: number;
  productoNombre: string;
  cantidad: number;
  total: number;
}

export interface VentasPorCategoria {
  categoriaId: number;
  categoriaNombre: string;
  cantidad: number;
  total: number;
}

export interface ResumenVentas {
  totalVentas: number;
  totalPedidos: number;
  ticketPromedio: number;
  ventasPorMetodo: {
    efectivo: number;
    yape: number;
    plin: number;
  };
}

class ReportesService {
  async getVentasPorPeriodo(fechaInicio: string, fechaFin: string): Promise<ResumenVentas> {
    const [resumen] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT p.id_pedidos) as totalPedidos,
        COALESCE(SUM(p.total), 0) as totalVentas
      FROM pedidos p
      WHERE p.estado = 'PAGADO'
        AND p.creadoEn BETWEEN ? AND ?`,
      [fechaInicio, fechaFin]
    );

    const [metodos] = await pool.query<RowDataPacket[]>(
      `SELECT 
        pg.metodo,
        COALESCE(SUM(pg.monto), 0) as total
      FROM pagos pg
      INNER JOIN pedidos p ON pg.pedidoId = p.id_pedidos
      WHERE p.creadoEn BETWEEN ? AND ?
      GROUP BY pg.metodo`,
      [fechaInicio, fechaFin]
    );

    const totalPedidos = parseInt(resumen[0].totalPedidos) || 0;
    const totalVentas = parseFloat(resumen[0].totalVentas) || 0;

    const ventasPorMetodo = {
      efectivo: 0,
      yape: 0,
      plin: 0,
    };

    for (const m of metodos) {
      const monto = parseFloat(m.total);
      if (m.metodo === 'EFECTIVO') ventasPorMetodo.efectivo = monto;
      if (m.metodo === 'YAPE') ventasPorMetodo.yape = monto;
      if (m.metodo === 'PLIN') ventasPorMetodo.plin = monto;
    }

    return {
      totalVentas,
      totalPedidos,
      ticketPromedio: totalPedidos > 0 ? totalVentas / totalPedidos : 0,
      ventasPorMetodo,
    };
  }

  async getVentasPorProducto(fechaInicio: string, fechaFin: string): Promise<VentasPorProducto[]> {
    const [productos] = await pool.query<RowDataPacket[]>(
      `SELECT 
        pr.id_productos as productoId,
        pr.nombre as productoNombre,
        SUM(dp.cantidad) as cantidad,
        SUM(dp.cantidad * dp.precioUnitario) as total
      FROM detalle_pedido dp
      INNER JOIN productos pr ON dp.productoId = pr.id_productos
      INNER JOIN pedidos p ON dp.pedidoId = p.id_pedidos
      WHERE p.estado = 'PAGADO'
        AND p.creadoEn BETWEEN ? AND ?
        AND dp.anulado = FALSE
      GROUP BY pr.id_productos, pr.nombre
      ORDER BY total DESC`,
      [fechaInicio, fechaFin]
    );

    return productos.map((p) => ({
      productoId: p.productoId,
      productoNombre: p.productoNombre,
      cantidad: parseInt(p.cantidad),
      total: parseFloat(p.total),
    }));
  }

  async getVentasPorCategoria(fechaInicio: string, fechaFin: string): Promise<VentasPorCategoria[]> {
    const [categorias] = await pool.query<RowDataPacket[]>(
      `SELECT 
        c.id_categorias as categoriaId,
        c.nombre as categoriaNombre,
        SUM(dp.cantidad) as cantidad,
        SUM(dp.cantidad * dp.precioUnitario) as total
      FROM detalle_pedido dp
      INNER JOIN productos pr ON dp.productoId = pr.id_productos
      INNER JOIN categorias c ON pr.categoriaId = c.id_categorias
      INNER JOIN pedidos p ON dp.pedidoId = p.id_pedidos
      WHERE p.estado = 'PAGADO'
        AND p.creadoEn BETWEEN ? AND ?
        AND dp.anulado = FALSE
      GROUP BY c.id_categorias, c.nombre
      ORDER BY total DESC`,
      [fechaInicio, fechaFin]
    );

    return categorias.map((c) => ({
      categoriaId: c.categoriaId,
      categoriaNombre: c.categoriaNombre,
      cantidad: parseInt(c.cantidad),
      total: parseFloat(c.total),
    }));
  }

  async getVentasPorDia(fechaInicio: string, fechaFin: string) {
    const [ventas] = await pool.query<RowDataPacket[]>(
      `SELECT 
        DATE(p.creadoEn) as fecha,
        COUNT(DISTINCT p.id_pedidos) as cantidadPedidos,
        COALESCE(SUM(p.total), 0) as totalVentas
      FROM pedidos p
      WHERE p.estado = 'PAGADO'
        AND p.creadoEn BETWEEN ? AND ?
      GROUP BY DATE(p.creadoEn)
      ORDER BY fecha ASC`,
      [fechaInicio, fechaFin]
    );

    return ventas.map((v) => ({
      fecha: v.fecha,
      cantidadPedidos: parseInt(v.cantidadPedidos),
      totalVentas: parseFloat(v.totalVentas),
    }));
  }

  async getVentasPorHora(fecha: string) {
    const [ventas] = await pool.query<RowDataPacket[]>(
      `SELECT 
        HOUR(p.creadoEn) as hora,
        COUNT(DISTINCT p.id_pedidos) as cantidadPedidos,
        COALESCE(SUM(p.total), 0) as totalVentas
      FROM pedidos p
      WHERE p.estado = 'PAGADO'
        AND DATE(p.creadoEn) = ?
      GROUP BY HOUR(p.creadoEn)
      ORDER BY hora ASC`,
      [fecha]
    );

    return ventas.map((v) => ({
      hora: parseInt(v.hora),
      cantidadPedidos: parseInt(v.cantidadPedidos),
      totalVentas: parseFloat(v.totalVentas),
    }));
  }

  async getTopUsuarios(fechaInicio: string, fechaFin: string, limit: number = 10) {
    const [usuarios] = await pool.query<RowDataPacket[]>(
      `SELECT 
        u.id_usuarios as usuarioId,
        u.nombre as usuarioNombre,
        COUNT(DISTINCT p.id_pedidos) as cantidadPedidos,
        COALESCE(SUM(p.total), 0) as totalVentas
      FROM pedidos p
      INNER JOIN usuarios u ON p.usuarioId = u.id_usuarios
      WHERE p.estado = 'PAGADO'
        AND p.creadoEn BETWEEN ? AND ?
      GROUP BY u.id_usuarios, u.nombre
      ORDER BY totalVentas DESC
      LIMIT ?`,
      [fechaInicio, fechaFin, limit]
    );

    return usuarios.map((u) => ({
      usuarioId: u.usuarioId,
      usuarioNombre: u.usuarioNombre,
      cantidadPedidos: parseInt(u.cantidadPedidos),
      totalVentas: parseFloat(u.totalVentas),
    }));
  }
}

export default new ReportesService();
