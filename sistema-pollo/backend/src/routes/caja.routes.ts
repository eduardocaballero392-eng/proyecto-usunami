import { Router } from 'express';
import { body } from 'express-validator';
import { autenticar, permitir } from '../middlewares/auth';
import { ruta, validar } from '../middlewares/comunes';
import * as caja from '../services/caja.service';

const router = Router();
router.use(autenticar, permitir('CAJERO'));

const monto = (campo: string) => body(campo).isFloat({ min: 0, max: 100000 }).withMessage('Monto inválido').toFloat();

router.get(
  '/turno',
  ruta(async (req, res) => {
    res.json(await caja.turnoActual(req.usuario!));
  })
);

router.post(
  '/turno/abrir',
  monto('montoInicial'),
  validar,
  ruta(async (req, res) => {
    res.status(201).json(await caja.abrirTurno(req.usuario!, req.body.montoInicial));
  })
);

router.post(
  '/turno/cerrar',
  monto('montoFinal'),
  validar,
  ruta(async (req, res) => {
    res.json(await caja.cerrarTurno(req.usuario!, req.body.montoFinal));
  })
);

router.post(
  '/cobrar',
  body('pedidoId').isInt({ min: 1 }).toInt(),
  body('pagos').isArray({ min: 1, max: 5 }).withMessage('Registra al menos un pago'),
  body('pagos.*.metodo').isIn(['EFECTIVO', 'YAPE', 'PLIN']).withMessage('Método de pago inválido'),
  body('pagos.*.monto').isFloat({ gt: 0, max: 100000 }).withMessage('Monto inválido').toFloat(),
  body('pagos.*.montoRecibido').optional({ values: 'null' }).isFloat({ gt: 0, max: 100000 }).toFloat(),
  validar,
  ruta(async (req, res) => {
    res.json(await caja.cobrar(req.body.pedidoId, req.body.pagos, req.usuario!));
  })
);

export default router;
