-- Migration 003: Pedido con Múltiples Mesas
-- Fecha: 12/11/2026
-- Descripción: Permitir que un pedido esté asociado a múltiples mesas (cuenta compartida)

-- Crear tabla de relación many-to-many
CREATE TABLE pedido_mesas (
    pedidoId INT NOT NULL,
    mesaId INT NOT NULL,
    PRIMARY KEY (pedidoId, mesaId),
    FOREIGN KEY (pedidoId) REFERENCES pedidos(id_pedidos) ON DELETE CASCADE,
    FOREIGN KEY (mesaId) REFERENCES mesas(id_mesa) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Relación many-to-many entre pedidos y mesas';

-- Migrar datos existentes de pedidos.mesaId a pedido_mesas
-- Solo migrar pedidos que tienen mesaId (no NULL)
INSERT INTO pedido_mesas (pedidoId, mesaId)
SELECT id_pedidos, mesaId 
FROM pedidos 
WHERE mesaId IS NOT NULL;

-- Eliminar la constraint de foreign key de pedidos.mesaId
-- NOTA: Ajustar el nombre de la constraint según tu esquema
-- Para encontrar el nombre: SHOW CREATE TABLE pedidos;
-- Ejemplo: ALTER TABLE pedidos DROP FOREIGN KEY pedidos_ibfk_mesa;

-- Si tu constraint se llama diferente, cambia este nombre:
SET @constraint_name = (
    SELECT CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'pedidos' 
    AND COLUMN_NAME = 'mesaId'
    AND REFERENCED_TABLE_NAME IS NOT NULL
    LIMIT 1
);

SET @drop_fk = IF(@constraint_name IS NOT NULL, 
    CONCAT('ALTER TABLE pedidos DROP FOREIGN KEY ', @constraint_name), 
    'SELECT "No foreign key found" AS info');

PREPARE stmt FROM @drop_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Eliminar la columna mesaId de pedidos
ALTER TABLE pedidos DROP COLUMN mesaId;

-- Nota: Ahora un pedido puede estar en varias mesas a la vez
-- Ejemplo: Mesa 4 y 5 comparten la cuenta
-- Validación: Una mesa solo puede estar en UN pedido ABIERTO o ENVIADO a la vez
