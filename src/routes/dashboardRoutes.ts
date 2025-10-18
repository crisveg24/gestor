import express from 'express';
import {
  getGlobalStats,
  getStoreStats,
  getStoresComparison
} from '../controllers/dashboardController';
import { protect, authorize, checkStoreAccess } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

// Estadísticas globales (solo admin)
router.get('/global', authorize(UserRole.ADMIN), getGlobalStats);

// Comparación entre tiendas (solo admin)
router.get('/comparison', authorize(UserRole.ADMIN), getStoresComparison);

// Estadísticas por tienda
router.get('/store/:storeId', checkStoreAccess, getStoreStats);

export default router;
