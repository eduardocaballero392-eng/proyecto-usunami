import { NextFunction, Request, RequestHandler, Response } from 'express';
import { validationResult } from 'express-validator';
import { AppError, TooManyRequestsError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';

/** Corta la petición si express-validator encontró errores. */
export const validar: RequestHandler = (req, _res, next) => {
  const errores = validationResult(req);
  if (errores.isEmpty()) return next();
  const primero = errores.array()[0];
  next(new ValidationError(String(primero.msg)));
};

/** Envuelve un handler async para que sus errores lleguen al errorHandler. */
export const ruta =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

/**
 * Limitador simple en memoria (sin dependencias) para login y PIN.
 * Suficiente para un único servidor en red local.
 */
export const limitarIntentos = (maximo: number, ventanaMs: number): RequestHandler => {
  const registro = new Map<string, { cuenta: number; desde: number }>();
  return (req, _res, next) => {
    const clave = `${req.ip}|${req.body?.usuario ?? req.body?.id_usuarios ?? ''}`;
    const ahora = Date.now();
    const r = registro.get(clave);
    if (!r || ahora - r.desde > ventanaMs) {
      registro.set(clave, { cuenta: 1, desde: ahora });
      return next();
    }
    r.cuenta += 1;
    if (r.cuenta > maximo) return next(new TooManyRequestsError());
    next();
  };
};

export const noEncontrado: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const manejarErrores = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error(err.message, { ruta: req.path });
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Errores de MySQL conocidos → mensajes claros
  const codigo = (err as { code?: string }).code;
  if (codigo === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
  }
  if (codigo === 'ER_ROW_IS_REFERENCED_2' || codigo === 'ER_ROW_IS_REFERENCED') {
    return res.status(409).json({ error: 'No se puede eliminar: el registro está en uso. Desactívalo en su lugar.' });
  }
  if (codigo === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'Alguna referencia (categoría, área, etc.) no existe' });
  }
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  logger.error('Error no controlado', { mensaje: err.message, stack: err.stack, ruta: req.path, metodo: req.method });
  res.status(500).json({ error: 'Error interno del servidor' });
};
