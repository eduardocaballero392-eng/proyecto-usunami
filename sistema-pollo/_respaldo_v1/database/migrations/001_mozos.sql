-- Migration 001: Tabla Mozos
-- Descripción: Crear tabla para mozos que toman pedidos sin cuenta completa

CREATE TABLE IF NOT EXISTS mozos (
    id_mozo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    pin VARCHAR(4) NULL COMMENT 'PIN opcional de 4 dígitos',
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_mozos_activo ON mozos(activo);

-- Insertar mozos de prueba
INSERT INTO mozos (nombre, pin, activo) VALUES
('Juan Pérez', '1234', TRUE),
('María López', NULL, TRUE),
('Carlos García', '5678', TRUE),
('Ana Torres', NULL, TRUE);
