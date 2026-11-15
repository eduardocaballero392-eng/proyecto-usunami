import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export interface ItemCocina {
  id_detalle_pedido: number;
  pedidoId: number;
  productoId: number;
  productoNombre: string;
  cantidad: number;
  nota: string | null;
  anulado: boolean;
  mesaNumero: number | null;
  pedidoTipo: 'MESA' | 'LLEVAR' | 'DELIVERY';
  creadoEn: Date;
}

export interface PedidoPorArea {
  areaId: number;
  areaNombre: string;
  items: ItemCocina[];
}

class CocinaService {
  async getItemsPendientesByArea(areaId: number): Promise<ItemCocina[]> {
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT 
        dp.id_detalle_pedido,
        dp.pedidoId,
        dp.productoId,
        pr.nombre as productoNombre,
        dp.cantidad,
        dp.nota,
        dp.anulado,
        m.numero as mesaNumero,
        p.tipo as pedidoTipo,
        p.creadoEn
      FROM detalle_pedido dp
      INNER JOIN productos pr ON dp.productoId = pr.id_productos
      INNER JOIN pedidos p ON dp.pedidoId = p.id_pedidos
      LEFT JOIN mesas m ON p.mesaId = m.id_mesas
      WHERE dp.areaId = ?
        AND p.estado IN ('ABIERTO', 'ENVIADO')
        AND dp.anulado = FALSE
      ORDER BY p.creadoEn ASC`,
      [areaId]
    );

    return items as ItemCocina[];
  }

  async getAllItemsPendientes(): Promise<PedidoPorArea[]> {
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT 
        a.id_areas as areaId,
        a.nombre as areaNombre,
        dp.id_detalle_pedido,
        dp.pedidoId,
        dp.productoId,
        pr.nombre as productoNombre,
        dp.cantidad,
        dp.nota,
        dp.anulado,
        m.numero as mesaNumero,
        p.tipo as pedidoTipo,
        p.creadoEn
      FROM detalle_pedido dp
      INNER JOIN productos pr ON dp.productoId = pr.id_productos
      INNER JOIN pedidos p ON dp.pedidoId = p.id_pedidos
      INNER JOIN areas a ON dp.areaId = a.id_areas
      LEFT JOIN mesas m ON p.mesaId = m.id_mesas
      WHERE p.estado IN ('ABIERTO', 'ENVIADO')
        AND dp.anulado = FALSE
      ORDER BY a.nombre, p.creadoEn ASC`
    );

    // Agrupar por área
    const areaMap = new Map<number, PedidoPorArea>();

    for (const item of items) {
      const areaId = item.areaId;
      
      if (!areaMap.has(areaId)) {
        areaMap.set(areaId, {
          areaId,
          areaNombre: item.areaNombre,
          items: [],
        });
      }

      areaMap.get(areaId)!.items.push({
        id_detalle_pedido: item.id_detalle_pedido,
        pedidoId: item.pedidoId,
        productoId: item.productoId,
        productoNombre: item.productoNombre,
        cantidad: item.cantidad,
        nota: item.nota,
        anulado: item.anulado,
        mesaNumero: item.mesaNumero,
        pedidoTipo: item.pedidoTipo,
        creadoEn: item.creadoEn,
      });
    }

    return Array.from(areaMap.values());
  }

  async marcarItemCompletado(itemId: number): Promise<void> {
    await pool.query(
      'UPDATE detalle_pedido SET anulado = TRUE WHERE id_detalle_pedido = ?',
      [itemId]
    );
  }

  async getPedidoCompleto(pedidoId: number) {
    const [pedido] = await pool.query<RowDataPacket[]>(
      `SELECT 
        p.*,
        m.numero as mesaNumero,
        u.nombre as usuarioNombre
      FROM pedidos p
      LEFT JOIN mesas m ON p.mesaId = m.id_mesas
      INNER JOIN usuarios u ON p.usuarioId = u.id_usuarios
      WHERE p.id_pedidos = ?`,
      [pedidoId]
    );

    if (pedido.length === 0) return null;

    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT 
        dp.*,
        pr.nombre as productoNombre,
        a.nombre as areaNombre
      FROM detalle_pedido dp
      INNER JOIN productos pr ON dp.productoId = pr.id_productos
      INNER JOIN areas a ON dp.areaId = a.id_areas
      WHERE dp.pedidoId = ?`,
      [pedidoId]
    );

    return {
      ...pedido[0],
      items,
    };
  }
}

export default new CocinaService();
