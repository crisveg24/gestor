import express from 'express';
import {
  openCashRegister,
  getCurrentCashRegister,
  addCashMovement,
  closeCashRegister,
  getCashRegisterHistory,
  getCashRegisterById,
  openCashRegisterValidation,
  addMovementValidation,
  closeCashRegisterValidation
} from '../controllers/cashRegisterController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Estado actual de la caja
router.get('/current', getCurrentCashRegister);

// Historial de arqueos
router.get('/history', getCashRegisterHistory);

// Abrir caja
router.post('/open', openCashRegisterValidation, openCashRegister);

// Agregar movimiento (ingreso/egreso)
router.post('/movement', addMovementValidation, addCashMovement);

// Cerrar caja
router.post('/close', closeCashRegisterValidation, closeCashRegister);

// Detalle de un arqueo específico
router.get('/:id', getCashRegisterById);

export default router;
