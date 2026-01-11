import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';
import {
  exportFullBackup,
  exportSalesCSV,
  exportInventoryCSV,
  exportProductsCSV,
  getStoreComparisonReport,
} from '../controllers/backupController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Backup completo (solo admin)
router.get('/full', authorize(UserRole.ADMIN), exportFullBackup);

// Exportar ventas CSV
router.get('/sales/csv', exportSalesCSV);

// Exportar inventario CSV
router.get('/inventory/csv', exportInventoryCSV);

// Exportar productos CSV
router.get('/products/csv', exportProductsCSV);

// Reporte comparativo de tiendas (solo admin)
router.get('/store-comparison', authorize(UserRole.ADMIN), getStoreComparisonReport);

export default router;
