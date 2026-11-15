# Script para configurar base de datos
# Sistema de Gestión - Anticuchería La Parrillita

Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Configuración de Base de Datos                  ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

$mysqlPath = "C:\xampp\mysql\bin\mysql.exe"
$mysqldumpPath = "C:\xampp\mysql\bin\mysqldump.exe"

if (!(Test-Path $mysqlPath)) {
    Write-Host "✗ MySQL no encontrado. Asegúrate de que XAMPP esté instalado" -ForegroundColor Red
    exit 1
}

$dbName = "parrillita_db"
$dbUser = Read-Host "Usuario de MySQL (default: root)"
if ([string]::IsNullOrEmpty($dbUser)) { $dbUser = "root" }

Write-Host "⚠ Ingresa la contraseña de MySQL (puede estar vacía):" -ForegroundColor Yellow
$dbPassword = Read-Host "Contraseña" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

# Crear base de datos
Write-Host "[1/4] Creando base de datos..." -ForegroundColor Yellow
$createDbSql = "CREATE DATABASE IF NOT EXISTS $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($dbPasswordPlain) {
    $createDbSql | & $mysqlPath -u $dbUser -p"$dbPasswordPlain"
} else {
    $createDbSql | & $mysqlPath -u $dbUser
}
Write-Host "✓ Base de datos '$dbName' creada" -ForegroundColor Green

# Importar esquema (si existe)
$schemaPath = "$PSScriptRoot\..\database\parrillita_esquema_limpio.sql"
if (Test-Path $schemaPath) {
    Write-Host "[2/4] Importando esquema base..." -ForegroundColor Yellow
    if ($dbPasswordPlain) {
        Get-Content $schemaPath | & $mysqlPath -u $dbUser -p"$dbPasswordPlain" $dbName
    } else {
        Get-Content $schemaPath | & $mysqlPath -u $dbUser $dbName
    }
    Write-Host "✓ Esquema importado" -ForegroundColor Green
} else {
    Write-Host "⚠ Archivo de esquema no encontrado: $schemaPath" -ForegroundColor Yellow
}

# Importar datos iniciales (si existe)
$datosPath = "$PSScriptRoot\..\database\parrillita_datos_iniciales.sql"
if (Test-Path $datosPath) {
    Write-Host "[3/4] Importando datos iniciales..." -ForegroundColor Yellow
    if ($dbPasswordPlain) {
        Get-Content $datosPath | & $mysqlPath -u $dbUser -p"$dbPasswordPlain" $dbName
    } else {
        Get-Content $datosPath | & $mysqlPath -u $dbUser $dbName
    }
    Write-Host "✓ Datos iniciales importados" -ForegroundColor Green
} else {
    Write-Host "⚠ Archivo de datos iniciales no encontrado: $datosPath" -ForegroundColor Yellow
}

# Ejecutar migraciones
Write-Host "[4/4] Ejecutando migraciones..." -ForegroundColor Yellow
$migrationsPath = "$PSScriptRoot\..\database\migrations"
if (Test-Path $migrationsPath) {
    $migrations = Get-ChildItem $migrationsPath -Filter "*.sql" | Sort-Object Name
    
    foreach ($migration in $migrations) {
        Write-Host "  → Aplicando $($migration.Name)..." -ForegroundColor Gray
        if ($dbPasswordPlain) {
            Get-Content $migration.FullName | & $mysqlPath -u $dbUser -p"$dbPasswordPlain" $dbName
        } else {
            Get-Content $migration.FullName | & $mysqlPath -u $dbUser $dbName
        }
    }
    
    Write-Host "✓ $($migrations.Count) migraciones aplicadas" -ForegroundColor Green
} else {
    Write-Host "⚠ Carpeta de migraciones no encontrada" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✓ Base de datos configurada correctamente       ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Base de datos: $dbName" -ForegroundColor Cyan
Write-Host "Usuario: $dbUser" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora puedes iniciar el backend: cd backend ; npm run dev" -ForegroundColor White
Write-Host ""
