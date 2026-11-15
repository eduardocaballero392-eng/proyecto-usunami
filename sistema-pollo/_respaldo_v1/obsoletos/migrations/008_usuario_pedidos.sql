-- Migration 008: Relación Usuario (Mozo) en Pedidos
-- Fecha: 12/11/2026
-- Descripción: Asegurar que pedidos.usuarioId apunta al mozo que tomó el pedido

-- Verificar que la foreign key existe
-- Si no existe en tu esquema, descomenta y ajusta:

-- ALTER TABLE pedidos
-- ADD CONSTRAINT fk_pedidos_usuario 
--     FOREIGN KEY (usuarioId) REFERENCES usuarios(id_usuario) 
--     ON DELETE RESTRICT;

-- Crear índice para búsquedas por mozo
CREATE INDEX idx_pedidos_usuario ON pedidos(usuarioId);

-- Nota:
-- - pedidos.usuarioId almacena el id_usuario del mozo (rol='MOZO')
-- - Esto permite auditar quién tomó cada pedido
-- - El mozo selecciona su nombre de la lista y su id se guarda aquí
