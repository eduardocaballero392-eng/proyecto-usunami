import { Router } from 'express';
import { autenticar, permitir } from '../middlewares/auth';
import { ruta } from '../middlewares/comunes';
import * as parrilla from '../services/parrilla.service';

const router = Router();

// Solo ADMIN y PARRILLA pueden ver este dashboard
router.get(
  '/dashboard',
  autenticar,
  permitir('ADMIN', 'PARRILLA'),
  ruta(async (_req, res) => {
    res.json(await parrilla.dashboardParrilla());
  })
);

export default router;
