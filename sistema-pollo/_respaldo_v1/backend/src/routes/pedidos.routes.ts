import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import * as pedidosService from '../services/pedidos.service';
import * as impresionService from '../services/impresion.service';
import { mozoMiddleware, authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/roles.middleware';

const router = Router();

const validar = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// POST /api/pedidos - Crear pedido (Mozo)
router.post(
  '/',
  mozoMiddleware,
  [
    body('mozoId').isInt(),
    body('tipo').isIn(['MESA', 'LLEVAR', 'DELIVERY']),
    body('mesas').optional().isArray(),
    body('items').isArray({ min: 1 }),
    body('items.*.productoId').isInt(),
    body('items.*.cantidad').isInt({ min: 1 }),
    validar
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pedidosService.crearPedido(req.body);
      
      // Imprimir comandas en segundo plano
      impresionService.imprimirComandas(result.id_pedidos, 1).catch(err => {
        console.error('Error al imprimir comandas:', err);
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/pedidos/activos - Listar pedidos activos del mozo
router.get(
  '/activos',
  mozoMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mozoId = parseInt(req.query.mozoId as string);
      const result = await pedidosService.listarPedidosActivos(mozoId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/pedidos/:id - Obtener pedido
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pedidoId = parseInt(req.params.id);
    const result = await pedidosService.obtenerPedido(pedidoId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/pedidos/:id/items - Agregar ítems (Mozo)
router.post(
  '/:id/items',
  mozoMiddleware,
  [
    body('items').isArray({ min: 1 }),
    body('items.*.productoId').isInt(),
    body('items.*.cantidad').isInt({ min: 1 }),
    validar
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pedidoId = parseInt(req.params.id);
      const result = await pedidosService.agregarItems(pedidoId, req.body);

      // Imprimir comandas en segundo plano
      impresionService.imprimirComandas(pedidoId, result.ronda).catch(err => {
        console.error('Error al imprimir comandas:', err);
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/pedidos/:id/mesas - Cambiar mesas
router.patch(
  '/:id/mesas',
  mozoMiddleware,
  [
    body('mesas').isArray({ min: 1 }),
    validar
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pedidoId = parseInt(req.params.id);
      const { mesas } = req.body;
      const result = await pedidosService.cambiarMesas(pedidoId, mesas);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/pedidos/:id/items/:itemId - Anular ítem
router.delete(
  '/:id/items/:itemId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const { motivoAnulacion } = req.body;

      // Si hay usuario autenticado (cajero/admin), incluir su ID
      const usuarioId = req.user?.id_usuario;

      const result = await pedidosService.anularItem(itemId, usuarioId, motivoAnulacion);

      // Si requiere impresión de anulación, hacerlo en segundo plano
      if (result.requiereImpresionAnulacion) {
        impresionService.imprimirAnulacion(itemId).catch(err => {
          console.error('Error al imprimir anulación:', err);
        });
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/pedidos/:id/reimprimir - Reimprimir comandas (Cajero/Admin)
router.post(
  '/:id/reimprimir',
  authMiddleware,
  requireRole(['CAJERO', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pedidoId = parseInt(req.params.id);
      
      // Reimprimir todas las rondas
      impresionService.imprimirComandas(pedidoId, 1).catch(err => {
        console.error('Error al reimprimir:', err);
      });

      res.json({ message: 'Reimprimiendo comandas...' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
