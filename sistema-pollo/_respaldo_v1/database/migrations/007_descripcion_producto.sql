-- Migration 007: Descripción de Producto
-- Fecha: 12/11/2026
-- Descripción: Agregar campo para descripción detallada del producto

-- Agregar campo descripcion a productos
ALTER TABLE productos
ADD COLUMN descripcion TEXT NULL 
    COMMENT 'Descripción detallada del producto (ej: "2 palitos + pancita + papas + arroz")' 
    AFTER nombre;

-- Ejemplos de actualización (ajustar según carta real):
-- UPDATE productos SET descripcion = '5 palitos de corazón con papa y choclo' WHERE nombre LIKE '%Anticucho%';
-- UPDATE productos SET descripcion = '1/4 de pollo con papas fritas y ensalada' WHERE nombre LIKE '%Broaster 1/4%';

-- Nota: Este campo se llenará desde el panel de administración
-- Permite separar el nombre comercial (corto) de la descripción completa
