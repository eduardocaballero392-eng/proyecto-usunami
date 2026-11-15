import { Router } from 'express';
import { query } from 'express-validator';
import { autenticar, permitir } from '../middlewares/auth';
import { ruta, validar } from '../middlewares/comunes';
import * as reportes from '../services/reportes.service';
import * as caja from '../services/caja.service';
import { rangoFechas } from '../utils/fechas';

const router = Router();
router.use(autenticar, permitir('ADMIN'));

const fechas = [
  query('desde').optional().isISO8601().withMessage('Fecha "desde" inválida'),
  query('hasta').optional().isISO8601().withMessage('Fecha "hasta" inválida'),
];
const rango = (q: Record<string, unknown>) => rangoFechas(q.desde, q.hasta);

// RF-026 — indicadores en tiempo real
router.get(
  '/dashboard',
  ruta(async (_req, res) => {
    res.json(await reportes.dashboard());
  })
);

// RF-027…RF-032 en una sola llamada
router.get(
  '/periodo',
  ...fechas,
  query('limite').optional().isIn(['10', '20', '50']),
  validar,
  ruta(async (req, res) => {
    res.json(await reportes.analisisPeriodo(rango(req.query), Number(req.query.limite ?? 10)));
  })
);

router.get('/ventas', ...fechas, validar, ruta(async (req, res) => { res.json(await reportes.ventasPeriodo(rango(req.query))); }));
router.get(
  '/productos',
  ...fechas,
  query('limite').optional().isIn(['10', '20', '50']),
  validar,
  ruta(async (req, res) => {
    res.json(await reportes.productosMasVendidos(rango(req.query), Number(req.query.limite ?? 10)));
  })
);
router.get('/mozos', ...fechas, validar, ruta(async (req, res) => { res.json(await reportes.ventasPorMozo(rango(req.query))); }));
router.get('/categorias', ...fechas, validar, ruta(async (req, res) => { res.json(await reportes.ventasPorCategoria(rango(req.query))); }));
router.get('/areas', ...fechas, validar, ruta(async (req, res) => { res.json(await reportes.ventasPorArea(rango(req.query))); }));
router.get('/horas', ...fechas, validar, ruta(async (req, res) => { res.json(await reportes.horasPico(rango(req.query))); }));

// RF-033 — cierres de caja
router.get(
  '/turnos',
  ...fechas,
  query('usuarioId').optional().isInt({ min: 1 }).toInt(),
  validar,
  ruta(async (req, res) => {
    const r = rango(req.query);
    res.json(await caja.listarTurnos({ ...r, usuarioId: req.query.usuarioId ? Number(req.query.usuarioId) : undefined }));
  })
);

export default router;
