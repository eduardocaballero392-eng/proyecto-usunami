import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { autenticar, permitir } from '../middlewares/auth';
import { ruta, validar } from '../middlewares/comunes';
import * as menu from '../services/menu.service';
import * as pedidos from '../services/pedidos.service';

const router = Router();
router.use(autenticar);

const idPedido = param('id').isInt({ min: 1 }).toInt();
const idItem = param('itemId').isInt({ min: 1 }).toInt();
const motivo = body('motivo').isString().trim().isLength({ min: 3, max: 255 }).withMessage('Indica el motivo (mín. 3 caracteres)');
const reglasItems = [
  body('items').isArray({ min: 1, max: 100 }).withMessage('Agrega al menos un producto'),
  body('items.*.productoId').isInt({ min: 1 }).toInt(),
  body('items.*.cantidad').isInt({ min: 1, max: 99 }).withMessage('Cantidad entre 1 y 99').toInt(),
  body('items.*.nota').optional({ values: 'null' }).isString().trim().isLength({ max: 255 }),
  body('items.*.opciones').optional().isArray({ max: 10 }),
  body('items.*.opciones.*').isInt({ min: 1 }).toInt(),
];

// --- Menú y mesas (mozo, caja, admin) ---
router.get(
  '/menu',
  query('buscar').optional().isString().trim().isLength({ max: 50 }),
  validar,
  ruta(async (req, res) => {
    res.json(await menu.obtenerMenu((req.query.buscar as string) || undefined));
  })
);

router.get(
  '/mesas',
  ruta(async (_req, res) => {
    res.json(await menu.estadoMesas());
  })
);

// --- Pedidos ---
router.get(
  '/pedidos/activos',
  ruta(async (req, res) => {
    res.json(await pedidos.listarActivos(req.usuario!));
  })
);

router.get(
  '/pedidos/:id',
  idPedido,
  validar,
  ruta(async (req, res) => {
    res.json(await pedidos.obtenerPedido(Number(req.params.id), req.usuario!));
  })
);

router.post(
  '/pedidos',
  permitir('MOZO', 'CAJERO'),
  body('tipo').isIn(['MESA', 'LLEVAR', 'DELIVERY']).withMessage('Tipo de pedido inválido'),
  body('mesas').optional().isArray({ max: 10 }),
  body('mesas.*').isInt({ min: 1 }).toInt(),
  body('observacion').optional({ values: 'null' }).isString().trim().isLength({ max: 255 }),
  ...reglasItems,
  validar,
  ruta(async (req, res) => {
    res.status(201).json(await pedidos.crearPedido(req.body, req.usuario!));
  })
);

router.post(
  '/pedidos/:id/items',
  permitir('MOZO', 'CAJERO'),
  idPedido,
  ...reglasItems,
  validar,
  ruta(async (req, res) => {
    res.json(await pedidos.agregarItems(Number(req.params.id), req.body.items, req.usuario!));
  })
);

router.patch(
  '/pedidos/:id/mesas',
  permitir('MOZO', 'CAJERO'),
  idPedido,
  body('mesas').isArray({ min: 1, max: 10 }).withMessage('Selecciona al menos una mesa'),
  body('mesas.*').isInt({ min: 1 }).toInt(),
  validar,
  ruta(async (req, res) => {
    res.json(await pedidos.cambiarMesas(Number(req.params.id), req.body.mesas, req.usuario!));
  })
);

router.post(
  '/pedidos/:id/items/:itemId/anular',
  permitir('CAJERO'),
  idPedido,
  idItem,
  motivo,
  validar,
  ruta(async (req, res) => {
    res.json(await pedidos.anularItem(Number(req.params.id), Number(req.params.itemId), req.body.motivo, req.usuario!));
  })
);

router.post(
  '/pedidos/:id/items/:itemId/quitar-recargo',
  permitir('CAJERO'),
  idPedido,
  idItem,
  validar,
  ruta(async (req, res) => {
    res.json(await pedidos.quitarRecargo(Number(req.params.id), Number(req.params.itemId), req.usuario!));
  })
);

router.post(
  '/pedidos/:id/anular',
  permitir('ADMIN'),
  idPedido,
  motivo,
  validar,
  ruta(async (req, res) => {
    res.json(await pedidos.anularPedido(Number(req.params.id), req.body.motivo, req.usuario!));
  })
);

router.post(
  '/pedidos/:id/reimprimir',
  permitir('CAJERO'),
  idPedido,
  validar,
  ruta(async (req, res) => {
    res.json(await pedidos.reimprimir(Number(req.params.id)));
  })
);

export default router;
