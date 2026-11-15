import { Router } from 'express';
import { param } from 'express-validator';
import cocinaService from '../services/cocina.service';
import { validateRequest } from '../middlewares/validator.middleware';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener items pendientes por área
router.get(
  '/items/area/:areaId',
  requireRoles(['COCINERO', 'BROSTER', 'PARILLA', 'ADMINISTRADOR']),
  [param('areaId').isInt({ min: 1 }).withMessage('ID de área inválido')],
  validateRequest,
  async (req, res, next) => {
    try {
      const { areaId } = req.params;
      const items = await cocinaService.getItemsPendientesByArea(parseInt(areaId));
      res.json(items);
    } catch (error) {
      next(error);
    }
  }
);

// Obtener todos los items pendientes agrupados por área
router.get(
  '/items',
  requireRoles(['COCINERO', 'BROSTER', 'PARILLA', 'ADMINISTRADOR']),
  async (req, res, next) => {
    try {
      const items = await cocinaService.getAllItemsPendientes();
      res.json(items);
    } catch (error) {
      next(error);
    }
  }
);

// Marcar item como completado
router.put(
  '/items/:itemId/completar',
  requireRoles(['COCINERO', 'BROSTER', 'PARILLA', 'ADMINISTRADOR']),
  [param('itemId').isInt({ min: 1 }).withMessage('ID de item inválido')],
  validateRequest,
  async (req, res, next) => {
    try {
      const { itemId } = req.params;
      await cocinaService.marcarItemCompletado(parseInt(itemId));
      res.json({ message: 'Item marcado como completado' });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener detalles completos de un pedido
router.get(
  '/pedidos/:pedidoId',
  requireRoles(['COCINERO', 'BROSTER', 'PARILLA', 'ADMINISTRADOR']),
  [param('pedidoId').isInt({ min: 1 }).withMessage('ID de pedido inválido')],
  validateRequest,
  async (req, res, next) => {
    try {
      const { pedidoId } = req.params;
      const pedido = await cocinaService.getPedidoCompleto(parseInt(pedidoId));
      if (!pedido) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }
      res.json(pedido);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
