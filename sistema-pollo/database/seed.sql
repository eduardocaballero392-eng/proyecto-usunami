-- ============================================================================
-- DATOS INICIALES — configuración base del local
-- Ejecutar DESPUÉS de schema.sql. Los usuarios se crean con:
--   cd backend && npm run crear-admin
-- (así las contraseñas quedan hasheadas con bcrypt).
-- ============================================================================
USE parrillita;

-- Áreas de producción (+ Caja, que imprime boletas y cierres)
INSERT INTO areas (id_areas, nombre) VALUES
  (1, 'PARRILLA'), (2, 'BROASTER'), (3, 'CARTA'), (4, 'CAJA');

-- Impresoras térmicas de red (ajustar IPs reales desde el panel de administración)
INSERT INTO impresoras (nombre, ip, puerto, areaId) VALUES
  ('Impresora Parrilla', '192.168.1.201', 9100, 1),
  ('Impresora Broaster', '192.168.1.202', 9100, 2),
  ('Impresora Carta',    '192.168.1.203', 9100, 3),
  ('Impresora Caja',     '192.168.1.204', 9100, 4);

-- Mesas 1..20
INSERT INTO mesas (numero) VALUES
  (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),
  (11),(12),(13),(14),(15),(16),(17),(18),(19),(20);

-- Serie de boletas internas
INSERT INTO series (serie, tipo, siguienteNumero) VALUES ('B001', 'BOLETA', 1);

-- Categorías de la carta
INSERT INTO categorias (id_categorias, nombre, orden) VALUES
  (1, 'Parrilla',         1),
  (2, 'Pollo Broaster',   2),
  (3, 'Platos a la carta',3),
  (4, 'Sopas',            4),
  (5, 'Chifa',            5),
  (6, 'Bebidas',          6),
  (7, 'Adicionales',      7);

-- Productos de ejemplo (precios en soles). Editar desde el panel de administración.
INSERT INTO productos (nombre, descripcion, precio, recargoLlevar, categoriaId, areaId) VALUES
  ('Plato 1',   '2 palitos + pancita',                                    13.00, 1.00, 1, 1),
  ('Plato 2',   '2 palitos + molleja',                                    13.00, 1.00, 1, 1),
  ('Plato 3',   '1 palito + molleja + pancita',                           13.00, 1.00, 1, 1),
  ('Plato 4',   '1 palito + molleja',                                     13.00, 1.00, 1, 1),
  ('Plato 5',   '1 palito + pancita',                                     13.00, 1.00, 1, 1),
  ('Plato 6',   'Porción de molleja',                                     13.00, 1.00, 1, 1),
  ('Plato 7',   'Porción de pancita',                                     13.00, 1.00, 1, 1),
  ('Plato 8',   'Pechuga a la plancha',                                   13.00, 1.00, 1, 1),
  ('Plato 9',   '1 palito + molleja + pancita + mini pollo',              13.00, 1.00, 1, 1),
  ('Plato 10',  '1 palito + molleja + pancita + pollo a la plancha',      19.00, 1.00, 1, 1),
  ('Plato 11',  'Porción de molleja + porción de pancita',                13.00, 1.00, 1, 1),
  -- Pollo Broaster
  ('Alita broaster',         'Pollo broaster',                     10.00, 1.00, 2, 2),
  ('Entrepierna broaster',   'Pollo broaster',                     11.00, 1.00, 2, 2),
  ('Pecho broaster',         'Pollo broaster',                     13.00, 1.00, 2, 2),
  ('Pierna broaster',        'Pollo broaster',                     11.00, 1.00, 2, 2),
  -- Hamburguesas
  ('Hamburguesa de carne',   'Hamburguesa',                         7.00, 1.00, 2, 2),
  ('Hamburguesa de pollo',   'Hamburguesa',                         7.00, 1.00, 2, 2),
  -- Mostrito Broaster
  ('Alita mostrito',         'Mostrito broaster',                  13.00, 1.00, 2, 2),
  ('Entrepierna mostrito',   'Mostrito broaster',                  14.00, 1.00, 2, 2),
  ('Pecho mostrito',         'Mostrito broaster',                  15.00, 1.00, 2, 2),
  ('Pierna mostrito',        'Mostrito broaster',                  14.00, 1.00, 2, 2),
  -- Salchipapa
  ('Salchipapa',             'Salchipapa',                          8.00, 1.00, 2, 2),
  ('Salchichorizo',          'Salchipapa',                          8.00, 1.00, 2, 2),
  -- Platos a la carta
  ('Broaster a lo pobre',   'Pollo broaster + huevo + plátano + papas fritas + arroz blanco', 20.00, 1.00, 3, 3),
  ('Arroz a la cubana',     NULL,                                                              10.00, 1.00, 3, 3),
  ('Lomo saltado',          NULL,                                                              20.00, 1.00, 3, 3),
  ('Pollo saltado',         NULL,                                                              15.00, 1.00, 3, 3),
  ('Lomo chaufero',         NULL,                                                              22.00, 1.00, 3, 3),
  ('Tallarín saltado',      NULL,                                                              15.00, 1.00, 3, 3),
  ('Tallarín verde c/n',    'Pollo broaster / 2 palitos de anticuchos / pechuga a la plancha', 18.00, 1.00, 3, 3),
  -- Sopas
  ('Caldo de gallina solo',     NULL,  9.00, 1.00, 4, 3),
  ('Caldo de gallina completo', NULL, 11.00, 1.00, 4, 3),
  ('Sopa dieta',                NULL, 13.00, 1.00, 4, 3),
  ('Sopa a la minuta',          NULL, 15.00, 1.00, 4, 3),
  ('Sopa criolla',              NULL, 13.00, 1.00, 4, 3),
  -- Chifa
  ('Chaufa',              NULL, 11.00, 1.00, 5, 3),
  ('Aeropuerto',          NULL, 13.00, 1.00, 5, 3),
  ('Combinado',           NULL, 15.00, 1.00, 5, 3),
  ('Tipakay',             NULL, 17.00, 1.00, 5, 3),
  ('Chijaukay',           NULL, 17.00, 1.00, 5, 3),
  ('Pollo enrollado',     NULL, 18.00, 1.00, 5, 3),
  ('Chaufa especial',     NULL, 16.00, 1.00, 5, 3),
  ('Aeropuerto especial', NULL, 18.00, 1.00, 5, 3),
  ('Salvaje',             NULL, 16.00, 1.00, 5, 3),
  -- Bebidas
  ('Maracuyá / Chicha 1L',              'Refresco de la casa',           8.00, 0.00, 6, 4),
  ('Maracuyá / Chicha 1/2L',            'Refresco de la casa',           4.50, 0.00, 6, 4),
  ('Maracuyá / Chicha vaso',            'Refresco de la casa',           2.00, 0.00, 6, 4),
  ('Maracuyá / Chicha botellita',       'Refresco de la casa',           2.50, 0.00, 6, 4),
  ('Inka Kola / Coca Cola litro',       NULL,                             7.00, 0.00, 6, 4),
  ('Gordita',                           'Gaseosa gordita',                5.00, 0.00, 6, 4),
  ('Inka Kola / Coca Cola personal',    NULL,                             5.00, 0.00, 6, 4),
  ('Inka Kola / Coca Cola mediana vidrio', NULL,                          2.50, 0.00, 6, 4),
  ('Agua Cielo personal',               NULL,                             2.00, 0.00, 6, 4),
  ('Infusiones',                        'Anís / manzanilla / té',        2.00, 0.00, 6, 4),
  ('Café pasado',                       NULL,                             3.00, 0.00, 6, 4),
  ('Cerveza Pilsen',                    'Botella 620ml',                  9.00, 0.00, 6, 4),
  ('Cerveza Cusqueña',                  'Botella 620ml',                 10.00, 0.00, 6, 4),
  -- Adicionales
  ('1 palito de anticucho',   NULL, 5.00, 0.00, 7, 1),
  ('Porción de pancita',      NULL, 5.00, 0.00, 7, 1),
  ('Porción de mollejita',    NULL, 5.00, 0.00, 7, 1),
  ('Porción de arroz',        NULL, 3.00, 0.00, 7, 1),
  ('Porción de papa sancochada', NULL, 3.00, 0.00, 7, 1),
  ('Porción de papa frita',   NULL, 5.00, 0.00, 7, 1),
  ('Porción de canchita',     NULL, 2.00, 0.00, 7, 1),
  ('Porción de ensalada',     NULL, 3.00, 0.00, 7, 1);

-- Sin opciones de ejemplo para Broaster (se configuran desde el panel de administración)
 