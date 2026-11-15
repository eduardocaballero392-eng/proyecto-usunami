import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Pool de conexiones a MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'parrillita_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'America/Lima',
  charset: 'utf8mb4'
});

// Función helper para ejecutar consultas
export const query = async <T = any>(sql: string, params?: any[]): Promise<T> => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T;
  } catch (error: any) {
    console.error('Error en consulta DB:', error.message);
    throw error;
  }
};

// Función para iniciar transacción
export const getConnection = async () => {
  return await pool.getConnection();
};

// Test de conexión
export const testConnection = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT 1');
    console.log('✓ Conexión a MySQL exitosa');
    return true;
  } catch (error: any) {
    console.error('✗ Error al conectar a MySQL:', error.message);
    return false;
  }
};

export default pool;
