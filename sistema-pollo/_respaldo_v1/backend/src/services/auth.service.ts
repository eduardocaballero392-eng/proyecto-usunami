import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';
import { generateToken } from '../config/jwt';
import { UnauthorizedError } from '../utils/errors';

export interface Usuario {
  id_usuarios: number;
  nombre: string;
  usuario: string;
  password: string;
  rol: 'ADMINISTRADOR' | 'COCINERO' | 'BROSTER' | 'PARILLA' | 'CAJA' | 'MOZO';
}

class AuthService {
  async login(usuario: string, password: string) {
    const [usuarios] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM usuarios WHERE usuario = ?',
      [usuario]
    );

    if (usuarios.length === 0) {
      throw new UnauthorizedError('Usuario o contraseña incorrectos');
    }

    const user = usuarios[0] as Usuario;

    // Verificar password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new UnauthorizedError('Usuario o contraseña incorrectos');
    }

    // Generar token
    const token = generateToken(user.id_usuarios, user.rol);

    return {
      token,
      usuario: {
        id_usuarios: user.id_usuarios,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
      },
    };
  }
}

export default new AuthService();
