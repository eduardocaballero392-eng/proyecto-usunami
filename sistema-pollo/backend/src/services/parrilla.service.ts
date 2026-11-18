import { consultar, consultarUno } from '../config/database';
import { hoyLima, sumarDias } from '../utils/fechas';
import { aNumero } from '../utils/dinero';

const n = (v: unknown) => Number(v ?? 0);

/**
 * Dashboard de Parrilla: estadísticas del día + comandas emitidas,
 * filtradas por areaId = 1 (PARRILLA).
 */
export const dashboardParrilla = async () => {
  const hoy = hoyLima();
  const inicio = `${hoy} 00:00:00`;
  const fin    = `${sumarDias(hoy, 1)} 00:00:00`;

  const [stats, platosMasVendidos, comandas] = await Promise.all([

    // ── Estadísticas globales del día ──────────────────────────────────────
    consultarUno<{
      totalPlatos: string;
      totalComandas: string;
      tiposDistintos: string;
    }>(
      `SELECT
         COALESCE(SUM(d.cantidad), 0)          AS totalPlatos,
         COUNT(DISTINCT d.pedidoId)            AS totalComandas,
         COUNT(DISTINCT d.productoId)          AS tiposDistintos
       FROM detalle_pedidos d
       JOIN pedidos p ON p.id_pedidos = d.pedidoId
      WHERE d.areaId = 1
        AND d.anulado = 0
        AND p.estado IN ('ABIERTO', 'PAGADO')
        AND p.creadoEn >= ? AND p.creadoEn < ?`,
      [inicio, fin]
    ),

    // ── Plato más vendido del día ──────────────────────────────────────────
    consultar<{ nombre: string; cantidad: string }>(
      `SELECT pr.nombre, SUM(d.cantidad) AS cantidad
         FROM detalle_pedidos d
         JOIN pedidos p  ON p.id_pedidos = d.pedidoId
         JOIN productos pr ON pr.id_productos = d.productoId
        WHERE d.areaId = 1
          AND d.anulado = 0
          AND p.estado IN ('ABIERTO', 'PAGADO')
          AND p.creadoEn >= ? AND p.creadoEn < ?
        GROUP BY d.productoId
        ORDER BY cantidad DESC
        LIMIT 5`,
      [inicio, fin]
    ),

    // ── Comandas del día con detalle ──────────────────────────────────────
    consultar<{
      id_pedidos: number;
      tipo: string;
      mozoNombre: string;
      mesas: string | null;
      creadoEn: string;
      estado: string;
    }>(
      `SELECT DISTINCT
          p.id_pedidos,
          p.tipo,
          u.nombre AS mozoNombre,
          GROUP_CONCAT(DISTINCT m.numero ORDER BY m.numero SEPARATOR ', ') AS mesas,
          p.creadoEn,
          p.estado
       FROM detalle_pedidos d
       JOIN pedidos p  ON p.id_pedidos = d.pedidoId
       JOIN usuarios u ON u.id_usuarios = p.usuarioId
       LEFT JOIN pedido_mesas pm ON pm.pedidoId = p.id_pedidos
       LEFT JOIN mesas m ON m.id_mesas = pm.mesaId
      WHERE d.areaId = 1
        AND d.anulado = 0
        AND p.estado IN ('ABIERTO', 'PAGADO')
        AND p.creadoEn >= ? AND p.creadoEn < ?
      GROUP BY p.id_pedidos
      ORDER BY p.creadoEn ASC`,
      [inicio, fin]
    ),
  ]);

  // Para cada comanda, traemos los ítems de parrilla
  const comandasConItems = await Promise.all(
    comandas.map(async (c) => {
      const items = await consultar<{
        nombre: string;
        cantidad: string;
        nota: string | null;
        opciones: string | null;
      }>(
        `SELECT pr.nombre, d.cantidad, d.nota,
                GROUP_CONCAT(DISTINCT dpo.nombre ORDER BY dpo.nombre SEPARATOR ', ') AS opciones
           FROM detalle_pedidos d
           JOIN productos pr ON pr.id_productos = d.productoId
           LEFT JOIN detalle_pedido_opciones dpo ON dpo.detallePedidoId = d.id_detalle_pedidos
          WHERE d.pedidoId = ? AND d.areaId = 1 AND d.anulado = 0
          GROUP BY d.id_detalle_pedidos
          ORDER BY d.id_detalle_pedidos`,
        [c.id_pedidos]
      );
      return {
        id_pedidos: c.id_pedidos,
        tipo: c.tipo,
        mozoNombre: c.mozoNombre,
        mesas: c.mesas ?? null,
        creadoEn: c.creadoEn,
        estado: c.estado,
        items: items.map((i) => ({
          nombre: i.nombre,
          cantidad: n(i.cantidad),
          nota: i.nota ?? null,
          opciones: i.opciones ?? null,
        })),
      };
    })
  );

  return {
    fecha: hoy,
    generadoEn: new Date().toISOString(),
    stats: {
      totalPlatos:    n(stats?.totalPlatos),
      totalComandas:  n(stats?.totalComandas),
      tiposDistintos: n(stats?.tiposDistintos),
      platoMasVendido: platosMasVendidos[0]
        ? { nombre: platosMasVendidos[0].nombre, cantidad: n(platosMasVendidos[0].cantidad) }
        : null,
    },
    ranking: platosMasVendidos.map((p) => ({ nombre: p.nombre, cantidad: n(p.cantidad) })),
    comandas: comandasConItems,
  };
};
