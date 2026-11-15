# TASKS - Sistema de Gestión Anticuchería La Parrillita

## ORGANIZACIÓN POR FASES

Este documento organiza todas las tareas de implementación del sistema en **3 fases**:
- **Fase 1**: MVP (tomar pedidos e imprimir)
- **Fase 2**: Caja y cobro  
- **Fase 3**: Dashboard y reportes

Cada fase se subdivide en **módulos** y cada módulo en **tareas atómicas**.

---

## FASE 1 - MVP (Tomar Pedidos e Imprimir)

### Estimación Total Fase 1: ~60 horas

### M1.1 - Configuración Inicial del Proyecto (4 horas)

#### T1.1.1 - Estructura de Directorios
- [ ] Crear estructura de carpetas backend/frontend
- [ ] Inicializar package.json en ambos proyectos
- [ ] Configurar TypeScript (tsconfig.json) con strict mode
- [ ] Configurar ESLint + Prettier
- [ ] Crear .gitignore (node_modules, .env, dist, build)

#### T1.1.2 - Variables de Entorno
- [ ] Crear .env.example con todas las variables necesarias
- [ ] Documentar cada variable en README
- [ ] Crear .env local para desarrollo

#### T1.1.3 - Base de Datos
- [ ] Verificar esquema existente (parrillita_esquema_limpio.sql)
- [ ] Crear archivo de datos iniciales (parrillita_datos_iniciales.sql)
- [ ] Documentar relaciones y constraints

---

### M1.2 - Migraciones de Base de Datos (3 horas)

#### T1.2.1 - Migración 001: Tabla Mozos
- [ ] Crear `database/migrations/001_mozos.sql`
- [ ] Tabla mozos con id_mozo, nombre, pin, activo
- [ ] Índice en campo activo
- [ ] Insertar datos de prueba (3-5 mozos)

#### T1.2.2 - Migración 002: Recargo Para Llevar
- [ ] Crear `database/migrations/002_recargo_llevar.sql`
- [ ] ALTER productos: agregar recargoLlevar DECIMAL(10,2)
- [ ] ALTER detalle_pedidos: agregar recargoUnitario DECIMAL(10,2)
- [ ] UPDATE productos: asignar recargos según categoría

#### T1.2.3 - Migración 003: Pedido con Múltiples Mesas
- [ ] Crear `database/migrations/003_pedido_mesas.sql`
- [ ] Crear tabla pedido_mesas con PRIMARY KEY compuesta
- [ ] Migrar datos existentes de pedidos.mesaId
- [ ] DROP FOREIGN KEY y DROP COLUMN pedidos.mesaId

#### T1.2.4 - Migración 004: Auditoría de Anulación
- [ ] Crear `database/migrations/004_auditoria_anulacion.sql`
- [ ] ALTER detalle_pedidos: anuladoPor, anuladoEn, motivoAnulacion
- [ ] FOREIGN KEY a usuarios
- [ ] Índice en campo anulado

#### T1.2.5 - Migración 005: Rondas de Impresión
- [ ] Crear `database/migrations/005_rondas.sql`
- [ ] ALTER detalle_pedidos: ronda INT DEFAULT 1
- [ ] ALTER impresiones: ronda INT DEFAULT 1
- [ ] Índice compuesto (pedidoId, ronda)

#### T1.2.6 - Migración 006: Series de Comprobantes
- [ ] Crear `database/migrations/006_series_comprobantes.sql`
- [ ] Crear tabla series (serie PK, siguienteNumero, activa)
- [ ] Insertar serie inicial B001

#### T1.2.7 - Migración 007: Descripción de Producto
- [ ] Crear `database/migrations/007_descripcion_producto.sql`
- [ ] ALTER productos: descripcion TEXT NULL

#### T1.2.8 - Migración 008: Relación Mozo en Pedidos
- [ ] Crear `database/migrations/008_mozo_pedidos.sql`
- [ ] ALTER pedidos: mozoId FK a mozos
- [ ] Índice en mozoId

#### T1.2.9 - Migración 009: Campos de Impresión
- [ ] Crear `database/migrations/009_campos_impresion.sql`
- [ ] ALTER impresiones: intentos INT, error TEXT

---

### M1.3 - Backend: Configuración Base (6 horas)

#### T1.3.1 - Conexión a Base de Datos
- [ ] Instalar mysql2
- [ ] Crear `src/config/database.ts` con pool de conexiones
- [ ] Crear función `query(sql, params)` con manejo de errores
- [ ] Configurar zona horaria America/Lima
- [ ] Test de conexión en startup

#### T1.3.2 - Configuración de Express
- [ ] Instalar express, cors, helmet, compression
- [ ] Crear `src/app.ts` con configuración base
- [ ] Middlewares: cors (solo red local), helmet, json parser
- [ ] Middleware de manejo de errores global
- [ ] Crear `src/server.ts` como entry point

#### T1.3.3 - Logger
- [ ] Instalar winston
- [ ] Crear `src/utils/logger.ts`
- [ ] Configurar logs en consola (desarrollo) y archivo (producción)
- [ ] Niveles: error, warn, info, debug
- [ ] Formato: timestamp + nivel + mensaje

#### T1.3.4 - Tipos TypeScript
- [ ] Crear `src/types/pedido.types.ts`
- [ ] Crear `src/types/usuario.types.ts`
- [ ] Crear `src/types/producto.types.ts`
- [ ] Crear `src/types/index.ts` para exports

---

### M1.4 - Backend: Autenticación (8 horas)

#### T1.4.1 - Configuración JWT
- [ ] Instalar jsonwebtoken, bcrypt, @types
- [ ] Crear `src/config/jwt.ts` con secret y opciones
- [ ] Función `generateToken(payload)`
- [ ] Función `verifyToken(token)`

#### T1.4.2 - Servicio de Autenticación
- [ ] Crear `src/services/auth.service.ts`
- [ ] Función `login(usuario, password)`: verificar usuario y password
- [ ] Hash con bcrypt (10 rounds)
- [ ] Generar JWT con payload { id_usuario, rol, nombre }
- [ ] Manejo de errores: usuario no existe, password incorrecto

#### T1.4.3 - Middleware de Autenticación
- [ ] Crear `src/middlewares/auth.middleware.ts`
- [ ] Verificar JWT en header Authorization
- [ ] Adjuntar usuario a req.user
- [ ] Responder 401 si token inválido o expirado

#### T1.4.4 - Middleware de Roles
- [ ] Crear `src/middlewares/roles.middleware.ts`
- [ ] Función `requireRole(roles: string[])`
- [ ] Verificar que req.user.rol esté en la lista
- [ ] Responder 403 si no autorizado

#### T1.4.5 - Rutas de Autenticación
- [ ] Crear `src/routes/auth.routes.ts`
- [ ] POST /api/auth/login → authService.login()
- [ ] POST /api/auth/logout (opcional, JWT stateless)
- [ ] Validaciones con express-validator

---

### M1.5 - Backend: Mozos (4 horas)

#### T1.5.1 - Servicio de Mozos
- [ ] Crear `src/services/mozos.service.ts`
- [ ] Función `listarMozosActivos()`: SELECT * WHERE activo=TRUE
- [ ] Función `seleccionarMozo(id, pin)`: verificar PIN si existe
- [ ] Función `crearMozo(nombre, pin, activo)` (ADMIN)
- [ ] Función `actualizarMozo(id, datos)`
- [ ] Función `activarDesactivar(id, activo)`

#### T1.5.2 - Rutas de Mozos
- [ ] Crear `src/routes/mozos.routes.ts`
- [ ] GET /api/mozos → listar mozos activos (sin auth)
- [ ] POST /api/mozos/seleccionar → seleccionar mozo (sin auth)
- [ ] POST /api/mozos → crear mozo (ADMIN)
- [ ] PUT /api/mozos/:id → actualizar mozo (ADMIN)
- [ ] PATCH /api/mozos/:id/estado → activar/desactivar (ADMIN)
- [ ] Validaciones

#### T1.5.3 - Middleware de Mozo
- [ ] Crear `src/middlewares/mozo.middleware.ts`
- [ ] Verificar X-Mozo-Token en header
- [ ] Validar formato `mozo_[id]_[timestamp]`
- [ ] Adjuntar mozo a req.mozo
- [ ] Responder 401 si token inválido

---

### M1.6 - Backend: Productos y Menú (5 horas)

#### T1.6.1 - Servicio de Productos
- [ ] Crear `src/services/productos.service.ts`
- [ ] Función `listarProductosConCategorias()`: JOIN con categorias
- [ ] Función `buscarProductos(query)`: LIKE %query%
- [ ] Función `obtenerProducto(id)`: con opciones
- [ ] Función `crearProducto(datos)` (ADMIN)
- [ ] Función `actualizarProducto(id, datos)` (ADMIN)
- [ ] Función `desactivarProducto(id)` (ADMIN, validar sin ventas)

#### T1.6.2 - Rutas de Productos
- [ ] Crear `src/routes/productos.routes.ts`
- [ ] GET /api/productos → listar con categorías y opciones
- [ ] GET /api/productos?buscar=query → buscar
- [ ] GET /api/productos/:id → detalle
- [ ] POST /api/productos → crear (ADMIN)
- [ ] PUT /api/productos/:id → actualizar (ADMIN)
- [ ] DELETE /api/productos/:id → desactivar (ADMIN)
- [ ] Validaciones

---

### M1.7 - Backend: Pedidos (12 horas)

#### T1.7.1 - Servicio de Pedidos - Crear
- [ ] Crear `src/services/pedidos.service.ts`
- [ ] Función `crearPedido(mozoId, tipo, mesas, items)`
  - [ ] Iniciar transacción
  - [ ] Validar mesas no ocupadas (si tipo=MESA)
  - [ ] Calcular total: suma(cantidad * (precio + recargo))
  - [ ] INSERT pedidos (estado=ABIERTO, total)
  - [ ] INSERT pedido_mesas (si aplica)
  - [ ] INSERT detalle_pedidos (copiar precio, recargo, areaId, ronda=1)
  - [ ] COMMIT
  - [ ] Retornar pedido creado
- [ ] Manejo de errores y rollback

#### T1.7.2 - Servicio de Pedidos - Agregar Ítems
- [ ] Función `agregarItems(pedidoId, items)`
  - [ ] Validar pedido existe y está ABIERTO
  - [ ] Obtener ronda actual: MAX(ronda) + 1
  - [ ] INSERT detalle_pedidos con nueva ronda
  - [ ] Recalcular total del pedido
  - [ ] UPDATE pedidos SET total=nuevo_total
  - [ ] Retornar ronda y total actualizado

#### T1.7.3 - Servicio de Pedidos - Anular Ítem
- [ ] Función `anularItem(itemId, usuarioId?, motivo?)`
  - [ ] Validar ítem existe y no está anulado
  - [ ] Si ya enviado: requerir usuarioId y motivo
  - [ ] UPDATE detalle_pedidos SET anulado=TRUE, anuladoPor, anuladoEn, motivoAnulacion
  - [ ] Recalcular total del pedido
  - [ ] Si ya enviado: llamar a impresionService.imprimirAnulacion()
  - [ ] Retornar total actualizado

#### T1.7.4 - Servicio de Pedidos - Cambiar Mesas
- [ ] Función `cambiarMesas(pedidoId, mesas)`
  - [ ] Validar pedido existe y está ABIERTO o ENVIADO
  - [ ] Validar mesas no ocupadas por otro pedido
  - [ ] DELETE FROM pedido_mesas WHERE pedidoId
  - [ ] INSERT nuevas mesas
  - [ ] Retornar OK

#### T1.7.5 - Servicio de Pedidos - Listar
- [ ] Función `listarPedidosActivos(mozoId)`: WHERE mozoId AND estado IN (ABIERTO, ENVIADO)
- [ ] Función `obtenerPedido(id)`: con detalles, mesas, mozo

#### T1.7.6 - Rutas de Pedidos
- [ ] Crear `src/routes/pedidos.routes.ts`
- [ ] POST /api/pedidos → crear pedido (Mozo)
- [ ] GET /api/pedidos/activos?mozoId → listar activos (Mozo)
- [ ] GET /api/pedidos/:id → detalle (Mozo/Cajero)
- [ ] POST /api/pedidos/:id/items → agregar ítems (Mozo)
- [ ] PATCH /api/pedidos/:id/mesas → cambiar mesas (Mozo/Cajero)
- [ ] DELETE /api/pedidos/:id/items/:itemId → anular ítem (Mozo/Cajero/Admin)
- [ ] POST /api/pedidos/:id/reimprimir → reimprimir comandas (Cajero/Admin)
- [ ] Validaciones

---

### M1.8 - Backend: Impresión (10 horas)

#### T1.8.1 - Configuración de Impresoras
- [ ] Instalar node-thermal-printer
- [ ] Crear `src/config/printer.ts`
- [ ] Función `getPrinterConfig(areaId)`: obtener IP y puerto de DB
- [ ] Configurar modo mock (PRINTER_MODE=mock)

#### T1.8.2 - Servicio de Impresión - Comandas
- [ ] Crear `src/services/impresion.service.ts`
- [ ] Función `imprimirComandas(pedidoId, ronda)`
  - [ ] Obtener ítems del pedido por ronda
  - [ ] Agrupar ítems por areaId
  - [ ] Para cada área:
    - [ ] INSERT impresiones (estado=PENDIENTE)
    - [ ] Llamar a `imprimirComanda(areaId, pedido, items, ronda)`
    - [ ] UPDATE impresiones según resultado
  - [ ] Promise.all() para imprimir en paralelo
  - [ ] Retornar resumen de impresiones

#### T1.8.3 - Servicio de Impresión - Formato Comanda
- [ ] Función `imprimirComanda(areaId, pedido, items, ronda)`
  - [ ] Si modo mock: imprimir en consola y archivo
  - [ ] Si producción: enviar a impresora por TCP
  - [ ] Formato ESC/POS:
    - [ ] Título "MESA n" o "AGREGADO - MESA n" (doble altura)
    - [ ] Mozo: nombre
    - [ ] Hora: HH:mm
    - [ ] Separador
    - [ ] Lista: cantidad x nombre
    - [ ] Nota debajo si existe
    - [ ] Separador
    - [ ] Corte de papel
  - [ ] Manejo de errores: timeout, conexión rechazada

#### T1.8.4 - Servicio de Impresión - Reintentos
- [ ] Función `reintentarImpresion(impresionId)`
  - [ ] Validar estado=ERROR y intentos < 3
  - [ ] Incrementar intentos
  - [ ] Intentar imprimir
  - [ ] UPDATE estado e intentos
- [ ] Función `reintentosAutomaticos()`: job que ejecuta cada 30s
  - [ ] SELECT impresiones WHERE estado=ERROR AND intentos < 3
  - [ ] Para cada una, llamar a reintentarImpresion()

#### T1.8.5 - Servicio de Impresión - Anulación
- [ ] Función `imprimirAnulacion(itemId)`
  - [ ] Obtener ítem anulado con pedido y área
  - [ ] Formato:
    - [ ] Título "⚠️ ANULADO ⚠️" (doble altura)
    - [ ] MESA n
    - [ ] cantidad x nombre
    - [ ] Motivo: motivo
    - [ ] Corte
  - [ ] Enviar a impresora del área

#### T1.8.6 - Integración con Pedidos
- [ ] En `pedidos.service.ts`, después de crear pedido:
  - [ ] Llamar a `impresionService.imprimirComandas(pedidoId, 1)` de forma asíncrona
  - [ ] No bloquear respuesta al mozo
- [ ] En `agregarItems`, después de insertar:
  - [ ] Llamar a `imprimirComandas(pedidoId, nuevaRonda)`
- [ ] En `anularItem`, si ya enviado:
  - [ ] Llamar a `imprimirAnulacion(itemId)`

---

### M1.9 - Backend: Socket.IO (3 horas)

#### T1.9.1 - Configuración Socket.IO
- [ ] Instalar socket.io
- [ ] Crear `src/sockets/index.ts`
- [ ] Configurar servidor Socket.IO con Express
- [ ] Manejar eventos: connection, disconnect
- [ ] Rooms: `area_${areaId}`, `caja`

#### T1.9.2 - Eventos de Impresión
- [ ] En `impresion.service.ts`, emitir eventos:
  - [ ] `impresion_completada`: a room `area_${areaId}`
  - [ ] `impresion_error`: a room `area_${areaId}` y `caja`

#### T1.9.3 - Eventos de Pedidos
- [ ] En `pedidos.service.ts`, emitir eventos:
  - [ ] `pedido_nuevo`: a room `caja` (al crear pedido)
  - [ ] `mesa_ocupada`: a todos (al asignar mesa)
  - [ ] `mesa_liberada`: a todos (al cobrar o anular)

---

### M1.10 - Backend: Admin CRUD (8 horas)

#### T1.10.1 - CRUD Categorías
- [ ] Crear `src/services/categorias.service.ts`
- [ ] Crear `src/routes/admin.routes.ts` (o separar por recurso)
- [ ] GET /api/admin/categorias → listar
- [ ] POST /api/admin/categorias → crear
- [ ] PUT /api/admin/categorias/:id → actualizar
- [ ] DELETE /api/admin/categorias/:id → eliminar (validar sin productos)
- [ ] PATCH /api/admin/categorias/reordenar → cambiar orden

#### T1.10.2 - CRUD Mesas
- [ ] Servicio y rutas para mesas
- [ ] GET /api/admin/mesas → listar con estado (libre/ocupada)
- [ ] POST /api/admin/mesas → crear
- [ ] PUT /api/admin/mesas/:id → editar número
- [ ] DELETE /api/admin/mesas/:id → eliminar (validar sin pedidos activos)

#### T1.10.3 - CRUD Áreas
- [ ] Servicio y rutas para áreas
- [ ] GET /api/admin/areas → listar
- [ ] POST /api/admin/areas → crear
- [ ] PUT /api/admin/areas/:id → actualizar
- [ ] DELETE /api/admin/areas/:id → eliminar (validar sin productos)

#### T1.10.4 - CRUD Impresoras
- [ ] Servicio y rutas para impresoras
- [ ] GET /api/admin/impresoras → listar con área
- [ ] POST /api/admin/impresoras → crear
- [ ] PUT /api/admin/impresoras/:id → actualizar
- [ ] PATCH /api/admin/impresoras/:id/estado → activar/desactivar
- [ ] POST /api/admin/impresoras/:id/probar → imprimir ticket de prueba

#### T1.10.5 - CRUD Usuarios
- [ ] Servicio y rutas para usuarios
- [ ] GET /api/admin/usuarios → listar
- [ ] POST /api/admin/usuarios → crear (hashear password)
- [ ] PUT /api/admin/usuarios/:id → actualizar
- [ ] PATCH /api/admin/usuarios/:id/password → cambiar contraseña
- [ ] PATCH /api/admin/usuarios/:id/estado → activar/desactivar

---

### M1.11 - Frontend: Configuración Base (4 horas)

#### T1.11.1 - Estructura y Build
- [ ] Crear proyecto con Vite + React + TypeScript
- [ ] Instalar dependencias: react-router-dom, axios, socket.io-client
- [ ] Instalar Tailwind CSS y configurar
- [ ] Instalar lucide-react (iconos)
- [ ] Configurar vite.config.ts (puerto, proxy)
- [ ] Configurar tailwind.config.js (colores personalizados)

#### T1.11.2 - Cliente HTTP
- [ ] Crear `src/api/axios.config.ts`
- [ ] Configurar baseURL (IP de la laptop)
- [ ] Interceptor request: agregar tokens (JWT o Mozo)
- [ ] Interceptor response: manejo de errores 401, 403, 500

#### T1.11.3 - Contextos
- [ ] Crear `src/context/AuthContext.tsx` (usuario autenticado)
- [ ] Crear `src/context/MozoContext.tsx` (mozo seleccionado)
- [ ] Crear `src/context/SocketContext.tsx` (conexión Socket.IO)
- [ ] Crear `src/context/PedidoContext.tsx` (carrito actual)

#### T1.11.4 - Hooks Personalizados
- [ ] Crear `src/hooks/useAuth.ts` (login, logout, usuario)
- [ ] Crear `src/hooks/useMozo.ts` (seleccionar, mozo actual)
- [ ] Crear `src/hooks/useSocket.ts` (conectar, escuchar eventos)
- [ ] Crear `src/hooks/usePedido.ts` (carrito, agregar/quitar ítems)

---

### M1.12 - Frontend: Login y Selección de Mozo (3 horas)

#### T1.12.1 - Página de Login
- [ ] Crear `src/pages/Login.tsx`
- [ ] Formulario: usuario, password
- [ ] Validación: campos requeridos
- [ ] Llamar a `authAPI.login()`
- [ ] Guardar token en localStorage
- [ ] Redirigir según rol (Admin → dashboard, Cajero → caja)

#### T1.12.2 - Página de Selección de Mozo
- [ ] Crear `src/pages/MozoSelect.tsx`
- [ ] Listar mozos activos (GET /api/mozos)
- [ ] Botones grandes con nombre del mozo
- [ ] Si tiene PIN: modal para ingresar PIN (4 dígitos)
- [ ] Llamar a `mozosAPI.seleccionar(id, pin)`
- [ ] Guardar sessionToken en localStorage
- [ ] Redirigir a `/mozo/menu`

---

### M1.13 - Frontend: Menú del Mozo (10 horas)

#### T1.13.1 - Componente de Categorías
- [ ] Crear `src/components/mozo/MenuCategories.tsx`
- [ ] Tabs horizontales con scroll
- [ ] Resaltar categoría activa
- [ ] Al hacer clic, scroll a la sección de productos

#### T1.13.2 - Componente de Producto
- [ ] Crear `src/components/mozo/ProductCard.tsx`
- [ ] Mostrar: foto, nombre, descripción, precio
- [ ] Botón "Agregar" → abrir modal de opciones
- [ ] Responsive: 2 columnas en móvil, 3-4 en tablet

#### T1.13.3 - Modal de Opciones de Producto
- [ ] Crear `src/components/mozo/ProductOptionsModal.tsx`
- [ ] Seleccionar opciones (checkboxes con precio extra)
- [ ] Input de cantidad (incremento/decremento)
- [ ] Textarea para nota
- [ ] Mostrar precio total del ítem
- [ ] Botón "Agregar al Pedido" → agregar a carrito

#### T1.13.4 - Componente de Carrito
- [ ] Crear `src/components/mozo/Cart.tsx`
- [ ] Lista de ítems con cantidad, nombre, opciones, nota
- [ ] Botón para quitar ítem (antes de enviar)
- [ ] Mostrar subtotal
- [ ] Botón "Continuar" → abrir modal de mesa/tipo

#### T1.13.5 - Modal de Selección de Mesa/Tipo
- [ ] Crear `src/components/mozo/MesaSelectorModal.tsx`
- [ ] Tabs: MESA | LLEVAR | DELIVERY
- [ ] Si MESA: grid de mesas (deshabilitar ocupadas)
- [ ] Permitir seleccionar múltiples mesas (checkboxes)
- [ ] Mostrar recargo "para llevar" si aplica
- [ ] Botón "Enviar Pedido" → POST /api/pedidos

#### T1.13.6 - Página de Menú
- [ ] Crear `src/pages/MozoMenu.tsx`
- [ ] Layout: header con nombre del mozo y botón carrito
- [ ] Buscador de productos (filtro local)
- [ ] MenuCategories + lista de ProductCard
- [ ] Cart flotante o en sidebar
- [ ] Notificaciones toast: "Pedido enviado correctamente"

#### T1.13.7 - Vista de Pedidos Activos
- [ ] Crear `src/components/mozo/ActiveOrders.tsx`
- [ ] Listar pedidos ABIERTOS y ENVIADOS del mozo
- [ ] Mostrar: mesa(s), total, estado, ítems
- [ ] Botón "Agregar ítems" → volver a menú con pedidoId en contexto
- [ ] Botón "Cambiar mesa" → modal con selector de mesas
- [ ] Actualización en tiempo real por Socket.IO

---

---

## FASE 2 - Caja y Cobro

### Estimación Total Fase 2: ~30 horas

### M2.1 - Backend: Turnos de Caja (4 horas)
- [ ] Servicio de turnos (abrir/cerrar)
- [ ] Rutas de caja
- [ ] Validaciones

### M2.2 - Backend: Cobro (8 horas)
- [ ] Servicio de cobro con pagos mixtos
- [ ] Servicio de comprobantes
- [ ] Transacción completa
- [ ] Rutas

### M2.3 - Backend: Impresión de Boleta (4 horas)
- [ ] Formato de boleta ESC/POS
- [ ] Impresión en Caja

### M2.4 - Backend: Anulación de Pedidos (3 horas)
- [ ] Servicio de anulación
- [ ] Auditoría

### M2.5 - Frontend: Caja (11 horas)
- [ ] Página de caja
- [ ] Apertura/cierre de turno
- [ ] Lista de pedidos
- [ ] Detalle de pedido
- [ ] Formulario de cobro
- [ ] Cierre de turno con cuadre

---

---

## FASE 3 - Dashboard y Reportes

### Estimación Total Fase 3: ~25 horas

### M3.1 - Backend: Servicio de Reportes (10 horas)
- [ ] Ventas por período
- [ ] Productos más vendidos
- [ ] Ventas por mozo/categoría/área
- [ ] Horas pico
- [ ] Historial de cierres

### M3.2 - Backend: Rutas de Reportes (2 horas)
- [ ] Endpoints de reportes
- [ ] Validaciones

### M3.3 - Frontend: Dashboard (13 horas)
- [ ] Página de dashboard
- [ ] Indicadores (KPIs)
- [ ] Gráficos de ventas
- [ ] Tablas de reportes
- [ ] Filtros por período

---

---

## TAREAS TRANSVERSALES (Aplican a todas las fases)

### T0.1 - Documentación (Continuo)
- [ ] README.md con instalación
- [ ] Manual de usuario
- [ ] Comentarios en código

### T0.2 - Pruebas (Continuo)
- [ ] Pruebas unitarias
- [ ] Pruebas de integración
- [ ] Pruebas manuales

### T0.3 - Scripts de Deployment (Al final)
- [ ] Script de backup
- [ ] Script de arranque automático
- [ ] Configuración de firewall

### T0.4 - PWA (Frontend, al final)
- [ ] Configurar vite-plugin-pwa
- [ ] Manifest.json
- [ ] Service worker

---

## RESUMEN DE ESTIMACIONES

| Fase | Módulos | Horas Estimadas |
|------|---------|-----------------|
| Fase 1 - MVP | 13 módulos | ~60 horas |
| Fase 2 - Caja | 5 módulos | ~30 horas |
| Fase 3 - Dashboard | 3 módulos | ~25 horas |
| **TOTAL** | **21 módulos** | **~115 horas** |

---

**Versión**: 1.0  
**Fecha**: 12/11/2026  
**Estado**: Pendiente de aprobación
