-- ============================================================================
-- MIGRACIÓN: Reemplazar productos de Pollo Broaster (categoriaId = 2)
-- con la carta real. Ejecutar en la base de datos parrillita ya existente.
-- ============================================================================
USE parrillita;

-- 1. Eliminar opciones que apunten a productos de Broaster
DELETE op FROM opciones_producto op
  JOIN productos p ON p.id_productos = op.productoId
 WHERE p.categoriaId = 2;

-- 2. Eliminar los productos de Broaster anteriores
DELETE FROM productos WHERE categoriaId = 2;

-- 3. Insertar los productos reales del Broaster
INSERT INTO productos (nombre, descripcion, precio, recargoLlevar, categoriaId, areaId) VALUES
  -- Pollo Broaster
  ('Alita broaster',       'Pollo broaster',   10.00, 1.00, 2, 2),
  ('Entrepierna broaster', 'Pollo broaster',   11.00, 1.00, 2, 2),
  ('Pecho broaster',       'Pollo broaster',   13.00, 1.00, 2, 2),
  ('Pierna broaster',      'Pollo broaster',   11.00, 1.00, 2, 2),
  -- Hamburguesas
  ('Hamburguesa de carne', 'Hamburguesa',       7.00, 1.00, 2, 2),
  ('Hamburguesa de pollo', 'Hamburguesa',       7.00, 1.00, 2, 2),
  -- Mostrito Broaster
  ('Alita mostrito',       'Mostrito broaster', 13.00, 1.00, 2, 2),
  ('Entrepierna mostrito', 'Mostrito broaster', 14.00, 1.00, 2, 2),
  ('Pecho mostrito',       'Mostrito broaster', 15.00, 1.00, 2, 2),
  ('Pierna mostrito',      'Mostrito broaster', 14.00, 1.00, 2, 2),
  -- Salchipapa
  ('Salchipapa',           'Salchipapa',         8.00, 1.00, 2, 2);
