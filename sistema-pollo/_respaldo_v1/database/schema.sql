-- ============================================================================
-- ANTICUCHERÍA LA PARRILLITA — ESQUEMA DE PRODUCCIÓN (v2)
-- Motor: MariaDB 10.4+ (XAMPP) / MySQL 8.0+ · InnoDB · utf8mb4
--
-- Convenciones
--   · Tablas en plural, snake_case.        Ej: detalle_pedidos
--   · PK:  id_<tabla>                      Ej: id_pedidos
--   · FK:  <entidad>Id (camelCase)         Ej: pedidoId, usuarioId
--   · Dinero: DECIMAL(10,2). Nunca FLOAT.
--   · Fechas: DATETIME en hora de Lima (la app fija time_zone = '-05:00').
--
-- Decisión clave: los MOZOS son USUARIOS (rol = 'MOZO'). No existe tabla mozos.
--   · Personal con login (ADMIN, CAJERO, cocina): usuario + password (bcrypt).
--   · Mozos: sin password; PIN opcional de 4 dígitos (guardado como hash bcrypt).
--
-- ¡ATENCIÓN! Este script BORRA y recrea la base de datos indicada abajo.
-- Úsalo sólo para una instalación nueva. Haz backup antes.
-- ============================================================================

DROP DATABASE IF EXISTS parrillita;
CREATE DATABASE parrillita CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parrillita;

SET time_zone = '-05:00';

-- ----------------------------------------------------------------------------
-- 1. SEGURIDAD
-- ----------------------------------------------------------------------------
CREATE TABLE usuarios (
  id_usuarios    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  usuario        VARCHAR(50)  NULL,                -- login; NULL para mozos sin cuenta
  password       VARCHAR(255) NULL,                -- hash bcrypt; NULL para mozos
  pinHash        VARCHAR(255) NULL,                -- hash bcrypt del PIN (sólo mozos)
  rol            ENUM('ADMIN','CAJERO','COCINERO','PARRILLA','BROASTER','MOZO') NOT NULL,
  activo         TINYINT(1)   NOT NULL DEFAULT 1,
  creadoEn       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizadoEn  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_usuario (usuario),
  KEY idx_usuarios_rol_activo (rol, activo),
  -- El personal que no es mozo debe poder iniciar sesión
  CONSTRAINT chk_usuarios_login CHECK (rol = 'MOZO' OR (usuario IS NOT NULL AND password IS NOT NULL))
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. CONFIGURACIÓN DEL LOCAL
-- ----------------------------------------------------------------------------
CREATE TABLE areas (
  id_areas  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(50) NOT NULL,
  activo    TINYINT(1)  NOT NULL DEFAULT 1,
  UNIQUE KEY uq_areas_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE impresoras (
  id_impresoras INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(50)  NOT NULL,
  ip            VARCHAR(45)  NOT NULL,
  puerto        SMALLINT UNSIGNED NOT NULL DEFAULT 9100,
  areaId        INT UNSIGNED NOT NULL,
  activa        TINYINT(1)   NOT NULL DEFAULT 1,
  UNIQUE KEY uq_impresoras_ip_puerto (ip, puerto),
  KEY idx_impresoras_area (areaId, activa),
  CONSTRAINT fk_impresoras_area FOREIGN KEY (areaId) REFERENCES areas(id_areas)
) ENGINE=InnoDB;

CREATE TABLE mesas (
  id_mesas  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero    SMALLINT UNSIGNED NOT NULL,
  activo    TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_mesas_numero (numero)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. CARTA
-- ----------------------------------------------------------------------------
CREATE TABLE categorias (
  id_categorias INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(50) NOT NULL,
  orden         SMALLINT    NOT NULL DEFAULT 0,
  activo        TINYINT(1)  NOT NULL DEFAULT 1,
  UNIQUE KEY uq_categorias_nombre (nombre),
  KEY idx_categorias_orden (activo, orden)
) ENGINE=InnoDB;

CREATE TABLE productos (
  id_productos   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(100)  NOT NULL,
  descripcion    VARCHAR(255)  NULL,
  precio         DECIMAL(10,2) NOT NULL,
  recargoLlevar  DECIMAL(10,2) NOT NULL DEFAULT 0.00,   -- taper / botella
  foto           VARCHAR(255)  NULL,                    -- URL o ruta relativa
  categoriaId    INT UNSIGNED  NOT NULL,
  areaId         INT UNSIGNED  NOT NULL,                -- área que lo prepara
  activo         TINYINT(1)    NOT NULL DEFAULT 1,
  creadoEn       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizadoEn  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_productos_categoria_nombre (categoriaId, nombre),
  KEY idx_productos_area (areaId),
  KEY idx_productos_activo (activo, categoriaId),
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoriaId) REFERENCES categorias(id_categorias),
  CONSTRAINT fk_productos_area      FOREIGN KEY (areaId)      REFERENCES areas(id_areas),
  CONSTRAINT chk_productos_precio   CHECK (precio >= 0 AND recargoLlevar >= 0)
) ENGINE=InnoDB;

CREATE TABLE opciones_producto (
  id_opciones_producto INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  productoId   INT UNSIGNED  NOT NULL,
  nombre       VARCHAR(100)  NOT NULL,                  -- ej. "Con papas fritas"
  precioExtra  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  activa       TINYINT(1)    NOT NULL DEFAULT 1,
  KEY idx_opciones_producto (productoId, activa),
  CONSTRAINT fk_opciones_producto FOREIGN KEY (productoId) REFERENCES productos(id_productos) ON DELETE CASCADE,
  CONSTRAINT chk_opciones_precio  CHECK (precioExtra >= 0)
) ENGINE=InnoDB;

-- Auditoría de cambios de precio (RNF-005)
CREATE TABLE productos_historial_precios (
  id_productos_historial_precios INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  productoId      INT UNSIGNED  NOT NULL,
  precioAnterior  DECIMAL(10,2) NOT NULL,
  precioNuevo     DECIMAL(10,2) NOT NULL,
  usuarioId       INT UNSIGNED  NOT NULL,
  creadoEn        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_historial_producto (productoId, creadoEn),
  CONSTRAINT fk_historial_producto FOREIGN KEY (productoId) REFERENCES productos(id_productos),
  CONSTRAINT fk_historial_usuario  FOREIGN KEY (usuarioId)  REFERENCES usuarios(id_usuarios)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. PEDIDOS
-- Estados: ABIERTO (en consumo, comandas enviadas) → PAGADO | ANULADO
-- ----------------------------------------------------------------------------
CREATE TABLE pedidos (
  id_pedidos       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuarioId        INT UNSIGNED  NOT NULL,              -- mozo responsable (usuarios.rol='MOZO')
  tipo             ENUM('MESA','LLEVAR','DELIVERY') NOT NULL,
  estado           ENUM('ABIERTO','PAGADO','ANULADO') NOT NULL DEFAULT 'ABIERTO',
  total            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  observacion      VARCHAR(255)  NULL,                  -- ej. dirección de delivery
  creadoEn         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizadoEn    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  pagadoEn         DATETIME      NULL,                  -- fecha contable de la venta
  anuladoPor       INT UNSIGNED  NULL,
  anuladoEn        DATETIME      NULL,
  motivoAnulacion  VARCHAR(255)  NULL,
  KEY idx_pedidos_estado_creado (estado, creadoEn),
  KEY idx_pedidos_estado_pagado (estado, pagadoEn),     -- reportes de ventas
  KEY idx_pedidos_mozo_estado (usuarioId, estado),
  CONSTRAINT fk_pedidos_usuario    FOREIGN KEY (usuarioId)  REFERENCES usuarios(id_usuarios),
  CONSTRAINT fk_pedidos_anuladoPor FOREIGN KEY (anuladoPor) REFERENCES usuarios(id_usuarios),
  CONSTRAINT chk_pedidos_total     CHECK (total >= 0)
) ENGINE=InnoDB;

-- Un pedido puede ocupar varias mesas ("Mesa 4 y 5")
CREATE TABLE pedido_mesas (
  pedidoId INT UNSIGNED NOT NULL,
  mesaId   INT UNSIGNED NOT NULL,
  PRIMARY KEY (pedidoId, mesaId),
  KEY idx_pedido_mesas_mesa (mesaId),
  CONSTRAINT fk_pedido_mesas_pedido FOREIGN KEY (pedidoId) REFERENCES pedidos(id_pedidos) ON DELETE CASCADE,
  CONSTRAINT fk_pedido_mesas_mesa   FOREIGN KEY (mesaId)   REFERENCES mesas(id_mesas)
) ENGINE=InnoDB;

CREATE TABLE detalle_pedidos (
  id_detalle_pedidos INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedidoId         INT UNSIGNED  NOT NULL,
  productoId       INT UNSIGNED  NOT NULL,
  areaId           INT UNSIGNED  NOT NULL,              -- copia de productos.areaId al vender
  cantidad         SMALLINT UNSIGNED NOT NULL,
  precioUnitario   DECIMAL(10,2) NOT NULL,              -- precio base + opciones, congelado
  recargoUnitario  DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- recargo "para llevar", congelado
  ronda            SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  nota             VARCHAR(255)  NULL,
  anulado          TINYINT(1)    NOT NULL DEFAULT 0,
  anuladoPor       INT UNSIGNED  NULL,
  anuladoEn        DATETIME      NULL,
  motivoAnulacion  VARCHAR(255)  NULL,
  creadoEn         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_detalle_pedido (pedidoId, ronda),
  KEY idx_detalle_producto (productoId),
  KEY idx_detalle_area (areaId),
  CONSTRAINT fk_detalle_pedido     FOREIGN KEY (pedidoId)   REFERENCES pedidos(id_pedidos) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto   FOREIGN KEY (productoId) REFERENCES productos(id_productos),
  CONSTRAINT fk_detalle_area       FOREIGN KEY (areaId)     REFERENCES areas(id_areas),
  CONSTRAINT fk_detalle_anuladoPor FOREIGN KEY (anuladoPor) REFERENCES usuarios(id_usuarios),
  CONSTRAINT chk_detalle_valores   CHECK (cantidad > 0 AND precioUnitario >= 0 AND recargoUnitario >= 0)
) ENGINE=InnoDB;

-- Opciones elegidas por ítem (copia congelada para imprimir y auditar)
CREATE TABLE detalle_pedido_opciones (
  id_detalle_pedido_opciones INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  detallePedidoId INT UNSIGNED  NOT NULL,
  opcionId        INT UNSIGNED  NULL,
  nombre          VARCHAR(100)  NOT NULL,
  precioExtra     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  KEY idx_dpo_detalle (detallePedidoId),
  CONSTRAINT fk_dpo_detalle FOREIGN KEY (detallePedidoId) REFERENCES detalle_pedidos(id_detalle_pedidos) ON DELETE CASCADE,
  CONSTRAINT fk_dpo_opcion  FOREIGN KEY (opcionId) REFERENCES opciones_producto(id_opciones_producto) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. IMPRESIÓN (cola persistente: un pedido nunca se pierde si falla la impresora)
-- ----------------------------------------------------------------------------
CREATE TABLE impresiones (
  id_impresiones INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedidoId       INT UNSIGNED NULL,                     -- NULL para cierre de caja / prueba
  areaId         INT UNSIGNED NOT NULL,
  impresoraId    INT UNSIGNED NULL,                     -- impresora usada en el último intento
  tipo           ENUM('COMANDA','ANULACION','BOLETA','CIERRE_CAJA','PRUEBA') NOT NULL,
  ronda          SMALLINT UNSIGNED NULL,
  contenido      MEDIUMTEXT NOT NULL,                   -- documento JSON listo para imprimir
  estado         ENUM('PENDIENTE','IMPRESA','ERROR') NOT NULL DEFAULT 'PENDIENTE',
  intentos       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  error          VARCHAR(255) NULL,
  creadoEn       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizadoEn  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_impresiones_estado (estado, actualizadoEn),
  KEY idx_impresiones_pedido (pedidoId),
  CONSTRAINT fk_impresiones_pedido    FOREIGN KEY (pedidoId)    REFERENCES pedidos(id_pedidos) ON DELETE CASCADE,
  CONSTRAINT fk_impresiones_area      FOREIGN KEY (areaId)      REFERENCES areas(id_areas),
  CONSTRAINT fk_impresiones_impresora FOREIGN KEY (impresoraId) REFERENCES impresoras(id_impresoras) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. CAJA
-- ----------------------------------------------------------------------------
CREATE TABLE turnos_caja (
  id_turnos_caja INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuarioId      INT UNSIGNED  NOT NULL,
  montoInicial   DECIMAL(10,2) NOT NULL,
  montoEsperado  DECIMAL(10,2) NULL,                    -- calculado al cerrar
  montoFinal     DECIMAL(10,2) NULL,                    -- contado por el cajero
  diferencia     DECIMAL(10,2) NULL,                    -- montoFinal - montoEsperado
  apertura       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cierre         DATETIME      NULL,
  -- 1 mientras está abierto, NULL al cerrar → UNIQUE garantiza un solo turno abierto por cajero
  abierto        TINYINT AS (IF(cierre IS NULL, 1, NULL)) PERSISTENT,
  UNIQUE KEY uq_turno_abierto_por_usuario (usuarioId, abierto),
  KEY idx_turnos_apertura (apertura),
  CONSTRAINT fk_turnos_usuario FOREIGN KEY (usuarioId) REFERENCES usuarios(id_usuarios),
  CONSTRAINT chk_turnos_montos CHECK (montoInicial >= 0 AND (montoFinal IS NULL OR montoFinal >= 0))
) ENGINE=InnoDB;

CREATE TABLE pagos (
  id_pagos      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedidoId      INT UNSIGNED  NOT NULL,
  turnoCajaId   INT UNSIGNED  NOT NULL,
  metodo        ENUM('EFECTIVO','YAPE','PLIN') NOT NULL,
  monto         DECIMAL(10,2) NOT NULL,                 -- monto aplicado al pedido
  montoRecibido DECIMAL(10,2) NULL,                     -- sólo efectivo
  vuelto        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  creadoEn      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pagos_pedido (pedidoId),
  KEY idx_pagos_turno_metodo (turnoCajaId, metodo),
  KEY idx_pagos_creado (creadoEn),
  CONSTRAINT fk_pagos_pedido FOREIGN KEY (pedidoId)    REFERENCES pedidos(id_pedidos),
  CONSTRAINT fk_pagos_turno  FOREIGN KEY (turnoCajaId) REFERENCES turnos_caja(id_turnos_caja),
  CONSTRAINT chk_pagos_monto CHECK (monto > 0 AND vuelto >= 0)
) ENGINE=InnoDB;

CREATE TABLE series (
  serie            VARCHAR(4)   NOT NULL PRIMARY KEY,   -- ej. B001
  tipo             ENUM('BOLETA','FACTURA') NOT NULL DEFAULT 'BOLETA',
  siguienteNumero  INT UNSIGNED NOT NULL DEFAULT 1,
  activa           TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE comprobantes (
  id_comprobantes INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedidoId        INT UNSIGNED  NOT NULL,
  serie           VARCHAR(4)    NOT NULL,
  numero          INT UNSIGNED  NOT NULL,
  total           DECIMAL(10,2) NOT NULL,
  creadoEn        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_comprobantes_serie_numero (serie, numero),
  UNIQUE KEY uq_comprobantes_pedido (pedidoId),
  CONSTRAINT fk_comprobantes_pedido FOREIGN KEY (pedidoId) REFERENCES pedidos(id_pedidos),
  CONSTRAINT fk_comprobantes_serie  FOREIGN KEY (serie)    REFERENCES series(serie)
) ENGINE=InnoDB;
