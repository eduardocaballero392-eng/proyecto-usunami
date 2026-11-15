-- Migration 004: Auditoría de Anulación
-- Fecha: 12/11/2026
-- Descripción: Agregar campos para auditar quién anuló ítems y por qué

-- Agregar campos de auditoría a detalle_pedidos
ALTER TABLE detalle_pedidos
ADD COLUMN anuladoPor INT NULL 
    COMMENT 'Usuario que anuló el ítem (ADMIN o CAJERO)' 
    AFTER anulado,
ADD COLUMN anuladoEn DATETIME NULL 
    COMMENT 'Fecha y hora de anulación' 
    AFTER anuladoPor,
ADD COLUMN motivoAnulacion VARCHAR(150) NULL 
    COMMENT 'Motivo de la anulación' 
    AFTER anuladoEn;

-- Foreign key a usuarios (quien anuló)
ALTER TABLE detalle_pedidos
ADD CONSTRAINT fk_detalle_anulado_por 
    FOREIGN KEY (anuladoPor) REFERENCES usuarios(id_usuario) 
    ON DELETE SET NULL;

-- Índice para búsquedas rápidas de ítems anulados
CREATE INDEX idx_detalle_anulado ON detalle_pedidos(anulado, anuladoEn);

-- Agregar campos de auditoría a pedidos (para anulación de pedido completo)
ALTER TABLE pedidos
ADD COLUMN anuladoPor INT NULL 
    COMMENT 'Usuario que anuló el pedido (solo ADMIN)' 
    AFTER estado,
ADD COLUMN anuladoEn DATETIME NULL 
    COMMENT 'Fecha y hora de anulación del pedido' 
    AFTER anuladoPor,
ADD COLUMN motivoAnulacion VARCHAR(150) NULL 
    COMMENT 'Motivo de anulación del pedido' 
    AFTER anuladoEn;

-- Foreign key a usuarios
ALTER TABLE pedidos
ADD CONSTRAINT fk_pedido_anulado_por 
    FOREIGN KEY (anuladoPor) REFERENCES usuarios(id_usuario) 
    ON DELETE SET NULL;

-- Nota: 
-- - Antes de enviar: el mozo puede quitar ítems sin auditoría (borrado del carrito)
-- - Después de enviar: requiere usuario ADMIN/CAJERO y motivo obligatorio
-- - Al anular un ítem ya enviado, se imprime ticket de anulación en el área
