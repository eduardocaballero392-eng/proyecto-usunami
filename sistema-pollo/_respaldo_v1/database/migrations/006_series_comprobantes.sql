-- Migration 006: Series de Comprobantes
-- Fecha: 12/11/2026
-- Descripción: Tabla para manejo de numeración correlativa de comprobantes

-- Crear tabla de series
CREATE TABLE series (
    serie VARCHAR(4) PRIMARY KEY,
    siguienteNumero INT NOT NULL DEFAULT 1 
        COMMENT 'Próximo número a asignar',
    activa BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Series para numeración correlativa de comprobantes';

-- Insertar serie inicial B001 (Boletas internas)
INSERT INTO series (serie, siguienteNumero, activa) 
VALUES ('B001', 1, TRUE);

-- Nota sobre numeración:
-- 1. Al cobrar, dentro de la transacción:
--    SELECT siguienteNumero FROM series WHERE serie='B001' FOR UPDATE;
-- 2. INSERT INTO comprobantes (..., numero=siguienteNumero)
-- 3. UPDATE series SET siguienteNumero = siguienteNumero + 1 WHERE serie='B001'
-- 4. El UNIQUE(serie, numero) en comprobantes previene duplicados
-- 5. Si se integra facturador SUNAT, se agregarán series F001, etc.
