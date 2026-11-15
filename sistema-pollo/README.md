# La Parrillita — Sistema de gestión

Toma de pedidos desde el celular del mozo, comandas impresas por área, caja con boletas correlativas y dashboard de ventas.
Funciona 100 % en la red local (sin internet), sobre una laptop Windows con XAMPP.

| Quién | Entra por | Ve |
|---|---|---|
| Mozo | `http://<IP-laptop>:3000` → toca su nombre (+ PIN opcional) | Menú, carrito, sus mesas |
| Cajero | **Ingreso de administración** → usuario y contraseña | Turno, cobros, anulaciones, reimpresión |
| Cocina (Parrilla, Broaster, Carta) | usuario y contraseña | Comandas abiertas de su área |
| Administrador | usuario y contraseña | Dashboard, reportes, personal, carta, local, caja |

> Arquitectura, modelo de datos y API: **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)**.
> Los requisitos originales siguen en [requirements.md](requirements.md). El modelo de datos de `design.md` quedó **reemplazado** por `database/schema.sql` (los mozos son usuarios con rol `MOZO`; no existe tabla `mozos`).

---

## Instalación (una sola vez)

Requisitos: Windows 10/11, **XAMPP** (MySQL/MariaDB encendido), **Node.js 18+**.

```powershell
# 1. Base de datos (¡borra y recrea la base "parrillita"!)
C:\xampp\mysql\bin\mysql.exe -u root < database\schema.sql
C:\xampp\mysql\bin\mysql.exe -u root < database\seed.sql

# 2. Backend
cd backend
npm install
copy .env.example .env        # editar: DB_*, JWT_SECRET, PRINTER_MODE
npm run crear-admin -- --usuario admin --password "UnaClaveSegura"

# 3. Frontend (se compila y lo sirve el backend)
cd ..\frontend
npm install
npm run build

# 4. Arrancar
cd ..\backend
npm run build
npm start                     # http://localhost:3000  (y http://<IP-laptop>:3000 desde los celulares)
```

Al arrancar, el servidor muestra en consola las direcciones de red a las que deben entrar los celulares.

### Recomendado para producción

- **Usuario de MySQL propio** (no `root`):
  ```sql
  CREATE USER 'parrillita_app'@'localhost' IDENTIFIED BY 'clave-larga';
  GRANT SELECT, INSERT, UPDATE, DELETE ON parrillita.* TO 'parrillita_app'@'localhost';
  ```
- **`JWT_SECRET`** de 48+ caracteres aleatorios (el servidor no arranca en producción con uno corto).
- **IP fija** para la laptop y para cada impresora.
- **Arranque automático**: `npm i -g pm2 pm2-windows-startup && pm2 start dist/index.js --name parrillita && pm2 save && pm2-startup install`.
- **Backup diario 4:00 a. m.** con [scripts/backup.ps1](scripts/backup.ps1) (instrucciones dentro del archivo; guarda 30 días).
- **Firewall**: permitir el puerto 3000 sólo en la red privada. Nunca exponer MySQL (3306).

### Impresoras

- `PRINTER_MODE=mock` (por defecto): las comandas se escriben en `backend/logs/impresiones-AAAA-MM-DD.log`.
- `PRINTER_MODE=network`: envía ESC/POS a cada impresora `IP:9100`. Configura las IP en **Administración → Local** y usa **Probar**.
- Si una impresora falla, el pedido **no se pierde**: queda en cola, se reintenta 3 veces cada 30 s y la caja ve el aviso con botón **Reintentar**.

---

## Desarrollo

```powershell
cd backend;  npm run dev          # API en :3000 (recarga automática)
cd frontend; npm run dev          # App en :5173 (redirige /api al backend)
```

Datos de demostración (60 días de ventas simuladas, sólo en una base vacía y nunca en producción):

```powershell
cd backend; npm run datos-demo
```
Crea: cajera `rosa` / `demo1234`, parrilla `luis` / `demo1234`, y 4 mozos (Juan y Lucía con PIN `1234`).

Verificación de tipos: `npm run typecheck` (backend) · `npx tsc --noEmit` (frontend).

## Estructura

```
backend/
  src/
    config/       env (validación de variables), database (pool + transacciones)
    middlewares/  auth (JWT + roles), comunes (validación, errores, límite de intentos)
    printing/     documento (texto / ESC/POS / TCP 9100), plantillas (comanda, boleta, cierre…)
    services/     auth, menu, pedidos, caja, impresion (cola + reintentos), reportes, admin
    routes/       auth, pedidos (+menú y mesas), caja, reportes, admin
  scripts/        crear-admin, datos-demo
frontend/src/
  api/            cliente HTTP (ruta relativa /api) y tipos
  components/     ui (botones, modal, campos…), charts/Graficos (KPI, líneas, barras)
  pages/          mozo/, caja/, cocina/, admin/ (Dashboard, Reportes, Personal, Carta, Local, Pedidos)
database/         schema.sql (esquema de producción), seed.sql (datos base)
scripts/          backup.ps1
_respaldo_v1/     copia del código y SQL anteriores (puede borrarse cuando ya no se necesite)
```
