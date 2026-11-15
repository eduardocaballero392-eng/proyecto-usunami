-- Migration 001: Agregar rol MOZO a usuarios
-- Fecha: 12/11/2026
-- Descripción: Permite que los mozos tengan cuentas en la tabla usuarios

-- Modificar ENUM de rol para incluir MOZO
ALTER TABLE usuarios 
MODIFY COLUMN rol ENUM('COCINERO','PARRILLA','BROASTER','ADMIN','CAJERO','MOZO') NOT NULL;

-- Los mozos no usan contraseña: permitir NULL
ALTER TABLE usuarios
MODIFY COLUMN password VARCHAR(255) NULL;

-- Agregar campo PIN opcional para mozos (4 dígitos)
ALTER TABLE usuarios
ADD COLUMN pin VARCHAR(4) NULL AFTER password,
ADD COLUMN activo BOOLEAN DEFAULT TRUE AFTER pin;

-- Índice para búsquedas por rol y estado activo
CREATE INDEX idx_usuarios_rol_activo ON usuarios(rol, activo);

-- Insertar mozos de ejemplo (sin password, solo con PIN)
-- El password puede ser NULL para usuarios tipo MOZO que solo usan PIN
INSERT INTO usuarios (nombre, usuario, password, rol, pin, activo) VALUES
('Juan Pérez', 'juan.mozo', NULL, 'MOZO', '1234', TRUE),
('María López', 'maria.mozo', NULL, 'MOZO', '5678', TRUE),
('Carlos García', 'carlos.mozo', NULL, 'MOZO', NULL, TRUE);

-- Nota: Los mozos con PIN NULL pueden seleccionarse directamente
-- Los mozos con PIN requieren ingresarlo para confirmar identidad
