import express from 'express';
import {
  getReportStats,
  getSalesTrend,
  getTopProducts,
  getReportsByStore,
  getReportsByCategory,
  getReportsByPaymentMethod,
} from '../controllers/reportController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Proteger todas las rutas
router.use(protect);

// GET /api/reports/stats
router.get('/stats', getReportStats);

// GET /api/reports/sales-trend
router.get('/sales-trend', getSalesTrend);

// GET /api/reports/top-products
router.get('/top-products', getTopProducts);

// GET /api/reports/by-store
router.get('/by-store', getReportsByStore);

// GET /api/reports/by-category
router.get('/by-category', getReportsByCategory);

// GET /api/reports/by-payment-method
router.get('/by-payment-method', getReportsByPaymentMethod);

export default router;
