# Guía de Instalación - Sistema de Pedidos

## Pasos Rápidos

### 1. Instalar Dependencias del Backend

```bash
cd backend
npm install
```

### 2. Generar Passwords para Base de Datos

```bash
npm run create-admin
```

Este comando generará los hashes bcrypt para los usuarios. Copia los hashes generados.

### 3. Configurar Base de Datos

Edita el archivo `database.sql` y reemplaza `$2b$10$YourHashedPasswordHere` con los hashes generados en el paso anterior.

Luego ejecuta el script en MySQL:

```bash
mysql -u root -p < database.sql
```

O desde MySQL Workbench/phpMyAdmin ejecuta el contenido de `database.sql`.

### 4. Configurar Variables de Entorno del Backend

```bash
cd backend
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=sistema_pollo

JWT_SECRET=cambiar_esto_por_algo_super_seguro_en_produccion
JWT_EXPIRES_IN=24h

MOZO_TOKEN_SECRET=cambiar_esto_tambien_por_algo_diferente_y_seguro
```

### 5. Iniciar Backend

```bash
cd backend
npm run dev
```

El backend estará en `http://localhost:3000`

### 6. Instalar Dependencias del Frontend

```bash
cd frontend
npm install
```

### 7. Configurar URL del Backend (si es diferente)

Edita `frontend/src/api/axios.config.ts` si necesitas cambiar la URL del backend (por defecto es `http://localhost:3000`).

### 8. Iniciar Frontend

```bash
cd frontend
npm run dev
```

El frontend estará en `http://localhost:5173`

## Verificación

1. Abre `http://localhost:5173` en tu navegador
2. Deberías ver la pantalla de selección de mozos
3. Selecciona un mozo y verifica que puedes acceder al menú

## Usuarios de Prueba

**Administrador:**
- Usuario: `admin`
- Password: `admin123`

**Mozos:**
- Juan Pérez, María López, Carlos Ruiz
- Password: `123456`

**Caja:**
- Pedro Sánchez
- Password: `123456`

**Cocina:**
- Ana Torres
- Password: `123456`

## Solución de Problemas

### Error de conexión a la base de datos

Verifica que:
- MySQL esté corriendo
- Las credenciales en `.env` sean correctas
- La base de datos `sistema_pollo` exista

### Error al generar passwords

Si `npm run create-admin` falla, asegúrate de que bcrypt esté instalado:

```bash
cd backend
npm install bcrypt @types/bcrypt
```

### Frontend no se conecta al backend

Verifica que:
- El backend esté corriendo en `http://localhost:3000`
- No haya errores de CORS (revisa la consola del navegador)
- La URL en `axios.config.ts` sea correcta

## Acceso desde Red Local

Para acceder desde otros dispositivos en la misma red:

1. Obtén la IP de tu computadora:
   ```bash
   ipconfig  # Windows
   ```

2. El backend ya acepta conexiones externas

3. El frontend Vite ya está configurado con `host: true`

4. Accede desde otro dispositivo a:
   - Frontend: `http://TU_IP:5173`
   - Backend: `http://TU_IP:3000`

5. Actualiza `frontend/src/api/axios.config.ts` con tu IP:
   ```typescript
   baseURL: 'http://TU_IP:3000/api',
   ```

## Siguiente Paso

Lee el archivo `README.md` para más detalles sobre el sistema y su uso.
