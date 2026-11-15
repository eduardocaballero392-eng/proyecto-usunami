import { Router } from 'express';
import { body, param } from 'express-validator';
import adminService from '../services/admin.service';
import { validateRequest } from '../middlewares/validator.middleware';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';

const router = Router();

// Todas las rutas requieren autenticación y rol ADMINISTRADOR
router.use(authenticateToken);
router.use(requireRoles(['ADMINISTRADOR']));

// ============ USUARIOS ============
router.get('/usuarios', async (req, res, next) => {
  try {
    const usuarios = await adminService.getUsuarios();
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/usuarios',
  [
    body('nombre').trim().notEmpty().withMessage('Nombre es requerido'),
    body('usuario').trim().notEmpty().withMessage('Usuario es requerido'),
    body('password').isLength({ min: 6 }).withMessage('Password debe tener al menos 6 caracteres'),
    body('rol')
      .isIn(['ADMINISTRADOR', 'COCINERO', 'BROSTER', 'PARILLA', 'CAJA', 'MOZO'])
      .withMessage('Rol inválido'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const usuario = await adminService.createUsuario(req.body);
      res.status(201).json(usuario);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/usuarios/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('nombre').optional().trim().notEmpty().withMessage('Nombre no puede estar vacío'),
    body('usuario').optional().trim().notEmpty().withMessage('Usuario no puede estar vacío'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password debe tener al menos 6 caracteres'),
    body('rol')
      .optional()
      .isIn(['ADMINISTRADOR', 'COCINERO', 'BROSTER', 'PARILLA', 'CAJA', 'MOZO'])
      .withMessage('Rol inválido'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const usuario = await adminService.updateUsuario(parseInt(id), req.body);
      res.json(usuario);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/usuarios/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID inválido')],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await adminService.deleteUsuario(parseInt(id));
      res.json({ message: 'Usuario eliminado' });
    } catch (error) {
      next(error);
    }
  }
);

// ============ ÁREAS ============
router.get('/areas', async (req, res, next) => {
  try {
    const areas = await adminService.getAreas();
    res.json(areas);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/areas',
  [body('nombre').trim().notEmpty().withMessage('Nombre es requerido')],
  validateRequest,
  async (req, res, next) => {
    try {
      const { nombre } = req.body;
      const area = await adminService.createArea(nombre);
      res.status(201).json(area);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/areas/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('nombre').trim().notEmpty().withMessage('Nombre es requerido'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { nombre } = req.body;
      const area = await adminService.updateArea(parseInt(id), nombre);
      res.json(area);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/areas/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID inválido')],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await adminService.deleteArea(parseInt(id));
      res.json({ message: 'Área eliminada' });
    } catch (error) {
      next(error);
    }
  }
);

// ============ IMPRESORAS ============
router.get('/impresoras', async (req, res, next) => {
  try {
    const impresoras = await adminService.getImpresoras();
    res.json(impresoras);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/impresoras',
  [
    body('nombre').trim().notEmpty().withMessage('Nombre es requerido'),
    body('ip').trim().notEmpty().withMessage('IP es requerida'),
    body('puerto').isInt({ min: 1, max: 65535 }).withMessage('Puerto inválido'),
    body('areaId').isInt({ min: 1 }).withMessage('ID de área inválido'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const impresora = await adminService.createImpresora(req.body);
      res.status(201).json(impresora);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/impresoras/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('nombre').optional().trim().notEmpty().withMessage('Nombre no puede estar vacío'),
    body('ip').optional().trim().notEmpty().withMessage('IP no puede estar vacía'),
    body('puerto').optional().isInt({ min: 1, max: 65535 }).withMessage('Puerto inválido'),
    body('areaId').optional().isInt({ min: 1 }).withMessage('ID de área inválido'),
    body('activa').optional().isBoolean().withMessage('Activa debe ser booleano'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const impresora = await adminService.updateImpresora(parseInt(id), req.body);
      res.json(impresora);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/impresoras/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID inválido')],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await adminService.deleteImpresora(parseInt(id));
      res.json({ message: 'Impresora eliminada' });
    } catch (error) {
      next(error);
    }
  }
);

// ============ CATEGORÍAS ============
router.get('/categorias', async (req, res, next) => {
  try {
    const categorias = await adminService.getCategorias();
    res.json(categorias);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/categorias',
  [
    body('nombre').trim().notEmpty().withMessage('Nombre es requerido'),
    body('orden').isInt({ min: 0 }).withMessage('Orden debe ser un número positivo'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const categoria = await adminService.createCategoria(req.body);
      res.status(201).json(categoria);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/categorias/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('nombre').optional().trim().notEmpty().withMessage('Nombre no puede estar vacío'),
    body('orden').optional().isInt({ min: 0 }).withMessage('Orden debe ser un número positivo'),
    body('activo').optional().isBoolean().withMessage('Activo debe ser booleano'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const categoria = await adminService.updateCategoria(parseInt(id), req.body);
      res.json(categoria);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/categorias/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID inválido')],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await adminService.deleteCategoria(parseInt(id));
      res.json({ message: 'Categoría eliminada' });
    } catch (error) {
      next(error);
    }
  }
);

// ============ MESAS ============
router.get('/mesas', async (req, res, next) => {
  try {
    const mesas = await adminService.getMesas();
    res.json(mesas);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/mesas',
  [body('numero').isInt({ min: 1 }).withMessage('Número de mesa debe ser positivo')],
  validateRequest,
  async (req, res, next) => {
    try {
      const { numero } = req.body;
      const mesa = await adminService.createMesa(numero);
      res.status(201).json(mesa);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/mesas/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('numero').isInt({ min: 1 }).withMessage('Número de mesa debe ser positivo'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { numero } = req.body;
      const mesa = await adminService.updateMesa(parseInt(id), numero);
      res.json(mesa);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/mesas/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID inválido')],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await adminService.deleteMesa(parseInt(id));
      res.json({ message: 'Mesa eliminada' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
