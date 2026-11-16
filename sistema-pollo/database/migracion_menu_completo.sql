-- ============================================================================
-- MIGRACIÓN: Actualizar Platos a la carta, Sopas, Chifa, Bebidas
--            y agregar nueva categoría Adicionales con sus productos.
-- Ejecutar en la base de datos parrillita ya existente.
-- ============================================================================
USE parrillita;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PLATOS A LA CARTA (categoriaId = 3, areaId = 3)
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM productos WHERE categoriaId = 3;

INSERT INTO productos (nombre, descripcion, precio, recargoLlevar, categoriaId, areaId) VALUES
  ('Broaster a lo pobre',   'Pollo broaster + huevo + plátano + papas fritas + arroz blanco', 20.00, 1.00, 3, 3),
  ('Arroz a la cubana',     NULL,                                                              10.00, 1.00, 3, 3),
  ('Lomo saltado',          NULL,                                                              20.00, 1.00, 3, 3),
  ('Pollo saltado',         NULL,                                                              15.00, 1.00, 3, 3),
  ('Lomo chaufero',         NULL,                                                              22.00, 1.00, 3, 3),
  ('Tallarín saltado',      NULL,                                                              15.00, 1.00, 3, 3),
  ('Tallarín verde c/n',    'Pollo broaster / 2 palitos de anticuchos / pechuga a la plancha', 18.00, 1.00, 3, 3);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SOPAS (categoriaId = 4, areaId = 3)
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM productos WHERE categoriaId = 4;

INSERT INTO productos (nombre, descripcion, precio, recargoLlevar, categoriaId, areaId) VALUES
  ('Caldo de gallina solo',     NULL, 9.00,  1.00, 4, 3),
  ('Caldo de gallina completo', NULL, 11.00, 1.00, 4, 3),
  ('Sopa dieta',                NULL, 13.00, 1.00, 4, 3),
  ('Sopa a la minuta',          NULL, 15.00, 1.00, 4, 3),
  ('Sopa criolla',              NULL, 13.00, 1.00, 4, 3);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CHIFA (categoriaId = 5, areaId = 3)
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM productos WHERE categoriaId = 5;

INSERT INTO productos (nombre, descripcion, precio, recargoLlevar, categoriaId, areaId) VALUES
  ('Chaufa',              NULL, 11.00, 1.00, 5, 3),
  ('Aeropuerto',          NULL, 13.00, 1.00, 5, 3),
  ('Combinado',           NULL, 15.00, 1.00, 5, 3),
  ('Tipakay',             NULL, 17.00, 1.00, 5, 3),
  ('Chijaukay',           NULL, 17.00, 1.00, 5, 3),
  ('Pollo enrollado',     NULL, 18.00, 1.00, 5, 3),
  ('Chaufa especial',     NULL, 16.00, 1.00, 5, 3),
  ('Aeropuerto especial', NULL, 18.00, 1.00, 5, 3),
  ('Salvaje',             NULL, 16.00, 1.00, 5, 3);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. BEBIDAS (categoriaId = 6, areaId = 4)
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM productos WHERE categoriaId = 6;

INSERT INTO productos (nombre, descripcion, precio, recargoLlevar, categoriaId, areaId) VALUES
  ('Maracuyá / Chicha 1L',       'Refresco de la casa',         8.00,  0.00, 6, 4),
  ('Maracuyá / Chicha 1/2L',     'Refresco de la casa',         4.50,  0.00, 6, 4),
  ('Maracuyá / Chicha vaso',     'Refresco de la casa',         2.00,  0.00, 6, 4),
  ('Maracuyá / Chicha botellita','Refresco de la casa',         2.50,  0.00, 6, 4),
  ('Inka Kola / Coca Cola litro',NULL,                           7.00,  0.00, 6, 4),
  ('Gordita',                    'Gaseosa gordita',              5.00,  0.00, 6, 4),
  ('Inka Kola / Coca Cola personal', NULL,                       5.00,  0.00, 6, 4),
  ('Inka Kola / Coca Cola mediana vidrio', NULL,                 2.50,  0.00, 6, 4),
  ('Agua Cielo personal',        NULL,                           2.00,  0.00, 6, 4),
  ('Infusiones',                 'Anís / manzanilla / té',      2.00,  0.00, 6, 4),
  ('Café pasado',                NULL,                           3.00,  0.00, 6, 4),
  ('Cerveza Pilsen',             'Botella 620ml',                9.00,  0.00, 6, 4),
  ('Cerveza Cusqueña',           'Botella 620ml',               10.00,  0.00, 6, 4);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ADICIONALES — nueva categoría (areaId = 1 Parrilla, ya que son extras de parrilla)
-- ─────────────────────────────────────────────────────────────────────────────

-- Insertar categoría si no existe
INSERT IGNORE INTO categorias (nombre, orden) VALUES ('Adicionales', 7);

-- Limpiar productos previos de Adicionales por si se re-ejecuta
DELETE p FROM productos p
  JOIN categorias c ON c.id_categorias = p.categoriaId
 WHERE c.nombre = 'Adicionales';

INSERT INTO productos (nombre, descripcion, precio, recargoLlevar, categoriaId, areaId)
SELECT p.nombre, p.descripcion, p.precio, p.recargoLlevar, c.id_categorias, p.areaId
FROM categorias c,
(SELECT '1 palito de anticucho'    AS nombre, NULL AS descripcion, 5.00 AS precio, 0.00 AS recargoLlevar, 1 AS areaId UNION ALL
 SELECT 'Porción de pancita',       NULL, 5.00, 0.00, 1 UNION ALL
 SELECT 'Porción de mollejita',     NULL, 5.00, 0.00, 1 UNION ALL
 SELECT 'Porción de arroz',         NULL, 3.00, 0.00, 1 UNION ALL
 SELECT 'Porción de papa sancochada', NULL, 3.00, 0.00, 1 UNION ALL
 SELECT 'Porción de papa frita',    NULL, 5.00, 0.00, 1 UNION ALL
 SELECT 'Porción de canchita',      NULL, 2.00, 0.00, 1 UNION ALL
 SELECT 'Porción de ensalada',      NULL, 3.00, 0.00, 1
) p
WHERE c.nombre = 'Adicionales';
