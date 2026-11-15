/**
 * Logger estructurado (una línea JSON por evento en producción, legible en desarrollo).
 * Se puede redirigir a archivo con PM2 / NSSM sin dependencias extra.
 */
type Nivel = 'error' | 'warn' | 'info' | 'debug';

const esProduccion = process.env.NODE_ENV === 'production';

const escribir = (nivel: Nivel, mensaje: string, meta?: Record<string, unknown>) => {
  if (nivel === 'debug' && esProduccion) return;
  const ts = new Date().toISOString();
  const salida = nivel === 'error' ? console.error : nivel === 'warn' ? console.warn : console.log;
  if (esProduccion) {
    salida(JSON.stringify({ ts, nivel, mensaje, ...meta }));
  } else {
    salida(`[${ts}] ${nivel.toUpperCase()} ${mensaje}`, meta && Object.keys(meta).length ? meta : '');
  }
};

const logger = {
  error: (m: string, meta?: Record<string, unknown>) => escribir('error', m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => escribir('warn', m, meta),
  info: (m: string, meta?: Record<string, unknown>) => escribir('info', m, meta),
  debug: (m: string, meta?: Record<string, unknown>) => escribir('debug', m, meta),
};

export default logger;
