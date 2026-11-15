import { Router } from 'express';
import { body } from 'express-validator';
import * as auth from '../services/auth.service';
import { autenticar } from '../middlewares/auth';
import { limitarIntentos, ruta, validar } from '../middlewares/comunes';
import { Rol } from '../types';

const router = Router();
const limitador = limitarIntentos(8, 60_000);

// POST /api/auth/login — personal con usuario y contraseña
router.post(
  '/login',
  limitador,
  body('usuario').isString().trim().notEmpty().withMessage('Ingresa tu usuario'),
  body('password').isString().notEmpty().withMessage('Ingresa tu contraseña'),
  validar,
  ruta(async (req, res) => {
    res.json(await auth.loginPersonal(req.body.usuario, req.body.password));
  })
);

// GET /api/auth/personal/:rol — lista de personal activo por rol (MOZO, PARRILLA, COCINERO, BROASTER)
router.get(
  '/personal/:rol',
  ruta(async (req, res) => {
    const rol = req.params.rol.toUpperCase() as Rol;
    const rolesPermitidos: Rol[] = ['MOZO', 'PARRILLA', 'BROASTER', 'COCINERO'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({ error: 'Rol no válido para selección por nombre' });
    }
    res.json(await auth.listarPersonalPorRol(rol));
  })
);

// POST /api/auth/pin — login por selección de nombre + PIN (MOZO, PARRILLA, COCINERO, BROASTER)
router.post(
  '/pin',
  limitador,
  body('id_usuarios').isInt({ min: 1 }).toInt(),
  body('pin').optional({ values: 'falsy' }).isString().matches(/^\d{4}$/).withMessage('El PIN tiene 4 dígitos'),
  validar,
  ruta(async (req, res) => {
    res.json(await auth.loginPorPin(req.body.id_usuarios, req.body.pin || undefined));
  })
);

// GET /api/auth/mozos — mantener por compatibilidad (alias de /personal/MOZO)
router.get(
  '/mozos',
  ruta(async (_req, res) => {
    res.json(await auth.listarPersonalPorRol('MOZO'));
  })
);

// GET /api/auth/yo — datos de la sesión actual
router.get(
  '/yo',
  autenticar,
  ruta(async (req, res) => {
    res.json({ usuario: req.usuario });
  })
);

export default router;
