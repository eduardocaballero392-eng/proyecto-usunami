# 🔵 CAMBIOS: Soporte Bluetooth para Impresoras Térmicas

**Fecha:** 2026-11-20  
**Sistema:** La Parrillita - Sistema de Impresión Térmica

---

## ✅ Resumen

Se ha adaptado el sistema de impresión térmica para soportar **3 tipos de conexión**:

1. **TCP/IP** (Red) - Para impresoras de red
2. **Bluetooth** (BLE) - Para impresoras Bluetooth inalámbricas
3. **COM** (USB/Serial) - Para impresoras conectadas por cable USB

**Librería:** `node-thermal-printer` (ya instalada, no necesita cambios)

---

## 📁 Archivos Modificados

### 1. **backend/src/services/printer.service.ts**
- ✅ Agregado soporte para `tipo_conexion`: TCP, BLUETOOTH, COM
- ✅ Actualizada interfaz `DatosImpresora` con campos `nombre_bluetooth` y `puerto_com`
- ✅ Modificada función `obtenerImpresora()` para validar configuración según tipo
- ✅ Actualizada función `imprimirTicket()` para determinar interface según tipo
- ✅ Actualizada función `imprimirPrueba()` para mostrar información de conexión
- ✅ Actualizada función `verificarConexionImpresora()` para todos los tipos

### 2. **backend/src/config/env.ts**
- ✅ Cambiado tipo de `modo` de `'network' | 'mock'` a `'network' | 'bluetooth' | 'mock'`
- ✅ Actualizado timeout por defecto de 5000ms a 10000ms (necesario para Bluetooth)
- ✅ Validación de PRINTER_MODE para aceptar 'bluetooth'

### 3. **backend/.env.example**
- ✅ Actualizado comentario de PRINTER_MODE (bluetooth en lugar de network)
- ✅ Documentado que Bluetooth requiere timeouts más altos (10-15 segundos)
- ✅ Actualizado valor por defecto de PRINTER_TIMEOUT_MS a 10000

### 4. **backend/IMPRESION_TERMICA.md**
- ✅ Completamente reescrito con:
  - Instrucciones de instalación de Python y bleak
  - Guía para encontrar nombre de impresora Bluetooth
  - Guía para encontrar puerto COM
  - Ejemplos de configuración SQL para cada tipo
  - Troubleshooting detallado para problemas comunes
  - Comparación de métodos de conexión (ventajas/desventajas)
  - Recomendaciones de configuración para el restaurante

---

## 🆕 Archivos Creados

### 1. **database/migracion_impresoras_bluetooth.sql**
Migración SQL que:
- Agrega columnas `tipo_conexion`, `nombre_bluetooth`, `puerto_com` a tabla `impresoras`
- Incluye ejemplos comentados de configuración
- Incluye query de verificación
- Incluye notas importantes sobre requisitos

**EJECUTAR ANTES DE USAR BLUETOOTH:**
```bash
mysql -u parrillita_app -p parrillita < database/migracion_impresoras_bluetooth.sql
```

### 2. **backend/scripts/escanear-bluetooth.py**
Script Python para escanear dispositivos Bluetooth:
- Lista todos los dispositivos Bluetooth disponibles
- Marca posibles impresoras térmicas con 🖨️
- Muestra señal (RSSI) de cada dispositivo
- Permite verificar un dispositivo específico por nombre
- Incluye troubleshooting si no encuentra dispositivos

**USO:**
```bash
# Escanear todos los dispositivos
python backend/scripts/escanear-bluetooth.py

# Verificar un dispositivo específico
python backend/scripts/escanear-bluetooth.py "RPP02N"
```

---

## 🔧 Configuración Requerida

### Paso 1: Instalar Python (Solo para Bluetooth)

Si vas a usar impresoras Bluetooth, necesitas:

```bash
# 1. Descargar e instalar Python 3.8+ desde:
https://www.python.org/downloads/

# 2. Verificar instalación
python --version

# 3. Instalar bleak
pip install bleak

# 4. Verificar bleak
python -c "import bleak; print('OK')"
```

### Paso 2: Ejecutar Migración de Base de Datos

```bash
cd sistema-pollo
mysql -u parrillita_app -p parrillita < database/migracion_impresoras_bluetooth.sql
```

### Paso 3: Encontrar tu Impresora

#### Opción A: Bluetooth

```bash
# Escanear dispositivos Bluetooth
python backend/scripts/escanear-bluetooth.py

# Buscar dispositivos con 🖨️ en la lista
# Copiar el nombre EXACTO (case-sensitive)
```

#### Opción B: Puerto COM (USB)

1. **Conectar impresora por USB**
2. **Administrador de Dispositivos** → **Puertos (COM y LPT)**
3. **Anotar el puerto** (ej: COM3)

### Paso 4: Configurar Impresora en Base de Datos

#### Para Bluetooth:
```sql
-- Actualizar impresora existente
UPDATE impresoras
SET tipo_conexion = 'BLUETOOTH',
    nombre_bluetooth = 'RPP02N'  -- Cambiar por tu nombre
WHERE id_impresoras = 1;

-- O crear nueva
INSERT INTO impresoras (areaId, nombre, tipo_conexion, nombre_bluetooth, activa)
VALUES (1, 'Parrilla BT', 'BLUETOOTH', 'RPP02N', 1);
```

#### Para COM (USB):
```sql
UPDATE impresoras
SET tipo_conexion = 'COM',
    puerto_com = 'COM3'  -- Cambiar por tu puerto
WHERE id_impresoras = 1;
```

#### Para TCP/IP (Red):
```sql
-- No necesita cambios, ya funciona con configuración actual
UPDATE impresoras
SET tipo_conexion = 'TCP'
WHERE id_impresoras = 1;
```

### Paso 5: Actualizar .env

```env
# Cambiar de mock a bluetooth para producción
PRINTER_MODE=bluetooth

# Aumentar timeout para Bluetooth (recomendado)
PRINTER_TIMEOUT_MS=10000
```

---

## 🧪 Pruebas

### 1. Verificar Conexión (desde Postman/cURL)

```bash
curl -X GET http://localhost:3000/api/printer/verificar/1 \
  -H "Authorization: Bearer TU_TOKEN"
```

**Respuesta esperada:**
```json
{
  "conectada": true,
  "mensaje": "Conectada a Parrilla BT (Bluetooth: RPP02N)"
}
```

### 2. Imprimir Prueba

```bash
curl -X POST http://localhost:3000/api/printer/prueba/1 \
  -H "Authorization: Bearer TU_TOKEN"
```

**Debe imprimir:**
```
===========================================
       LA PARRILLITA
===========================================

=== IMPRESION DE PRUEBA ===

Impresora: Parrilla BT
Area: PARRILLA
Tipo: BLUETOOTH
Conexion: Bluetooth: RPP02N
Fecha: 20/11/2026 15:30

Si puede leer esto,
la impresora funciona correctamente

===========================================
```

### 3. Imprimir Comanda Real

```bash
curl -X POST http://localhost:3000/api/printer/ticket/123/1 \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"COMANDA"}'
```

---

## 🐛 Troubleshooting

### Problema: "Cannot find module 'bleak'"

**Solución:**
```bash
pip install bleak

# Si tienes múltiples Pythons
python -m pip install bleak
```

### Problema: "Python no encontrado"

**Solución:**
1. Reinstalar Python marcando "Add to PATH"
2. O agregar manualmente a variables de entorno

### Problema: "No se puede conectar a Bluetooth"

**Causas comunes:**
1. ❌ Impresora no emparejada → Emparejar desde Windows
2. ❌ Nombre incorrecto → Usar script escanear-bluetooth.py
3. ❌ Impresora apagada → Encender y verificar batería
4. ❌ Bluetooth desactivado → Activar en Windows
5. ❌ Fuera de rango → Acercar impresora (< 10m)

**Verificar nombre:**
```sql
SELECT * FROM impresoras WHERE tipo_conexion = 'BLUETOOTH';
```

### Problema: "Puerto COM no encontrado"

**Solución:**
1. Verificar puerto en Administrador de Dispositivos
2. Instalar driver del fabricante
3. Probar otro puerto USB
4. Verificar nombre en BD:
```sql
SELECT * FROM impresoras WHERE tipo_conexion = 'COM';
```

### Problema: "Timeout al conectar"

**Solución:**
```env
# Aumentar timeout en .env
PRINTER_TIMEOUT_MS=15000  # 15 segundos
```

---

## 📊 Comparación de Métodos

| Método | Velocidad | Confiabilidad | Cables | Costo | Recomendado Para |
|--------|-----------|---------------|--------|-------|------------------|
| **TCP/IP** | ⚡⚡⚡ Rápido | 🟢🟢🟢 Alta | ✅ Red | 💰💰💰 Alto | Restaurantes grandes |
| **Bluetooth** | ⚡⚡ Medio | 🟡🟡 Media | ❌ Sin cables | 💰💰 Medio | Cocinas móviles |
| **COM (USB)** | ⚡⚡⚡ Rápido | 🟢🟢🟢 Alta | ✅ USB | 💰 Bajo | Cajas fijas |

**Recomendación para "La Parrillita":**
- **Cocinas (Parrilla/Broaster):** Bluetooth (flexibilidad)
- **Caja:** COM/USB (confiabilidad para boletas)

---

## ✅ Validación Final

Ejecuta estos comandos para validar que todo está correcto:

```bash
# 1. TypeScript compila sin errores
cd backend
npx tsc --noEmit

# 2. Python y bleak instalados (solo si usas Bluetooth)
python --version
python -c "import bleak; print('OK')"

# 3. Escanear dispositivos Bluetooth
python scripts/escanear-bluetooth.py

# 4. Verificar migración SQL ejecutada
mysql -u parrillita_app -p parrillita -e "DESCRIBE impresoras"
# Debe mostrar: tipo_conexion, nombre_bluetooth, puerto_com

# 5. Iniciar backend
npm run dev
# Debe iniciar sin errores
```

---

## 📝 Notas Importantes

1. ✅ **Python es REQUERIDO** solo para Bluetooth (no para COM o TCP)
2. ✅ **bleak es REQUERIDO** solo para Bluetooth
3. ✅ **Nombre Bluetooth es case-sensitive** ("RPP02N" ≠ "rpp02n")
4. ✅ **Emparejar primero** la impresora desde Windows
5. ✅ **COM es más confiable** que Bluetooth para alto volumen
6. ✅ **Timeout mayor** para Bluetooth (10-15 segundos vs 5 segundos)
7. ✅ **Modo 'bluetooth'** funciona para los 3 tipos (TCP, BLE, COM)

---

## 🚀 Próximos Pasos

1. ✅ **Instalar Python y bleak** (si usas Bluetooth)
2. ✅ **Ejecutar migración SQL**
3. ✅ **Emparejar impresora Bluetooth** (desde Windows)
4. ✅ **Escanear dispositivos** con script Python
5. ✅ **Configurar impresoras en BD** con nombres correctos
6. ✅ **Probar en modo MOCK** primero
7. ✅ **Cambiar a modo bluetooth** en .env
8. ✅ **Imprimir prueba** desde API
9. ✅ **Validar con pedido real**

---

**¡Sistema de impresión Bluetooth completamente integrado y listo para usar!** 🎉
