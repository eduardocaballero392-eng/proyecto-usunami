-- Migration 008: Relación Mozo en Pedidos
-- Descripción: Relacionar pedidos con el mozo que los tomó

ALTER TABLE pedidos
ADD COLUMN mozoId INT NULL COMMENT 'Mozo que tomó el pedido' AFTER usuarioId;

ALTER TABLE pedidos
ADD CONSTRAINT fk_pedidos_mozo
FOREIGN KEY (mozoId) REFERENCES mozos(id_mozo) ON DELETE SET NULL;

CREATE INDEX idx_pedidos_mozo ON pedidos(mozoId);
