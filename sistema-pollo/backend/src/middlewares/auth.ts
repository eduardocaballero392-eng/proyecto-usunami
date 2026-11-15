import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { consultarUno } from '../config/database';
import { Rol, UsuarioSesion } from '../types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

interface PayloadToken {
  sub: number;
  rol: Rol;
  nombre: string;
}

/** Firma el token de sesión (personal: 8 h; mozos: un turno largo). */
export const firmarToken = (u: UsuarioSesion): string =>
  jwt.sign({ sub: u.id, rol: u.rol, nombre: u.nombre }, env.jwt.secreto, {
    expiresIn: (u.rol === 'MOZO' ? env.jwt.expiraMozo : env.jwt.expiraPersonal) as jwt.SignOptions['expiresIn'],
  });

/**
 * Verifica el JWT y que el usuario siga ACTIVO (desactivar a alguien corta su sesión al instante).
 */
export const autenticar = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const cabecera = req.headers.authorization;
    if (!cabecera?.startsWith('Bearer ')) throw new UnauthorizedError('Debes iniciar sesión');

    let payload: PayloadToken;
    try {
      payload = jwt.verify(cabecera.slice(7), env.jwt.secreto) as unknown as PayloadToken;
    } catch {
      throw new UnauthorizedError('Tu sesión expiró. Vuelve a ingresar.');
    }

    const usuario = await consultarUno<{ id_usuarios: number; nombre: string; rol: Rol; activo: number }>(
      'SELECT id_usuarios, nombre, rol, activo FROM usuarios WHERE id_usuarios = ?',
      [payload.sub]
    );
    if (!usuario || !usuario.activo) throw new UnauthorizedError('Tu usuario está desactivado');

    req.usuario = { id: usuario.id_usuarios, nombre: usuario.nombre, rol: usuario.rol };
    next();
  } catch (error) {
    next(error);
  }
};

/** Permite el acceso sólo a los roles indicados. ADMIN siempre tiene acceso. */
export const permitir =
  (...roles: Rol[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const rol = req.usuario?.rol;
    if (!rol) return next(new UnauthorizedError());
    if (rol !== 'ADMIN' && !roles.includes(rol)) return next(new ForbiddenError());
    next();
  };
