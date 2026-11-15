import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcrypt';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface Usuario {
  id_usuarios: number;
  nombre: string;
  usuario: string;
  rol: 'ADMINISTRADOR' | 'COCINERO' | 'BROSTER' | 'PARILLA' | 'CAJA' | 'MOZO';
}

export interface Area {
  id_areas: number;
  nombre: string;
}

export interface Impresora {
  id_impresoras: number;
  nombre: string;
  ip: string;
  puerto: number;
  areaId: number;
  activa: boolean;
}

export interface Categoria {
  id_categorias: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface Mesa {
  id_mesas: number;
  numero: number;
}

class AdminService {
  // ============ USUARIOS ============
  async getUsuarios(): Promise<Usuario[]> {
    const [usuarios] = await pool.query<RowDataPacket[]>(
      'SELECT id_usuarios, nombre, usuario, rol FROM usuarios ORDER BY nombre'
    );
    return usuarios as Usuario[];
  }

  async createUsuario(data: {
    nombre: string;
    usuario: string;
    password: string;
    rol: string;
  }): Promise<Usuario> {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO usuarios (nombre, usuario, password, rol) VALUES (?, ?, ?, ?)',
      [data.nombre, data.usuario, hashedPassword, data.rol]
    );

    const [nuevo] = await pool.query<RowDataPacket[]>(
      'SELECT id_usuarios, nombre, usuario, rol FROM usuarios WHERE id_usuarios = ?',
      [result.insertId]
    );

    return nuevo[0] as Usuario;
  }

  async updateUsuario(
    id: number,
    data: { nombre?: string; usuario?: string; password?: string; rol?: string }
  ): Promise<Usuario> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.nombre) {
      updates.push('nombre = ?');
      values.push(data.nombre);
    }
    if (data.usuario) {
      updates.push('usuario = ?');
      values.push(data.usuario);
    }
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }
    if (data.rol) {
      updates.push('rol = ?');
      values.push(data.rol);
    }

    if (updates.length === 0) {
      throw new ValidationError('No hay datos para actualizar');
    }

    values.push(id);
    await pool.query(`UPDATE usuarios SET ${updates.join(', ')} WHERE id_usuarios = ?`, values);

    const [actualizado] = await pool.query<RowDataPacket[]>(
      'SELECT id_usuarios, nombre, usuario, rol FROM usuarios WHERE id_usuarios = ?',
      [id]
    );

    if (actualizado.length === 0) {
      throw new NotFoundError('Usuario no encontrado');
    }

    return actualizado[0] as Usuario;
  }

  async deleteUsuario(id: number): Promise<void> {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM usuarios WHERE id_usuarios = ?', [id]);
    if (result.affectedRows === 0) {
      throw new NotFoundError('Usuario no encontrado');
    }
  }

  // ============ ÁREAS ============
  async getAreas(): Promise<Area[]> {
    const [areas] = await pool.query<RowDataPacket[]>('SELECT * FROM areas ORDER BY nombre');
    return areas as Area[];
  }

  async createArea(nombre: string): Promise<Area> {
    const [result] = await pool.query<ResultSetHeader>('INSERT INTO areas (nombre) VALUES (?)', [nombre]);

    const [nuevo] = await pool.query<RowDataPacket[]>('SELECT * FROM areas WHERE id_areas = ?', [
      result.insertId,
    ]);

    return nuevo[0] as Area;
  }

  async updateArea(id: number, nombre: string): Promise<Area> {
    await pool.query('UPDATE areas SET nombre = ? WHERE id_areas = ?', [nombre, id]);

    const [actualizado] = await pool.query<RowDataPacket[]>('SELECT * FROM areas WHERE id_areas = ?', [id]);

    if (actualizado.length === 0) {
      throw new NotFoundError('Área no encontrada');
    }

    return actualizado[0] as Area;
  }

  async deleteArea(id: number): Promise<void> {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM areas WHERE id_areas = ?', [id]);
    if (result.affectedRows === 0) {
      throw new NotFoundError('Área no encontrada');
    }
  }

  // ============ IMPRESORAS ============
  async getImpresoras(): Promise<Impresora[]> {
    const [impresoras] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM impresoras ORDER BY nombre'
    );
    return impresoras as Impresora[];
  }

  async createImpresora(data: {
    nombre: string;
    ip: string;
    puerto: number;
    areaId: number;
  }): Promise<Impresora> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO impresoras (nombre, ip, puerto, areaId) VALUES (?, ?, ?, ?)',
      [data.nombre, data.ip, data.puerto, data.areaId]
    );

    const [nuevo] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM impresoras WHERE id_impresoras = ?',
      [result.insertId]
    );

    return nuevo[0] as Impresora;
  }

  async updateImpresora(
    id: number,
    data: { nombre?: string; ip?: string; puerto?: number; areaId?: number; activa?: boolean }
  ): Promise<Impresora> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.nombre !== undefined) {
      updates.push('nombre = ?');
      values.push(data.nombre);
    }
    if (data.ip !== undefined) {
      updates.push('ip = ?');
      values.push(data.ip);
    }
    if (data.puerto !== undefined) {
      updates.push('puerto = ?');
      values.push(data.puerto);
    }
    if (data.areaId !== undefined) {
      updates.push('areaId = ?');
      values.push(data.areaId);
    }
    if (data.activa !== undefined) {
      updates.push('activa = ?');
      values.push(data.activa);
    }

    if (updates.length === 0) {
      throw new ValidationError('No hay datos para actualizar');
    }

    values.push(id);
    await pool.query(`UPDATE impresoras SET ${updates.join(', ')} WHERE id_impresoras = ?`, values);

    const [actualizado] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM impresoras WHERE id_impresoras = ?',
      [id]
    );

    if (actualizado.length === 0) {
      throw new NotFoundError('Impresora no encontrada');
    }

    return actualizado[0] as Impresora;
  }

  async deleteImpresora(id: number): Promise<void> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM impresoras WHERE id_impresoras = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError('Impresora no encontrada');
    }
  }

  // ============ CATEGORÍAS ============
  async getCategorias(): Promise<Categoria[]> {
    const [categorias] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categorias ORDER BY orden, nombre'
    );
    return categorias as Categoria[];
  }

  async createCategoria(data: { nombre: string; orden: number }): Promise<Categoria> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO categorias (nombre, orden) VALUES (?, ?)',
      [data.nombre, data.orden]
    );

    const [nuevo] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categorias WHERE id_categorias = ?',
      [result.insertId]
    );

    return nuevo[0] as Categoria;
  }

  async updateCategoria(
    id: number,
    data: { nombre?: string; orden?: number; activo?: boolean }
  ): Promise<Categoria> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.nombre !== undefined) {
      updates.push('nombre = ?');
      values.push(data.nombre);
    }
    if (data.orden !== undefined) {
      updates.push('orden = ?');
      values.push(data.orden);
    }
    if (data.activo !== undefined) {
      updates.push('activo = ?');
      values.push(data.activo);
    }

    if (updates.length === 0) {
      throw new ValidationError('No hay datos para actualizar');
    }

    values.push(id);
    await pool.query(`UPDATE categorias SET ${updates.join(', ')} WHERE id_categorias = ?`, values);

    const [actualizado] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categorias WHERE id_categorias = ?',
      [id]
    );

    if (actualizado.length === 0) {
      throw new NotFoundError('Categoría no encontrada');
    }

    return actualizado[0] as Categoria;
  }

  async deleteCategoria(id: number): Promise<void> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM categorias WHERE id_categorias = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError('Categoría no encontrada');
    }
  }

  // ============ MESAS ============
  async getMesas(): Promise<Mesa[]> {
    const [mesas] = await pool.query<RowDataPacket[]>('SELECT * FROM mesas ORDER BY numero');
    return mesas as Mesa[];
  }

  async createMesa(numero: number): Promise<Mesa> {
    const [result] = await pool.query<ResultSetHeader>('INSERT INTO mesas (numero) VALUES (?)', [numero]);

    const [nuevo] = await pool.query<RowDataPacket[]>('SELECT * FROM mesas WHERE id_mesas = ?', [
      result.insertId,
    ]);

    return nuevo[0] as Mesa;
  }

  async updateMesa(id: number, numero: number): Promise<Mesa> {
    await pool.query('UPDATE mesas SET numero = ? WHERE id_mesas = ?', [numero, id]);

    const [actualizado] = await pool.query<RowDataPacket[]>('SELECT * FROM mesas WHERE id_mesas = ?', [id]);

    if (actualizado.length === 0) {
      throw new NotFoundError('Mesa no encontrada');
    }

    return actualizado[0] as Mesa;
  }

  async deleteMesa(id: number): Promise<void> {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM mesas WHERE id_mesas = ?', [id]);
    if (result.affectedRows === 0) {
      throw new NotFoundError('Mesa no encontrada');
    }
  }
}

export default new AdminService();
