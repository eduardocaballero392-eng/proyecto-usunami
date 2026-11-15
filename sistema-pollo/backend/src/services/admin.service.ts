import bcrypt from 'bcrypt';
import { RowDataPacket } from 'mysql2';
import { consultar, consultarUno, ejecutar, enTransaccion } from '../config/database';
import { Rol, UsuarioSesion } from '../types';
import { aNumero } from '../utils/dinero';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import * as impresion from './impresion.service';
import * as plantillas from '../printing/plantillas';

const RONDAS_BCRYPT = 10;

/** Construye "SET a = ?, b = ?" sólo con los campos presentes. */
const armarSet = (datos: Record<string, unknown>, permitidos: string[]) => {
  const campos = permitidos.filter((c) => datos[c] !== undefined);
  if (!campos.length) throw new ValidationError('No hay datos para actualizar');
  return { sql: campos.map((c) => `${c} = ?`).join(', '), valores: campos.map((c) => datos[c]) };
};

const verificarAfectado = (filas: number, entidad: string) => {
  if (!filas) throw new NotFoundError(`${entidad} no encontrado`);
};

// --- RF-018 / RF-019: USUARIOS (personal + mozos en la misma tabla) -----------------------

export interface UsuarioDatos {
  nombre?: string;
  usuario?: string | null;
  password?: string;
  pin?: string | null; // '' o null = quitar PIN
  rol?: Rol;
  activo?: boolean;
}

export const listarUsuarios = async (rol?: string) =>
  (
    await consultar(
      `SELECT u.id_usuarios, u.nombre, u.usuario, u.rol, u.activo, (u.pinHash IS NOT NULL) AS tienePin, u.creadoEn,
              (SELECT COUNT(*) FROM pedidos p WHERE p.usuarioId = u.id_usuarios) AS pedidos
         FROM usuarios u ${rol ? 'WHERE u.rol = ?' : ''}
        ORDER BY u.activo DESC, u.rol = 'MOZO' DESC, u.nombre`,
      rol ? [rol] : []
    )
  ).map((u) => ({ ...u, activo: Boolean(u.activo), tienePin: Boolean(u.tienePin), pedidos: Number(u.pedidos) }));

export const crearUsuario = async (d: UsuarioDatos) => {
  if (!d.nombre?.trim() || !d.rol) throw new ValidationError('Nombre y rol son obligatorios');
  const esMozo = d.rol === 'MOZO';
  if (!esMozo && (!d.usuario || !d.password)) throw new ValidationError('El personal necesita usuario y contraseña');
  if (!esMozo && d.password!.length < 6) throw new ValidationError('La contraseña debe tener al menos 6 caracteres');

  const res = await ejecutar(
    'INSERT INTO usuarios (nombre, usuario, password, pinHash, rol, activo) VALUES (?, ?, ?, ?, ?, ?)',
    [
      d.nombre.trim(),
      d.usuario?.trim() || null,
      !esMozo && d.password ? await bcrypt.hash(d.password, RONDAS_BCRYPT) : null,
      esMozo && d.pin ? await bcrypt.hash(d.pin, RONDAS_BCRYPT) : null,
      d.rol,
      d.activo === false ? 0 : 1,
    ]
  );
  return { id_usuarios: res.insertId };
};

export const actualizarUsuario = async (id: number, d: UsuarioDatos, actual: UsuarioSesion) => {
  const u = await consultarUno<{ rol: Rol; usuario: string | null; password: string | null }>(
    'SELECT rol, usuario, password FROM usuarios WHERE id_usuarios = ?',
    [id]
  );
  if (!u) throw new NotFoundError('Usuario no encontrado');
  if (id === actual.id && (d.activo === false || (d.rol && d.rol !== 'ADMIN'))) {
    throw new ValidationError('No puedes desactivarte ni quitarte el rol de administrador');
  }

  const rolFinal = d.rol ?? u.rol;
  const cambios: Record<string, unknown> = {
    nombre: d.nombre?.trim(),
    usuario: d.usuario === undefined ? undefined : d.usuario?.trim() || null,
    rol: d.rol,
    activo: d.activo === undefined ? undefined : d.activo ? 1 : 0,
  };
  if (d.password) {
    if (d.password.length < 6) throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
    cambios.password = await bcrypt.hash(d.password, RONDAS_BCRYPT);
  }
  if (d.pin !== undefined) cambios.pinHash = d.pin ? await bcrypt.hash(d.pin, RONDAS_BCRYPT) : null;

  const usuarioFinal = cambios.usuario !== undefined ? cambios.usuario : u.usuario;
  const passwordFinal = cambios.password ?? u.password;
  if (rolFinal !== 'MOZO' && (!usuarioFinal || !passwordFinal)) {
    throw new ValidationError('Para ese rol el usuario necesita nombre de usuario y contraseña');
  }

  const { sql, valores } = armarSet(cambios, ['nombre', 'usuario', 'password', 'pinHash', 'rol', 'activo']);
  await ejecutar(`UPDATE usuarios SET ${sql} WHERE id_usuarios = ?`, [...valores, id]);
  return { mensaje: 'Usuario actualizado' };
};

/** RF-018: historial de pedidos de un mozo. */
export const historialUsuario = (id: number) =>
  consultar(
    `SELECT p.id_pedidos, p.tipo, p.estado, p.total, p.creadoEn, p.pagadoEn
       FROM pedidos p WHERE p.usuarioId = ? ORDER BY p.creadoEn DESC LIMIT 100`,
    [id]
  );

// --- RF-015: CATEGORÍAS ------------------------------------------------------------

export const listarCategorias = () =>
  consultar(
    `SELECT c.*, (SELECT COUNT(*) FROM productos p WHERE p.categoriaId = c.id_categorias) AS productos
       FROM categorias c ORDER BY c.orden, c.nombre`
  );

export const crearCategoria = async (d: { nombre: string; orden?: number }) => {
  const res = await ejecutar('INSERT INTO categorias (nombre, orden) VALUES (?, ?)', [d.nombre.trim(), d.orden ?? 0]);
  return { id_categorias: res.insertId };
};

export const actualizarCategoria = async (id: number, d: Record<string, unknown>) => {
  const { sql, valores } = armarSet({ ...d, activo: d.activo === undefined ? undefined : d.activo ? 1 : 0 }, ['nombre', 'orden', 'activo']);
  verificarAfectado((await ejecutar(`UPDATE categorias SET ${sql} WHERE id_categorias = ?`, [...valores, id])).affectedRows, 'Categoría');
  return { mensaje: 'Categoría actualizada' };
};

export const eliminarCategoria = async (id: number) => {
  const usados = await consultarUno<{ n: number }>('SELECT COUNT(*) AS n FROM productos WHERE categoriaId = ?', [id]);
  if (Number(usados?.n)) throw new ConflictError('La categoría tiene productos. Muévelos o desactívala.');
  verificarAfectado((await ejecutar('DELETE FROM categorias WHERE id_categorias = ?', [id])).affectedRows, 'Categoría');
  return { mensaje: 'Categoría eliminada' };
};

// --- RF-014: PRODUCTOS -------------------------------------------------------------

export const listarProductos = async () => {
  const [productos, opciones] = await Promise.all([
    consultar(
      `SELECT p.*, c.nombre AS categoria, a.nombre AS area
         FROM productos p
         JOIN categorias c ON c.id_categorias = p.categoriaId
         JOIN areas a ON a.id_areas = p.areaId
        ORDER BY c.orden, p.nombre`
    ),
    consultar('SELECT * FROM opciones_producto ORDER BY nombre'),
  ]);
  return productos.map((p) => ({
    ...p,
    precio: aNumero(p.precio),
    recargoLlevar: aNumero(p.recargoLlevar),
    activo: Boolean(p.activo),
    opciones: opciones
      .filter((o) => o.productoId === p.id_productos)
      .map((o) => ({ ...o, precioExtra: aNumero(o.precioExtra), activa: Boolean(o.activa) })),
  }));
};

export interface ProductoDatos {
  nombre?: string;
  descripcion?: string | null;
  precio?: number;
  recargoLlevar?: number;
  foto?: string | null;
  categoriaId?: number;
  areaId?: number;
  activo?: boolean;
}

export const crearProducto = async (d: ProductoDatos) => {
  const res = await ejecutar(
    `INSERT INTO productos (nombre, descripcion, precio, recargoLlevar, foto, categoriaId, areaId)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [d.nombre!.trim(), d.descripcion || null, d.precio, d.recargoLlevar ?? 0, d.foto || null, d.categoriaId, d.areaId]
  );
  return { id_productos: res.insertId };
};

export const actualizarProducto = async (id: number, d: ProductoDatos, usuario: UsuarioSesion) =>
  enTransaccion(async (conn) => {
    const [[actual]] = await conn.query<RowDataPacket[]>('SELECT precio FROM productos WHERE id_productos = ? FOR UPDATE', [id]);
    if (!actual) throw new NotFoundError('Producto no encontrado');

    const cambios = { ...d, activo: d.activo === undefined ? undefined : d.activo ? 1 : 0 } as Record<string, unknown>;
    const { sql, valores } = armarSet(cambios, ['nombre', 'descripcion', 'precio', 'recargoLlevar', 'foto', 'categoriaId', 'areaId', 'activo']);
    await conn.query(`UPDATE productos SET ${sql} WHERE id_productos = ?`, [...valores, id]);

    // RNF-005: historial de precios
    if (d.precio !== undefined && aNumero(d.precio) !== aNumero(actual.precio)) {
      await conn.query(
        'INSERT INTO productos_historial_precios (productoId, precioAnterior, precioNuevo, usuarioId) VALUES (?, ?, ?, ?)',
        [id, actual.precio, d.precio, usuario.id]
      );
    }
    return { mensaje: 'Producto actualizado' };
  });

export const historialPrecios = (id: number) =>
  consultar(
    `SELECT h.precioAnterior, h.precioNuevo, h.creadoEn, u.nombre AS usuario
       FROM productos_historial_precios h JOIN usuarios u ON u.id_usuarios = h.usuarioId
      WHERE h.productoId = ? ORDER BY h.creadoEn DESC`,
    [id]
  );

export const crearOpcion = async (productoId: number, d: { nombre: string; precioExtra?: number }) => {
  const res = await ejecutar('INSERT INTO opciones_producto (productoId, nombre, precioExtra) VALUES (?, ?, ?)', [
    productoId,
    d.nombre.trim(),
    d.precioExtra ?? 0,
  ]);
  return { id_opciones_producto: res.insertId };
};

export const actualizarOpcion = async (id: number, d: Record<string, unknown>) => {
  const { sql, valores } = armarSet({ ...d, activa: d.activa === undefined ? undefined : d.activa ? 1 : 0 }, ['nombre', 'precioExtra', 'activa']);
  verificarAfectado((await ejecutar(`UPDATE opciones_producto SET ${sql} WHERE id_opciones_producto = ?`, [...valores, id])).affectedRows, 'Opción');
  return { mensaje: 'Opción actualizada' };
};

// --- RF-016: MESAS -------------------------------------------------------------------

export const listarMesas = () => consultar('SELECT * FROM mesas ORDER BY numero');

export const crearMesa = async (numero: number) => ({ id_mesas: (await ejecutar('INSERT INTO mesas (numero) VALUES (?)', [numero])).insertId });

export const actualizarMesa = async (id: number, d: Record<string, unknown>) => {
  const { sql, valores } = armarSet({ ...d, activo: d.activo === undefined ? undefined : d.activo ? 1 : 0 }, ['numero', 'activo']);
  verificarAfectado((await ejecutar(`UPDATE mesas SET ${sql} WHERE id_mesas = ?`, [...valores, id])).affectedRows, 'Mesa');
  return { mensaje: 'Mesa actualizada' };
};

export const eliminarMesa = async (id: number) => {
  const usada = await consultarUno<{ n: number }>('SELECT COUNT(*) AS n FROM pedido_mesas WHERE mesaId = ?', [id]);
  if (Number(usada?.n)) throw new ConflictError('La mesa tiene historial de pedidos. Desactívala en su lugar.');
  verificarAfectado((await ejecutar('DELETE FROM mesas WHERE id_mesas = ?', [id])).affectedRows, 'Mesa');
  return { mensaje: 'Mesa eliminada' };
};

// --- RF-017: ÁREAS E IMPRESORAS ------------------------------------------------------

export const listarAreas = () => consultar('SELECT * FROM areas ORDER BY id_areas');

export const crearArea = async (nombre: string) => ({
  id_areas: (await ejecutar('INSERT INTO areas (nombre) VALUES (?)', [nombre.trim().toUpperCase()])).insertId,
});

export const actualizarArea = async (id: number, d: Record<string, unknown>) => {
  const datos = { nombre: typeof d.nombre === 'string' ? d.nombre.trim().toUpperCase() : undefined, activo: d.activo === undefined ? undefined : d.activo ? 1 : 0 };
  const { sql, valores } = armarSet(datos, ['nombre', 'activo']);
  verificarAfectado((await ejecutar(`UPDATE areas SET ${sql} WHERE id_areas = ?`, [...valores, id])).affectedRows, 'Área');
  return { mensaje: 'Área actualizada' };
};

export const listarImpresoras = () =>
  consultar(
    `SELECT i.*, a.nombre AS area,
            (SELECT estado FROM impresiones x WHERE x.impresoraId = i.id_impresoras ORDER BY x.id_impresiones DESC LIMIT 1) AS ultimoEstado
       FROM impresoras i JOIN areas a ON a.id_areas = i.areaId ORDER BY a.id_areas`
  );

export const crearImpresora = async (d: { nombre: string; ip: string; puerto?: number; areaId: number }) => ({
  id_impresoras: (
    await ejecutar('INSERT INTO impresoras (nombre, ip, puerto, areaId) VALUES (?, ?, ?, ?)', [d.nombre.trim(), d.ip.trim(), d.puerto ?? 9100, d.areaId])
  ).insertId,
});

export const actualizarImpresora = async (id: number, d: Record<string, unknown>) => {
  const { sql, valores } = armarSet({ ...d, activa: d.activa === undefined ? undefined : d.activa ? 1 : 0 }, ['nombre', 'ip', 'puerto', 'areaId', 'activa']);
  verificarAfectado((await ejecutar(`UPDATE impresoras SET ${sql} WHERE id_impresoras = ?`, [...valores, id])).affectedRows, 'Impresora');
  return { mensaje: 'Impresora actualizada' };
};

/** RF-017: ticket de prueba (se imprime por la cola, en el área de la impresora). */
export const probarImpresora = async (id: number) => {
  const imp = await consultarUno<{ nombre: string; areaId: number; area: string }>(
    'SELECT i.nombre, i.areaId, a.nombre AS area FROM impresoras i JOIN areas a ON a.id_areas = i.areaId WHERE i.id_impresoras = ?',
    [id]
  );
  if (!imp) throw new NotFoundError('Impresora no encontrada');
  const idImp = await enTransaccion((conn) =>
    impresion.encolar(conn, { pedidoId: null, areaId: imp.areaId, tipo: 'PRUEBA', doc: plantillas.prueba(imp.nombre, imp.area) })
  );
  return impresion.reintentar(idImp);
};
