// Script para crear hash de contraseña de administrador
const bcrypt = require('bcrypt');

const password = 'admin123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error al generar hash:', err);
    return;
  }
  
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  Hash de contraseña generado                     ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  console.log('Contraseña:', password);
  console.log('Hash:', hash);
  console.log('\nSQL para insertar usuario admin:\n');
  console.log("INSERT INTO usuarios (nombre, usuario, password, rol) VALUES");
  console.log(`('Administrador', 'admin01', '${hash}', 'ADMIN');`);
  console.log('');
});
