/**
 * Crea (o restablece) un usuario ADMIN.
 *
 *   npm run crear-admin -- --usuario admin --nombre "Administrador" --password "MiClaveSegura"
 *
 * Si no pasas --password se genera una aleatoria y se muestra UNA sola vez.
 */
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { consultarUno, ejecutar, cerrarPool } from '../src/config/database';

const arg = (nombre: string) => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const main = async () => {
  const usuario = arg('usuario') ?? 'admin';
  const nombre = arg('nombre') ?? 'Administrador';
  const generada = !arg('password');
  const password = arg('password') ?? crypto.randomBytes(9).toString('base64url');
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');

  const hash = await bcrypt.hash(password, 10);
  const existente = await consultarUno<{ id_usuarios: number }>('SELECT id_usuarios FROM usuarios WHERE usuario = ?', [usuario]);

  if (existente) {
    await ejecutar("UPDATE usuarios SET password = ?, rol = 'ADMIN', activo = 1 WHERE id_usuarios = ?", [hash, existente.id_usuarios]);
    console.log(`✔ Contraseña restablecida para "${usuario}"`);
  } else {
    await ejecutar("INSERT INTO usuarios (nombre, usuario, password, rol) VALUES (?, ?, ?, 'ADMIN')", [nombre, usuario, hash]);
    console.log(`✔ Administrador "${usuario}" creado`);
  }
  if (generada) console.log(`  Contraseña generada: ${password}\n  Guárdala ahora: no se volverá a mostrar.`);
};

main()
  .catch((e) => {
    console.error('✘', e.message);
    process.exitCode = 1;
  })
  .finally(() => cerrarPool());
