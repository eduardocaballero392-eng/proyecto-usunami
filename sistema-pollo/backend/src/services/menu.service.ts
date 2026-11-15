import { consultar } from '../config/database';
import { aNumero } from '../utils/dinero';

/** RF-003: carta por categorías (sólo activas), con opciones de cada producto. */
export const obtenerMenu = async (buscar?: string) => {
  const filtro = buscar ? 'AND p.nombre LIKE ?' : '';
  const params = buscar ? [`%${buscar}%`] : [];

  const [categorias, productos, opciones] = await Promise.all([
    consultar<{ id_categorias: number; nombre: string; orden: number }>(
      'SELECT id_categorias, nombre, orden FROM categorias WHERE activo = 1 ORDER BY orden, nombre'
    ),
    consultar<{
      id_productos: number;
      nombre: string;
      descripcion: string | null;
      precio: string;
      recargoLlevar: string;
      foto: string | null;
      categoriaId: number;
      areaId: number;
    }>(
      `SELECT p.id_productos, p.nombre, p.descripcion, p.precio, p.recargoLlevar, p.foto, p.categoriaId, p.areaId
         FROM productos p WHERE p.activo = 1 ${filtro} ORDER BY p.nombre`,
      params
    ),
    consultar<{ id_opciones_producto: number; productoId: number; nombre: string; precioExtra: string }>(
      `SELECT o.id_opciones_producto, o.productoId, o.nombre, o.precioExtra
         FROM opciones_producto o JOIN productos p ON p.id_productos = o.productoId
        WHERE o.activa = 1 AND p.activo = 1 ORDER BY o.nombre`
    ),
  ]);

  const opcionesPorProducto = new Map<number, { id_opciones_producto: number; nombre: string; precioExtra: number }[]>();
  for (const o of opciones) {
    const lista = opcionesPorProducto.get(o.productoId) ?? [];
    lista.push({ id_opciones_producto: o.id_opciones_producto, nombre: o.nombre, precioExtra: aNumero(o.precioExtra) });
    opcionesPorProducto.set(o.productoId, lista);
  }

  return categorias
    .map((c) => ({
      ...c,
      productos: productos
        .filter((p) => p.categoriaId === c.id_categorias)
        .map((p) => ({
          ...p,
          precio: aNumero(p.precio),
          recargoLlevar: aNumero(p.recargoLlevar),
          opciones: opcionesPorProducto.get(p.id_productos) ?? [],
        })),
    }))
    .filter((c) => !buscar || c.productos.length > 0);
};

/** Estado de mesas: libre u ocupada (con su pedido). */
export const estadoMesas = async () => {
  const filas = await consultar<{
    id_mesas: number;
    numero: number;
    pedidoId: number | null;
    mozoNombre: string | null;
    total: string | null;
    desde: string | null;
  }>(
    `SELECT m.id_mesas, m.numero, p.id_pedidos AS pedidoId, u.nombre AS mozoNombre, p.total, p.creadoEn AS desde
       FROM mesas m
       LEFT JOIN (pedido_mesas pm
                  JOIN pedidos p ON p.id_pedidos = pm.pedidoId AND p.estado = 'ABIERTO'
                  JOIN usuarios u ON u.id_usuarios = p.usuarioId)
              ON pm.mesaId = m.id_mesas
      WHERE m.activo = 1
      ORDER BY m.numero`
  );
  // Sólo se unen pedidos ABIERTOS y una mesa no puede estar en dos a la vez → una fila por mesa
  return filas.map((f) => ({
    id_mesas: f.id_mesas,
    numero: f.numero,
    ocupada: f.pedidoId !== null,
    pedidoId: f.pedidoId,
    mozoNombre: f.mozoNombre,
    total: f.total !== null ? aNumero(f.total) : null,
    desde: f.desde,
  }));
};
