import express from 'express';
import {
  getGlobalStats,
  getStoreStats,
  getStoresComparison,
  getPaymentMethodsStats,
  getSalesTrend,
  getTopProducts
} from '../controllers/dashboardController';
import { protect, authorize, checkStoreAccess } from '../middleware/auth';
import { UserRole } from '../models/User';
import { cacheMiddleware } from '../utils/cache';

const router = express.Router();

router.use(protect);

// Estadísticas globales (solo admin) - caché 2 minutos
router.get('/global', authorize(UserRole.ADMIN), cacheMiddleware({ ttl: 120 }), getGlobalStats);

// Comparación entre tiendas (solo admin) - caché 2 minutos
router.get('/comparison', authorize(UserRole.ADMIN), cacheMiddleware({ ttl: 120 }), getStoresComparison);

// Tendencia de ventas (últimos 30 días) - caché 5 minutos
router.get('/sales-trend', cacheMiddleware({ ttl: 300 }), getSalesTrend);

// Productos más vendidos - caché 5 minutos
router.get('/top-products', cacheMiddleware({ ttl: 300 }), getTopProducts);

// Estadísticas por método de pago - caché 2 minutos
router.get('/payment-methods', cacheMiddleware({ ttl: 120 }), getPaymentMethodsStats);

// Estadísticas por tienda - caché 2 minutos
router.get('/store/:storeId', checkStoreAccess, cacheMiddleware({ ttl: 120 }), getStoreStats);

export default router;
