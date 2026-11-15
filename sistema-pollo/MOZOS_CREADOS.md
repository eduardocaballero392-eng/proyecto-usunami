# 👨‍🍳 Mozos Creados

Se han creado 2 mozos de ejemplo en el sistema:

## Mozos disponibles:

### 1. Carlos Ramírez
- **Usuario**: carlosramirez
- **PIN**: `1234`
- **Rol**: MOZO

### 2. María González
- **Usuario**: mariagonzalez
- **PIN**: `5678`
- **Rol**: MOZO

## Cómo ingresar:

1. Ve al login del sistema
2. Selecciona el área **"Mozo"**
3. Elige el nombre del mozo (Carlos o María)
4. Ingresa el PIN de 4 dígitos

## Vista del Mozo:

Una vez que ingreses con el PIN, tendrás acceso a:

- ✅ Ver y gestionar mesas
- ✅ Crear nuevos pedidos
- ✅ Tomar órdenes de los clientes
- ✅ Enviar pedidos a cocina/parrilla
- ✅ Ver el estado de los pedidos
- ✅ Cerrar y cobrar mesas

## Crear más mozos:

Si necesitas crear más mozos, ejecuta:

```bash
cd backend
npm run crear-mozos
```

Y edita el archivo `backend/scripts/crear-mozos.ts` para agregar más nombres y PINs.
