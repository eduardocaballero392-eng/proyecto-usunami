# CORRECCIÓN: Mozos son Usuarios, NO tabla separada

## ❌ ERROR ORIGINAL

En las primeras versiones de requirements.md, design.md y tasks.md mencioné erróneamente crear una tabla `mozos` separada.

## ✅ CORRECCIÓN

**Los mozos SON usuarios** en la tabla `usuarios` con `rol='MOZO'`.

### Cambios Aplicados

#### 1. Migration 001: Agregar rol MOZO
```sql
ALTER TABLE usuarios 
MODIFY COLUMN rol ENUM('COCINERO','PARRILLA','BROASTER','ADMIN','CAJERO','MOZO');

ALTER TABLE usuarios
ADD COLUMN pin VARCHAR(4) NULL,
ADD COLUMN activo BOOLEAN DEFAULT TRUE;
```

#### 2. Relación en Pedidos
- **pedidos.usuarioId** → apunta al mozo (usuario con rol='MOZO')
- NO se crea campo `pedidos.mozoId`
- NO se crea tabla `mozos`

#### 3. Flujo de Autenticación de Mozos

**Simplificado (sin contraseña)**:
1. Mozo selecciona su nombre de lista (GET /api/auth/mozos)
2. Si tiene PIN, lo ingresa
3. Sistema genera session token simple
4. Token se guarda en localStorage del celular

**Backend**:
```typescript
// GET /api/auth/mozos
// Listar usuarios con rol='MOZO' y activo=TRUE
SELECT id_usuario, nombre, pin IS NOT NULL as tienePIN 
FROM usuarios 
WHERE rol='MOZO' AND activo=TRUE;

// POST /api/auth/mozo/seleccionar
// Body: { id_usuario, pin? }
// Verificar PIN si existe
// Generar token simple: mozo_[id]_[timestamp]
// NO usar JWT ni bcrypt para mozos
```

### Modelo de Datos Corregido

```
┌──────────────┐
│   usuarios   │
├──────────────┤
│ id_usuario PK│
│ nombre       │
│ usuario      │ ← Solo para ADMIN, CAJERO, COCINA
│ password     │ ← NULL para mozos
│ rol ENUM     │ ← Incluye 'MOZO'
│ pin VARCHAR  │ ← Solo para mozos (opcional, 4 dígitos)
│ activo       │
└──────────────┘
       │
       │ FK (usuarioId)
       ▼
┌──────────────┐
│   pedidos    │
├──────────────┤
│ id_pedidos PK│
│ usuarioId FK │ ← Apunta al mozo
│ tipo ENUM    │
│ estado ENUM  │
│ total        │
└──────────────┘
```

### Tipos TypeScript Corregidos

```typescript
// NO existe interfaz Mozo separada

interface Usuario {
  id_usuario: number;
  nombre: string;
  usuario: string | null; // NULL para mozos
  password: string | null; // NULL para mozos
  rol: 'COCINERO' | 'PARRILLA' | 'BROASTER' | 'ADMIN' | 'CAJERO' | 'MOZO';
  pin: string | null; // Solo mozos
  activo: boolean;
}

interface MozoListItem {
  id_usuario: number;
  nombre: string;
  tienePIN: boolean;
}
```

### API Corregida

#### Listar Mozos
```http
GET /api/auth/mozos

Response 200:
{
  "mozos": [
    {
      "id_usuario": 1,
      "nombre": "Juan Pérez",
      "tienePIN": true
    },
    {
      "id_usuario": 2,
      "nombre": "María López",
      "tienePIN": false
    }
  ]
}
```

#### Seleccionar Mozo
```http
POST /api/auth/mozo/seleccionar

Body:
{
  "id_usuario": 1,
  "pin": "1234"  // opcional, solo si tienePIN
}

Response 200:
{
  "usuario": {
    "id_usuario": 1,
    "nombre": "Juan Pérez",
    "rol": "MOZO"
  },
  "sessionToken": "mozo_1_1731416400000"
}
```

### Frontend Corregido

```typescript
// Context
interface AuthContextType {
  usuario: Usuario | null;
  isMozo: boolean; // rol === 'MOZO'
  login: (usuario: string, password: string) => Promise<void>;
  loginMozo: (id_usuario: number, pin?: string) => Promise<void>;
  logout: () => void;
}

// Hooks
const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};

// Uso
const { usuario, isMozo } = useAuth();

if (isMozo) {
  // Mostrar interfaz de mozo
} else {
  // Mostrar interfaz de admin/cajero
}
```

### Rutas Corregidas

```typescript
// backend/src/routes/auth.routes.ts

router.get('/mozos', listarMozos); 
// SELECT * FROM usuarios WHERE rol='MOZO' AND activo=TRUE

router.post('/mozo/seleccionar', seleccionarMozo);
// Verificar PIN, generar token simple

router.post('/login', login);
// Para ADMIN, CAJERO, COCINA → JWT

router.post('/logout', logout);
// Para todos
```

## Resumen de Cambios en Migraciones

| Migración | Cambio |
|-----------|--------|
| ~~001_mozos.sql~~ | ❌ ELIMINAR |
| **001_rol_mozo.sql** | ✅ CREAR - Agrega rol MOZO a usuarios |
| 002_recargo_llevar.sql | ✅ Sin cambios |
| 003_pedido_mesas.sql | ✅ Sin cambios |
| 004_auditoria_anulacion.sql | ✅ Sin cambios |
| 005_rondas.sql | ✅ Sin cambios |
| 006_series_comprobantes.sql | ✅ Sin cambios |
| 007_descripcion_producto.sql | ✅ Sin cambios |
| ~~008_mozo_pedidos.sql~~ | ❌ ELIMINAR - No hay mozoId |
| **008_usuario_pedidos.sql** | ✅ CREAR - Índice en usuarioId |
| 009_campos_impresion.sql | ✅ Sin cambios |

## Impacto en Tareas

### Módulos Afectados

- **M1.5 - Backend: Mozos** → Renombrar a **M1.5 - Backend: Autenticación de Mozos**
  - No hay servicio `mozos.service.ts` separado
  - Todo va en `auth.service.ts`
  - Rutas en `auth.routes.ts` con prefijo `/mozos`

- **M1.12 - Frontend: Selección de Mozo**
  - Llamar a `/api/auth/mozos` (no `/api/mozos`)
  - Llamar a `/api/auth/mozo/seleccionar` (no `/api/mozos/seleccionar`)

### CRUD de Usuarios Incluye Mozos

En el panel de administración:
- Crear usuario con rol='MOZO'
- Si es mozo, campo `usuario` opcional
- Si es mozo, `password` debe ser NULL
- Si es mozo, opcionalmente agregar `pin` (4 dígitos)

## ✅ Estado Actual

- ✅ Migraciones corregidas en `database/migrations/`
- ✅ README.md actualizado
- ⏳ requirements.md - pendiente de corrección
- ⏳ design.md - pendiente de corrección
- ⏳ tasks.md - pendiente de corrección

---

**Fecha de corrección**: 12/11/2026  
**Razón**: Simplificación del modelo de datos - los mozos no necesitan tabla separada
