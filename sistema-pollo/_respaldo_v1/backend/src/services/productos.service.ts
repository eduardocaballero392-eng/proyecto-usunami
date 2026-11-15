import { query } from '../config/database';
import { Producto, OpcionProducto } from '../types';
import { NotFoundError, ValidationError } from '../utils/errors';

interface Categoria {
  id_categoria: number;
  nombre: string;
  orden: number;
}

export const listarProductosConCategorias = async (buscar?: string) => {
  // Obtener categorías ordenadas
  const categorias = await query<Categoria[]>(
    'SELECT * FROM categorias ORDER BY orden, nombre'
  );

  const resultado = [];

  for (const categoria of categorias) {
    // Obtener productos de esta categoría
    let sql = `
      SELECT p.*, a.nombre as areaNombre 
      FROM productos p
      LEFT JOIN areas a ON p.areaId = a.id_area
      WHERE p.categoriaId = ?
    `;
    const params: any[] = [categoria.id_categoria];

    if (buscar) {
      sql += ' AND p.nombre LIKE ?';
      params.push(`%${buscar}%`);
    }

    sql += ' ORDER BY p.nombre';

    const productos = await query<any[]>(sql, params);

    // Obtener opciones para cada producto
    for (const producto of productos) {
      const opciones = await query<OpcionProducto[]>(
        'SELECT * FROM opciones_producto WHERE productoId = ? AND activa = TRUE',
        [producto.id_producto]
      );
      producto.opciones = opciones;
    }

    if (productos.length > 0 || !buscar) {
      resultado.push({
        id_categoria: categoria.id_categoria,
        nombre: categoria.nombre,
        orden: categoria.orden,
        productos
      });
    }
  }

  return { categorias: resultado };
};

export const obtenerProducto = async (id_producto: number) => {
  const productos = await query<Producto[]>(
    'SELECT * FROM productos WHERE id_producto = ?',
    [id_producto]
  );

  if (productos.length === 0) {
    throw new NotFoundError('Producto no encontrado');
  }

  const producto = productos[0];

  // Obtener opciones
  const opciones = await query<OpcionProducto[]>(
    'SELECT * FROM opciones_producto WHERE productoId = ? AND activa = TRUE',
    [id_producto]
  );

  return {
    ...producto,
    opciones
  };
};

export const crearProducto = async (datos: {
  nombre: string;
  descripcion?: string;
  precio: number;
  recargoLlevar: number;
  categoriaId: number;
  areaId: number;
}) => {
  if (!datos.nombre || datos.precio < 0 || datos.recargoLlevar < 0) {
    throw new ValidationError('Datos inválidos');
  }

  const result = await query<any>(
    `INSERT INTO productos (nombre, descripcion, precio, recargoLlevar, categoriaId, areaId) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [datos.nombre, datos.descripcion || null, datos.precio, datos.recargoLlevar, datos.categoriaId, datos.areaId]
  );

  return {
    id_producto: result.insertId,
    nombre: datos.nombre
  };
};

export const actualizarProducto = async (id_producto: number, datos: Partial<Producto>) => {
  const fields: string[] = [];
  const values: any[] = [];

  if (datos.nombre !== undefined) {
    fields.push('nombre = ?');
    values.push(datos.nombre);
  }
  if (datos.descripcion !== undefined) {
    fields.push('descripcion = ?');
    values.push(datos.descripcion);
  }
  if (datos.precio !== undefined) {
    if (datos.precio < 0) throw new ValidationError('Precio inválido');
    fields.push('precio = ?');
    values.push(datos.precio);
  }
  if (datos.recargoLlevar !== undefined) {
    if (datos.recargoLlevar < 0) throw new ValidationError('Recargo inválido');
    fields.push('recargoLlevar = ?');
    values.push(datos.recargoLlevar);
  }
  if (datos.categoriaId !== undefined) {
    fields.push('categoriaId = ?');
    values.push(datos.categoriaId);
  }
  if (datos.areaId !== undefined) {
    fields.push('areaId = ?');
    values.push(datos.areaId);
  }

  if (fields.length === 0) {
    throw new ValidationError('No hay datos para actualizar');
  }

  values.push(id_producto);

  await query(
    `UPDATE productos SET ${fields.join(', ')} WHERE id_producto = ?`,
    values
  );

  return { message: 'Producto actualizado' };
};
