-- ============================================
-- MIGRACIÓN: Soporte Bluetooth y COM en Impresoras
-- Fecha: 2026-11-20
-- Descripción: Agrega soporte para impresoras Bluetooth y COM (USB/Serial)
-- ============================================

-- Agregar nuevas columnas para tipos de conexión
ALTER TABLE impresoras
  ADD COLUMN tipo_conexion ENUM('TCP', 'BLUETOOTH', 'COM') DEFAULT 'TCP' 
    COMMENT 'Tipo de conexión: TCP (red), BLUETOOTH (BLE), COM (USB/Serial)' 
    AFTER puerto,
  ADD COLUMN nombre_bluetooth VARCHAR(100) NULL 
    COMMENT 'Nombre del dispositivo Bluetooth (ej: RPP02N, MTP-II)' 
    AFTER tipo_conexion,
  ADD COLUMN puerto_com VARCHAR(10) NULL 
    COMMENT 'Puerto COM asignado por Windows (ej: COM3, COM4)' 
    AFTER nombre_bluetooth;

-- Actualizar impresoras existentes a TCP (por defecto)
UPDATE impresoras SET tipo_conexion = 'TCP' WHERE tipo_conexion IS NULL;

-- ============================================
-- EJEMPLOS DE CONFIGURACIÓN
-- ============================================

-- Ejemplo 1: Impresora Bluetooth para Parrilla
-- INSERT INTO impresoras (areaId, nombre, tipo_conexion, nombre_bluetooth, activa)
-- VALUES (
--   1,  -- ID del área de Parrilla
--   'Impresora Parrilla BT',
--   'BLUETOOTH',
--   'RPP02N',  -- Cambiar por el nombre real de tu impresora
--   1
-- );

-- Ejemplo 2: Impresora COM (USB) para Broaster
-- INSERT INTO impresoras (areaId, nombre, tipo_conexion, puerto_com, activa)
-- VALUES (
--   2,  -- ID del área de Broaster
--   'Impresora Broaster USB',
--   'COM',
--   'COM3',  -- Cambiar por el puerto real (verificar en Administrador de Dispositivos)
--   1
-- );

-- Ejemplo 3: Impresora TCP/IP (red) para Caja
-- INSERT INTO impresoras (areaId, nombre, tipo_conexion, ip, puerto, activa)
-- VALUES (
--   (SELECT id_areas FROM areas WHERE nombre = 'CAJA'),
--   'Impresora Caja Red',
--   'TCP',
--   '192.168.1.100',
--   9100,
--   1
-- );

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver todas las impresoras configuradas
SELECT 
  i.id_impresoras,
  i.nombre,
  i.tipo_conexion,
  CASE 
    WHEN i.tipo_conexion = 'TCP' THEN CONCAT(i.ip, ':', i.puerto)
    WHEN i.tipo_conexion = 'BLUETOOTH' THEN i.nombre_bluetooth
    WHEN i.tipo_conexion = 'COM' THEN i.puerto_com
  END AS conexion,
  a.nombre AS area,
  i.activa
FROM impresoras i
LEFT JOIN areas a ON a.id_areas = i.areaId
ORDER BY a.nombre;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

-- 1. Para Bluetooth:
--    - Debes tener Python instalado (3.8+)
--    - Debes instalar bleak: pip install bleak
--    - Emparejar la impresora desde Windows antes
--    - Usar el nombre EXACTO del dispositivo (case-sensitive)

-- 2. Para COM (USB/Serial):
--    - Conectar impresora por USB
--    - Verificar puerto en Administrador de Dispositivos → Puertos (COM y LPT)
--    - Puede ser COM3, COM4, COM5, etc.

-- 3. Variables de entorno (.env):
--    PRINTER_MODE=bluetooth  (cambiar de 'mock' a 'bluetooth' en producción)
--    PRINTER_TIMEOUT_MS=10000  (10 segundos para Bluetooth)

-- 4. Validación de configuración:
--    - TCP requiere ip y puerto
--    - BLUETOOTH requiere nombre_bluetooth
--    - COM requiere puerto_com
