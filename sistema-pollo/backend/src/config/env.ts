import dotenv from 'dotenv';

dotenv.config();

/** Lee una variable obligatoria; en producción falla al arrancar si falta. */
const requerida = (nombre: string, porDefectoDev?: string): string => {
  const valor = process.env[nombre];
  if (valor !== undefined && valor !== '') return valor;
  if (process.env.NODE_ENV !== 'production' && porDefectoDev !== undefined) return porDefectoDev;
  throw new Error(`Falta la variable de entorno ${nombre}`);
};

const esProduccion = process.env.NODE_ENV === 'production';

export const env = {
  esProduccion,
  puerto: parseInt(process.env.PORT || '3000', 10),

  db: {
    host: process.env.DB_HOST || 'localhost',
    puerto: parseInt(process.env.DB_PORT || '3306', 10),
    usuario: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    nombre: process.env.DB_NAME || 'parrillita',
  },

  jwt: {
    secreto: requerida('JWT_SECRET', 'dev_secret_no_usar_en_produccion'),
    expiraPersonal: process.env.JWT_EXPIRES_IN || '8h',
    expiraMozo: process.env.JWT_MOZO_EXPIRES_IN || '14h',
  },

  impresion: {
    modo: (['network', 'bluetooth'].includes(process.env.PRINTER_MODE || '') ? process.env.PRINTER_MODE : 'mock') as 'network' | 'bluetooth' | 'mock',
    timeoutMs: parseInt(process.env.PRINTER_TIMEOUT_MS || '10000', 10),
    maxIntentos: parseInt(process.env.PRINTER_MAX_RETRIES || '3', 10),
    esperaReintentoSeg: parseInt(process.env.PRINTER_RETRY_DELAY_S || '30', 10),
    anchoCaracteres: parseInt(process.env.PRINTER_WIDTH_CHARS || '42', 10),
  },

  /** Orígenes permitidos por CORS, separados por coma. Vacío = cualquiera de la red local. */
  corsOrigenes: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

if (esProduccion && env.jwt.secreto.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
}
