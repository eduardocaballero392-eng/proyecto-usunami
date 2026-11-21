# ✅ IMPLEMENTACIÓN SISTEMA DE IMPRESIÓN TÉRMICA

## 📋 Resumen

Se implementó un sistema completo de impresión térmica usando `node-thermal-printer`, integrado con el sistema existente de "La Parrillita".

---

## 📂 Archivos Creados/Modificados

### ✅ Archivos Nuevos

1. **`backend/src/services/printer.service.ts`**
   - Servicio principal de impresión térmica
   - Funciones: `imprimirTicket()`, `imprimirPrueba()`, `verificarConexionImpresora()`
   - Integrado con variables de entorno (`env.impresion`)
   - Compatible con tabla `impresiones` existente
   - Modo MOCK y NETWORK

2. **`backend/src/routes/printer.routes.ts`**
   - Rutas de API para impresión
   - `POST /api/printer/ticket/:pedidoId/:areaId`
   - `POST /api/printer/prueba/:areaId`
   - `GET /api/printer/verificar/:areaId`
   - `POST /api/printer/reimprimir/:pedidoId/:areaId`

3. **`backend/IMPRESION_TERMICA.md`**
   - Documentación completa del sistema
   - Ejemplos de uso con cURL y Fetch
   - Guía de configuración
   - Troubleshooting

4. **`CAMBIOS_IMPRESION_TERMICA.md`** (este archivo)
   - Resumen de implementación

### 🔧 Archivos Modificados

1. **`backend/src/app.ts`**
   - Agregado: `import printerRoutes from './routes/printer.routes'`
   - Agregado: `app.use('/api/printer', printerRoutes)`

---

## 🎯 Funcionalidades Implementadas

### 1. Impresión de Tickets
- ✅ Comandas de cocina (por área)
- ✅ Boletas de venta
- ✅ Diseño optimizado para impresoras de 80mm
- ✅ Soporte para:
  - Mesas
  - Para llevar
  - Delivery
  - Notas especiales
  - Opciones de productos

### 2. Modos de Operación
- ✅ **Modo MOCK**: Simula impresión, guarda en logs
- ✅ **Modo NETWORK**: Impresión real vía TCP/IP

### 3. Integración
- ✅ Usa variables de entorno existentes (`PRINTER_MODE`, `PRINTER_TIMEOUT_MS`, etc.)
- ✅ Compatible con tabla `impresoras` de la BD
- ✅ Compatible con tabla `impresiones` (cola y tracking)
- ✅ Registro de errores y reintentos
- ✅ Logs en `backend/logs/impresiones-YYYY-MM-DD.log`

### 4. Seguridad
- ✅ Autenticación requerida (JWT)
- ✅ Endpoints admin solo para ADMIN
- ✅ Validación de parámetros con express-validator

---

## 📊 Estructura del Sistema

```
backend/
├── src/
│   ├── services/
│   │   ├── impresion.service.ts    (Sistema existente - ESC/POS raw)
│   │   └── printer.service.ts      (NUEVO - node-thermal-printer)
│   ├── routes/
│   │   └── printer.routes.ts       (NUEVO - Endpoints de API)
│   └── app.ts                       (MODIFICADO - Registra rutas)
├── logs/
│   └── impresiones-YYYY-MM-DD.log  (Logs en modo MOCK)
├── IMPRESION_TERMICA.md             (NUEVO - Documentación)
└── .env                             (Configuración existente)
```

---

## 🔧 Configuración Requerida

### 1. Variables de Entorno (.env)

Ya existen en tu sistema:
```env
PRINTER_MODE=mock              # mock o network
PRINTER_TIMEOUT_MS=5000        # Timeout en ms
PRINTER_MAX_RETRIES=3          # Reintentos
PRINTER_RETRY_DELAY_S=30       # Espera entre reintentos
PRINTER_WIDTH_CHARS=42         # Ancho en caracteres
```

### 2. Base de Datos

Tablas existentes que se usan:
- `impresoras`: Configuración de impresoras por área
- `impresiones`: Cola de impresiones (tracking)
- `pedidos`: Datos de pedidos
- `detalle_pedidos`: Items del pedido
- `areas`: Áreas de producción

### 3. Dependencia

Ya instalada:
```json
{
  "dependencies": {
    "node-thermal-printer": "^4.6.1"
  }
}
```

---

## 🚀 Cómo Usar

### Paso 1: Configurar Impresoras en la BD

```sql
-- Ejemplo: Agregar impresora para área PARRILLA
INSERT INTO impresoras (areaId, nombre, ip, puerto, activa)
VALUES (
  (SELECT id_areas FROM areas WHERE nombre = 'PARRILLA'),
  'Impresora Parrilla Principal',
  '192.168.1.100',
  9100,
  1
);
```

### Paso 2: Probar en Modo MOCK

```bash
# Imprimir prueba (simula en logs)
curl -X POST http://localhost:3000/api/printer/prueba/1 \
  -H "Authorization: Bearer TOKEN_ADMIN"
```

### Paso 3: Verificar Logs

```bash
# Ver log de impresiones simuladas
cat backend/logs/impresiones-2026-11-18.log
```

### Paso 4: Probar Conexión Real

```bash
# Verificar que la impresora esté accesible
curl -X GET http://localhost:3000/api/printer/verificar/1 \
  -H "Authorization: Bearer TOKEN_ADMIN"
```

### Paso 5: Imprimir Ticket Real

```bash
# Cambiar a modo network en .env
PRINTER_MODE=network

# Reiniciar backend
npm run dev

# Imprimir comanda
curl -X POST http://localhost:3000/api/printer/ticket/123/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"COMANDA"}'
```

---

## 🎨 Formato del Ticket

### Características del Diseño

- ✅ Encabezado con nombre del restaurante
- ✅ Tipo de documento (COMANDA / BOLETA)
- ✅ Información del pedido (#, fecha, mozo, mesa)
- ✅ Lista de productos con cantidades y precios
- ✅ Opciones y notas destacadas en negrita
- ✅ Total (solo en boletas)
- ✅ Corte automático de papel
- ✅ Soporte para caracteres especiales (ñ, tildes)

### Ancho Configurable

- Por defecto: 42 caracteres (impresoras de 80mm)
- Configurable vía `PRINTER_WIDTH_CHARS`

---

## 📡 Endpoints de API

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/printer/ticket/:pedidoId/:areaId` | Imprimir ticket (comanda o boleta) | Requerida |
| POST | `/api/printer/prueba/:areaId` | Imprimir ticket de prueba | Admin |
| GET | `/api/printer/verificar/:areaId` | Verificar conexión con impresora | Admin |
| POST | `/api/printer/reimprimir/:pedidoId/:areaId` | Reimprimir ticket | Requerida |

---

## 🔍 Integración con Frontend

### Ejemplo: Botón para Imprimir Comanda

```tsx
// En el componente de pedidos
const imprimirComanda = async (pedidoId: number, areaId: number) => {
  try {
    const response = await api.post(
      `/printer/ticket/${pedidoId}/${areaId}`,
      { tipo: 'COMANDA' }
    );
    
    toast.success('Comanda enviada a impresión');
  } catch (error) {
    toast.error('Error al imprimir comanda');
    console.error(error);
  }
};

// Botón
<button onClick={() => imprimirComanda(pedido.id, 1)}>
  <Printer className="h-4 w-4" />
  Imprimir Comanda
</button>
```

---

## 🐛 Troubleshooting

### Problema: "No hay impresora activa"
**Solución:** Configurar impresora en la BD para ese área

### Problema: "Connection timeout"
**Solución:** Verificar IP, puerto, y que la impresora esté encendida

### Problema: Caracteres extraños
**Solución:** Ajustar `characterSet` en `printer.service.ts`

### Problema: No corta el papel
**Solución:** Usar `printer.partialCut()` o comentar `printer.cut()`

---

## 📈 Ventajas vs Sistema Anterior

| Característica | Sistema Anterior | Sistema Nuevo (Thermal) |
|----------------|------------------|-------------------------|
| Librería | ESC/POS raw manual | node-thermal-printer |
| Formato | Comando por comando | API de alto nivel |
| Mantenibilidad | Complejo | Simple |
| Debugging | Difícil | Fácil (logs claros) |
| Testing | Solo real | MOCK + real |
| Documentación | Limitada | Completa |
| Diseño | Manual | Helpers integrados |

---

## 🎯 Próximos Pasos (Opcional)

1. **Impresión Automática**: Integrar con `pedidos.service.ts` para imprimir automáticamente al crear pedido

2. **Panel de Administración**: Crear UI para gestionar impresoras desde el frontend

3. **Historial de Impresiones**: Crear vista en admin para ver impresiones exitosas/fallidas

4. **Notificaciones**: Alertar cuando una impresión falla

5. **Múltiples Impresoras**: Soportar varias impresoras por área (load balancing)

---

## ✅ Testing

### Test Manual

```bash
# 1. Modo MOCK
PRINTER_MODE=mock npm run dev
curl -X POST http://localhost:3000/api/printer/ticket/1/1 -H "Authorization: Bearer TOKEN"

# 2. Verificar log
cat backend/logs/impresiones-$(date +%Y-%m-%d).log

# 3. Modo NETWORK
PRINTER_MODE=network npm run dev
curl -X POST http://localhost:3000/api/printer/prueba/1 -H "Authorization: Bearer TOKEN_ADMIN"
```

### Test de Integración

Postman Collection disponible en `IMPRESION_TERMICA.md`

---

## 📝 Notas Importantes

1. ✅ **Compatible con sistema existente**: No reemplaza `impresion.service.ts`, es una alternativa moderna

2. ✅ **Modo MOCK por defecto**: Seguro para desarrollo, no requiere impresoras reales

3. ✅ **Logs persistentes**: Todas las impresiones (MOCK y NETWORK) se registran

4. ✅ **Reintentos automáticos**: Si falla, el worker existente reintentará

5. ✅ **Sin breaking changes**: El sistema anterior sigue funcionando

---

## 🎉 Resultado Final

**Sistema de impresión térmica profesional, integrado y listo para producción.**

- ✅ Código limpio y bien documentado
- ✅ Fácil de mantener y extender
- ✅ Compatible con el sistema existente
- ✅ Testing simple (modo MOCK)
- ✅ Producción ready (modo NETWORK)

---

**Implementación completada el:** 18/11/2026  
**Versión:** 1.0.0  
**Estado:** ✅ Listo para usar
