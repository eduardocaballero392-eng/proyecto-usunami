import bcrypt from 'bcrypt';

/**
 * Script para generar hash de password para usuarios iniciales
 * Uso: tsx scripts/create-admin.ts
 */

async function createPasswordHash(password: string) {
  const hash = await bcrypt.hash(password, 10);
  return hash;
}

async function main() {
  console.log('=== Generador de Passwords para Base de Datos ===\n');
  
  // Password para admin
  const adminHash = await createPasswordHash('admin123');
  console.log('Usuario: admin');
  console.log('Password: admin123');
  console.log('Hash:', adminHash);
  console.log();

  // Password para usuarios de ejemplo
  const userHash = await createPasswordHash('123456');
  console.log('Usuarios: mozos, caja, cocina');
  console.log('Password: 123456');
  console.log('Hash:', userHash);
  console.log();

  console.log('Copia estos hashes en el archivo database.sql');
  console.log('Reemplaza "$2b$10$YourHashedPasswordHere" con los hashes generados');
}

main().catch(console.error);
