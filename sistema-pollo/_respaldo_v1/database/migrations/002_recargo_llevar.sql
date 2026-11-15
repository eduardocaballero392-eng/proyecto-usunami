-- Migration 002: Recargo Para Llevar
-- Fecha: 12/11/2026
-- Descripción: Agregar campos para recargos automáticos en pedidos tipo LLEVAR

-- Agregar campo recargoLlevar a productos
ALTER TABLE productos
ADD COLUMN recargoLlevar DECIMAL(10,2) NOT NULL DEFAULT 0.00 
COMMENT 'Recargo automático para pedidos tipo LLEVAR (ej: taper 1.00, botella 0.50)' 
AFTER precio;

-- Agregar campo recargoUnitario a detalle_pedidos
ALTER TABLE detalle_pedidos
ADD COLUMN recargoUnitario DECIMAL(10,2) NOT NULL DEFAULT 0.00 
COMMENT 'Copia del recargo al momento de la venta'
AFTER precioUnitario;

-- Actualizar productos existentes con recargos según categoría
-- NOTA: Estos valores son ejemplos, ajustar según carta real

-- Platos a la carta: taper S/ 1.00
UPDATE productos p
INNER JOIN categorias c ON p.categoriaId = c.id_categoria
SET p.recargoLlevar = 1.00
WHERE c.nombre LIKE '%Plato%' OR c.nombre LIKE '%Carta%' OR c.nombre LIKE '%Sopa%';

-- Parrilla: taper S/ 1.00
UPDATE productos p
INNER JOIN categorias c ON p.categoriaId = c.id_categoria
SET p.recargoLlevar = 1.00
WHERE c.nombre LIKE '%Parrilla%' OR c.nombre LIKE '%Anticucho%';

-- Pollo Broaster: taper S/ 1.00
UPDATE productos p
INNER JOIN categorias c ON p.categoriaId = c.id_categoria
SET p.recargoLlevar = 1.00
WHERE c.nombre LIKE '%Broaster%' OR c.nombre LIKE '%Pollo%';

-- Chifa: taper S/ 1.00
UPDATE productos p
INNER JOIN categorias c ON p.categoriaId = c.id_categoria
SET p.recargoLlevar = 1.00
WHERE c.nombre LIKE '%Chifa%';

-- Bebidas en botella: descartable S/ 0.50
UPDATE productos p
INNER JOIN categorias c ON p.categoriaId = c.id_categoria
SET p.recargoLlevar = 0.50
WHERE c.nombre LIKE '%Bebida%' AND p.nombre LIKE '%1.5%';

-- Sopas: taper S/ 1.00
UPDATE productos p
INNER JOIN categorias c ON p.categoriaId = c.id_categoria
SET p.recargoLlevar = 1.00
WHERE c.nombre LIKE '%Sopa%';

-- Nota: El total del pedido se calcula como:
-- total = SUM(cantidad * (precioUnitario + recargoUnitario)) WHERE anulado = FALSE
