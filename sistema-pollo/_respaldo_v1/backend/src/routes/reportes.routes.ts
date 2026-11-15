import { Router } from 'express';
import { query } from 'express-validator';
import reportesService from '../services/reportes.service';
import { validateRequest } from '../middlewares/validator.middleware';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';

const router = Router();

// Todas las rutas requieren autenticación y rol ADMINISTRADOR o CAJA
router.use(authenticateToken);
router.use(requireRoles(['ADMINISTRADOR', 'CAJA']));

// Resumen de ventas por período
router.get(
  '/ventas/resumen',
  [
    query('fechaInicio').isISO8601().withMessage('Fecha inicio inválida'),
    query('fechaFin').isISO8601().withMessage('Fecha fin inválida'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { fechaInicio, fechaFin } = req.query;
      const resumen = await reportesService.getVentasPorPeriodo(
        fechaInicio as string,
        fechaFin as string
      );
      res.json(resumen);
    } catch (error) {
      next(error);
    }
  }
);

// Ventas por producto
router.get(
  '/ventas/productos',
  [
    query('fechaInicio').isISO8601().withMessage('Fecha inicio inválida'),
    query('fechaFin').isISO8601().withMessage('Fecha fin inválida'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { fechaInicio, fechaFin } = req.query;
      const ventas = await reportesService.getVentasPorProducto(
        fechaInicio as string,
        fechaFin as string
      );
      res.json(ventas);
    } catch (error) {
      next(error);
    }
  }
);

// Ventas por categoría
router.get(
  '/ventas/categorias',
  [
    query('fechaInicio').isISO8601().withMessage('Fecha inicio inválida'),
    query('fechaFin').isISO8601().withMessage('Fecha fin inválida'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { fechaInicio, fechaFin } = req.query;
      const ventas = await reportesService.getVentasPorCategoria(
        fechaInicio as string,
        fechaFin as string
      );
      res.json(ventas);
    } catch (error) {
      next(error);
    }
  }
);

// Ventas por día
router.get(
  '/ventas/dias',
  [
    query('fechaInicio').isISO8601().withMessage('Fecha inicio inválida'),
    query('fechaFin').isISO8601().withMessage('Fecha fin inválida'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { fechaInicio, fechaFin } = req.query;
      const ventas = await reportesService.getVentasPorDia(
        fechaInicio as string,
        fechaFin as string
      );
      res.json(ventas);
    } catch (error) {
      next(error);
    }
  }
);

// Ventas por hora (de un día específico)
router.get(
  '/ventas/horas',
  [query('fecha').isISO8601().withMessage('Fecha inválida')],
  validateRequest,
  async (req, res, next) => {
    try {
      const { fecha } = req.query;
      const ventas = await reportesService.getVentasPorHora(fecha as string);
      res.json(ventas);
    } catch (error) {
      next(error);
    }
  }
);

// Top usuarios (mozos)
router.get(
  '/ventas/usuarios',
  [
    query('fechaInicio').isISO8601().withMessage('Fecha inicio inválida'),
    query('fechaFin').isISO8601().withMessage('Fecha fin inválida'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Límite debe estar entre 1 y 50'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { fechaInicio, fechaFin, limit } = req.query;
      const usuarios = await reportesService.getTopUsuarios(
        fechaInicio as string,
        fechaFin as string,
        limit ? parseInt(limit as string) : 10
      );
      res.json(usuarios);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
