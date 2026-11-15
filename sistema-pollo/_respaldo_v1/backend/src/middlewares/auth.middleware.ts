import { Request, Response, NextFunction } from 'express';
import { verifyToken, verifyMozoToken } from '../config/jwt';

// Extender Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        rol: string;
      };
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

export const authenticateMozo = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7);
    const payload = verifyMozoToken(token);

    if (!payload) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    req.user = { id: payload.mozoId, rol: 'MOZO' };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

// Alias usados por pedidos.routes.ts y productos.routes.ts
export const authMiddleware = authenticateToken;
export const mozoMiddleware = authenticateMozo;
