# MIGRACIONES DE BASE DE DATOS

Este directorio contiene las migraciones SQL para actualizar el esquema existente de la base de datos `parrillita_db`.

## ⚠️ IMPORTANTE

- **Ejecutar las migraciones EN ORDEN NUMÉRICO** (001, 002, 003, etc.)
- **NO ejecutar dos veces la misma migración**
- **Hacer backup de la base de datos antes de ejecutar migraciones**
- Las migraciones están diseñadas para ejecutarse sobre el esquema limpio existente

## 📋 LISTA DE MIGRACIONES

| # | Archivo | Descripción | Estado |
|---|---------|-------------|--------|
| 001 | `001_mozos.sql` | Tabla mozos con PIN opcional | ⏳ Pendiente |
| 002 | `002_recargo_llevar.sql` | Campos para recargo de taper y botella | ⏳ Pendiente |
| 003 | `003_pedido_mesas.sql` | Relación many-to-many pedido-mesas | ⏳ Pendiente |
| 004 | `004_auditoria_anulacion.sql` | Auditoría de anulación de ítems | ⏳ Pendiente |
| 005 | `005_rondas.sql` | Rondas de impresión para comandas diferenciales | ⏳ Pendiente |
| 006 | `006_series_comprobantes.sql` | Tabla series para numeración correlativa | ⏳ Pendiente |
| 007 | `007_descripcion_producto.sql` | Campo descripción en productos | ⏳ Pendiente |
| 008 | `008_mozo_pedidos.sql` | Relación mozo en pedidos | ⏳ Pendiente |
| 009 | `009_campos_impresion.sql` | Campos intentos y error en impresiones | ⏳ Pendiente |

## 🚀 CÓMO EJECUTAR LAS MIGRACIONES

### Opción 1: Desde MySQL Command Line (Manual)

```bash
# 1. Conectarse a MySQL
C:\xampp\mysql\bin\mysql.exe -u root -p

# 2. Seleccionar base de datos
USE parrillita_db;

# 3. Ejecutar cada migración
SOURCE C:\Users\PC\Downloads\sistema-pollo\database\migrations\001_mozos.sql;
SOURCE C:\Users\PC\Downloads\sistema-pollo\database\migrations\002_recargo_llevar.sql;
SOURCE C:\Users\PC\Downloads\sistema-pollo\database\migrations\003_pedido_mesas.sql;
SOURCE C:\Users\PC\Downloads\sistema-pollo\database\migrations\004_auditoria_anulacion.sql;
SOURCE C:\Users\PC\Downloads\sistema-pollo\database\migrations\005_rondas.sql;
SOURCE C:\Users\PC\Downloads\sistema-pollo\database\migrations\006_series_comprobantes.sql;
SOURCE C:\Users\PC\Downloads\sistema-pollo\database\migrations\007_descripcion_producto.sql;
SOURCE C:\Users\PC\Downloads\sistema-pollo\database\migrations\008_mozo_pedidos.sql;
SOURCE C:\Users\PC\Downloads\sistema-pollo\database\migrations\009_campos_impresion.sql;
```

### Opción 2: Desde PowerShell (Automatizado)

```powershell
# Ejecutar todas las migraciones en orden
$dbUser = "root"
$dbName = "parrillita_db"
$migrationsPath = "C:\Users\PC\Downloads\sistema-pollo\database\migrations"

Get-ChildItem "$migrationsPath" -Filter "*.sql" | 
    Where-Object { $_.Name -match '^\d{3}_' } |
    Sort-Object Name |
    ForEach-Object {
        Write-Host "Ejecutando migración: $($_.Name)" -ForegroundColor Cyan
        C:\xampp\mysql\bin\mysql.exe -u $dbUser -p $dbName < $_.FullName
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Migración $($_.Name) aplicada correctamente" -ForegroundColor Green
        } else {
            Write-Host "✗ Error en migración $($_.Name)" -ForegroundColor Red
            break
        }
    }
```

### Opción 3: Desde phpMyAdmin

1. Abrir phpMyAdmin (http://localhost/phpmyadmin)
2. Seleccionar base de datos `parrillita_db`
3. Ir a la pestaña "SQL"
4. Copiar y pegar el contenido de cada archivo `.sql` en orden
5. Hacer clic en "Continuar"

## ✅ VERIFICACIÓN POST-MIGRACIÓN

Después de ejecutar todas las migraciones, verificar que las tablas y campos existen:

```sql
-- Verificar tabla mozos
SHOW TABLES LIKE 'mozos';
DESCRIBE mozos;

-- Verificar campos nuevos en productos
DESCRIBE productos;

-- Verificar tabla pedido_mesas
SHOW TABLES LIKE 'pedido_mesas';

-- Verificar campos de auditoría en detalle_pedidos
DESCRIBE detalle_pedidos;

-- Verificar campos de ronda
SELECT COLUMN_NAME 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'parrillita_db' 
  AND TABLE_NAME = 'detalle_pedidos' 
  AND COLUMN_NAME = 'ronda';

-- Verificar tabla series
SELECT * FROM series;
```

## 🔄 ROLLBACK (Si algo sale mal)

Si una migración falla y necesitas revertir:

1. **Restaurar desde backup**:
   ```powershell
   C:\xampp\mysql\bin\mysql.exe -u root -p parrillita_db < C:\Backups\Parrillita\backup_antes_migraciones.sql
   ```

2. **Revertir manualmente** (solo si sabes qué cambió):
   ```sql
   -- Ejemplo: deshacer migración 008
   ALTER TABLE pedidos DROP FOREIGN KEY fk_pedidos_mozo;
   ALTER TABLE pedidos DROP COLUMN mozoId;
   ```

## 📝 NOTAS IMPORTANTES

### Migración 002 (Recargo Llevar)
- Los UPDATE de recargos están comentados
- Debes ajustar según los `id_categoria` reales de tu base de datos
- O actualizar manualmente desde el panel de administración

### Migración 003 (Pedido Mesas)
- **Elimina el campo `mesaId` de la tabla `pedidos`**
- Migra datos existentes a la nueva tabla `pedido_mesas`
- Esta operación es irreversible sin backup

### Migración 006 (Series)
- Inserta la serie inicial B001 con número 1
- Si ya tienes comprobantes emitidos, ajusta el `siguienteNumero`

## 🆘 SOPORTE

Si encuentras errores durante las migraciones:

1. **No continúes ejecutando** las siguientes migraciones
2. Verifica el mensaje de error en la consola
3. Revisa el archivo SQL correspondiente
4. Ajusta según tu esquema existente
5. Si es necesario, restaura desde backup y reintenta

---

**Versión**: 1.0  
**Última actualización**: 2026-11-12
