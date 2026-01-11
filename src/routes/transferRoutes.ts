import express from 'express';
import {
  createTransfer,
  getTransfers,
  getTransferById,
  sendTransfer,
  receiveTransfer,
  cancelTransfer,
  getTransfersSummary,
  createTransferValidation,
  receiveTransferValidation,
  cancelTransferValidation
} from '../controllers/transferController';
import { protect, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Resumen (debe ir antes de /:id)
router.get('/summary', getTransfersSummary);

// CRUD de transferencias
router.route('/')
  .get(getTransfers)
  .post(authorize(UserRole.ADMIN), createTransferValidation, createTransfer);

router.route('/:id')
  .get(getTransferById);

// Acciones sobre transferencias
router.put('/:id/send', sendTransfer);
router.put('/:id/receive', receiveTransferValidation, receiveTransfer);
router.put('/:id/cancel', authorize(UserRole.ADMIN), cancelTransferValidation, cancelTransfer);

export default router;
