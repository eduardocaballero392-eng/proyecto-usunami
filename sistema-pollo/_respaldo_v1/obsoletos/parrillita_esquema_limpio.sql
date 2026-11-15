-- ============================================================
-- BASE DE DATOS: parrillita_db
-- ESQUEMA LIMPIO (con correcciones de FK y nombres)
-- ============================================================

CREATE DATABASE IF NOT EXISTS parrillita_db 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE parrillita_db;

-- ============================================================
-- TABLAS BASE
-- ============================================================

CREATE TABLE usuarios (
  id_usuarios  INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL,
  usuario      VARCHAR(50)  NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,  -- hash bcrypt
  rol          ENUM('ADMINISTRADOR','COCINERO','BROSTER','PARILLA','CAJA','MOZO') NOT NULL,
  activo       BOOLEAN      NOT NULL DEFAULT TRUE,
  creadoEn     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE areas (
  id_areas  INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE impresoras (
  id_impresoras  INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(50)  NOT NULL,
  ip             VARCHAR(45)  NOT NULL,
  puerto         INT          NOT NULL DEFAULT 9100,
  areaId         INT          NOT NULL,
  activa         BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_impresoras_area FOREIGN KEY (areaId) REFERENCES areas(id_areas)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categorias (
  id_categorias  INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(50) NOT NULL,
  orden          INT         NOT NULL DEFAULT 0,
  activo         BOOLEAN     NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE productos (
  id_productos   INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(100)  NOT NULL,
  precio         DECIMAL(10,2) NOT NULL,
  categoriaId    INT           NOT NULL,
  areaId         INT           NOT NULL,
  activo         BOOLEAN       NOT NULL DEFAULT TRUE,
  creadoEn       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoriaId) REFERENCES categorias(id_categorias),
  CONSTRAINT fk_productos_area      FOREIGN KEY (areaId)      REFERENCES areas(id_areas)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE opciones_producto (
  id_opcion      INT AUTO_INCREMENT PRIMARY KEY,
  productoId     INT           NOT NULL,
  nombre         VARCHAR(100)  NOT NULL,
  precioExtra    DECIMAL(10,2) NOT NULL DEFAULT 0,
  activa         BOOLEAN       NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_opciones_producto FOREIGN KEY (productoId) REFERENCES productos(id_productos) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mesas (
  id_mesas  INT AUTO_INCREMENT PRIMARY KEY,
  numero    INT NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pedidos (
  id_pedidos     INT AUTO_INCREMENT PRIMARY KEY,
  mesaId         INT NULL,  -- NULL si es para llevar o delivery
  usuarioId      INT NOT NULL,  -- el MOZO que tomó el pedido
  tipo           ENUM('MESA','LLEVAR','DELIVERY') NOT NULL DEFAULT 'MESA',
  estado         ENUM('ABIERTO','ENVIADO','PAGADO','ANULADO') NOT NULL DEFAULT 'ABIERTO',
  total          DECIMAL(10,2) NOT NULL DEFAULT 0,
  creadoEn       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizadoEn  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedidos_mesa    FOREIGN KEY (mesaId)    REFERENCES mesas(id_mesas),
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuarioId) REFERENCES usuarios(id_usuarios),
  INDEX idx_pedidos_creadoEn (creadoEn),
  INDEX idx_pedidos_usuario (usuarioId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE detalle_pedido (
  id_detalle_pedido  INT AUTO_INCREMENT PRIMARY KEY,
  pedidoId           INT NOT NULL,
  productoId         INT NOT NULL,
  areaId             INT NOT NULL,
  cantidad           INT NOT NULL,
  precioUnitario     DECIMAL(10,2) NOT NULL,
  nota               VARCHAR(255) NULL,
  anulado            BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_items_pedido   FOREIGN KEY (pedidoId)   REFERENCES pedidos(id_pedidos) ON DELETE CASCADE,
  CONSTRAINT fk_items_producto FOREIGN KEY (productoId) REFERENCES productos(id_productos),
  CONSTRAINT fk_items_area     FOREIGN KEY (areaId)     REFERENCES areas(id_areas)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE impresiones (
  id_impresiones  INT AUTO_INCREMENT PRIMARY KEY,
  pedidoId        INT NOT NULL,
  impresoraId     INT NOT NULL,
  estado          ENUM('PENDIENTE','IMPRESA','ERROR') NOT NULL DEFAULT 'PENDIENTE',
  intentos        INT NOT NULL DEFAULT 0,
  error           VARCHAR(255) NULL,
  creadoEn        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizadoEn   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_impresiones_pedido    FOREIGN KEY (pedidoId)    REFERENCES pedidos(id_pedidos) ON DELETE CASCADE,
  CONSTRAINT fk_impresiones_impresora FOREIGN KEY (impresoraId) REFERENCES impresoras(id_impresoras),
  INDEX idx_impresiones_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FASE 2: CAJA Y COMPROBANTES
-- ============================================================

CREATE TABLE turnos_caja (
  id_caja       INT AUTO_INCREMENT PRIMARY KEY,
  usuarioId     INT NOT NULL,
  montoInicial  DECIMAL(10,2) NOT NULL,
  montoFinal    DECIMAL(10,2) NULL,
  apertura      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cierre        DATETIME NULL,
  CONSTRAINT fk_turnos_usuario FOREIGN KEY (usuarioId) REFERENCES usuarios(id_usuarios)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE comprobantes (
  id_comprobante  INT AUTO_INCREMENT PRIMARY KEY,
  pedidoId        INT NOT NULL,
  clienteId       INT NULL,  -- Futuro: tabla clientes
  tipo            ENUM('BOLETA','FACTURA') NOT NULL,
  serie           VARCHAR(4) NOT NULL,
  numero          INT NOT NULL,
  total           DECIMAL(10,2) NOT NULL,
  creadoEn        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_comprobantes_serie_numero (serie, numero),
  CONSTRAINT fk_comprobantes_pedido FOREIGN KEY (pedidoId) REFERENCES pedidos(id_pedidos)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DATOS INICIALES DE ÁREAS
-- ============================================================

INSERT INTO areas (nombre) VALUES
('Parrilla'),
('Broster'),
('Carta'),
('Caja');

-- ============================================================
-- USUARIO ADMINISTRADOR INICIAL
-- Password: admin123 (cambiar en producción)
-- Hash bcrypt: $2b$10$rZ9yD7XqxH7pVqK5nQ0u8eDqQxJ5K2jXH8Pz5vW7wK3tN6R4Y8Q9e
-- ============================================================

INSERT INTO usuarios (nombre, usuario, password, rol) VALUES
('Administrador', 'admin', '$2b$10$rZ9yD7XqxH7pVqK5nQ0u8eDqQxJ5K2jXH8Pz5vW7wK3tN6R4Y8Q9e', 'ADMINISTRADOR');
