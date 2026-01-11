import express from 'express';
import {
  createSale,
  getAllSales,
  getStoreSales,
  getSaleById,
  updateSale,
  editSaleItems,
  cancelSale,
  getSalesStats,
  getDailyCut,
  createSaleValidation,
  updateSaleValidation,
  editSaleItemsValidation,
  cancelSaleValidation
} from '../controllers/salesController';
import { protect, authorize, checkStoreAccess, checkPermission } from '../middleware/auth';
import { validate, validateObjectId } from '../middleware/validation';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

// Obtener todas las ventas (con filtros)
router.get('/', getAllSales);

// Crear venta
router.post('/', checkPermission('canAddSale'), createSaleValidation, validate, createSale);

// Corte de caja diario
router.get('/daily-cut', getDailyCut);

// Obtener venta específica
router.get('/detail/:id', validateObjectId('id'), getSaleById);

// Obtener ventas de una tienda
router.get('/:storeId', validateObjectId('storeId'), checkStoreAccess, checkPermission('canViewSales'), getStoreSales);

// Estadísticas de ventas
router.get('/:storeId/stats', validateObjectId('storeId'), checkStoreAccess, checkPermission('canViewReports'), getSalesStats);

// Actualizar venta (solo admins) - notas, método de pago, descuento
router.put('/:id', validateObjectId('id'), authorize(UserRole.ADMIN), updateSaleValidation, validate, updateSale);

// Editar items de venta con ajuste de inventario (solo admins)
router.put('/:id/items', validateObjectId('id'), authorize(UserRole.ADMIN), editSaleItemsValidation, validate, editSaleItems);

// Cancelar venta (solo admins)
router.put('/:id/cancel', validateObjectId('id'), authorize(UserRole.ADMIN), cancelSaleValidation, validate, cancelSale);

export default router;
