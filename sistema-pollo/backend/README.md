# Backend - Anticuchería La Parrillita

Backend del sistema de gestión para restaurante desarrollado con Node.js, TypeScript y Express.

## Requisitos

- Node.js 18+ LTS
- MySQL 8.0 / MariaDB 10.x (XAMPP)
- Windows 10/11

## Instalación

1. **Instalar dependencias**:
```powershell
cd backend
npm install
```

2. **Configurar variables de entorno**:
```powershell
Copy-Item .env.example .env
# Editar .env con tus credenciales
```

3. **Configurar base de datos**:
```powershell
# Iniciar XAMPP (MySQL)
# Importar esquema y migraciones
C:\xampp\mysql\bin\mysql.exe -u root -p
```
```sql
CREATE DATABASE parrillita_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parrillita_db;
SOURCE C:\sistema-pollo\database\parrillita_esquema_limpio.sql;
SOURCE C:\sistema-pollo\database\parrillita_datos_iniciales.sql;
```

4. **Ejecutar migraciones**:
```powershell
$migrationFiles = Get-ChildItem "..\database\migrations" -Filter "*.sql" | Sort-Object Name
foreach ($file in $migrationFiles) {
    C:\xampp\mysql\bin\mysql.exe -u root -p parrillita_db < $file.FullName
    Write-Host "✓ Migración aplicada: $($file.Name)"
}
```

## Desarrollo

```powershell
npm run dev
```

El servidor iniciará en `http://localhost:3000`

## Producción

```powershell
npm run build
npm start
```

## Scripts Disponibles

- `npm run dev` - Modo desarrollo con nodemon
- `npm run build` - Compilar TypeScript a JavaScript
- `npm start` - Iniciar servidor en producción
- `npm test` - Ejecutar pruebas
- `npm run test:watch` - Pruebas en modo watch
- `npm run test:coverage` - Cobertura de pruebas

## Estructura

```
backend/
├── src/
│   ├── config/       # Configuraciones (DB, JWT, Printer)
│   ├── routes/       # Rutas de la API
│   ├── services/     # Lógica de negocio
│   ├── middlewares/  # Middlewares personalizados
│   ├── types/        # Tipos TypeScript
│   ├── utils/        # Utilidades (logger, errors)
│   ├── sockets/      # Socket.IO
│   ├── app.ts        # Configuración Express
│   └── server.ts     # Entry point
├── logs/             # Archivos de log
├── .env.example      # Variables de entorno ejemplo
└── package.json
```

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/logout` - Logout

### Mozos
- `GET /api/mozos` - Listar mozos activos
- `POST /api/mozos/seleccionar` - Seleccionar mozo
- `POST /api/mozos` - Crear mozo (ADMIN)
- `PUT /api/mozos/:id` - Actualizar mozo (ADMIN)
- `PATCH /api/mozos/:id/estado` - Activar/desactivar (ADMIN)

### Productos
- `GET /api/productos` - Listar productos con categorías
- `GET /api/productos/:id` - Obtener producto
- `POST /api/productos` - Crear producto (ADMIN)
- `PUT /api/productos/:id` - Actualizar producto (ADMIN)

### Pedidos
- `POST /api/pedidos` - Crear pedido (Mozo)
- `GET /api/pedidos/activos` - Listar pedidos activos (Mozo)
- `GET /api/pedidos/:id` - Obtener pedido
- `POST /api/pedidos/:id/items` - Agregar ítems (Mozo)
- `PATCH /api/pedidos/:id/mesas` - Cambiar mesas (Mozo)
- `DELETE /api/pedidos/:id/items/:itemId` - Anular ítem
- `POST /api/pedidos/:id/reimprimir` - Reimprimir comandas (Cajero/Admin)

## Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DB_HOST` | Host de MySQL | localhost |
| `DB_PORT` | Puerto de MySQL | 3306 |
| `DB_USER` | Usuario de MySQL | root |
| `DB_PASSWORD` | Contraseña de MySQL | (vacío) |
| `DB_NAME` | Nombre de la base de datos | parrillita_db |
| `JWT_SECRET` | Clave secreta para JWT | (requerido) |
| `JWT_EXPIRES_IN` | Tiempo de expiración JWT | 8h |
| `PORT` | Puerto del servidor | 3000 |
| `NODE_ENV` | Entorno | development |
| `PRINTER_MODE` | Modo de impresión | mock |
| `PRINTER_*_IP` | IPs de impresoras | 192.168.1.* |

## Modo Mock (Impresoras)

Para desarrollo sin impresoras físicas:

```env
PRINTER_MODE=mock
```

Las comandas se imprimen en:
- Consola
- Archivo en `logs/prints/`

## Testing

```powershell
# Ejecutar todas las pruebas
npm test

# Pruebas específicas
npm test -- pedidos.test.ts

# Cobertura
npm run test:coverage
```

## Logs

Los logs se guardan en:
- `logs/error.log` - Solo errores
- `logs/combined.log` - Todos los logs
- `logs/prints/` - Impresiones mock

## Troubleshooting

### Error de conexión a MySQL
- Verificar que XAMPP esté ejecutando MySQL
- Revisar credenciales en `.env`
- Verificar que el puerto 3306 esté disponible

### Error de impresión
- Modo mock: Verificar que la carpeta `logs/prints` exista
- Modo producción: Verificar IPs de impresoras en `.env`

### Puerto 3000 ocupado
```powershell
# Cambiar puerto en .env
PORT=3001
```

## Soporte

Para problemas o dudas, revisar:
1. Logs en `logs/`
2. Documentación en `/docs`
3. Archivo `requirements.md`
