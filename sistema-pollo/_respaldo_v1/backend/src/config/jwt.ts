import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const MOZO_TOKEN_SECRET = process.env.MOZO_TOKEN_SECRET || 'default_mozo_secret_change_in_production';

export interface JWTPayload {
  id: number;
  rol: string;
}

export interface MozoTokenPayload {
  mozoId: number;
}

export const generateToken = (id: number, rol: string): string => {
  return jwt.sign({ id, rol }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const generateMozoToken = (mozoId: number): string => {
  return jwt.sign({ mozoId }, MOZO_TOKEN_SECRET, { expiresIn: '30d' });
};

export const verifyMozoToken = (token: string): MozoTokenPayload | null => {
  try {
    return jwt.verify(token, MOZO_TOKEN_SECRET) as MozoTokenPayload;
  } catch (error) {
    return null;
  }
};
