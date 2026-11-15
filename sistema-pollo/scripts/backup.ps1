# ============================================================================
# Respaldo diario de la base de datos (RNF-006)
#   · mysqldump consistente (--single-transaction, no bloquea la operación)
#   · comprime a .zip y conserva los últimos 30 días
#
# Programarlo a las 4:00 a. m. (una sola vez, PowerShell como administrador):
#   schtasks /Create /TN "Parrillita Backup" /SC DAILY /ST 04:00 /RU SYSTEM `
#     /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\ruta\sistema-pollo\scripts\backup.ps1"
# ============================================================================
param(
  [string]$Destino = "C:\Backups\Parrillita",
  [string]$BaseDatos = "parrillita",
  [string]$Usuario = "root",
  [string]$Password = "",
  [int]$DiasRetencion = 30,
  [string]$MysqlBin = "C:\xampp\mysql\bin"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $Destino | Out-Null

$fecha = Get-Date -Format "yyyy-MM-dd_HHmm"
$sql = Join-Path $Destino "parrillita_$fecha.sql"
$zip = "$sql.zip"
$log = Join-Path $Destino "backup.log"

try {
  $argumentos = @("--user=$Usuario", "--single-transaction", "--routines", "--triggers",
                  "--default-character-set=utf8mb4", "--result-file=$sql", $BaseDatos)
  if ($Password) { $argumentos = @("--password=$Password") + $argumentos }

  & (Join-Path $MysqlBin "mysqldump.exe") @argumentos
  if ($LASTEXITCODE -ne 0) { throw "mysqldump terminó con código $LASTEXITCODE" }

  Compress-Archive -Path $sql -DestinationPath $zip -Force
  Remove-Item $sql

  # Rotación
  Get-ChildItem $Destino -Filter "parrillita_*.sql.zip" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$DiasRetencion) } |
    Remove-Item

  $tam = [math]::Round((Get-Item $zip).Length / 1KB)
  Add-Content $log "$(Get-Date -Format s) OK $zip ($tam KB)"
} catch {
  Add-Content $log "$(Get-Date -Format s) ERROR $($_.Exception.Message)"
  exit 1
}

# Restaurar (manual):
#   Expand-Archive C:\Backups\Parrillita\parrillita_AAAA-MM-DD_HHMM.sql.zip -DestinationPath C:\Temp
#   C:\xampp\mysql\bin\mysql.exe -u root parrillita < C:\Temp\parrillita_AAAA-MM-DD_HHMM.sql
