import { Router } from 'express';
import { body } from 'express-validator';
import mozosService from '../services/mozos.service';
import { validateRequest } from '../middlewares/validator.middleware';
import { generateMozoToken } from '../config/jwt';

const router = Router();

// Listar todos los mozos (sin autenticación)
router.get('/', async (req, res, next) => {
  try {
    const mozos = await mozosService.getAll();
    res.json(mozos);
  } catch (error) {
    next(error);
  }
});

// Seleccionar mozo y obtener token (sin autenticación)
router.post(
  '/token',
  [body('mozoId').isInt({ min: 1 }).withMessage('ID de mozo inválido')],
  validateRequest,
  async (req, res, next) => {
    try {
      const { mozoId } = req.body;
      const mozo = await mozosService.getById(mozoId);
      
      if (!mozo) {
        return res.status(404).json({ message: 'Mozo no encontrado' });
      }

      const token = generateMozoToken(mozo.id_usuarios);
      res.json({ token, mozo });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
