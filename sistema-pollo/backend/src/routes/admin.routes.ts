import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { autenticar, permitir } from '../middlewares/auth';
import { ruta, validar } from '../middlewares/comunes';
import * as admin from '../services/admin.service';
import * as impresion from '../services/impresion.service';
import { ROLES } from '../types';

const router = Router();
router.use(autenticar);

const id = param('id').isInt({ min: 1 }).toInt();
const soloAdmin = permitir('ADMIN');
const dinero = (campo: string) => body(campo).isFloat({ min: 0, max: 100000 }).withMessage(`${campo} inválido`).toFloat();
const nombre = (opcional = false) =>
  (opcional ? body('nombre').optional() : body('nombre')).isString().trim().isLength({ min: 1, max: 100 }).withMessage('Nombre requerido');
const activo = (campo = 'activo') => body(campo).optional().isBoolean().toBoolean();

// --- Usuarios y mozos ---
router.get('/usuarios', soloAdmin, query('rol').optional().isIn(ROLES as unknown as string[]), validar,
  ruta(async (req, res) => { res.json(await admin.listarUsuarios(req.query.rol as string | undefined)); }));

const reglasUsuario = (opcional: boolean) => [
  nombre(opcional),
  (opcional ? body('rol').optional() : body('rol')).isIn(ROLES as unknown as string[]).withMessage('Rol inválido'),
  body('usuario').optional({ values: 'null' }).isString().trim().matches(/^[a-zA-Z0-9._-]{3,50}$/).withMessage('Usuario: 3-50 letras, números, . _ -'),
  body('password').optional({ values: 'falsy' }).isString().isLength({ min: 6, max: 100 }).withMessage('Contraseña: mínimo 6 caracteres'),
  body('pin').optional({ values: 'null' }).custom((v) => v === '' || /^\d{4}$/.test(String(v))).withMessage('El PIN debe tener 4 dígitos'),
  activo(),
];

router.post('/usuarios', soloAdmin, ...reglasUsuario(false), validar,
  ruta(async (req, res) => { res.status(201).json(await admin.crearUsuario(req.body)); }));
router.patch('/usuarios/:id', soloAdmin, id, ...reglasUsuario(true), validar,
  ruta(async (req, res) => { res.json(await admin.actualizarUsuario(Number(req.params.id), req.body, req.usuario!)); }));
router.get('/usuarios/:id/pedidos', soloAdmin, id, validar,
  ruta(async (req, res) => { res.json(await admin.historialUsuario(Number(req.params.id))); }));

// --- Categorías ---
router.get('/categorias', soloAdmin, ruta(async (_req, res) => { res.json(await admin.listarCategorias()); }));
router.post('/categorias', soloAdmin, nombre(), body('orden').optional().isInt().toInt(), validar,
  ruta(async (req, res) => { res.status(201).json(await admin.crearCategoria(req.body)); }));
router.patch('/categorias/:id', soloAdmin, id, nombre(true), body('orden').optional().isInt().toInt(), activo(), validar,
  ruta(async (req, res) => { res.json(await admin.actualizarCategoria(Number(req.params.id), req.body)); }));
router.delete('/categorias/:id', soloAdmin, id, validar,
  ruta(async (req, res) => { res.json(await admin.eliminarCategoria(Number(req.params.id))); }));

// --- Productos ---
const reglasProducto = (opcional: boolean) => {
  const o = <T extends { optional: () => T }>(v: T) => (opcional ? v.optional() : v);
  return [
    nombre(opcional),
    body('descripcion').optional({ values: 'null' }).isString().trim().isLength({ max: 255 }),
    o(dinero('precio')),
    body('recargoLlevar').optional().isFloat({ min: 0, max: 1000 }).toFloat(),
    body('foto').optional({ values: 'null' }).isString().trim().isLength({ max: 255 }),
    o(body('categoriaId').isInt({ min: 1 }).withMessage('Categoría requerida').toInt()),
    o(body('areaId').isInt({ min: 1 }).withMessage('Área requerida').toInt()),
    activo(),
  ];
};
router.get('/productos', soloAdmin, ruta(async (_req, res) => { res.json(await admin.listarProductos()); }));
router.post('/productos', soloAdmin, ...reglasProducto(false), validar,
  ruta(async (req, res) => { res.status(201).json(await admin.crearProducto(req.body)); }));
router.patch('/productos/:id', soloAdmin, id, ...reglasProducto(true), validar,
  ruta(async (req, res) => { res.json(await admin.actualizarProducto(Number(req.params.id), req.body, req.usuario!)); }));
router.get('/productos/:id/historial-precios', soloAdmin, id, validar,
  ruta(async (req, res) => { res.json(await admin.historialPrecios(Number(req.params.id))); }));
router.post('/productos/:id/opciones', soloAdmin, id, nombre(), body('precioExtra').optional().isFloat({ min: 0 }).toFloat(), validar,
  ruta(async (req, res) => { res.status(201).json(await admin.crearOpcion(Number(req.params.id), req.body)); }));
router.patch('/opciones/:id', soloAdmin, id, nombre(true), body('precioExtra').optional().isFloat({ min: 0 }).toFloat(), activo('activa'), validar,
  ruta(async (req, res) => { res.json(await admin.actualizarOpcion(Number(req.params.id), req.body)); }));

// --- Mesas ---
router.get('/mesas', soloAdmin, ruta(async (_req, res) => { res.json(await admin.listarMesas()); }));
router.post('/mesas', soloAdmin, body('numero').isInt({ min: 1, max: 999 }).toInt(), validar,
  ruta(async (req, res) => { res.status(201).json(await admin.crearMesa(req.body.numero)); }));
router.patch('/mesas/:id', soloAdmin, id, body('numero').optional().isInt({ min: 1, max: 999 }).toInt(), activo(), validar,
  ruta(async (req, res) => { res.json(await admin.actualizarMesa(Number(req.params.id), req.body)); }));
router.delete('/mesas/:id', soloAdmin, id, validar,
  ruta(async (req, res) => { res.json(await admin.eliminarMesa(Number(req.params.id))); }));

// --- Áreas ---
router.get('/areas', soloAdmin, ruta(async (_req, res) => { res.json(await admin.listarAreas()); }));
router.post('/areas', soloAdmin, nombre(), validar,
  ruta(async (req, res) => { res.status(201).json(await admin.crearArea(req.body.nombre)); }));
router.patch('/areas/:id', soloAdmin, id, nombre(true), activo(), validar,
  ruta(async (req, res) => { res.json(await admin.actualizarArea(Number(req.params.id), req.body)); }));

// --- Impresoras ---
const reglasImpresora = (opcional: boolean) => [
  nombre(opcional),
  (opcional ? body('ip').optional() : body('ip')).isIP().withMessage('IP inválida'),
  body('puerto').optional().isInt({ min: 1, max: 65535 }).toInt(),
  (opcional ? body('areaId').optional() : body('areaId')).isInt({ min: 1 }).toInt(),
  activo('activa'),
];
router.get('/impresoras', soloAdmin, ruta(async (_req, res) => { res.json(await admin.listarImpresoras()); }));
router.post('/impresoras', soloAdmin, ...reglasImpresora(false), validar,
  ruta(async (req, res) => { res.status(201).json(await admin.crearImpresora(req.body)); }));
router.patch('/impresoras/:id', soloAdmin, id, ...reglasImpresora(true), validar,
  ruta(async (req, res) => { res.json(await admin.actualizarImpresora(Number(req.params.id), req.body)); }));
router.post('/impresoras/:id/probar', soloAdmin, id, validar,
  ruta(async (req, res) => { res.json(await admin.probarImpresora(Number(req.params.id))); }));

// --- Cola de impresión (caja y admin) ---
router.get('/impresiones', permitir('CAJERO'),
  query('estado').optional().isIn(['PENDIENTE', 'IMPRESA', 'ERROR']),
  query('pedidoId').optional().isInt({ min: 1 }).toInt(),
  validar,
  ruta(async (req, res) => {
    res.json(await impresion.listar(req.query.estado as string | undefined, req.query.pedidoId ? Number(req.query.pedidoId) : undefined));
  }));
router.get('/impresiones/:id/vista', permitir('CAJERO'), id, validar,
  ruta(async (req, res) => { res.type('text/plain').send(await impresion.vistaPrevia(Number(req.params.id))); }));
router.post('/impresiones/:id/reintentar', permitir('CAJERO'), id, validar,
  ruta(async (req, res) => { res.json(await impresion.reintentar(Number(req.params.id))); }));

export default router;
