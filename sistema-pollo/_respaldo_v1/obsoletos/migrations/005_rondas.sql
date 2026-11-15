-- Migration 005: Rondas de Impresión
-- Fecha: 12/11/2026
-- Descripción: Implementar comandas diferenciales (solo imprimir ítems nuevos)

-- Agregar campo ronda a detalle_pedidos
ALTER TABLE detalle_pedidos
ADD COLUMN ronda INT NOT NULL DEFAULT 1 
    COMMENT 'Número de ronda (1=pedido inicial, 2+=agregados)' 
    AFTER recargoUnitario;

-- Agregar campo ronda a impresiones
ALTER TABLE impresiones
ADD COLUMN ronda INT NOT NULL DEFAULT 1 
    COMMENT 'Ronda de impresión correspondiente' 
    AFTER areaId;

-- Índice compuesto para búsquedas por pedido y ronda
CREATE INDEX idx_detalle_pedido_ronda ON detalle_pedidos(pedidoId, ronda);
CREATE INDEX idx_impresiones_pedido_ronda ON impresiones(pedidoId, ronda);

-- Nota: 
-- - Ronda 1: pedido inicial
-- - Ronda 2+: ítems agregados posteriormente
-- - Al agregar ítems, se incrementa la ronda y solo se imprimen los nuevos
-- - Título de comanda: "MESA n" (ronda 1) o "AGREGADO - MESA n" (ronda >= 2)
