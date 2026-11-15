import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export interface Mozo {
  id_usuarios: number;
  nombre: string;
}

class MozosService {
  async getAll(): Promise<Mozo[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id_usuarios, nombre FROM usuarios WHERE rol = ? ORDER BY nombre',
      ['MOZO']
    );
    return rows as Mozo[];
  }

  async getById(id: number): Promise<Mozo | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id_usuarios, nombre FROM usuarios WHERE id_usuarios = ? AND rol = ?',
      [id, 'MOZO']
    );
    return rows.length > 0 ? (rows[0] as Mozo) : null;
  }
}

export default new MozosService();
