# Script para configurar Firewall de Windows
# Permite acceso a Vite (5173) y Backend (3000) desde la red local

Write-Host "Configurando Firewall de Windows..." -ForegroundColor Cyan

# Regla para Vite (Frontend)
Write-Host "`nAgregando regla para Vite (puerto 5173)..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="Vite Dev Server" protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=5173 profile=private

# Regla para Backend Node (puerto 3000)
Write-Host "Agregando regla para Backend (puerto 3000)..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="Backend Node Dev" protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Backend Node Dev" dir=in action=allow protocol=TCP localport=3000 profile=private

Write-Host "`n✅ Firewall configurado correctamente!" -ForegroundColor Green
Write-Host "`nAhora puedes acceder desde tu celular a:" -ForegroundColor Cyan
Write-Host "  Frontend: http://192.168.1.81:5173" -ForegroundColor White
Write-Host "  Backend:  http://192.168.1.81:3000" -ForegroundColor White
Write-Host "`nPresiona Enter para cerrar..." -ForegroundColor Gray
Read-Host
