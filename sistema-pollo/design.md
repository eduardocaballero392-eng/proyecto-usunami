# DESIGN - Sistema de Gestión Anticuchería La Parrillita

## 1. ARQUITECTURA DEL SISTEMA

### 1.1 Vista General

```
┌─────────────────────────────────────────────────────────────┐
│                    RED LOCAL RESTAURANTE                     │
│                  (WiFi, sin conexión internet)               │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
    ┌────▼─────┐         ┌────▼─────┐        ┌────▼─────┐
    │ Celular  │         │ Celular  │        │ Celular  │
    │  Mozo 1  │         │  Mozo 2  │        │  Mozo N  │
    │ (Chrome) │         │ (Safari) │        │ (Browser)│
    └──────────┘         └──────────┘        └──────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                    HTTP + WebSocket
                              │
                              ▼
        ┌─────────────────────────────────────────────┐
        │      LAPTOP WINDOWS (IP fija)               │
        │                                             │
        │  ┌───────────────────────────────────────┐ │
        │  │  Node.js + Express + TypeScript       │ │
        │  │  Puerto 3000                          │ │
        │  │                                       │ │
        │  │  ┌─────────────┐  ┌────────────────┐ │ │
        │  │  │   API REST  │  │   Socket.IO    │ │ │
        │  │  │   (HTTP)    │  │  (Tiempo Real) │ │ │
        │  │  └─────────────┘  └────────────────┘ │ │
        │  │                                       │ │
        │  │  ┌─────────────────────────────────┐ │ │
        │  │  │   Servicios de Negocio          │ │ │
        │  │  │  • PedidosService               │ │ │
        │  │  │  • ImpresionService             │ │ │
        │  │  │  • CajaService                  │ │ │
        │  │  │  • ReportesService              │ │ │
        │  │  └─────────────────────────────────┘ │ │
        │  │                                       │ │
        │  │  ┌─────────────────────────────────┐ │ │
        │  │  │   node-thermal-printer          │ │ │
        │  │  │   (ESC/POS TCP)                 │ │ │
        │  │  └─────────────────────────────────┘ │ │
        │  └───────────────────────────────────────┘ │
        │                                             │
        │  ┌───────────────────────────────────────┐ │
        │  │   XAMPP                               │ │
        │  │   MySQL/MariaDB 10.x                  │ │
        │  │   Puerto 3306                         │ │
        │  │   InnoDB, utf8mb4                     │ │
        │  └───────────────────────────────────────┘ │
        └─────────────────────────────────────────────┘
                    │         │         │         │
         ┌──────────┘         │         │         └──────────┐
         │                    │         │                    │
    ┌────▼─────┐         ┌────▼────┐  ┌▼────┐         ┌────▼─────┐
    │ Impresora│         │Impresora│  │Impr.│         │ Impresora│
    │ Parrilla │         │ Broaster│  │Carta│         │   Caja   │
    │ (IP:9100)│         │(IP:9100)│  │9100 │         │ (IP:9100)│
    └──────────┘         └─────────┘  └─────┘         └──────────┘
```

### 1.2 Stack Tecnológico

#### Backend
- **Runtime**: Node.js 18+ LTS
- **Lenguaje**: TypeScript 5.x (strict mode)
- **Framework**: Express 4.x
- **Base de Datos**: MySQL 8.0 / MariaDB 10.x
- **Cliente DB**: mysql2 (promesas, sin ORM)
- **Autenticación**: JWT (jsonwebtoken) + bcrypt
- **Tiempo Real**: Socket.IO 4.x
- **Impresión**: node-thermal-printer
- **Validación**: express-validator
- **Variables de entorno**: dotenv
- **Logs**: winston

#### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite 5.x
- **Lenguaje**: TypeScript 5.x
- **Estilos**: Tailwind CSS 3.x
- **Enrutamiento**: React Router 6.x
- **Estado**: Context API + hooks
- **HTTP**: axios
- **Tiempo Real**: socket.io-client
- **PWA**: vite-plugin-pwa
- **Iconos**: lucide-react

#### Infraestructura
- **SO**: Windows 10/11
- **Servidor Local**: XAMPP (Apache + MySQL)
- **Backup**: mysqldump + scripts PowerShell
- **Red**: WiFi local (192.168.x.x)

### 1.3 Estructura de Directorios

```
sistema-pollo/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts          # Conexión MySQL
│   │   │   ├── jwt.ts               # Configuración JWT
│   │   │   └── printer.ts           # Config impresoras
│   │   ├── routes/
│   │   │   ├── auth.routes.ts       # Login/logout
│   │   │   ├── mozos.routes.ts      # Selección mozo
│   │   │   ├── productos.routes.ts  # Menú
│   │   │   ├── pedidos.routes.ts    # Pedidos
│   │   │   ├── caja.routes.ts       # Cobro, turnos
│   │   │   ├── reportes.routes.ts   # Dashboard
│   │   │   └── admin.routes.ts      # CRUD
│   │   ├── services/
│   │   │   ├── pedidos.service.ts   # Lógica pedidos
│   │   │   ├── impresion.service.ts # Impresión
│   │   │   ├── caja.service.ts      # Cobro, turnos
│   │   │   └── reportes.service.ts  # Estadísticas
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts   # Verificar JWT
│   │   │   ├── roles.middleware.ts  # Verificar rol
│   │   │   └── validator.middleware.ts # Validaciones
│   │   ├── types/
│   │   │   ├── pedido.types.ts
│   │   │   ├── usuario.types.ts
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── logger.ts            # Winston
│   │   │   ├── errors.ts            # Manejo errores
│   │   │   └── helpers.ts
│   │   ├── sockets/
│   │   │   └── index.ts             # Socket.IO handlers
│   │   ├── app.ts                   # Express app
│   │   └── server.ts                # Entry point
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── pedidos.test.ts
│   │   │   ├── impresion.test.ts
│   │   │   └── caja.test.ts
│   │   └── integration/
│   │       └── pedido-flow.test.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── mozo/
│   │   │   │   ├── MenuCategories.tsx
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── CartItem.tsx
│   │   │   │   └── MesaSelector.tsx
│   │   │   ├── caja/
│   │   │   │   ├── PedidosList.tsx
│   │   │   │   ├── PaymentForm.tsx
│   │   │   │   └── TurnoControls.tsx
│   │   │   ├── admin/
│   │   │   │   ├── ProductForm.tsx
│   │   │   │   └── Dashboard.tsx
│   │   │   └── common/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       └── Modal.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── MozoSelect.tsx
│   │   │   ├── MozoMenu.tsx
│   │   │   ├── Caja.tsx
│   │   │   └── Admin.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   ├── PedidoContext.tsx
│   │   │   └── SocketContext.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── usePedido.ts
│   │   │   └── useSocket.ts
│   │   ├── api/
│   │   │   ├── axios.config.ts
│   │   │   ├── auth.api.ts
│   │   │   ├── pedidos.api.ts
│   │   │   └── productos.api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── format.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   ├── manifest.json
│   │   └── icons/
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── database/
│   ├── parrillita_esquema_limpio.sql     # Esquema existente
│   ├── parrillita_datos_iniciales.sql    # Datos carta
│   └── migrations/
│       ├── 001_mozos.sql
│       ├── 002_recargo_llevar.sql
│       ├── 003_pedido_mesas.sql
│       ├── 004_auditoria_anulacion.sql
│       ├── 005_rondas.sql
│       ├── 006_series_comprobantes.sql
│       └── 007_descripcion_producto.sql
├── scripts/
│   ├── backup.ps1                        # Backup diario
│   ├── restore.ps1                       # Restaurar backup
│   └── startup.ps1                       # Arranque automático
├── docs/
│   ├── requirements.md
│   ├── design.md
│   ├── tasks.md
│   └── manual_usuario.md
├── .gitignore
├── README.md
└── package.json (workspace root)
```

## 2. MODELO DE DATOS

### 2.1 Diagrama Entidad-Relación

```
┌─────────────┐         ┌──────────────┐
│   mozos     │         │   usuarios   │
├─────────────┤         ├──────────────┤
│ id_mozo PK  │         │ id_usuario PK│
│ nombre      │         │ nombre       │
│ pin         │         │ usuario      │
│ activo      │         │ password     │
└─────────────┘         │ rol          │
      │                 └──────────────┘
      │                       │
      │                       │
      │  ┌────────────────────┘
      │  │
      │  │    ┌──────────────────┐
      │  │    │    pedidos       │
      │  └───►├──────────────────┤
      │       │ id_pedidos PK    │
      └──────►│ mozoId FK        │◄────────┐
              │ usuarioId FK     │         │
              │ tipo ENUM        │         │
              │ estado ENUM      │         │
              │ total DECIMAL    │         │
              │ creadoEn         │         │
              │ actualizadoEn    │         │
              └──────────────────┘         │
                │      │                   │
                │      │                   │
    ┌───────────┘      └───────────┐       │
    │                              │       │
    ▼                              ▼       │
┌────────────────┐        ┌─────────────────┐
│ pedido_mesas   │        │ detalle_pedidos │
├────────────────┤        ├─────────────────┤
│ pedidoId FK PK │        │ id_detalle PK   │
│ mesaId FK PK   │        │ pedidoId FK     │
└────────────────┘        │ productoId FK   │
    │                     │ areaId FK       │
    │                     │ cantidad        │
    ▼                     │ precioUnitario  │
┌──────────┐              │ recargoUnitario │
│  mesas   │              │ ronda           │
├──────────┤              │ nota            │
│ id_mesa  │              │ anulado         │
│ numero   │              │ anuladoPor FK   │
└──────────┘              │ anuladoEn       │
                          │ motivoAnulacion │
                          └─────────────────┘
                                 │
                                 │
                                 ▼
                          ┌──────────────┐
                          │  productos   │
                          ├──────────────┤
                          │ id_producto  │
                          │ nombre       │
                          │ descripcion  │
                          │ precio       │
                          │ recargoLlevar│
                          │ categoriaId  │◄──┐
                          │ areaId       │◄──┼──┐
                          │ creadoEn     │   │  │
                          └──────────────┘   │  │
                                 │           │  │
                                 │           │  │
                                 ▼           │  │
                       ┌─────────────────┐   │  │
                       │opciones_producto│   │  │
                       ├─────────────────┤   │  │
                       │ id PK           │   │  │
                       │ productoId FK   │   │  │
                       │ nombre          │   │  │
                       │ precioExtra     │   │  │
                       │ activa          │   │  │
                       └─────────────────┘   │  │
                                             │  │
┌──────────────┐                             │  │
│  categorias  │                             │  │
├──────────────┤                             │  │
│ id_categoria │─────────────────────────────┘  │
│ nombre       │                                │
│ orden        │                                │
└──────────────┘                                │
                                                │
┌─────────┐                                     │
│  areas  │                                     │
├─────────┤                                     │
│ id_area │─────────────────────────────────────┘
│ nombre  │◄────────────────────┐
└─────────┘                     │
     │                          │
     │                          │
     ▼                          │
┌──────────────┐                │
│ impresoras   │                │
├──────────────┤                │
│ id_impresora │                │
│ nombre       │                │
│ ip           │                │
│ puerto       │                │
│ areaId FK    │                │
│ activa       │                │
└──────────────┘                │
     │                          │
     │                          │
     ▼                          │
┌──────────────┐                │
│ impresiones  │                │
├──────────────┤                │
│ id_impresion │                │
│ pedidoId FK  │                │
│ impresoraId  │                │
│ areaId FK    │────────────────┘
│ ronda        │
│ estado ENUM  │
│ intentos     │
│ error        │
│ creadoEn     │
└──────────────┘

┌──────────────┐         ┌──────────┐
│ turnos_caja  │         │  pagos   │
├──────────────┤         ├──────────┤
│ id_turnocaja │◄────────│ id_pagos │
│ usuarioId FK │         │ pedidoId │
│ montoInicial │         │ turnoCaja│
│ montoFinal   │         │ metodo   │
│ apertura     │         │ monto    │
│ cierre       │         │ creadoEn │
└──────────────┘         └──────────┘

┌───────────────┐
│  comprobantes │
├───────────────┤
│ id_comprobante│
│ pedidoId FK   │
│ serie         │
│ numero        │
│ total         │
│ creadoEn      │
│ UNIQUE(serie, │
│        numero)│
└───────────────┘

┌──────────────┐
│   series     │
├──────────────┤
│ serie PK     │
│siguienteNum  │
│ activa       │
└──────────────┘
```

### 2.2 Cambios al Esquema Existente (Migraciones)

Las siguientes modificaciones se implementarán como migraciones SQL numeradas:

#### Migration 001: Tabla Mozos
```sql
CREATE TABLE mozos (
    id_mozo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    pin VARCHAR(4) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_mozos_activo ON mozos(activo);
```

#### Migration 002: Recargo Para Llevar
```sql
-- Agregar campo a productos
ALTER TABLE productos
ADD COLUMN recargoLlevar DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER precio;

-- Actualizar productos existentes (ejemplo)
UPDATE productos SET recargoLlevar = 1.00 WHERE categoriaId IN (SELECT id_categoria FROM categorias WHERE nombre LIKE '%Plato%');
UPDATE productos SET recargoLlevar = 0.50 WHERE categoriaId IN (SELECT id_categoria FROM categorias WHERE nombre LIKE '%Bebida%');

-- Agregar campo a detalle_pedidos
ALTER TABLE detalle_pedidos
ADD COLUMN recargoUnitario DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER precioUnitario;
```

#### Migration 003: Pedido con Múltiples Mesas
```sql
-- Crear tabla de relación many-to-many
CREATE TABLE pedido_mesas (
    pedidoId INT NOT NULL,
    mesaId INT NOT NULL,
    PRIMARY KEY (pedidoId, mesaId),
    FOREIGN KEY (pedidoId) REFERENCES pedidos(id_pedidos) ON DELETE CASCADE,
    FOREIGN KEY (mesaId) REFERENCES mesas(id_mesa) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrar datos existentes de pedidos.mesaId a pedido_mesas
INSERT INTO pedido_mesas (pedidoId, mesaId)
SELECT id_pedidos, mesaId FROM pedidos WHERE mesaId IS NOT NULL;

-- Eliminar columna mesaId de pedidos
ALTER TABLE pedidos DROP FOREIGN KEY pedidos_ibfk_1; -- Ajustar nombre de constraint
ALTER TABLE pedidos DROP COLUMN mesaId;
```

#### Migration 004: Auditoría de Anulación
```sql
ALTER TABLE detalle_pedidos
ADD COLUMN anuladoPor INT NULL AFTER anulado,
ADD COLUMN anuladoEn DATETIME NULL,
ADD COLUMN motivoAnulacion VARCHAR(150) NULL,
ADD FOREIGN KEY (anuladoPor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL;

CREATE INDEX idx_detalle_anulado ON detalle_pedidos(anulado);
```

#### Migration 005: Rondas de Impresión
```sql
ALTER TABLE detalle_pedidos
ADD COLUMN ronda INT NOT NULL DEFAULT 1 AFTER recargoUnitario;

ALTER TABLE impresiones
ADD COLUMN ronda INT NOT NULL DEFAULT 1 AFTER areaId;

CREATE INDEX idx_impresiones_ronda ON impresiones(pedidoId, ronda);
```

#### Migration 006: Series de Comprobantes
```sql
CREATE TABLE series (
    serie VARCHAR(4) PRIMARY KEY,
    siguienteNumero INT NOT NULL DEFAULT 1,
    activa BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar serie inicial
INSERT INTO series (serie, siguienteNumero, activa) VALUES ('B001', 1, TRUE);
```

#### Migration 007: Descripción de Producto
```sql
ALTER TABLE productos
ADD COLUMN descripcion TEXT NULL AFTER nombre;

-- Actualizar productos existentes con descripción (ejemplo)
-- Este paso se hará manualmente desde el admin
```

#### Migration 008: Relación Mozo en Pedidos
```sql
ALTER TABLE pedidos
ADD COLUMN mozoId INT NULL AFTER usuarioId,
ADD FOREIGN KEY (mozoId) REFERENCES mozos(id_mozo) ON DELETE SET NULL;

CREATE INDEX idx_pedidos_mozo ON pedidos(mozoId);
```

#### Migration 009: Campos de Impresión
```sql
ALTER TABLE impresiones
ADD COLUMN intentos INT NOT NULL DEFAULT 0 AFTER estado,
ADD COLUMN error TEXT NULL;
```

## 3. API REST

### 3.1 Autenticación

#### POST /api/auth/login
**Descripción**: Login de usuario autenticado (personal)  
**Auth**: No requiere  
**Body**:
```json
{
  "usuario": "admin01",
  "password": "miPassword123"
}
```
**Response 200**:
```json
{
  "token": "eyJhbGc...",
  "usuario": {
    "id": 1,
    "nombre": "Juan Admin",
    "rol": "ADMIN"
  }
}
```
**Errores**: 401 (credenciales inválidas)

#### POST /api/auth/logout
**Descripción**: Cerrar sesión (opcional, JWT stateless)  
**Auth**: JWT  
**Response 200**:
```json
{
  "message": "Sesión cerrada"
}
```

### 3.2 Mozos

#### GET /api/mozos
**Descripción**: Listar mozos activos  
**Auth**: No requiere  
**Response 200**:
```json
{
  "mozos": [
    {
      "id_mozo": 1,
      "nombre": "Juan Pérez",
      "tienePIN": true
    },
    {
      "id_mozo": 2,
      "nombre": "María López",
      "tienePIN": false
    }
  ]
}
```

#### POST /api/mozos/seleccionar
**Descripción**: Seleccionar mozo (con PIN opcional)  
**Auth**: No requiere  
**Body**:
```json
{
  "id_mozo": 1,
  "pin": "1234"
}
```
**Response 200**:
```json
{
  "mozo": {
    "id_mozo": 1,
    "nombre": "Juan Pérez"
  },
  "sessionToken": "simple_token_for_mozo"
}
```
**Errores**: 401 (PIN incorrecto), 404 (mozo no existe o inactivo)

#### POST /api/mozos (ADMIN)
**Descripción**: Crear mozo  
**Auth**: JWT (rol ADMIN)  
**Body**:
```json
{
  "nombre": "Carlos García",
  "pin": "5678",
  "activo": true
}
```
**Response 201**:
```json
{
  "id_mozo": 3,
  "nombre": "Carlos García"
}
```

### 3.3 Productos y Menú

#### GET /api/productos
**Descripción**: Listar productos activos agrupados por categoría  
**Auth**: No requiere  
**Query Params**:
- `buscar`: string (opcional, buscar por nombre)
**Response 200**:
```json
{
  "categorias": [
    {
      "id_categoria": 1,
      "nombre": "Parrilla",
      "orden": 1,
      "productos": [
        {
          "id_producto": 1,
          "nombre": "Anticuchos (5 palitos)",
          "descripcion": "5 palitos de corazón con papa y choclo",
          "precio": 25.00,
          "recargoLlevar": 1.00,
          "areaId": 1,
          "opciones": [
            {
              "id": 1,
              "nombre": "Extra salsa criolla",
              "precioExtra": 2.00
            }
          ]
        }
      ]
    }
  ]
}
```

#### GET /api/productos/:id
**Descripción**: Detalle de un producto  
**Auth**: No requiere  
**Response 200**:
```json
{
  "id_producto": 1,
  "nombre": "Anticuchos (5 palitos)",
  "descripcion": "5 palitos de corazón...",
  "precio": 25.00,
  "recargoLlevar": 1.00,
  "categoriaId": 1,
  "areaId": 1,
  "opciones": [...]
}
```

### 3.4 Pedidos

#### POST /api/pedidos
**Descripción**: Crear pedido nuevo  
**Auth**: Mozo session token  
**Body**:
```json
{
  "mozoId": 1,
  "tipo": "MESA",
  "mesas": [4, 5],
  "items": [
    {
      "productoId": 1,
      "cantidad": 2,
      "nota": "bien cocidos",
      "opciones": [1, 3]
    },
    {
      "productoId": 15,
      "cantidad": 1,
      "nota": null,
      "opciones": []
    }
  ]
}
```
**Response 201**:
```json
{
  "id_pedidos": 123,
  "estado": "ABIERTO",
  "tipo": "MESA",
  "total": 62.00,
  "items": [
    {
      "id_detalle_pedidos": 234,
      "productoNombre": "Anticuchos (5 palitos)",
      "cantidad": 2,
      "precioUnitario": 25.00,
      "recargoUnitario": 0.00,
      "subtotal": 50.00
    }
  ],
  "message": "Pedido creado. Imprimiendo comandas..."
}
```
**Validaciones**:
- Mesas no ocupadas por otro pedido activo
- Al menos un ítem
- Productos existen y están activos

#### GET /api/pedidos/activos
**Descripción**: Listar pedidos del mozo (ABIERTO, ENVIADO)  
**Auth**: Mozo session token  
**Query Params**:
- `mozoId`: int (requerido)
**Response 200**:
```json
{
  "pedidos": [
    {
      "id_pedidos": 123,
      "tipo": "MESA",
      "mesas": "4 y 5",
      "estado": "ABIERTO",
      "total": 62.00,
      "creadoEn": "2026-11-12T14:30:00",
      "items": [...]
    }
  ]
}
```

#### POST /api/pedidos/:id/items
**Descripción**: Agregar ítems a pedido abierto (nueva ronda)  
**Auth**: Mozo session token  
**Body**:
```json
{
  "items": [
    {
      "productoId": 20,
      "cantidad": 1,
      "nota": "sin cebolla",
      "opciones": []
    }
  ]
}
```
**Response 200**:
```json
{
  "message": "Ítems agregados. Imprimiendo comandas...",
  "ronda": 2,
  "totalActualizado": 75.00
}
```

#### PATCH /api/pedidos/:id/mesas
**Descripción**: Cambiar mesas del pedido  
**Auth**: Mozo/Cajero  
**Body**:
```json
{
  "mesas": [6]
}
```
**Response 200**:
```json
{
  "message": "Mesas actualizadas"
}
```

#### DELETE /api/pedidos/:id/items/:itemId
**Descripción**: Anular un ítem  
**Auth**: Mozo (antes de enviar) o Cajero/Admin (después)  
**Body** (solo si ya enviado):
```json
{
  "motivoAnulacion": "Cliente cambió de opinión"
}
```
**Response 200**:
```json
{
  "message": "Ítem anulado",
  "totalActualizado": 50.00
}
```

#### DELETE /api/pedidos/:id
**Descripción**: Anular pedido completo  
**Auth**: JWT (rol ADMIN)  
**Body**:
```json
{
  "motivoAnulacion": "Error de registro"
}
```
**Response 200**:
```json
{
  "message": "Pedido anulado"
}
```

#### POST /api/pedidos/:id/reimprimir
**Descripción**: Reimprimir comandas completas  
**Auth**: JWT (rol CAJERO o ADMIN)  
**Response 200**:
```json
{
  "message": "Reimprimiendo comandas..."
}
```

### 3.5 Caja

#### POST /api/caja/turno/abrir
**Descripción**: Abrir turno de caja  
**Auth**: JWT (rol CAJERO o ADMIN)  
**Body**:
```json
{
  "montoInicial": 100.00
}
```
**Response 201**:
```json
{
  "id_turnocaja": 45,
  "apertura": "2026-11-12T08:00:00",
  "montoInicial": 100.00
}
```

#### POST /api/caja/turno/cerrar
**Descripción**: Cerrar turno de caja  
**Auth**: JWT (rol CAJERO o ADMIN)  
**Body**:
```json
{
  "montoFinal": 850.00
}
```
**Response 200**:
```json
{
  "message": "Turno cerrado",
  "montoEsperado": 845.00,
  "montoFinal": 850.00,
  "diferencia": 5.00,
  "desglose": {
    "efectivo": 650.00,
    "yape": 150.00,
    "plin": 45.00
  }
}
```

#### GET /api/caja/pedidos
**Descripción**: Listar pedidos pendientes de cobro  
**Auth**: JWT (rol CAJERO o ADMIN)  
**Response 200**:
```json
{
  "pedidos": [
    {
      "id_pedidos": 123,
      "mesas": "4 y 5",
      "mozo": "Juan Pérez",
      "total": 62.00,
      "estado": "ENVIADO",
      "items": [...]
    }
  ]
}
```

#### POST /api/caja/cobrar
**Descripción**: Cobrar pedido  
**Auth**: JWT (rol CAJERO o ADMIN)  
**Body**:
```json
{
  "pedidoId": 123,
  "pagos": [
    {
      "metodo": "EFECTIVO",
      "monto": 50.00
    },
    {
      "metodo": "YAPE",
      "monto": 12.00
    }
  ]
}
```
**Response 200**:
```json
{
  "message": "Cobro realizado",
  "comprobante": {
    "serie": "B001",
    "numero": 123,
    "total": 62.00
  }
}
```
**Validaciones**:
- Suma de pagos = total del pedido
- Pedido no está ya PAGADO o ANULADO

### 3.6 Reportes

#### GET /api/reportes/ventas
**Descripción**: Reporte de ventas por período  
**Auth**: JWT (rol ADMIN)  
**Query Params**:
- `desde`: date (YYYY-MM-DD)
- `hasta`: date (YYYY-MM-DD)
**Response 200**:
```json
{
  "totalVendido": 15420.50,
  "cantidadPedidos": 320,
  "ticketPromedio": 48.19,
  "desgloseMetodos": {
    "EFECTIVO": 10200.00,
    "YAPE": 4500.50,
    "PLIN": 720.00
  }
}
```

#### GET /api/reportes/productos-mas-vendidos
**Descripción**: Productos más vendidos  
**Auth**: JWT (rol ADMIN)  
**Query Params**:
- `desde`, `hasta`: date
- `limit`: int (default 10)
**Response 200**:
```json
{
  "productos": [
    {
      "id_producto": 1,
      "nombre": "Anticuchos (5 palitos)",
      "cantidadVendida": 450,
      "totalVendido": 11250.00
    }
  ]
}
```

#### GET /api/reportes/ventas-por-mozo
**Descripción**: Desempeño de mozos  
**Auth**: JWT (rol ADMIN)  
**Query Params**: `desde`, `hasta`  
**Response 200**:
```json
{
  "mozos": [
    {
      "id_mozo": 1,
      "nombre": "Juan Pérez",
      "cantidadPedidos": 80,
      "totalVendido": 3850.00,
      "ticketPromedio": 48.13
    }
  ]
}
```

### 3.7 Admin - CRUD

*(Endpoints estándar de CRUD para productos, categorías, mesas, áreas, impresoras, mozos, usuarios)*

Ejemplos:
- GET /api/admin/productos
- POST /api/admin/productos
- PUT /api/admin/productos/:id
- DELETE /api/admin/productos/:id

## 4. FLUJO DE IMPRESIÓN

### 4.1 Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│  MOZO: Enviar Pedido                                        │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│  1. TRANSACCIÓN DB (< 1 segundo)                            │
│  • INSERT pedidos (estado=ABIERTO, total calculado)         │
│  • INSERT pedido_mesas (mesas seleccionadas)                │
│  • INSERT detalle_pedidos (precio, recargo, areaId, ronda=1)│
│  • Calcular total = suma(cant * (precio + recargo))         │
│  • COMMIT                                                   │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│  RESPUESTA INMEDIATA AL MOZO: "Pedido enviado OK"          │
└─────────────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│  2. IMPRESIÓN ASÍNCRONA (segundo plano)                     │
│                                                             │
│  • Agrupar items por areaId:                                │
│    - Área Parrilla: items con areaId=1                      │
│    - Área Broaster: items con areaId=2                      │
│    - Área Carta: items con areaId=3                         │
│                                                             │
│  • Para cada área:                                          │
│    1. INSERT impresiones (pedidoId, impresoraId, areaId,    │
│       ronda, estado=PENDIENTE)                              │
│    2. Obtener IP de impresora (SELECT ip FROM impresoras    │
│       WHERE areaId=X AND activa=TRUE)                       │
│    3. Enviar comando ESC/POS a IP:9100                      │
│    4. Si OK: UPDATE estado=IMPRESA                          │
│    5. Si ERROR: UPDATE estado=ERROR, error=mensaje,         │
│       intentos++                                            │
│                                                             │
│  • Promise.all() para imprimir en paralelo                  │
│  • Socket.IO: emitir evento "impresion_completada"          │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
     ┌──────────┴──────────┐
     │                     │
     ▼                     ▼
┌──────────┐         ┌──────────┐
│  ÉXITO   │         │  ERROR   │
└──────────┘         └─────┬────┘
                           │
                           ▼
                ┌────────────────────────┐
                │  REINTENTO AUTOMÁTICO  │
                │  (max 3, delay 30s)    │
                └────────────────────────┘
```

### 4.2 Lógica de Agrupación por Área

**Input**: Pedido con múltiples ítems
```javascript
items = [
  { productoId: 1, areaId: 1 }, // Anticuchos → Parrilla
  { productoId: 2, areaId: 1 }, // Mollejitas → Parrilla
  { productoId: 15, areaId: 2 }, // Pollo Broaster → Broaster
  { productoId: 30, areaId: 3 }, // Tallarín Saltado → Carta
  { productoId: 45, areaId: 4 }  // Inca Kola → Caja (resumen)
]
```

**Agrupación**:
```javascript
grupos = {
  1: [item1, item2],  // Parrilla
  2: [item15],         // Broaster
  3: [item30],         // Carta
  4: [todos los items] // Caja (resumen completo)
}
```

**Impresión en Parrilla**:
```
══════════════════════════════════════
       MESA 4 Y 5
══════════════════════════════════════
Mozo: Juan Pérez
Hora: 14:30
──────────────────────────────────────
2x Anticuchos (5 palitos)
   Nota: bien cocidos

1x Mollejitas
──────────────────────────────────────
```

**Impresión en Caja** (resumen completo para control):
```
══════════════════════════════════════
       RESUMEN PEDIDO
══════════════════════════════════════
MESA 4 Y 5
Mozo: Juan Pérez
Hora: 14:30
──────────────────────────────────────
2x Anticuchos (5 palitos)    50.00
1x Mollejitas                18.00
1x Pollo Broaster 1/4        22.00
1x Tallarín Saltado          25.00
1x Inca Kola 1.5L             8.00
──────────────────────────────────────
TOTAL S/                    123.00
══════════════════════════════════════
```

### 4.3 Manejo de Errores de Impresión

**Estrategia de Reintentos**:
1. Intento inicial: inmediato
2. Reintento 1: después de 30 segundos
3. Reintento 2: después de 60 segundos
4. Reintento 3: después de 90 segundos
5. Si falla 3 veces: marcar ERROR y notificar

**Notificaciones**:
- Socket.IO a pantalla de caja: "Error en impresora Parrilla"
- Botón manual "Reintentar"
- Log de error con timestamp y mensaje

**Modo Mock** (PRINTER_MODE=mock):
- No envía comandos TCP a impresoras
- Imprime el contenido en consola con formato
- Guarda en archivo: `logs/print_[timestamp].txt`
- Estado siempre IMPRESA

## 5. SEGURIDAD

### 5.1 Autenticación

**Personal Autenticado** (Cajero, Admin, Cocina):
- Usuario + contraseña (bcrypt, 10 rounds)
- JWT con payload: `{ id_usuario, rol, nombre }`
- Expiración: 8 horas
- Almacenamiento: localStorage en cliente
- Header: `Authorization: Bearer <token>`

**Mozos**:
- Selección de nombre + PIN opcional (4 dígitos)
- No requiere bcrypt (PIN simple)
- Session token simple (no JWT): `mozo_[id]_[timestamp]`
- Expiración: 12 horas
- Header: `X-Mozo-Token: <token>`

### 5.2 Autorización

**Middleware de Roles**:
```typescript
const requireRole = (roles: string[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    next();
  };
};

// Uso
router.post('/api/admin/productos', 
  authMiddleware, 
  requireRole(['ADMIN']), 
  crearProducto
);
```

**Matriz de Permisos**:

| Recurso | Mozo | Cocinero | Cajero | Admin |
|---------|------|----------|--------|-------|
| Ver menú | ✓ | ✓ | ✓ | ✓ |
| Crear pedido | ✓ | ✗ | ✗ | ✓ |
| Anular ítem (antes de enviar) | ✓ | ✗ | ✗ | ✓ |
| Anular ítem (después) | ✗ | ✗ | ✓ | ✓ |
| Cobrar | ✗ | ✗ | ✓ | ✓ |
| Abrir/cerrar caja | ✗ | ✗ | ✓ | ✓ |
| Ver reportes | ✗ | ✗ | ✗ | ✓ |
| CRUD productos | ✗ | ✗ | ✗ | ✓ |

### 5.3 Validación de Entradas

**Express Validator**:
```typescript
// Ejemplo: validar creación de pedido
const validarPedido = [
  body('mozoId').isInt().withMessage('Mozo inválido'),
  body('tipo').isIn(['MESA', 'LLEVAR', 'DELIVERY']),
  body('items').isArray({ min: 1 }).withMessage('Debe tener al menos un ítem'),
  body('items.*.productoId').isInt(),
  body('items.*.cantidad').isInt({ min: 1 }),
  (req, res, next) => {
    const errors = validationErrors(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

**Prevención SQL Injection**:
```typescript
// BIEN: consultas parametrizadas
const [rows] = await db.query(
  'SELECT * FROM productos WHERE id_producto = ?',
  [productoId]
);

// MAL: concatenación de strings
const query = `SELECT * FROM productos WHERE id_producto = ${productoId}`; // ❌
```

### 5.4 Variables de Entorno

**Archivo .env** (nunca en git):
```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=parrillita_user
DB_PASSWORD=password_seguro_aqui
DB_NAME=parrillita_db

# JWT
JWT_SECRET=clave_secreta_muy_larga_y_aleatoria_aqui
JWT_EXPIRES_IN=8h

# Impresoras
PRINTER_MODE=mock
PRINTER_PARRILLA_IP=192.168.1.101
PRINTER_BROASTER_IP=192.168.1.102
PRINTER_CARTA_IP=192.168.1.103
PRINTER_CAJA_IP=192.168.1.104

# Servidor
PORT=3000
NODE_ENV=production

# Backup
BACKUP_PATH=C:\Backups\Parrillita
BACKUP_RETENTION_DAYS=30
```

## 6. TIEMPO REAL (Socket.IO)

### 6.1 Eventos

**Del servidor a clientes**:
- `impresion_completada`: `{ pedidoId, areaId, estado, error? }`
- `pedido_nuevo`: `{ pedidoId, mesas, mozo, items }` (a pantalla de caja)
- `pedido_cobrado`: `{ pedidoId }` (libera mesa en pantalla de mozos)
- `mesa_ocupada`: `{ mesaId, pedidoId }` (actualiza estado de mesas)

**De clientes a servidor**:
- `join_area`: `{ areaId }` (cocina se subscribe a comandas de su área)
- `join_caja`: (caja se subscribe a eventos de pedidos)

### 6.2 Ejemplo de Implementación

**Backend**:
```typescript
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('join_area', (data) => {
    socket.join(`area_${data.areaId}`);
  });

  socket.on('join_caja', () => {
    socket.join('caja');
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Emitir desde servicio de impresión
io.to(`area_${areaId}`).emit('impresion_completada', {
  pedidoId,
  areaId,
  estado: 'IMPRESA'
});
```

**Frontend**:
```typescript
const socket = io('http://192.168.1.100:3000');

socket.on('connect', () => {
  socket.emit('join_caja');
});

socket.on('pedido_nuevo', (data) => {
  // Actualizar lista de pedidos
  setPedidos(prev => [...prev, data]);
  // Notificación sonora
  playSound();
});
```

## 7. RESPALDO Y RECUPERACIÓN

### 7.1 Script de Backup Diario

**PowerShell** (`scripts/backup.ps1`):
```powershell
# Configuración
$backupPath = "C:\Backups\Parrillita"
$dbName = "parrillita_db"
$dbUser = "root"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$filename = "$backupPath\parrillita_$timestamp.sql"

# Crear carpeta si no existe
if (!(Test-Path $backupPath)) {
    New-Item -ItemType Directory -Path $backupPath
}

# Ejecutar mysqldump
C:\xampp\mysql\bin\mysqldump.exe -u $dbUser -p --databases $dbName > $filename

# Comprimir
Compress-Archive -Path $filename -DestinationPath "$filename.zip"
Remove-Item $filename

# Rotación: mantener últimos 30 días
Get-ChildItem $backupPath -Filter "*.zip" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | 
    Remove-Item

Write-Host "Backup completado: $filename.zip"
```

### 7.2 Tarea Programada

**Configuración en Windows**:
1. Abrir "Programador de tareas"
2. Crear tarea básica: "Backup Parrillita"
3. Desencadenador: Diario a las 4:00 AM
4. Acción: Ejecutar programa
   - Programa: `powershell.exe`
   - Argumentos: `-File C:\sistema-pollo\scripts\backup.ps1`
5. Ejecutar aunque el usuario no haya iniciado sesión

### 7.3 Restauración

**PowerShell** (`scripts/restore.ps1`):
```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$backupFile
)

$dbName = "parrillita_db"
$dbUser = "root"

# Descomprimir
Expand-Archive -Path $backupFile -DestinationPath "C:\Temp" -Force
$sqlFile = (Get-ChildItem "C:\Temp" -Filter "*.sql")[0].FullName

# Restaurar
C:\xampp\mysql\bin\mysql.exe -u $dbUser -p $dbName < $sqlFile

Write-Host "Restauración completada desde: $backupFile"
```

## 8. DEPLOYMENT LOCAL

### 8.1 Requisitos Previos

1. **Windows 10/11** con usuario administrador
2. **XAMPP** instalado en `C:\xampp`
3. **Node.js 18+** LTS
4. **Git** (opcional, para clonar repo)
5. **Impresoras térmicas** configuradas con IP fija

### 8.2 Instalación

**Paso 1: Configurar Base de Datos**
```powershell
# 1. Iniciar XAMPP (Apache + MySQL)
C:\xampp\xampp-control.exe

# 2. Crear base de datos
C:\xampp\mysql\bin\mysql.exe -u root -p
```
```sql
CREATE DATABASE parrillita_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parrillita_db;
SOURCE C:\sistema-pollo\database\parrillita_esquema_limpio.sql;
SOURCE C:\sistema-pollo\database\parrillita_datos_iniciales.sql;
```

**Paso 2: Ejecutar Migraciones**
```powershell
foreach ($file in Get-ChildItem "C:\sistema-pollo\database\migrations" -Filter "*.sql" | Sort-Object Name) {
    C:\xampp\mysql\bin\mysql.exe -u root -p parrillita_db < $file.FullName
    Write-Host "Migración aplicada: $($file.Name)"
}
```

**Paso 3: Configurar Backend**
```powershell
cd C:\sistema-pollo\backend
npm install
Copy-Item .env.example .env
# Editar .env con datos reales
npm run build
```

**Paso 4: Configurar Frontend**
```powershell
cd C:\sistema-pollo\frontend
npm install
# Editar src/api/axios.config.ts con IP de la laptop
npm run build
```

**Paso 5: Iniciar Sistema**
```powershell
# Backend (producción)
cd C:\sistema-pollo\backend
npm start

# O con PM2 para auto-restart
npm install -g pm2
pm2 start dist/server.js --name parrillita-api
pm2 save
pm2 startup
```

### 8.3 Arranque Automático

**Script** (`scripts/startup.ps1`):
```powershell
# Iniciar XAMPP
Start-Process "C:\xampp\xampp-control.exe"
Start-Sleep -Seconds 10

# Iniciar backend
cd C:\sistema-pollo\backend
Start-Process powershell -ArgumentList "-Command npm start" -WindowStyle Hidden

# Abrir navegador en localhost (opcional, para ver dashboard)
Start-Process "http://localhost:3000"
```

**Agregar a Inicio de Windows**:
1. Win + R → `shell:startup`
2. Crear acceso directo a `startup.ps1`

### 8.4 Acceso desde Celulares

1. **Configurar IP fija en la laptop**:
   - Panel de control → Centro de redes → Cambiar configuración del adaptador
   - WiFi → Propiedades → IPv4
   - IP: `192.168.1.100`, Máscara: `255.255.255.0`, Gateway: `192.168.1.1`

2. **Configurar firewall**:
```powershell
New-NetFirewallRule -DisplayName "Parrillita API" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

3. **En el celular**:
   - Conectar al WiFi del restaurante
   - Abrir Chrome/Safari
   - Ir a: `http://192.168.1.100:3000`
   - Agregar a pantalla de inicio (PWA)

## 9. PRUEBAS

### 9.1 Pruebas Unitarias

**Framework**: Jest + ts-jest

**Ejemplo** (`backend/tests/unit/pedidos.test.ts`):
```typescript
import { calcularTotalPedido } from '../../src/services/pedidos.service';

describe('Cálculo de Total de Pedido', () => {
  test('debe calcular total con recargo para llevar', () => {
    const items = [
      {
        cantidad: 2,
        precioUnitario: 25.00,
        recargoUnitario: 1.00, // taper
        anulado: false
      },
      {
        cantidad: 1,
        precioUnitario: 8.00,
        recargoUnitario: 0.50, // botella
        anulado: false
      }
    ];

    const total = calcularTotalPedido(items);
    expect(total).toBe(60.50); // (2*26) + (1*8.5)
  });

  test('debe excluir ítems anulados del total', () => {
    const items = [
      { cantidad: 2, precioUnitario: 25.00, recargoUnitario: 1.00, anulado: false },
      { cantidad: 1, precioUnitario: 8.00, recargoUnitario: 0.50, anulado: true }
    ];

    const total = calcularTotalPedido(items);
    expect(total).toBe(52.00); // Solo el primero
  });
});
```

### 9.2 Pruebas de Integración

**Ejemplo** (`backend/tests/integration/pedido-flow.test.ts`):
```typescript
import request from 'supertest';
import app from '../../src/app';

describe('Flujo Completo de Pedido', () => {
  let mozoToken: string;
  let pedidoId: number;

  beforeAll(async () => {
    // Seleccionar mozo
    const res = await request(app)
      .post('/api/mozos/seleccionar')
      .send({ id_mozo: 1, pin: '1234' });
    mozoToken = res.body.sessionToken;
  });

  test('1. Crear pedido', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .set('X-Mozo-Token', mozoToken)
      .send({
        mozoId: 1,
        tipo: 'MESA',
        mesas: [4],
        items: [
          { productoId: 1, cantidad: 2, nota: null, opciones: [] }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(50.00);
    pedidoId = res.body.id_pedidos;
  });

  test('2. Agregar ítems (ronda 2)', async () => {
    const res = await request(app)
      .post(`/api/pedidos/${pedidoId}/items`)
      .set('X-Mozo-Token', mozoToken)
      .send({
        items: [
          { productoId: 15, cantidad: 1, nota: null, opciones: [] }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.ronda).toBe(2);
    expect(res.body.totalActualizado).toBeGreaterThan(50.00);
  });

  test('3. Verificar impresiones en modo mock', async () => {
    // Esperar a que termine impresión asíncrona
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar que se crearon registros de impresión
    const impresiones = await db.query(
      'SELECT * FROM impresiones WHERE pedidoId = ?',
      [pedidoId]
    );

    expect(impresiones[0].length).toBeGreaterThan(0);
    expect(impresiones[0][0].estado).toBe('IMPRESA'); // modo mock
  });
});
```

### 9.3 Comando de Pruebas

**package.json**:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

**Versión**: 1.0  
**Fecha**: 12/11/2026  
**Estado**: Pendiente de aprobación
