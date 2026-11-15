import { Router } from 'express';
import { body } from 'express-validator';
import authService from '../services/auth.service';
import { validateRequest } from '../middlewares/validator.middleware';

const router = Router();

// Login para usuarios admin/caja/cocina
router.post(
  '/login',
  [
    body('usuario').trim().notEmpty().withMessage('Usuario es requerido'),
    body('password').notEmpty().withMessage('Password es requerido'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { usuario, password } = req.body;
      const result = await authService.login(usuario, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
