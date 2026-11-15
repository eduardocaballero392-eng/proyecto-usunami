import mysql, { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { env } from './env';
import logger from '../utils/logger';

/**
 * Pool de conexiones MySQL/MariaDB.
 * - Fechas en hora de Lima (UTC-5, sin horario de verano).
 * - DECIMAL se devuelve como string para no perder precisión; convertir con utils/dinero.
 */
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.puerto,
  user: env.db.usuario,
  password: env.db.password,
  database: env.db.nombre,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  timezone: '-05:00',
  dateStrings: true,
  charset: 'utf8mb4',
});

// Cada conexión nueva opera en hora de Lima para que NOW() y CURRENT_TIMESTAMP coincidan
pool.on('connection', (conn) => {
  conn.query("SET time_zone = '-05:00'");
});

export type Conexion = PoolConnection;

/** SELECT → filas tipadas */
export const consultar = async <T = RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> => {
  const [filas] = await pool.query<RowDataPacket[]>(sql, params);
  return filas as unknown as T[];
};

/** SELECT → primera fila o null */
export const consultarUno = async <T = RowDataPacket>(sql: string, params: unknown[] = []): Promise<T | null> => {
  const filas = await consultar<T>(sql, params);
  return filas[0] ?? null;
};

/** INSERT / UPDATE / DELETE */
export const ejecutar = async (sql: string, params: unknown[] = []): Promise<ResultSetHeader> => {
  const [res] = await pool.query<ResultSetHeader>(sql, params);
  return res;
};

/**
 * Ejecuta `fn` dentro de una transacción. Hace COMMIT si todo sale bien y ROLLBACK si falla.
 */
export const enTransaccion = async <T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const probarConexion = async (): Promise<void> => {
  await pool.query('SELECT 1');
  logger.info('Conexión a la base de datos OK', { db: env.db.nombre, host: env.db.host });
};

export const cerrarPool = () => pool.end();

export default pool;
