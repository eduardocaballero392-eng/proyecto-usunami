import { getConnection, query } from '../config/database';
import { CrearPedidoRequest, AgregarItemsRequest, TipoPedido } from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const validarMesasDisponibles = async (mesas: number[], excludePedidoId?: number) => {
  if (mesas.length === 0) return;

  const placeholders = mesas.map(() => '?').join(',');
  let sql = `
    SELECT pm.mesaId 
    FROM pedido_mesas pm
    JOIN pedidos p ON pm.pedidoId = p.id_pedidos
    WHERE pm.mesaId IN (${placeholders}) 
    AND p.estado IN ('ABIERTO', 'ENVIADO')
  `;
  const params: any[] = [...mesas];

  if (excludePedidoId) {
    sql += ' AND p.id_pedidos != ?';
    params.push(excludePedidoId);
  }

  const ocupadas = await query<any[]>(sql, params);

  if (ocupadas.length > 0) {
    const mesasOcupadas = ocupadas.map(m => m.mesaId).join(', ');
    throw new ValidationError(`Las mesas ${mesasOcupadas} ya están ocupadas`);
  }
};

export const crearPedido = async (datos: CrearPedidoRequest) => {
  if (!datos.items || datos.items.length === 0) {
    throw new ValidationError('El pedido debe tener al menos un ítem');
  }

  // Validar mesas si es tipo MESA
  if (datos.tipo === 'MESA') {
    if (!datos.mesas || datos.mesas.length === 0) {
      throw new ValidationError('Debe seleccionar al menos una mesa');
    }
    await validarMesasDisponibles(datos.mesas);
  }

  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    // Obtener información de productos
    const productoIds = datos.items.map(i => i.productoId);
    const placeholders = productoIds.map(() => '?').join(',');
    const productos = await connection.query<RowDataPacket[]>(
      `SELECT id_producto, precio, recargoLlevar, areaId FROM productos WHERE id_producto IN (${placeholders})`,
      productoIds
    );

    const productosMap = new Map();
    productos[0].forEach((p: any) => {
      productosMap.set(p.id_producto, p);
    });

    // Calcular total
    let total = 0;
    const itemsConPrecios = datos.items.map(item => {
      const producto = productosMap.get(item.productoId);
      if (!producto) {
        throw new NotFoundError(`Producto ${item.productoId} no encontrado`);
      }

      const precioUnitario = producto.precio;
      const recargoUnitario = datos.tipo === 'LLEVAR' ? producto.recargoLlevar : 0;
      const subtotal = item.cantidad * (precioUnitario + recargoUnitario);
      total += subtotal;

      return {
        ...item,
        precioUnitario,
        recargoUnitario,
        areaId: producto.areaId,
        subtotal
      };
    });

    // Insertar pedido
    const [pedidoResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO pedidos (mozoId, usuarioId, tipo, estado, total, creadoEn, actualizadoEn) 
       VALUES (?, NULL, ?, 'ABIERTO', ?, NOW(), NOW())`,
      [datos.mozoId, datos.tipo, total.toFixed(2)]
    );

    const pedidoId = pedidoResult.insertId;

    // Insertar mesas si aplica
    if (datos.tipo === 'MESA' && datos.mesas) {
      for (const mesaId of datos.mesas) {
        await connection.query(
          'INSERT INTO pedido_mesas (pedidoId, mesaId) VALUES (?, ?)',
          [pedidoId, mesaId]
        );
      }
    }

    // Insertar detalles
    const detalleIds: number[] = [];
    for (const item of itemsConPrecios) {
      const [detalleResult] = await connection.query<ResultSetHeader>(
        `INSERT INTO detalle_pedidos 
         (pedidoId, productoId, areaId, cantidad, precioUnitario, recargoUnitario, ronda, nota, anulado) 
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, FALSE)`,
        [pedidoId, item.productoId, item.areaId, item.cantidad, item.precioUnitario, item.recargoUnitario, item.nota || null]
      );
      detalleIds.push(detalleResult.insertId);
    }

    await connection.commit();

    // Retornar pedido creado
    return {
      id_pedidos: pedidoId,
      estado: 'ABIERTO',
      tipo: datos.tipo,
      total: parseFloat(total.toFixed(2)),
      detalleIds,
      message: 'Pedido creado. Imprimiendo comandas...'
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const agregarItems = async (pedidoId: number, datos: AgregarItemsRequest) => {
  if (!datos.items || datos.items.length === 0) {
    throw new ValidationError('Debe agregar al menos un ítem');
  }

  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    // Verificar que el pedido existe y está abierto
    const [pedidos] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM pedidos WHERE id_pedidos = ? AND estado = "ABIERTO"',
      [pedidoId]
    );

    if (pedidos.length === 0) {
      throw new NotFoundError('Pedido no encontrado o ya no está abierto');
    }

    const pedido = pedidos[0];

    // Obtener ronda actual
    const [rondaResult] = await connection.query<RowDataPacket[]>(
      'SELECT MAX(ronda) as maxRonda FROM detalle_pedidos WHERE pedidoId = ?',
      [pedidoId]
    );
    const nuevaRonda = (rondaResult[0].maxRonda || 0) + 1;

    // Obtener productos
    const productoIds = datos.items.map(i => i.productoId);
    const placeholders = productoIds.map(() => '?').join(',');
    const [productos] = await connection.query<RowDataPacket[]>(
      `SELECT id_producto, precio, recargoLlevar, areaId FROM productos WHERE id_producto IN (${placeholders})`,
      productoIds
    );

    const productosMap = new Map();
    productos.forEach((p: any) => {
      productosMap.set(p.id_producto, p);
    });

    // Calcular nuevo total
    let totalNuevosItems = 0;
    const detalleIds: number[] = [];

    for (const item of datos.items) {
      const producto = productosMap.get(item.productoId);
      if (!producto) {
        throw new NotFoundError(`Producto ${item.productoId} no encontrado`);
      }

      const precioUnitario = producto.precio;
      const recargoUnitario = pedido.tipo === 'LLEVAR' ? producto.recargoLlevar : 0;
      const subtotal = item.cantidad * (precioUnitario + recargoUnitario);
      totalNuevosItems += subtotal;

      const [detalleResult] = await connection.query<ResultSetHeader>(
        `INSERT INTO detalle_pedidos 
         (pedidoId, productoId, areaId, cantidad, precioUnitario, recargoUnitario, ronda, nota, anulado) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
        [pedidoId, item.productoId, producto.areaId, item.cantidad, precioUnitario, recargoUnitario, nuevaRonda, item.nota || null]
      );
      detalleIds.push(detalleResult.insertId);
    }

    const nuevoTotal = parseFloat(pedido.total) + totalNuevosItems;

    // Actualizar total del pedido
    await connection.query(
      'UPDATE pedidos SET total = ?, actualizadoEn = NOW() WHERE id_pedidos = ?',
      [nuevoTotal.toFixed(2), pedidoId]
    );

    await connection.commit();

    return {
      message: 'Ítems agregados. Imprimiendo comandas...',
      ronda: nuevaRonda,
      totalActualizado: parseFloat(nuevoTotal.toFixed(2)),
      detalleIds
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const cambiarMesas = async (pedidoId: number, mesas: number[]) => {
  if (!mesas || mesas.length === 0) {
    throw new ValidationError('Debe seleccionar al menos una mesa');
  }

  await validarMesasDisponibles(mesas, pedidoId);

  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    // Eliminar mesas anteriores
    await connection.query('DELETE FROM pedido_mesas WHERE pedidoId = ?', [pedidoId]);

    // Insertar nuevas mesas
    for (const mesaId of mesas) {
      await connection.query(
        'INSERT INTO pedido_mesas (pedidoId, mesaId) VALUES (?, ?)',
        [pedidoId, mesaId]
      );
    }

    await connection.commit();

    return { message: 'Mesas actualizadas' };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const anularItem = async (itemId: number, usuarioId?: number, motivo?: string) => {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    // Obtener ítem
    const [items] = await connection.query<RowDataPacket[]>(
      `SELECT dp.*, p.estado, p.tipo 
       FROM detalle_pedidos dp
       JOIN pedidos p ON dp.pedidoId = p.id_pedidos
       WHERE dp.id_detalle_pedidos = ?`,
      [itemId]
    );

    if (items.length === 0) {
      throw new NotFoundError('Ítem no encontrado');
    }

    const item = items[0];

    if (item.anulado) {
      throw new ValidationError('El ítem ya está anulado');
    }

    // Si el pedido ya fue enviado, requiere usuario y motivo
    if (item.estado === 'ENVIADO') {
      if (!usuarioId || !motivo) {
        throw new ValidationError('Se requiere usuario autorizado y motivo para anular después de enviar');
      }

      await connection.query(
        `UPDATE detalle_pedidos 
         SET anulado = TRUE, anuladoPor = ?, anuladoEn = NOW(), motivoAnulacion = ?
         WHERE id_detalle_pedidos = ?`,
        [usuarioId, motivo, itemId]
      );
    } else {
      // Antes de enviar, solo marcar como anulado
      await connection.query(
        'UPDATE detalle_pedidos SET anulado = TRUE WHERE id_detalle_pedidos = ?',
        [itemId]
      );
    }

    // Recalcular total del pedido
    const [totales] = await connection.query<RowDataPacket[]>(
      `SELECT SUM(cantidad * (precioUnitario + recargoUnitario)) as total
       FROM detalle_pedidos 
       WHERE pedidoId = ? AND anulado = FALSE`,
      [item.pedidoId]
    );

    const nuevoTotal = totales[0].total || 0;

    await connection.query(
      'UPDATE pedidos SET total = ?, actualizadoEn = NOW() WHERE id_pedidos = ?',
      [nuevoTotal, item.pedidoId]
    );

    await connection.commit();

    return {
      message: 'Ítem anulado',
      totalActualizado: parseFloat(nuevoTotal),
      requiereImpresionAnulacion: item.estado === 'ENVIADO',
      itemData: item
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const listarPedidosActivos = async (mozoId: number) => {
  const pedidos = await query<any[]>(
    `SELECT p.*, 
     GROUP_CONCAT(DISTINCT pm.mesaId ORDER BY pm.mesaId SEPARATOR ', ') as mesas,
     m.nombre as mozoNombre
     FROM pedidos p
     LEFT JOIN pedido_mesas pm ON p.id_pedidos = pm.pedidoId
     LEFT JOIN mozos m ON p.mozoId = m.id_mozo
     WHERE p.mozoId = ? AND p.estado IN ('ABIERTO', 'ENVIADO')
     GROUP BY p.id_pedidos
     ORDER BY p.creadoEn DESC`,
    [mozoId]
  );

  // Obtener items de cada pedido
  for (const pedido of pedidos) {
    const items = await query<any[]>(
      `SELECT dp.*, prod.nombre as productoNombre
       FROM detalle_pedidos dp
       JOIN productos prod ON dp.productoId = prod.id_producto
       WHERE dp.pedidoId = ?
       ORDER BY dp.ronda, dp.id_detalle_pedidos`,
      [pedido.id_pedidos]
    );
    pedido.items = items;
  }

  return { pedidos };
};

export const obtenerPedido = async (pedidoId: number) => {
  const pedidos = await query<any[]>(
    `SELECT p.*, 
     GROUP_CONCAT(DISTINCT pm.mesaId ORDER BY pm.mesaId SEPARATOR ' y ') as mesas,
     m.nombre as mozoNombre
     FROM pedidos p
     LEFT JOIN pedido_mesas pm ON p.id_pedidos = pm.pedidoId
     LEFT JOIN mozos m ON p.mozoId = m.id_mozo
     WHERE p.id_pedidos = ?
     GROUP BY p.id_pedidos`,
    [pedidoId]
  );

  if (pedidos.length === 0) {
    throw new NotFoundError('Pedido no encontrado');
  }

  const pedido = pedidos[0];

  // Obtener items
  const items = await query<any[]>(
    `SELECT dp.*, prod.nombre as productoNombre, a.nombre as areaNombre
     FROM detalle_pedidos dp
     JOIN productos prod ON dp.productoId = prod.id_producto
     LEFT JOIN areas a ON dp.areaId = a.id_area
     WHERE dp.pedidoId = ?
     ORDER BY dp.ronda, dp.id_detalle_pedidos`,
    [pedidoId]
  );

  pedido.items = items;

  return pedido;
};
