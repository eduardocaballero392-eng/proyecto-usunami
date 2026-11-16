-- ============================================================================
-- MIGRACIÓN: Reemplazar productos de Parrilla con la carta real
-- Ejecutar en la base de datos parrillita ya existente.
-- ============================================================================
USE parrillita;

-- 1. Eliminar opciones que apunten a productos de Parrilla (categoriaId = 1)
DELETE op FROM opciones_producto op
  JOIN productos p ON p.id_productos = op.productoId
 WHERE p.categoriaId = 1;

-- 2. Eliminar los productos de Parrilla anteriores
DELETE FROM productos WHERE categoriaId = 1;

-- 3. Insertar los platos reales de Parrilla (sin arroz ni papa en descripción)
INSERT INTO productos (nombre, descripcion, precio, recargoLlevar, categoriaId, areaId) VALUES
  ('Plato 1',  '2 palitos + pancita',                                   13.00, 1.00, 1, 1),
  ('Plato 2',  '2 palitos + molleja',                                   13.00, 1.00, 1, 1),
  ('Plato 3',  '1 palito + molleja + pancita',                          13.00, 1.00, 1, 1),
  ('Plato 4',  '1 palito + molleja',                                    13.00, 1.00, 1, 1),
  ('Plato 5',  '1 palito + pancita',                                    13.00, 1.00, 1, 1),
  ('Plato 6',  'Porción de molleja',                                    13.00, 1.00, 1, 1),
  ('Plato 7',  'Porción de pancita',                                    13.00, 1.00, 1, 1),
  ('Plato 8',  'Pechuga a la plancha',                                  13.00, 1.00, 1, 1),
  ('Plato 9',  '1 palito + molleja + pancita + mini pollo',             13.00, 1.00, 1, 1),
  ('Plato 10', '1 palito + molleja + pancita + pollo a la plancha',     19.00, 1.00, 1, 1),
  ('Plato 11', 'Porción de molleja + porción de pancita',               13.00, 1.00, 1, 1);
