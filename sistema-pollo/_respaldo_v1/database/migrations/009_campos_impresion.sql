-- Migration 009: Campos de Impresión Avanzados
-- Fecha: 12/11/2026
-- Descripción: Agregar campos para manejo de reintentos y errores de impresión

-- Agregar campos a impresiones
ALTER TABLE impresiones
ADD COLUMN intentos INT NOT NULL DEFAULT 0 
    COMMENT 'Número de intentos de impresión realizados' 
    AFTER estado,
ADD COLUMN error TEXT NULL 
    COMMENT 'Mensaje de error si la impresión falló' 
    AFTER intentos;

-- Índice para búsquedas de impresiones con error
CREATE INDEX idx_impresiones_estado ON impresiones(estado, intentos);

-- Nota:
-- - intentos: se incrementa en cada reintento (máximo 3)
-- - error: mensaje descriptivo del error (ej: "Connection refused", "Timeout")
-- - Los reintentos automáticos se ejecutan con delay: 30s, 60s, 90s
-- - Si intentos >= 3 y estado = ERROR, se notifica al personal
