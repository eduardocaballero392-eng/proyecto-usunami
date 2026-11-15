import bcrypt from 'bcrypt';
import { consultar, consultarUno } from '../config/database';
import { firmarToken } from '../middlewares/auth';
import { Rol, UsuarioSesion } from '../types';
import { UnauthorizedError, ValidationError } from '../utils/errors';

interface FilaUsuario {
  id_usuarios: number;
  nombre: string;
  usuario: string | null;
  password: string | null;
  pinHash: string | null;
  rol: Rol;
  activo: number;
}

const HASH_FALSO = bcrypt.hashSync('usuario-inexistente', 10);

const respuestaSesion =(u: UsuarioSesion) => ({ token: firmarToken(u), usuario: u });

/** RF-001: login del personal (ADMIN, CAJERO, cocina) con usuario y contraseña. */
export const loginPersonal = async (usuario: string, password: string) => {
  const u = await consultarUno<FilaUsuario>(
    "SELECT * FROM usuarios WHERE usuario = ? AND rol <> 'MOZO' LIMIT 1",
    [usuario]
  );
  // Comparar siempre (aunque no exista) para no revelar qué usuarios existen por tiempo de respuesta
  const hash = u?.password ?? HASH_FALSO;
  const ok = await bcrypt.compare(password, hash);
  if (!u || !ok) throw new UnauthorizedError('Usuario o contraseña incorrectos');
  if (!u.activo) throw new UnauthorizedError('Tu usuario está desactivado');
  return respuestaSesion({ id: u.id_usuarios, nombre: u.nombre, rol: u.rol });
};

/** RF-002: lista de personal activo para la pantalla de selección (mozos y cocina). */
export const listarPersonalPorRol = (rol: Rol) =>
  consultar<{ id_usuarios: number; nombre: string; tienePin: number }>(
    `SELECT id_usuarios, nombre, (pinHash IS NOT NULL) AS tienePin
       FROM usuarios WHERE rol = ? AND activo = 1 ORDER BY nombre`,
    [rol]
  ).then((filas) => filas.map((f) => ({ ...f, tienePin: Boolean(f.tienePin) })));

/** RF-002: el personal de sala/cocina elige su nombre y PIN (OBLIGATORIO). */
export const loginPorPin = async (idUsuario: number, pin?: string) => {
  const u = await consultarUno<FilaUsuario>(
    'SELECT * FROM usuarios WHERE id_usuarios = ? AND activo = 1',
    [idUsuario]
  );
  if (!u) throw new UnauthorizedError('Usuario no disponible');
  
  // Solo roles que usan selección por nombre (no admin ni cajero)
  const rolesPermitidos: Rol[] = ['MOZO', 'PARRILLA', 'BROASTER', 'COCINERO'];
  if (!rolesPermitidos.includes(u.rol)) throw new UnauthorizedError('Rol no permitido');
  
  // PIN OBLIGATORIO para todos los roles operativos
  if (!u.pinHash) throw new ValidationError('Este usuario debe tener un PIN configurado. Contacta al administrador.');
  if (!pin) throw new ValidationError('Ingresa tu PIN');
  if (!(await bcrypt.compare(pin, u.pinHash))) throw new UnauthorizedError('PIN incorrecto');
  
  return respuestaSesion({ id: u.id_usuarios, nombre: u.nombre, rol: u.rol });
};
