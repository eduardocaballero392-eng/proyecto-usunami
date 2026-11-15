/**
 * Crea mozos de ejemplo con PIN
 * 
 * Ejecutar: npm run crear-mozos
 */
import bcrypt from 'bcrypt';
import { ejecutar, cerrarPool } from '../src/config/database';

const mozos = [
  { nombre: 'Carlos Ramírez', pin: '1234' },
  { nombre: 'María González', pin: '5678' },
];

const main = async () => {
  console.log('Creando mozos...\n');

  for (const mozo of mozos) {
    const hash = await bcrypt.hash(mozo.pin, 10);
    
    await ejecutar(
      `INSERT INTO usuarios (nombre, usuario, password, rol, activo) 
       VALUES (?, ?, ?, 'MOZO', 1)
       ON DUPLICATE KEY UPDATE 
       password = VALUES(password), 
       activo = 1`,
      [mozo.nombre, mozo.nombre.toLowerCase().replace(/\s+/g, ''), hash]
    );
    
    console.log(`✔ Mozo "${mozo.nombre}" creado con PIN: ${mozo.pin}`);
  }

  console.log('\n✨ Mozos creados exitosamente!');
};

main()
  .catch((e) => {
    console.error('✘', e.message);
    process.exitCode = 1;
  })
  .finally(() => cerrarPool());
