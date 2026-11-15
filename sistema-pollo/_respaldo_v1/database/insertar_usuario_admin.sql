-- Insertar usuario administrador de prueba
-- Contraseña: admin123 (hasheada con bcrypt)

INSERT INTO usuarios (nombre, usuario, password, rol) VALUES
('Administrador', 'admin01', '$2b$10$rQ7jK3N5vFZ5K5kZ5Z5Z5.Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'ADMIN');

-- Nota: Ejecutar este script una sola vez.
-- La contraseña será hasheada automáticamente por el backend al crear nuevos usuarios.
-- Para crear el hash real, ejecutar en Node.js:
-- const bcrypt = require('bcrypt');
-- bcrypt.hash('admin123', 10).then(console.log);
