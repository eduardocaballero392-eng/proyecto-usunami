import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import * as productosService from '../services/productos.service';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/roles.middleware';

const router = Router();

const validar = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /api/productos - Listar productos con categorías
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buscar = req.query.buscar as string | undefined;
    const result = await productosService.listarProductosConCategorias(buscar);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/productos/:id - Obtener producto
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id_producto = parseInt(req.params.id);
    const result = await productosService.obtenerProducto(id_producto);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/productos - Crear producto (ADMIN)
router.post(
  '/',
  authMiddleware,
  requireRole(['ADMIN']),
  [
    body('nombre').notEmpty(),
    body('precio').isFloat({ min: 0 }),
    body('recargoLlevar').isFloat({ min: 0 }),
    body('categoriaId').isInt(),
    body('areaId').isInt(),
    validar
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await productosService.crearProducto(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/productos/:id - Actualizar producto (ADMIN)
router.put(
  '/:id',
  authMiddleware,
  requireRole(['ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id_producto = parseInt(req.params.id);
      const result = await productosService.actualizarProducto(id_producto, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
