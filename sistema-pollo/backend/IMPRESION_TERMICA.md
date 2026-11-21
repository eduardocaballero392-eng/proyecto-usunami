# 🖨️ SISTEMA DE IMPRESIÓN TÉRMICA BLUETOOTH - node-thermal-printer

## 📋 Descripción

Sistema de impresión térmica integrado para "La Parrillita" usando `node-thermal-printer` con soporte para **impresoras Bluetooth**. Permite imprimir comandas de cocina y boletas directamente a impresoras térmicas de 80mm vía Bluetooth o puerto COM.

## ✅ Características

- ✅ Impresión de comandas de cocina por área
- ✅ Impresión de boletas de venta
- ✅ **Soporte Bluetooth (BLE)**
- ✅ **Soporte Puerto COM (USB/Serial)**
- ✅ Modo MOCK para desarrollo (simula impresión en logs)
- ✅ Modo BLUETOOTH para producción (impresoras Bluetooth reales)
- ✅ Integrado con sistema de cola de impresiones existente
- ✅ Registro de errores y reintentos automáticos
- ✅ Diseño optimizado para impresoras de 80mm
- ✅ Soporte para caracteres especiales (ñ, tildes, etc.)

---

## 🔧 Requisitos Previos

### 1. Python (Requerido para Bluetooth)

**Instalar Python 3.8+:**
```bash
# Descargar desde: https://www.python.org/downloads/
# Asegúrate de marcar "Add Python to PATH" durante la instalación
```

**Verificar instalación:**
```bash
python --version
# Debe mostrar: Python 3.x.x
```

### 2. Librería bleak (Python - Para Bluetooth)

```bash
pip install bleak
```

**Verificar instalación:**
```bash
python -c "import bleak; print('bleak instalado correctamente')"
```

### 3. Node.js (Ya instalado)

La librería `node-thermal-printer` ya está instalada en tu proyecto.

---

## 🔧 Configuración

### Variables de Entorno (.env)

```env
# Modo de impresión: 'mock' para desarrollo, 'bluetooth' para producción
PRINTER_MODE=mock

# Timeout de conexión en milisegundos
PRINTER_TIMEOUT_MS=10000

# Número máximo de reintentos en caso de error
PRINTER_MAX_RETRIES=3

# Tiempo de espera entre reintentos (segundos)
PRINTER_RETRY_DELAY_S=30

# Ancho del papel en caracteres (42 para 80mm)
PRINTER_WIDTH_CHARS=42
```

### Base de Datos - Tabla `impresoras`

**Agregar columnas para Bluetooth:**

```sql
-- Modificar tabla impresoras para soportar Bluetooth
ALTER TABLE impresoras
  ADD COLUMN tipo_conexion ENUM('TCP', 'BLUETOOTH', 'COM') DEFAULT 'TCP' AFTER puerto,
  ADD COLUMN nombre_bluetooth VARCHAR(100) NULL AFTER tipo_conexion,
  ADD COLUMN puerto_com VARCHAR(10) NULL AFTER nombre_bluetooth;

-- Ejemplo: Impresora Bluetooth
INSERT INTO impresoras (areaId, nombre, tipo_conexion, nombre_bluetooth, activa)
VALUES (
  1,
  'Impresora Parrilla BT',
  'BLUETOOTH',
  'RPP02N',  -- Nombre de tu impresora Bluetooth
  1
);

-- Ejemplo: Impresora COM (USB/Serial)
INSERT INTO impresoras (areaId, nombre, tipo_conexion, puerto_com, activa)
VALUES (
  2,
  'Impresora Cocina USB',
  'COM',
  'COM3',  -- Puerto COM asignado por Windows
  1
);
```

---

## 🔍 Encontrar tu Impresora Bluetooth

### Opción 1: Desde Windows

1. **Configuración → Bluetooth y dispositivos**
2. Busca tu impresora (ej: "RPP02N", "MTP-II", "POS-80")
3. **Anota el nombre exacto** (case-sensitive)

### Opción 2: Desde PowerShell

```powershell
# Listar dispositivos Bluetooth emparejados
Get-PnpDevice -Class Bluetooth | Where-Object {$_.Status -eq "OK"} | Select-Object FriendlyName, InstanceId
```

### Opción 3: Script Python (Escanear dispositivos BLE)

Crea un archivo `escanear_bluetooth.py`:

```python
import asyncio
from bleak import BleakScanner

async def escanear():
    print("Escaneando dispositivos Bluetooth...")
    devices = await BleakScanner.discover()
    print(f"\nEncontrados {len(devices)} dispositivos:\n")
    for d in devices:
        print(f"Nombre: {d.name or 'Sin nombre'}")
        print(f"Dirección: {d.address}")
        print(f"RSSI: {d.rssi} dBm")
        print("-" * 50)

asyncio.run(escanear())
```

**Ejecutar:**
```bash
python escanear_bluetooth.py
```

---

## 🔍 Encontrar Puerto COM (USB/Serial)

### Opción 1: Administrador de Dispositivos

1. **Win + X** → Administrador de dispositivos
2. **Puertos (COM y LPT)**
3. Busca tu impresora (ej: "USB Serial Port (COM3)")
4. Anota el puerto (ej: `COM3`)

### Opción 2: PowerShell

```powershell
Get-WMIObject Win32_SerialPort | Select-Object Name, DeviceID
```

---

## 🚀 Uso

### 1. Imprimir un Ticket (Comanda o Boleta)

**Endpoint:** `POST /api/printer/ticket/:pedidoId/:areaId`

**Autenticación:** Requerida

**Parámetros:**
- `pedidoId` (URL): ID del pedido a imprimir
- `areaId` (URL): ID del área (para obtener la impresora)
- `tipo` (Body, opcional): `'COMANDA'` o `'BOLETA'` (default: `'COMANDA'`)

**Ejemplo con cURL:**
```bash
# Imprimir comanda
curl -X POST http://localhost:3000/api/printer/ticket/123/1 \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"COMANDA"}'
```

---

## 🐛 Troubleshooting Bluetooth

### Problema: "Cannot find module 'bleak'"

**Causa:** Python no tiene instalado `bleak`

**Solución:**
```bash
pip install bleak

# Si tienes múltiples versiones de Python
python -m pip install bleak
```

### Problema: "Python no encontrado"

**Causa:** Python no está en el PATH

**Solución:**
1. Reinstalar Python marcando "Add to PATH"
2. O agregar manualmente a las variables de entorno

### Problema: "No se puede conectar a la impresora Bluetooth"

**Causas y Soluciones:**

1. **Impresora no emparejada:**
   - Ve a **Configuración → Bluetooth**
   - Emparejar impresora
   - Anota el nombre exacto

2. **Nombre incorrecto en BD:**
   ```sql
   -- Verificar nombre configurado
   SELECT * FROM impresoras WHERE tipo_conexion = 'BLUETOOTH';
   
   -- Actualizar si es necesario
   UPDATE impresoras SET nombre_bluetooth = 'NOMBRE_CORRECTO' WHERE id_impresoras = 1;
   ```

3. **Impresora apagada o sin batería:**
   - Encender impresora
   - Verificar que esté en rango (< 10m)

4. **Bluetooth desactivado en Windows:**
   - Activar Bluetooth en configuración de Windows

### Problema: "Timeout al conectar"

**Causa:** La conexión Bluetooth es lenta

**Solución:**
```env
# Aumentar timeout en .env
PRINTER_TIMEOUT_MS=15000  # 15 segundos
```

### Problema: "Puerto COM no encontrado"

**Causas y Soluciones:**

1. **Driver no instalado:**
   - Instalar driver del fabricante de la impresora

2. **Puerto incorrecto:**
   ```sql
   -- Verificar puerto en BD
   SELECT * FROM impresoras WHERE tipo_conexion = 'COM';
   
   -- Actualizar puerto correcto
   UPDATE impresoras SET puerto_com = 'COM3' WHERE id_impresoras = 1;
   ```

3. **Permisos:**
   - Ejecutar Node.js como Administrador (solo para probar)

---

## 📊 Comparación de Métodos de Conexión

| Método | Ventajas | Desventajas | Recomendado Para |
|--------|----------|-------------|------------------|
| **Bluetooth** | ✅ Sin cables<br>✅ Portátil<br>✅ Fácil de mover | ❌ Puede fallar conexión<br>❌ Requiere Python+bleak<br>❌ Más lento | Impresoras móviles, cocinas |
| **COM (USB/Serial)** | ✅ Más confiable<br>✅ Más rápido<br>✅ No requiere Python | ❌ Requiere cable<br>❌ Menos portable | Cajas, impresoras fijas |
| **TCP/IP (Red)** | ✅ Muy confiable<br>✅ Rápido<br>✅ Múltiples dispositivos | ❌ Requiere red<br>❌ Impresoras más caras | Restaurantes grandes |

---

## 🎯 Configuración Recomendada para "La Parrillita"

### Opción A: Todo Bluetooth (Más flexible)

```sql
-- Parrilla - Bluetooth
INSERT INTO impresoras (areaId, nombre, tipo_conexion, nombre_bluetooth, activa)
VALUES (1, 'Parrilla BT', 'BLUETOOTH', 'RPP02N', 1);

-- Broaster - Bluetooth  
INSERT INTO impresoras (areaId, nombre, tipo_conexion, nombre_bluetooth, activa)
VALUES (2, 'Broaster BT', 'BLUETOOTH', 'MTP-II', 1);

-- Caja - COM (más confiable para boletas)
INSERT INTO impresoras (areaId, nombre, tipo_conexion, puerto_com, activa)
VALUES (
  (SELECT id_areas FROM areas WHERE nombre = 'CAJA'),
  'Caja USB',
  'COM',
  'COM3',
  1
);
```

### Opción B: Mixto (Recomendado)

```sql
-- Cocinas: Bluetooth (flexibilidad)
-- Caja: COM (confiabilidad)
```

---

## 📝 Notas Importantes

1. ✅ **Python es REQUERIDO** para Bluetooth (Windows, Linux, Mac)
2. ✅ **bleak debe estar instalado** (`pip install bleak`)
3. ✅ **Nombre Bluetooth es case-sensitive** ("RPP02N" ≠ "rpp02n")
4. ✅ **Emparejar primero** la impresora desde Windows
5. ✅ **COM más confiable** que Bluetooth para alto volumen
6. ✅ **Timeout mayor** para Bluetooth (10-15 segundos)

---

## 🚀 Próximos Pasos

1. **Instalar Python y bleak** (si usas Bluetooth)
2. **Emparejar impresora** desde Windows
3. **Actualizar tabla impresoras** con nombre_bluetooth o puerto_com
4. **Probar en modo MOCK** primero
5. **Cambiar a modo bluetooth** en .env
6. **Imprimir prueba** desde el endpoint

---

## 📚 Referencias

- [node-thermal-printer Documentation](https://github.com/Klemen1337/node-thermal-printer)
- [bleak Documentation](https://github.com/hbldh/bleak)
- [Python Downloads](https://www.python.org/downloads/)

---

**¡Sistema de impresión térmica Bluetooth listo para usar!** 🎉

---

## 🔧 Configuración

### Variables de Entorno (.env)

```env
# Modo de impresión: 'mock' para desarrollo, 'network' para producción
PRINTER_MODE=mock

# Timeout de conexión en milisegundos
PRINTER_TIMEOUT_MS=5000

# Número máximo de reintentos en caso de error
PRINTER_MAX_RETRIES=3

# Tiempo de espera entre reintentos (segundos)
PRINTER_RETRY_DELAY_S=30

# Ancho del papel en caracteres (42 para 80mm)
PRINTER_WIDTH_CHARS=42
```

### Base de Datos

El sistema usa las siguientes tablas existentes:

**`impresoras`**: Configuración de impresoras por área
```sql
CREATE TABLE impresoras (
  id_impresoras INT PRIMARY KEY AUTO_INCREMENT,
  areaId INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  puerto INT NOT NULL DEFAULT 9100,
  activa BOOLEAN NOT NULL DEFAULT 1,
  FOREIGN KEY (areaId) REFERENCES areas(id_areas)
);
```

**`impresiones`**: Cola de impresiones (para tracking y reintentos)
```sql
CREATE TABLE impresiones (
  id_impresiones INT PRIMARY KEY AUTO_INCREMENT,
  pedidoId INT,
  areaId INT NOT NULL,
  tipo ENUM('COMANDA', 'ANULACION', 'BOLETA', 'CIERRE_CAJA', 'PRUEBA'),
  estado ENUM('PENDIENTE', 'IMPRESA', 'ERROR') DEFAULT 'PENDIENTE',
  impresoraId INT,
  intentos INT DEFAULT 0,
  error VARCHAR(255),
  creadoEn TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizadoEn TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pedidoId) REFERENCES pedidos(id_pedidos),
  FOREIGN KEY (areaId) REFERENCES areas(id_areas),
  FOREIGN KEY (impresoraId) REFERENCES impresoras(id_impresoras)
);
```

---

## 🚀 Uso

### 1. Imprimir un Ticket (Comanda o Boleta)

**Endpoint:** `POST /api/printer/ticket/:pedidoId/:areaId`

**Autenticación:** Requerida

**Parámetros:**
- `pedidoId` (URL): ID del pedido a imprimir
- `areaId` (URL): ID del área (para obtener la impresora)
- `tipo` (Body, opcional): `'COMANDA'` o `'BOLETA'` (default: `'COMANDA'`)

**Ejemplo con cURL:**
```bash
# Imprimir comanda
curl -X POST http://localhost:3000/api/printer/ticket/123/1 \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"COMANDA"}'

# Imprimir boleta
curl -X POST http://localhost:3000/api/printer/ticket/123/1 \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"BOLETA"}'
```

**Ejemplo con Fetch (Frontend):**
```typescript
const imprimirComanda = async (pedidoId: number, areaId: number) => {
  const response = await fetch(`/api/printer/ticket/${pedidoId}/${areaId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ tipo: 'COMANDA' })
  });
  
  const data = await response.json();
  console.log(data.mensaje); // "Ticket COMANDA enviado a impresión"
};
```

---

### 2. Imprimir Prueba

**Endpoint:** `POST /api/printer/prueba/:areaId`

**Autenticación:** Requerida (Solo ADMIN)

**Parámetros:**
- `areaId` (URL): ID del área cuya impresora se quiere probar

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/printer/prueba/1 \
  -H "Authorization: Bearer TU_TOKEN_ADMIN"
```

**Uso:**
- Verifica que la impresora esté conectada y funcionando
- Imprime un ticket de prueba simple con información de la impresora

---

### 3. Verificar Conexión

**Endpoint:** `GET /api/printer/verificar/:areaId`

**Autenticación:** Requerida (Solo ADMIN)

**Parámetros:**
- `areaId` (URL): ID del área cuya impresora se quiere verificar

**Ejemplo:**
```bash
curl -X GET http://localhost:3000/api/printer/verificar/1 \
  -H "Authorization: Bearer TU_TOKEN_ADMIN"
```

**Respuesta:**
```json
{
  "exito": true,
  "areaId": 1,
  "conectada": true,
  "mensaje": "Conectada a Impresora Parrilla (192.168.1.100:9100)"
}
```

---

### 4. Reimprimir Ticket

**Endpoint:** `POST /api/printer/reimprimir/:pedidoId/:areaId`

**Autenticación:** Requerida

**Uso:** Reimprime un ticket si la primera impresión falló

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/printer/reimprimir/123/1 \
  -H "Authorization: Bearer TU_TOKEN"
```

---

## 📄 Formato del Ticket

### Comanda de Cocina

```
         LA PARRILLITA
    Anticuchería & Parrillas

     COMANDA DE COCINA
------------------------------------------
Pedido: #00123
Fecha: 18/11/2026 20:30
Mozo: Juan Pérez
Mesa(s): 5, 6
------------------------------------------
CANT  PRODUCTO                  PRECIO
------------------------------------------
2     Pollo a la brasa        S/ 90.00
      + Papa + arroz
      NOTA: Sin ají

1     Chicha morada           S/ 5.00
------------------------------------------


```

### Boleta de Venta

```
         LA PARRILLITA
    Anticuchería & Parrillas

       BOLETA DE VENTA
------------------------------------------
Pedido: #00123
Fecha: 18/11/2026 20:30
Mozo: Juan Pérez
Mesa(s): 5, 6
------------------------------------------
CANT  PRODUCTO                  PRECIO
------------------------------------------
2     Pollo a la brasa        S/ 90.00
      + Papa + arroz

1     Chicha morada           S/ 5.00
------------------------------------------

         TOTAL: S/ 95.00

    ¡Gracias por su preferencia!
          Vuelva pronto
------------------------------------------


```

---

## 🔌 Integración con Sistema Existente

### En el Servicio de Pedidos

Puedes integrar la impresión automática cuando se crea un pedido:

```typescript
// En pedidos.service.ts
import * as printerService from './printer.service';

export const crearPedido = async (datos: DatosNuevoPedido) => {
  const conn = await obtenerConexion();
  
  try {
    await conn.beginTransaction();
    
    // ... lógica existente de crear pedido ...
    const pedidoId = resultado.insertId;
    
    // Imprimir comanda automáticamente
    for (const areaId of areasConItems) {
      try {
        await printerService.imprimirTicket(pedidoId, areaId, 'COMANDA');
      } catch (error) {
        // Log pero no fallar la transacción
        logger.warn('Error al imprimir comanda', { pedidoId, areaId, error });
      }
    }
    
    await conn.commit();
    return { pedidoId };
    
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};
```

### Con el Sistema de Cola Existente

Si prefieres usar el worker de reintentos existente:

```typescript
// Modificar impresion.service.ts para usar thermal printer

import * as thermalPrinter from './printer.service';

export const procesar = async (id: number): Promise<boolean> => {
  // ... código existente para obtener datos de impresión ...
  
  try {
    // Opción 1: Usar el sistema anterior (ESC/POS raw)
    if (env.impresion.modo === 'mock') {
      registrarMock(aTexto(doc), destino);
    } else {
      await enviarAImpresora(impresora.ip, impresora.puerto, aEscPos(doc));
    }
    
    // Opción 2: Usar node-thermal-printer (recomendado)
    await thermalPrinter.imprimirTicket(
      imp.pedidoId,
      imp.areaId,
      imp.tipo as 'COMANDA' | 'BOLETA',
      id // Pasar ID de impresión para actualizar estado
    );
    
    return true;
  } catch (error) {
    // ... manejo de errores ...
  }
};
```

---

## 🐛 Troubleshooting

### Problema: "No hay impresora activa configurada"

**Causa:** No existe una impresora asociada al área o está desactivada

**Solución:**
```sql
-- Verificar impresoras
SELECT * FROM impresoras WHERE areaId = 1;

-- Insertar impresora si no existe
INSERT INTO impresoras (areaId, nombre, ip, puerto, activa)
VALUES (1, 'Impresora Parrilla', '192.168.1.100', 9100, 1);

-- Activar impresora existente
UPDATE impresoras SET activa = 1 WHERE id_impresoras = 1;
```

### Problema: "Error al imprimir: Connection timeout"

**Causa:** La impresora no está accesible en la red o IP incorrecta

**Soluciones:**
1. Verificar que la impresora esté encendida
2. Hacer ping a la IP de la impresora:
   ```bash
   ping 192.168.1.100
   ```
3. Verificar puerto (normalmente 9100 para TCP/IP raw)
4. Revisar firewall de Windows/Linux
5. Actualizar IP en la base de datos si cambió

### Problema: Caracteres extraños en la impresión

**Causa:** Problema de charset o codificación

**Solución:**
- El servicio usa `CharacterSet.PC858_EURO` por defecto
- Si tu impresora usa otro charset, modifica en `printer.service.ts`:
  ```typescript
  characterSet: CharacterSet.PC437_USA, // O el que use tu impresora
  ```

### Problema: El papel no corta automáticamente

**Causa:** Impresora no soporta comando de corte

**Solución:**
- Comentar la línea `printer.cut()` en el servicio
- O configurar corte parcial: `printer.partialCut()`

---

## 📊 Logs y Monitoreo

### En Modo MOCK

Los tickets simulados se guardan en:
```
backend/logs/impresiones-YYYY-MM-DD.log
```

Ejemplo:
```
----- [MOCK THERMAL] Impresora Parrilla (PARRILLA) · 2026-11-18T20:30:00.000Z -----
==========================================
           LA PARRILLITA
      Anticuchería & Parrillas

        COMANDA DE COCINA
------------------------------------------
...
```

### En Modo NETWORK

Los intentos de impresión se registran en:
1. **Consola** (logger.info/error)
2. **Tabla `impresiones`** (estado, intentos, error)

Consultar impresiones con error:
```sql
SELECT i.*, p.id_pedidos, a.nombre AS area, imp.nombre AS impresora
FROM impresiones i
JOIN areas a ON a.id_areas = i.areaId
LEFT JOIN pedidos p ON p.id_pedidos = i.pedidoId
LEFT JOIN impresoras imp ON imp.id_impresoras = i.impresoraId
WHERE i.estado = 'ERROR'
ORDER BY i.creadoEn DESC
LIMIT 20;
```

---

## 🎯 Próximos Pasos

1. **Configurar impresoras en la BD:**
   - Asignar IP y puerto a cada área
   - Marcar como activas

2. **Probar en modo MOCK:**
   ```bash
   # En .env
   PRINTER_MODE=mock
   ```

3. **Probar conexión con impresoras reales:**
   ```bash
   curl -X GET http://localhost:3000/api/printer/verificar/1 \
     -H "Authorization: Bearer TOKEN_ADMIN"
   ```

4. **Imprimir prueba:**
   ```bash
   curl -X POST http://localhost:3000/api/printer/prueba/1 \
     -H "Authorization: Bearer TOKEN_ADMIN"
   ```

5. **Cambiar a modo NETWORK:**
   ```bash
   # En .env
   PRINTER_MODE=network
   ```

6. **Integrar con flujo de pedidos** (automático)

---

## 📚 Referencias

- [node-thermal-printer Documentation](https://github.com/Klemen1337/node-thermal-printer)
- [ESC/POS Command Reference](https://reference.epson-biz.com/modules/ref_escpos/index.php)

---

**¡Sistema de impresión térmica listo para usar!** 🎉
