import express from 'express';
import {
  getStats,
  getSalesByCategory,
  getSalesByPaymentMethod,
  getTopProducts,
  getSalesByStore,
  getSalesTrend,
} from '../controllers/reportsController';
import { protect, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

// Estadísticas generales
router.get('/stats', getStats);

// Ventas por categoría
router.get('/by-category', getSalesByCategory);

// Ventas por método de pago
router.get('/by-payment-method', getSalesByPaymentMethod);

// Top productos
router.get('/top-products', getTopProducts);

// Ventas por tienda (solo admins)
router.get('/by-store', authorize(UserRole.ADMIN), getSalesByStore);

// Tendencia de ventas
router.get('/sales-trend', getSalesTrend);

export default router;
