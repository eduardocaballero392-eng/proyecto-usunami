# REQUIREMENTS - Sistema de Gestión Anticuchería La Parrillita

## 1. CONTEXTO DEL NEGOCIO

### 1.1 Descripción del Negocio
**Anticuchería La Parrillita** es un restaurante ubicado en Lima, Perú, especializado en:
- Parrilla (anticuchos)
- Pollo broaster
- Platos a la carta
- Sopas
- Chifa
- Bebidas

### 1.2 Tipos de Servicio
- **Mesa**: Atención en las instalaciones del restaurante
- **Para llevar**: Cliente recoge su pedido
- **Delivery**: Entrega a domicilio

### 1.3 Áreas de Producción
El restaurante cuenta con **cuatro áreas operativas**, cada una equipada con su propia impresora térmica de red:

1. **Parrilla**: Anticuchos y preparaciones a la parrilla
2. **Broaster**: Pollo broaster y complementos
3. **Carta**: Platos a la carta, sopas, chifa
4. **Caja**: Punto de cobro y expedición

## 2. OBJETIVOS DEL SISTEMA

### 2.1 Objetivo Principal
Desarrollar un sistema de gestión integral que permita:
- Tomar pedidos desde dispositivos móviles
- Distribuir automáticamente las comandas a las áreas de producción
- Gestionar el cobro y emisión de comprobantes
- Generar reportes de ventas y análisis de negocio

### 2.2 Objetivos Específicos
1. **Agilizar la toma de pedidos**: Los mozos toman pedidos desde su celular sin necesidad de anotar en papel
2. **Optimizar la comunicación cocina-salón**: Impresión automática en cada área de producción
3. **Eliminar errores de transcripción**: El pedido llega directamente del mozo a la cocina
4. **Facilitar el control de caja**: Registro de pagos mixtos y cierre de turno
5. **Proporcionar información de negocio**: Reportes de ventas, productos más vendidos, horas pico

### 2.3 Alcance Excluido
- **NO** maneja inventario ni control de stock
- **NO** integra con SUNAT (facturación electrónica)
- **NO** requiere conexión a internet para operar

## 3. USUARIOS DEL SISTEMA

### 3.1 Mozos
- **Perfil**: Personal de atención al cliente sin conocimientos técnicos avanzados
- **Acceso**: Seleccionan su nombre de una lista (sin contraseña, opcionalmente con PIN de 4 dígitos)
- **Dispositivo**: Celular personal conectado a WiFi del local
- **Permisos**:
  - Tomar pedidos nuevos
  - Agregar ítems a pedidos abiertos
  - Cambiar mesa asignada
  - Quitar ítems ANTES de enviar el pedido
  - Ver estado de sus pedidos

### 3.2 Personal de Cocina (Cocinero, Parrilla, Broaster)
- **Perfil**: Personal de producción
- **Acceso**: Usuario y contraseña
- **Permisos**:
  - Ver comandas asignadas a su área
  - Marcar comandas como preparadas (Fase 2)

### 3.3 Cajero
- **Perfil**: Personal de caja
- **Acceso**: Usuario y contraseña
- **Permisos**:
  - Abrir/cerrar turno de caja
  - Procesar pagos (efectivo, Yape, Plin)
  - Emitir comprobantes
  - Anular ítems de pedidos enviados (con motivo)
  - Quitar recargo "para llevar" de ítems específicos
  - Ver todos los pedidos activos

### 3.4 Administrador
- **Perfil**: Gerente o dueño del negocio
- **Acceso**: Usuario y contraseña
- **Permisos**: Todos los anteriores más:
  - CRUD de productos, categorías, mesas, áreas, impresoras
  - CRUD de usuarios y mozos
  - Acceso a dashboard y reportes
  - Configuración del sistema

## 4. REQUERIMIENTOS FUNCIONALES

### 4.1 FASE 1 - MVP (Tomar Pedidos e Imprimir)

#### RF-001: Login del Personal
- **Actor**: Usuario autenticado (Cocinero, Cajero, Admin)
- **Descripción**: El personal ingresa con usuario y contraseña
- **Validaciones**:
  - Usuario debe existir y estar activo
  - Contraseña debe coincidir con el hash almacenado (bcrypt)
  - Genera token JWT con expiración de 8 horas
- **Resultado**: Acceso al sistema según su rol

#### RF-002: Selección de Mozo
- **Actor**: Mozo
- **Descripción**: Al abrir la aplicación web, el mozo selecciona su nombre de una lista
- **Validaciones**:
  - El mozo debe estar activo
  - Si tiene PIN configurado, debe ingresarlo (4 dígitos)
- **Resultado**: Queda registrado como el responsable de los pedidos que tome

#### RF-003: Visualización del Menú
- **Actor**: Mozo
- **Descripción**: Muestra el menú organizado por categorías
- **Especificaciones**:
  - Categorías ordenadas por `categorias.orden`
  - Productos por categoría con foto, nombre, descripción y precio
  - Buscador por nombre de producto
  - Vista mobile-first optimizada para celular
- **Datos mostrados**: Foto, nombre, precio base, descripción

#### RF-004: Selección de Productos
- **Actor**: Mozo
- **Descripción**: El mozo selecciona productos y configura el pedido
- **Especificaciones**:
  - Seleccionar cantidad (incremento/decremento)
  - Agregar nota por ítem (ej. "sin cebolla", "bien cocido")
  - Seleccionar opciones del producto (ej. "con papas fritas +2.00")
  - Ver precio total por ítem incluyendo opciones
- **Validaciones**:
  - Cantidad mínima: 1
  - Opciones solo las activas del producto

#### RF-005: Asignación de Mesa(s) o Tipo de Servicio
- **Actor**: Mozo
- **Descripción**: Antes de enviar el pedido, el mozo selecciona:
  - **Una o varias mesas** (ej. "Mesa 4 y 5" para cuenta compartida)
  - **LLEVAR**: Cliente recoge
  - **DELIVERY**: Entrega a domicilio
- **Validaciones**:
  - Una mesa solo puede estar en un pedido ABIERTO o ENVIADO a la vez
  - Si selecciona mesas, no puede marcar LLEVAR/DELIVERY y viceversa

#### RF-006: Cálculo Automático de Recargo "Para Llevar"
- **Actor**: Sistema
- **Descripción**: Cuando `pedidos.tipo = 'LLEVAR'`, se aplica automáticamente el recargo por ítem
- **Especificaciones**:
  - Cada producto tiene `recargoLlevar` (ej. taper S/ 1.00, botella S/ 0.50, resto S/ 0.00)
  - Al crear el ítem en `detalle_pedidos`, se copia `productos.recargoLlevar` → `detalle_pedidos.recargoUnitario`
  - **Total del ítem** = cantidad × (precioUnitario + recargoUnitario)
  - **Total del pedido** = suma de totales de ítems no anulados
- **Excepciones**:
  - Un usuario ADMIN o CAJERO puede poner el recargo de un ítem específico en 0 (cliente trae su propio envase)

#### RF-007: Envío del Pedido
- **Actor**: Mozo
- **Descripción**: Al confirmar, el pedido se guarda y se imprimen las comandas
- **Flujo**:
  1. **Transacción en la base de datos** (< 1 segundo):
     - Insertar en `pedidos` con estado 'ABIERTO', tipo, usuarioId (del mozo), total calculado
     - Insertar en `pedido_mesas` las mesas seleccionadas
     - Insertar en `detalle_pedidos` cada ítem con `precioUnitario`, `recargoUnitario`, `areaId`, `ronda = 1`
     - Responder al mozo: "Pedido enviado correctamente"
  2. **Impresión en segundo plano** (asíncrono):
     - Agrupar ítems por `areaId`
     - Para cada área, enviar comando de impresión a su impresora (IP:9100)
     - Registrar en `impresiones` con estado PENDIENTE → IMPRESA o ERROR
     - Notificar por Socket.IO el estado de impresión
- **Validaciones**:
  - Al menos un ítem en el pedido
  - Mesa(s) o tipo de servicio seleccionado
  - Mesa(s) no ocupadas por otro pedido activo

#### RF-008: Impresión de Comandas por Área
- **Actor**: Sistema
- **Descripción**: Imprime en papel térmico 80mm (~38 caracteres por línea)
- **Formato de Comanda**:
  ```
  ══════════════════════════════════════
         MESA 4 Y 5
  ══════════════════════════════════════
  Mozo: Juan Pérez
  Hora: 13:45
  ──────────────────────────────────────
  2x Anticuchos
     Nota: bien cocidos
  
  1x Pollo Broaster 1/4
  
  ──────────────────────────────────────
  ```
- **Especificaciones**:
  - Título "MESA n" o "PARA LLEVAR" o "DELIVERY" en doble altura
  - Solo ítems del área correspondiente
  - Cantidad × nombre del producto
  - Nota debajo si existe
  - Corte automático de papel (ESC/POS)

#### RF-009: Comandas Diferenciales (Rondas)
- **Actor**: Mozo
- **Descripción**: Al agregar ítems a un pedido abierto, solo se imprimen los nuevos
- **Especificaciones**:
  - Campo `detalle_pedidos.ronda` inicia en 1
  - Al agregar ítems, se incrementa la ronda (2, 3, ...)
  - Se imprimen solo los ítems de la nueva ronda
  - Título de comanda: "AGREGADO - MESA n" (si ronda >= 2)
- **Caso de uso**: Cliente pide entrada, luego pide plato de fondo

#### RF-010: Manejo de Errores de Impresión
- **Actor**: Sistema
- **Descripción**: Si una impresora falla, el pedido no se pierde
- **Especificaciones**:
  - Registrar en `impresiones.estado = 'ERROR'`
  - Guardar mensaje de error en `impresiones.error`
  - Incrementar `impresiones.intentos`
  - Reintento automático hasta 3 veces con delay de 30 segundos
  - Notificar por Socket.IO al personal de cocina y caja
  - Botón manual "Reintentar impresión"
  - Modo mock (PRINTER_MODE=mock): imprime en consola/archivo

#### RF-011: Gestión de Pedidos Abiertos
- **Actor**: Mozo
- **Descripción**: Operaciones sobre pedidos aún no cobrados
- **Funcionalidades**:
  - **Ver mis pedidos activos** (ABIERTO, ENVIADO)
  - **Agregar ítems** a un pedido abierto (genera nueva ronda)
  - **Cambiar mesa(s)**: mover el pedido a otra(s) mesa(s)
  - **Quitar ítems** ANTES de enviar (eliminar del carrito)
  - **Ver estado de impresión** por área

#### RF-012: Anulación de Ítems
- **Actor**: Mozo, Cajero, Admin
- **Descripción**: Marcar un ítem como anulado sin borrarlo
- **Casos**:
  1. **Antes de enviar** (pedido en carrito):
     - El mozo puede quitar ítems libremente
     - No genera registro de auditoría
  2. **Después de enviar** (pedido ya enviado a cocina):
     - Requiere usuario ADMIN o CAJERO autenticado
     - Requiere ingresar motivo (ej. "Cliente cambió de opinión")
     - Guarda `anuladoPor`, `anuladoEn`, `motivoAnulacion`
     - Imprime ticket de anulación en el área correspondiente:
       ```
       ══════════════════════════════════════
              ⚠️  ANULADO  ⚠️
       ══════════════════════════════════════
       MESA 4
       
       2x Anticuchos
       
       Motivo: Cliente cambió de opinión
       ══════════════════════════════════════
       ```
     - Recalcula automáticamente el total del pedido

#### RF-013: Reimprimir Comanda Completa
- **Actor**: Cajero, Admin
- **Descripción**: Botón manual para reimprimir toda la comanda de un pedido
- **Caso de uso**: Se perdió el ticket en cocina
- **Especificación**: Imprime todos los ítems no anulados, agrupados por área

#### RF-014: CRUD de Productos
- **Actor**: Admin
- **Descripción**: Gestionar el menú
- **Funcionalidades**:
  - Crear producto: nombre, descripción, precio, categoría, área, recargo para llevar, foto
  - Editar producto
  - Desactivar producto (no se puede eliminar si tiene ventas)
  - Ver historial de cambios de precio (Fase 3)
- **Validaciones**:
  - Precio y recargo >= 0
  - Categoría y área deben existir
  - Nombre único por categoría

#### RF-015: CRUD de Categorías
- **Actor**: Admin
- **Descripción**: Gestionar categorías del menú
- **Funcionalidades**:
  - Crear categoría: nombre, orden
  - Editar categoría
  - Reordenar categorías (cambiar campo orden)
  - Eliminar (solo si no tiene productos)

#### RF-016: CRUD de Mesas
- **Actor**: Admin
- **Descripción**: Gestionar mesas del restaurante
- **Funcionalidades**:
  - Crear mesa: número único
  - Editar número
  - Ver estado (libre, ocupada con número de pedido)
  - Eliminar (solo si no tiene pedidos activos)

#### RF-017: CRUD de Áreas e Impresoras
- **Actor**: Admin
- **Descripción**: Configurar áreas de producción e impresoras
- **Funcionalidades**:
  - Crear área: nombre único
  - Editar área
  - Crear impresora: nombre, IP, puerto (default 9100), área, activa
  - Editar impresora
  - Activar/desactivar impresora
  - Probar impresión (ticket de prueba)

#### RF-018: CRUD de Mozos
- **Actor**: Admin
- **Descripción**: Gestionar mozos
- **Funcionalidades**:
  - Crear mozo: nombre, PIN opcional (4 dígitos), activo
  - Editar mozo
  - Activar/desactivar mozo
  - Ver historial de pedidos por mozo

#### RF-019: CRUD de Usuarios
- **Actor**: Admin
- **Descripción**: Gestionar usuarios del sistema (personal autenticado)
- **Funcionalidades**:
  - Crear usuario: nombre, usuario (login), password, rol
  - Editar usuario
  - Cambiar contraseña (hash con bcrypt)
  - Desactivar usuario
- **Roles**: COCINERO, PARRILLA, BROASTER, ADMIN, CAJERO

### 4.2 FASE 2 - Caja y Cobro

#### RF-020: Apertura de Turno de Caja
- **Actor**: Cajero
- **Descripción**: Iniciar turno de trabajo con monto inicial
- **Flujo**:
  1. Cajero ingresa monto inicial en efectivo
  2. Sistema registra en `turnos_caja`: usuarioId, montoInicial, apertura (timestamp)
  3. Solo puede haber un turno abierto por cajero
- **Validaciones**:
  - El cajero no puede tener otro turno abierto
  - Monto inicial >= 0

#### RF-021: Cierre de Turno de Caja
- **Actor**: Cajero
- **Descripción**: Finalizar turno y cuadrar caja
- **Flujo**:
  1. Sistema calcula:
     - Monto esperado = montoInicial + suma(pagos.monto WHERE metodo='EFECTIVO')
     - Total Yape = suma(pagos.monto WHERE metodo='YAPE')
     - Total Plin = suma(pagos.monto WHERE metodo='PLIN')
  2. Cajero ingresa monto final real contado
  3. Sistema calcula diferencia = montoFinal - montoEsperado
  4. Registra cierre (timestamp) y montoFinal
  5. Imprime reporte de cierre en impresora de Caja
- **Validaciones**:
  - Todos los pedidos del turno deben estar cobrados o anulados

#### RF-022: Proceso de Cobro
- **Actor**: Cajero
- **Descripción**: Cobrar un pedido con uno o varios métodos de pago
- **Flujo** (en una transacción):
  1. Cajero selecciona pedido a cobrar (estado ABIERTO o ENVIADO)
  2. Muestra total del pedido
  3. Cajero ingresa pagos:
     - **Efectivo**: monto recibido → sistema calcula aplicado y vuelto
     - **Yape/Plin**: monto exacto aplicado
  4. Cuando suma(pagos.monto) = pedidos.total:
     - Cambiar estado del pedido a PAGADO
     - Liberar mesa(s) asociadas
     - Generar comprobante con numeración correlativa
     - Imprimir boleta en impresora de Caja
  5. Responder: "Cobro realizado correctamente"
- **Validaciones**:
  - Suma de pagos debe ser exactamente igual al total
  - Al menos un método de pago
  - El pedido no debe estar ya pagado o anulado

#### RF-023: Generación de Comprobantes
- **Actor**: Sistema
- **Descripción**: Asignar número correlativo único por serie
- **Especificaciones**:
  - Tabla `series` con serie (ej. B001) y siguienteNumero
  - Dentro de la transacción de cobro:
    1. `SELECT siguienteNumero FROM series WHERE serie = 'B001' FOR UPDATE`
    2. Insertar en `comprobantes`: pedidoId, serie, numero, total, creadoEn
    3. `UPDATE series SET siguienteNumero = siguienteNumero + 1 WHERE serie = 'B001'`
  - Restricción UNIQUE(serie, numero) previene duplicados

#### RF-024: Impresión de Boleta
- **Actor**: Sistema
- **Descripción**: Imprimir ticket de venta en impresora de Caja
- **Formato**:
  ```
  ══════════════════════════════════════
    BOLETA DE VENTA ELECTRÓNICA
  ══════════════════════════════════════
  B001 - 00000123
  
  Fecha: 12/11/2026    Hora: 14:30
  
  Mesa: 4 y 5
  Atendió: Juan Pérez
  Cliente: CLIENTES VARIOS
  ──────────────────────────────────────
  Cant  Descripción         Importe
  ──────────────────────────────────────
  2     Anticuchos           50.00
        (+ Taper 2.00)
  
  1     Inca Kola 1.5L        8.00
        (+ Botella 0.50)
  
  ──────────────────────────────────────
  TOTAL S/                   60.50
  ──────────────────────────────────────
  Pago: EFECTIVO             70.00
  Vuelto:                     9.50
  ──────────────────────────────────────
       Gracias por su visita
  ══════════════════════════════════════
  ```
- **Especificaciones**:
  - **NO** incluir: IGV, operación gravada, cajero, datos del negocio
  - Si hay recargo, mostrarlo entre paréntesis debajo del producto
  - Si pago mixto, listar todos los métodos
  - Son tickets internos, no facturas electrónicas

#### RF-025: Anulación de Pedidos
- **Actor**: Admin
- **Descripción**: Anular un pedido completo antes de cobrarlo
- **Flujo**:
  1. Ingresar motivo de anulación
  2. Cambiar estado del pedido a ANULADO
  3. Liberar mesa(s)
  4. Registrar auditoría: usuarioId, motivoAnulacion, anuladoEn
- **Validaciones**:
  - El pedido no debe estar PAGADO
  - Solo rol ADMIN
  - Motivo obligatorio

### 4.3 FASE 3 - Dashboard y Reportes

#### RF-026: Dashboard Principal
- **Actor**: Admin
- **Descripción**: Vista general del negocio
- **Indicadores en tiempo real**:
  - Mesas ocupadas vs libres
  - Pedidos activos por estado
  - Ventas del día actual
  - Ticket promedio del día
  - Hora pico (mayor facturación)

#### RF-027: Reporte de Ventas por Período
- **Actor**: Admin
- **Descripción**: Filtrar ventas por fecha
- **Filtros**:
  - Día específico
  - Semana actual/anterior
  - Mes actual/anterior
  - Rango personalizado
- **Datos mostrados**:
  - Total vendido (excluye anulados)
  - Cantidad de pedidos
  - Ticket promedio
  - Desglose por método de pago

#### RF-028: Productos Más Vendidos
- **Actor**: Admin
- **Descripción**: Ranking de productos por período
- **Especificaciones**:
  - Top 10/20/50 productos
  - Cantidad vendida
  - Total facturado por producto
  - Gráfico de barras

#### RF-029: Ventas por Mozo
- **Actor**: Admin
- **Descripción**: Desempeño de mozos
- **Datos**:
  - Cantidad de pedidos por mozo
  - Total vendido por mozo
  - Ticket promedio por mozo
  - Comparativa

#### RF-030: Ventas por Categoría
- **Actor**: Admin
- **Descripción**: Distribución de ventas
- **Especificaciones**:
  - Total por categoría
  - Porcentaje del total
  - Gráfico de pastel

#### RF-031: Ventas por Área
- **Actor**: Admin
- **Descripción**: Carga de trabajo por área
- **Datos**:
  - Cantidad de ítems producidos por área
  - Total facturado por área

#### RF-032: Análisis de Horas Pico
- **Actor**: Admin
- **Descripción**: Identificar horarios de mayor demanda
- **Especificaciones**:
  - Agrupación por hora (12:00-13:00, 13:00-14:00, etc.)
  - Cantidad de pedidos por hora
  - Total facturado por hora
  - Gráfico de líneas

#### RF-033: Reporte de Cierre de Caja por Turno
- **Actor**: Admin
- **Descripción**: Historial de cierres de caja
- **Filtros**:
  - Por cajero
  - Por fecha
- **Datos**:
  - Fecha y hora de apertura/cierre
  - Monto inicial/final
  - Diferencia (cuadre)
  - Desglose por método de pago

## 5. REQUERIMIENTOS NO FUNCIONALES

### RNF-001: Rendimiento
- Respuesta al mozo al enviar pedido: < 1 segundo
- Impresión en segundo plano: no bloquea la interfaz
- Dashboard con datos de hasta 1 año: carga < 3 segundos

### RNF-002: Disponibilidad
- El sistema funciona 100% offline (red local)
- Sin dependencia de internet
- Tolerante a fallos de impresoras (pedido no se pierde)

### RNF-003: Seguridad
- Contraseñas hasheadas con bcrypt (10 rounds)
- JWT con expiración de 8 horas
- Validación de entradas (SQL injection, XSS)
- Base de datos nunca expuesta a internet
- Variables sensibles en .env (nunca en el código)

### RNF-004: Precisión Financiera
- Todo dinero en DECIMAL(10,2), nunca FLOAT
- Redondeo a 2 decimales en todos los cálculos
- Zona horaria: America/Lima

### RNF-005: Auditoría
- Log de errores de impresión con timestamp
- Registro de quién anuló qué y por qué
- Historial de cambios en productos (Fase 3)

### RNF-006: Respaldo
- Backup automático diario con mysqldump
- Carpeta configurable (ej. C:\Backups\Parrillita)
- Rotación: mantener últimos 30 días
- Ejecutar a las 4:00 AM (horario de menor actividad)

### RNF-007: Usabilidad
- Interfaz en español
- Mobile-first (celulares de mozos)
- Botones grandes (mínimo 44x44px)
- Mensajes de error claros para usuarios no técnicos
- Sin necesidad de capacitación técnica para mozos

### RNF-008: Mantenibilidad
- Código TypeScript con tipos estrictos
- Estructura modular: routes, services, middlewares
- Comentarios en español
- Logs estructurados
- README con instrucciones de instalación

### RNF-009: Escalabilidad
- Soporte para hasta 50 mesas
- Hasta 10 mozos simultáneos
- Hasta 500 productos en el menú
- Base de datos optimizada con índices

### RNF-010: Compatibilidad
- Funciona en Windows 10/11 con XAMPP
- Navegadores móviles modernos (Chrome, Safari iOS/Android)
- Impresoras térmicas ESC/POS estándar (puerto 9100)

## 6. RESTRICCIONES Y SUPUESTOS

### 6.1 Restricciones
- **Hardware**: Laptop Windows con XAMPP instalado
- **Red**: WiFi local del restaurante (no requiere internet)
- **Impresoras**: Térmicas de red con protocolo ESC/POS
- **Celulares**: Los mozos usan sus propios dispositivos
- **Base de datos**: Esquema existente, no se puede modificar sin aprobación

### 6.2 Supuestos
- La laptop del restaurante tiene IP fija en la red local
- Las impresoras tienen IP fija configurada
- Hay energía eléctrica estable (se recomienda UPS)
- Los celulares tienen batería suficiente durante el turno
- El restaurante cuenta con técnico para configuración inicial

## 7. GLOSARIO

- **Comanda**: Ticket impreso para el área de producción con los ítems a preparar
- **Boleta**: Comprobante de pago entregado al cliente (ticket interno, no factura electrónica)
- **Turno de Caja**: Período de trabajo de un cajero, desde apertura hasta cierre
- **Ronda**: Cada envío de ítems adicionales a un pedido ya existente
- **Área**: Zona de producción del restaurante (Parrilla, Broaster, Carta, Caja)
- **Mozo**: Personal de atención al cliente que toma pedidos
- **PWA**: Progressive Web App, aplicación web que funciona como app nativa
- **ESC/POS**: Protocolo estándar de impresoras térmicas
- **JWT**: JSON Web Token, mecanismo de autenticación
- **Mock**: Modo de simulación sin hardware real (para pruebas)

## 8. CRITERIOS DE ACEPTACIÓN

### Fase 1 - MVP
- ✅ Un mozo puede tomar un pedido desde su celular en < 30 segundos
- ✅ El pedido llega impreso a cada área en < 10 segundos
- ✅ Si una impresora falla, el sistema reintenta automáticamente
- ✅ El mozo puede agregar ítems a un pedido abierto
- ✅ El recargo "para llevar" se aplica automáticamente
- ✅ Los ítems anulados después de enviar generan ticket de anulación

### Fase 2 - Caja
- ✅ Un cajero puede cobrar un pedido con pago mixto en < 1 minuto
- ✅ La numeración de comprobantes es correlativa sin saltos
- ✅ El cierre de caja muestra el cuadre correcto
- ✅ Las mesas se liberan automáticamente al pagar

### Fase 3 - Dashboard
- ✅ El admin puede ver las ventas del mes en < 3 segundos
- ✅ Los reportes excluyen pedidos anulados
- ✅ El dashboard muestra datos en tiempo real

## 9. PLAN DE PRUEBAS

### Pruebas Unitarias
- Cálculo de totales con recargo
- Reparto de ítems por áreas
- Numeración de comprobantes
- Validación de mesa ocupada

### Pruebas de Integración
- Flujo completo: pedido → impresión → cobro
- Modo mock (sin impresoras físicas)
- Reintentos de impresión
- Transacciones de cobro

### Pruebas de Usuario
- Mozo toma pedido en celular (usabilidad)
- Cajero cobra pedido mixto
- Admin genera reporte de ventas

### Pruebas de Carga
- 10 mozos tomando pedidos simultáneamente
- 50 pedidos en una hora
- Dashboard con 1 año de datos

## 10. ENTREGABLES

1. **requirements.md** ← Este documento
2. **design.md** - Arquitectura, diagramas, API REST
3. **tasks.md** - Tareas de implementación por fases
4. **Migraciones SQL** - Actualizaciones al esquema existente
5. **Código Backend** - Node.js + Express + TypeScript
6. **Código Frontend** - React + Vite + TypeScript + Tailwind
7. **Pruebas** - Unitarias e integración
8. **README.md** - Instalación y configuración
9. **Manual de Usuario** - Guía para mozos y cajeros

---

**Versión**: 1.0  
**Fecha**: 12/11/2026  
**Estado**: Pendiente de aprobación
