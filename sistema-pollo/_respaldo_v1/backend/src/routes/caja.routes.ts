import { Router } from 'express';
import { body } from 'express-validator';
import cajaService from '../services/caja.service';
import { validateRequest } from '../middlewares/validator.middleware';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Abrir turno (solo CAJA)
router.post(
  '/turnos',
  requireRoles(['CAJA', 'ADMINISTRADOR']),
  [
    body('montoInicial').isFloat({ min: 0 }).withMessage('Monto inicial debe ser mayor o igual a 0'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { montoInicial } = req.body;
      const turno = await cajaService.abrirTurno(req.user!.id, montoInicial);
      res.status(201).json(turno);
    } catch (error) {
      next(error);
    }
  }
);

// Cerrar turno
router.put(
  '/turnos/:id/cerrar',
  requireRoles(['CAJA', 'ADMINISTRADOR']),
  [
    body('montoFinal').isFloat({ min: 0 }).withMessage('Monto final debe ser mayor o igual a 0'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { montoFinal } = req.body;
      const turno = await cajaService.cerrarTurno(parseInt(id), montoFinal);
      res.json(turno);
    } catch (error) {
      next(error);
    }
  }
);

// Obtener turno actual del usuario
router.get('/turnos/actual', requireRoles(['CAJA', 'ADMINISTRADOR']), async (req, res, next) => {
  try {
    const turno = await cajaService.getTurnoActual(req.user!.id);
    res.json(turno);
  } catch (error) {
    next(error);
  }
});

// Obtener resumen de turno
router.get('/turnos/:id/resumen', requireRoles(['CAJA', 'ADMINISTRADOR']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const resumen = await cajaService.getResumenTurno(parseInt(id));
    res.json(resumen);
  } catch (error) {
    next(error);
  }
});

// Listar turnos
router.get('/turnos', requireRoles(['ADMINISTRADOR']), async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const turnos = await cajaService.getTurnos(limit);
    res.json(turnos);
  } catch (error) {
    next(error);
  }
});

// Registrar pago
router.post(
  '/pagos',
  requireRoles(['CAJA', 'ADMINISTRADOR']),
  [
    body('pedidoId').isInt({ min: 1 }).withMessage('ID de pedido inválido'),
    body('metodo').isIn(['EFECTIVO', 'YAPE', 'PLIN']).withMessage('Método de pago inválido'),
    body('monto').isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
    body('turnoCajaId').optional().isInt({ min: 1 }).withMessage('ID de turno inválido'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { pedidoId, metodo, monto, turnoCajaId } = req.body;
      const pago = await cajaService.registrarPago(pedidoId, metodo, monto, turnoCajaId);
      res.status(201).json(pago);
    } catch (error) {
      next(error);
    }
  }
);

// Obtener pagos de un pedido
router.get('/pagos/pedido/:pedidoId', async (req, res, next) => {
  try {
    const { pedidoId } = req.params;
    const pagos = await cajaService.getPagosByPedido(parseInt(pedidoId));
    res.json(pagos);
  } catch (error) {
    next(error);
  }
});

export default router;
