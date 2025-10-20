import express from 'express';
import {
  createSale,
  getStoreSales,
  getSaleById,
  cancelSale,
  getSalesStats,
  getDailyCut,
  createSaleValidation,
  cancelSaleValidation
} from '../controllers/salesController';
import { protect, authorize, checkStoreAccess, checkPermission } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

// Crear venta
router.post('/', checkPermission('canAddSale'), createSaleValidation, validate, createSale);

// Corte de caja diario
router.get('/daily-cut', getDailyCut);

// Obtener ventas de una tienda
router.get('/:storeId', checkStoreAccess, checkPermission('canViewSales'), getStoreSales);

// Estadísticas de ventas
router.get('/:storeId/stats', checkStoreAccess, checkPermission('canViewReports'), getSalesStats);

// Obtener venta específica
router.get('/detail/:id', getSaleById);

// Cancelar venta (solo admins)
router.put('/:id/cancel', authorize(UserRole.ADMIN), cancelSaleValidation, validate, cancelSale);

export default router;
