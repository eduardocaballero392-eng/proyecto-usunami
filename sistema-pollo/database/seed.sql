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
  (1, 'Parrilla', 1),
  (2, 'Pollo Broaster', 2),
  (3, 'Platos a la carta', 3),
  (4, 'Sopas', 4),
  (5, 'Chifa', 5),
  (6, 'Bebidas', 6);

-- Productos de ejemplo (precios en soles). Editar desde el panel de administración.
INSERT INTO productos (nombre, descripcion, precio, recargoLlevar, categoriaId, areaId) VALUES
  ('Anticuchos de corazón',  '2 palitos con papa y choclo',        18.00, 1.00, 1, 1),
  ('Rachi',                  'Porción con papa dorada',            20.00, 1.00, 1, 1),
  ('Mollejitas a la parrilla','Con papas fritas y ensalada',       22.00, 1.00, 1, 1),
  ('Parrilla mixta',         'Anticucho, rachi, molleja y chorizo',45.00, 1.00, 1, 1),
  ('Pollo broaster 1/4',     'Con papas y ensalada',               16.00, 1.00, 2, 2),
  ('Pollo broaster 1/2',     'Con papas y ensalada',               30.00, 1.00, 2, 2),
  ('Alitas broaster x6',     'Con papas fritas',                   18.00, 1.00, 2, 2),
  ('Lomo saltado',           'Con arroz y papas fritas',           28.00, 1.00, 3, 3),
  ('Tallarín saltado',       'De carne o pollo',                   24.00, 1.00, 3, 3),
  ('Caldo de gallina',       'Con fideos y huevo',                 16.00, 1.00, 4, 3),
  ('Sopa wantán',            'Wantanes de cerdo',                  15.00, 1.00, 4, 3),
  ('Arroz chaufa',           'De pollo',                           20.00, 1.00, 5, 3),
  ('Aeropuerto',             'Chaufa con tallarín',                24.00, 1.00, 5, 3),
  ('Inca Kola 1.5L',         NULL,                                  9.00, 0.50, 6, 4),
  ('Chicha morada 1L',       'Hecha en casa',                      10.00, 0.50, 6, 4),
  ('Cerveza Cusqueña',       'Botella 620ml',                      10.00, 0.00, 6, 4);

-- Opciones de ejemplo
INSERT INTO opciones_producto (productoId, nombre, precioExtra) VALUES
  (1, 'Porción extra de papa', 3.00),
  (1, 'Con ají extra',         0.00),
  (5, 'Cambiar a papas nativas', 2.00);
 