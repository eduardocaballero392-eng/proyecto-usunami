-- ============================================================
-- SISTEMA DE GESTIÓN DE PEDIDOS - RESTAURANTE
-- ============================================================

CREATE DATABASE IF NOT EXISTS sistema_pollo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sistema_pollo;

-- ============================================================
-- FASE 1: CORE DEL SISTEMA
-- ============================================================

-- Usuarios del sistema (incluye mozos como rol)
CREATE TABLE usuarios (
  id_usuarios  INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL,
  usuario      VARCHAR(50)  NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  rol          ENUM('ADMINISTRADOR','COCINERO','BROSTER','PARILLA','CAJA','MOZO') NOT NULL
) ENGINE=InnoDB;

-- Áreas de cocina (PARRILLA, BROASTER, etc.)
CREATE TABLE areas (
  id_areas  INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Impresoras de cocina por área
CREATE TABLE impresoras (
  id_impresoras INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(50)  NOT NULL,
  ip            VARCHAR(45)  NOT NULL,
  puerto        INT          NOT NULL DEFAULT 9100,
  areaId        INT          NOT NULL,
  activa        BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_impresoras_area FOREIGN KEY (areaId) REFERENCES areas(id_areas)
) ENGINE=InnoDB;

-- Categorías de productos
CREATE TABLE categorias (
  id_categorias INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(50) NOT NULL,
  orden         INT         NOT NULL DEFAULT 0,
  activo        BOOLEAN     NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- Productos del menú
CREATE TABLE productos (
  id_productos INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100)  NOT NULL,
  precio       DECIMAL(10,2) NOT NULL,
  categoriaId  INT           NOT NULL,
  areaId       INT           NOT NULL,
  activo       BOOLEAN       NOT NULL DEFAULT TRUE,
  creadoEn     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoriaId) REFERENCES categorias(id_categorias),
  CONSTRAINT fk_productos_area      FOREIGN KEY (areaId)      REFERENCES areas(id_areas)
) ENGINE=InnoDB;

-- Mesas del restaurante
CREATE TABLE mesas (
  id_mesas INT AUTO_INCREMENT PRIMARY KEY,
  numero   INT NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Pedidos principales
CREATE TABLE pedidos (
  id_pedidos     INT AUTO_INCREMENT PRIMARY KEY,
  mesaId         INT NULL,
  usuarioId      INT NOT NULL,
  tipo           ENUM('MESA','LLEVAR','DELIVERY') NOT NULL DEFAULT 'MESA',
  estado         ENUM('ABIERTO','ENVIADO','PAGADO','ANULADO') NOT NULL DEFAULT 'ABIERTO',
  total          DECIMAL(10,2) NOT NULL DEFAULT 0,
  creadoEn       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizadoEn  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedidos_mesa    FOREIGN KEY (mesaId)    REFERENCES mesas(id_mesas),
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuarioId) REFERENCES usuarios(id_usuarios),
  INDEX idx_pedidos_creadoEn (creadoEn)
) ENGINE=InnoDB;

-- Detalle de pedidos (items)
CREATE TABLE detalle_pedido (
  id_detalle_pedido INT AUTO_INCREMENT PRIMARY KEY,
  pedidoId          INT NOT NULL,
  productoId        INT NOT NULL,
  areaId            INT NOT NULL,
  cantidad          INT NOT NULL,
  precioUnitario    DECIMAL(10,2) NOT NULL,
  nota              VARCHAR(255) NULL,
  anulado           BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_items_pedido   FOREIGN KEY (pedidoId)   REFERENCES pedidos(id_pedidos) ON DELETE CASCADE,
  CONSTRAINT fk_items_producto FOREIGN KEY (productoId) REFERENCES productos(id_productos),
  CONSTRAINT fk_items_area     FOREIGN KEY (areaId)     REFERENCES areas(id_areas)
) ENGINE=InnoDB;

-- Registro de impresiones
CREATE TABLE impresiones (
  id_impresiones INT AUTO_INCREMENT PRIMARY KEY,
  pedidoId       INT NOT NULL,
  impresoraId    INT NOT NULL,
  estado         ENUM('PENDIENTE','IMPRESA','ERROR') NOT NULL DEFAULT 'PENDIENTE',
  intentos       INT NOT NULL DEFAULT 0,
  error          VARCHAR(255) NULL,
  creadoEn       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizadoEn  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_impresiones_pedido    FOREIGN KEY (pedidoId)    REFERENCES pedidos(id_pedidos) ON DELETE CASCADE,
  CONSTRAINT fk_impresiones_impresora FOREIGN KEY (impresoraId) REFERENCES impresoras(id_impresoras),
  INDEX idx_impresiones_estado (estado)
) ENGINE=InnoDB;

-- ============================================================
-- FASE 2: CAJA Y DASHBOARD
-- ============================================================

-- Turnos de caja
CREATE TABLE turnos_caja (
  id_caja      INT AUTO_INCREMENT PRIMARY KEY,
  usuarioId    INT NOT NULL,
  montoInicial DECIMAL(10,2) NOT NULL,
  montoFinal   DECIMAL(10,2) NULL,
  apertura     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cierre       DATETIME NULL,
  CONSTRAINT fk_turnos_usuario FOREIGN KEY (usuarioId) REFERENCES usuarios(id_usuarios)
) ENGINE=InnoDB;

-- Pagos de pedidos
CREATE TABLE pagos (
  id_pago      INT AUTO_INCREMENT PRIMARY KEY,
  pedidoId     INT NOT NULL,
  turnoCajaId  INT NULL,
  metodo       ENUM('EFECTIVO','YAPE','PLIN') NOT NULL,
  monto        DECIMAL(10,2) NOT NULL,
  creadoEn     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pagos_pedido FOREIGN KEY (pedidoId)    REFERENCES pedidos(id_pedidos),
  CONSTRAINT fk_pagos_turno  FOREIGN KEY (turnoCajaId) REFERENCES turnos_caja(id_caja),
  INDEX idx_pagos_creadoEn (creadoEn)
) ENGINE=InnoDB;

-- Comprobantes (opcional para futuro)
CREATE TABLE comprobantes (
  id_comprobante INT AUTO_INCREMENT PRIMARY KEY,
  pedidoId       INT NOT NULL,
  clienteId      INT NULL,
  tipo           ENUM('BOLETA','FACTURA') NOT NULL,
  serie          VARCHAR(4) NOT NULL,
  numero         INT NOT NULL,
  total          DECIMAL(10,2) NOT NULL,
  creadoEn       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_comprobantes_serie_numero (serie, numero),
  CONSTRAINT fk_comprobantes_pedido FOREIGN KEY (pedidoId) REFERENCES pedidos(id_pedidos)
) ENGINE=InnoDB;

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Áreas de cocina
INSERT INTO areas (nombre) VALUES 
('PARRILLA'),
('BROASTER'),
('BAR'),
('POSTRES');

-- Categorías
INSERT INTO categorias (nombre, orden) VALUES 
('Pollos', 1),
('Complementos', 2),
('Bebidas', 3),
('Ensaladas', 4),
('Postres', 5);

-- Productos de ejemplo
INSERT INTO productos (nombre, precio, categoriaId, areaId) VALUES 
('Pollo a la Brasa 1/4', 18.00, 1, 1),
('Pollo a la Brasa 1/2', 32.00, 1, 1),
('Pollo a la Brasa Entero', 60.00, 1, 1),
('Papas Fritas', 8.00, 2, 2),
('Ensalada Mixta', 6.00, 4, 2),
('Inca Kola 1.5L', 7.00, 3, 3),
('Chicha Morada 1L', 5.00, 3, 3);

-- Mesas
INSERT INTO mesas (numero) VALUES 
(1), (2), (3), (4), (5), (6), (7), (8), (9), (10),
(11), (12), (13), (14), (15), (16), (17), (18), (19), (20);

-- Usuario administrador (password: admin123)
-- Nota: El hash debe ser generado con bcrypt en la aplicación
INSERT INTO usuarios (nombre, usuario, password, rol) VALUES 
('Administrador', 'admin', '$2b$10$YourHashedPasswordHere', 'ADMINISTRADOR');

-- Usuarios de ejemplo (password: 123456)
INSERT INTO usuarios (nombre, usuario, password, rol) VALUES 
('Juan Pérez', 'juan', '$2b$10$YourHashedPasswordHere', 'MOZO'),
('María López', 'maria', '$2b$10$YourHashedPasswordHere', 'MOZO'),
('Carlos Ruiz', 'carlos', '$2b$10$YourHashedPasswordHere', 'MOZO'),
('Pedro Sánchez', 'pedro', '$2b$10$YourHashedPasswordHere', 'CAJA'),
('Ana Torres', 'ana', '$2b$10$YourHashedPasswordHere', 'COCINERO');

-- ============================================================
-- NOTA IMPORTANTE
-- ============================================================
-- Los passwords en este script son de ejemplo.
-- Para crear usuarios reales, usar bcrypt desde la aplicación:
-- 
-- import bcrypt from 'bcrypt';
-- const hash = await bcrypt.hash('tu_password', 10);
-- 
-- ============================================================
