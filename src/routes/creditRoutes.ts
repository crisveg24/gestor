import { Router } from 'express';
import {
  createCredit,
  getCredits,
  getCreditById,
  addPayment,
  cancelCredit,
  getCreditSummary,
  createCreditValidation,
  addPaymentValidation
} from '../controllers/creditController';
import { protect, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas públicas (para usuarios autenticados)
router.get('/summary', getCreditSummary);
router.get('/', getCredits);
router.get('/:id', getCreditById);
router.post('/', createCreditValidation, createCredit);
router.post('/:id/payment', addPaymentValidation, addPayment);

// Solo admin puede cancelar
router.put('/:id/cancel', authorize(UserRole.ADMIN), cancelCredit);

export default router;
