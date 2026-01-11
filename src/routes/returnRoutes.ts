import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  createReturn,
  createReturnValidation,
  approveReturn,
  completeReturn,
  rejectReturn,
  getReturns,
  getReturnById,
  getReturnsSummary,
  searchSaleForReturn,
} from '../controllers/returnController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Buscar venta para devolución
router.get('/search-sale', searchSaleForReturn);

// Obtener resumen de devoluciones
router.get('/summary', getReturnsSummary);

// Obtener todas las devoluciones
router.get('/', getReturns);

// Obtener devolución por ID
router.get('/:id', getReturnById);

// Crear nueva devolución
router.post('/', createReturnValidation, createReturn);

// Aprobar devolución
router.post('/:id/approve', approveReturn);

// Completar devolución
router.post('/:id/complete', completeReturn);

// Rechazar devolución
router.post('/:id/reject', rejectReturn);

export default router;
