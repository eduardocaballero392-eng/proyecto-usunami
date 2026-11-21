import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { ruta, validar } from '../middlewares/comunes';
import { autenticar, permitir } from '../middlewares/auth';
import * as printerService from '../services/printer.service';

const router = Router();
router.use(autenticar);

const soloAdmin = permitir('ADMIN');

/**
 * POST /api/printer/ticket/:pedidoId/:areaId
 * Imprime un ticket completo (comanda o boleta)
 * Requiere autenticación
 */
router.post(
  '/ticket/:pedidoId/:areaId',
  param('pedidoId').isInt({ min: 1 }).withMessage('ID de pedido inválido'),
  param('areaId').isInt({ min: 1 }).withMessage('ID de área inválido'),
  body('tipo')
    .optional()
    .isIn(['COMANDA', 'BOLETA'])
    .withMessage('Tipo debe ser COMANDA o BOLETA'),
  validar,
  ruta(async (req: Request, res: Response) => {
    const pedidoId = parseInt(req.params.pedidoId);
    const areaId = parseInt(req.params.areaId);
    const tipo = (req.body.tipo as 'COMANDA' | 'BOLETA') || 'COMANDA';

    await printerService.imprimirTicket(pedidoId, areaId, tipo);

    res.json({
      exito: true,
      mensaje: `Ticket ${tipo} enviado a impresión`,
      pedidoId,
      areaId,
    });
  })
);

/**
 * POST /api/printer/prueba/:areaId
 * Imprime un ticket de prueba
 * Solo administradores
 */
router.post(
  '/prueba/:areaId',
  soloAdmin,
  param('areaId').isInt({ min: 1 }).withMessage('ID de área inválido'),
  validar,
  ruta(async (req: Request, res: Response) => {
    const areaId = parseInt(req.params.areaId);

    await printerService.imprimirPrueba(areaId);

    res.json({
      exito: true,
      mensaje: 'Ticket de prueba enviado a impresión',
      areaId,
    });
  })
);

/**
 * GET /api/printer/verificar/:areaId
 * Verifica el estado de conexión con la impresora
 * Solo administradores
 */
router.get(
  '/verificar/:areaId',
  soloAdmin,
  param('areaId').isInt({ min: 1 }).withMessage('ID de área inválido'),
  validar,
  ruta(async (req: Request, res: Response) => {
    const areaId = parseInt(req.params.areaId);

    const estado = await printerService.verificarConexionImpresora(areaId);

    res.json({
      exito: true,
      areaId,
      ...estado,
    });
  })
);

/**
 * POST /api/printer/reimprimir/:pedidoId/:areaId
 * Reimprime un ticket (útil si la primera impresión falló)
 * Requiere autenticación
 */
router.post(
  '/reimprimir/:pedidoId/:areaId',
  param('pedidoId').isInt({ min: 1 }).withMessage('ID de pedido inválido'),
  param('areaId').isInt({ min: 1 }).withMessage('ID de área inválido'),
  validar,
  ruta(async (req: Request, res: Response) => {
    const pedidoId = parseInt(req.params.pedidoId);
    const areaId = parseInt(req.params.areaId);

    await printerService.imprimirTicket(pedidoId, areaId, 'COMANDA');

    res.json({
      exito: true,
      mensaje: 'Ticket reenviado a impresión',
      pedidoId,
      areaId,
    });
  })
);

/**
 * GET /api/printer/ble-status
 * Obtiene el estado del servidor BLE y sus conexiones
 * Solo administradores
 */
router.get(
  '/ble-status',
  soloAdmin,
  ruta(async (_req: Request, res: Response) => {
    const status = printerService.obtenerEstadoBLEServer();

    res.json({
      exito: true,
      servidor_activo: true,
      impresoras: status,
    });
  })
);

export default router;
