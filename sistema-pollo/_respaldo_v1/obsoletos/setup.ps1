# Script de instalación y configuración
# Sistema de Gestión - Anticuchería La Parrillita

Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Instalación - Anticuchería La Parrillita        ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Verificar Node.js
Write-Host "[1/6] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js no encontrado. Por favor instalar desde https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Verificar MySQL
Write-Host "[2/6] Verificando MySQL..." -ForegroundColor Yellow
$mysqlPath = "C:\xampp\mysql\bin\mysql.exe"
if (Test-Path $mysqlPath) {
    Write-Host "✓ MySQL encontrado en XAMPP" -ForegroundColor Green
} else {
    Write-Host "✗ MySQL no encontrado. Por favor instalar XAMPP" -ForegroundColor Red
    exit 1
}

# Instalar dependencias del backend
Write-Host "[3/6] Instalando dependencias del backend..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\..\backend"
npm install
Write-Host "✓ Dependencias instaladas" -ForegroundColor Green

# Crear archivo .env si no existe
Write-Host "[4/6] Configurando variables de entorno..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Archivo .env creado. Por favor editarlo con tus credenciales" -ForegroundColor Green
    Write-Host "⚠ IMPORTANTE: Editar backend\.env antes de continuar" -ForegroundColor Yellow
    notepad ".env"
    Read-Host "Presiona Enter cuando hayas terminado de editar .env"
} else {
    Write-Host "✓ Archivo .env ya existe" -ForegroundColor Green
}

# Crear carpetas necesarias
Write-Host "[5/6] Creando carpetas..." -ForegroundColor Yellow
$folders = @("logs", "logs\prints")
foreach ($folder in $folders) {
    if (!(Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }
}
Write-Host "✓ Carpetas creadas" -ForegroundColor Green

# Compilar TypeScript
Write-Host "[6/6] Compilando backend..." -ForegroundColor Yellow
npm run build
Write-Host "✓ Backend compilado" -ForegroundColor Green

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✓ Instalación completada                        ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Ejecutar script de base de datos: .\scripts\setup-database.ps1" -ForegroundColor White
Write-Host "2. Iniciar backend: cd backend ; npm run dev" -ForegroundColor White
Write-Host "3. Acceder a: http://localhost:3000/health" -ForegroundColor White
Write-Host ""
