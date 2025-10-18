import express from 'express';
import {
  getStoreInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getLowStockAlerts,
  addInventoryValidation,
  updateInventoryValidation
} from '../controllers/inventoryController';
import { protect, authorize, checkStoreAccess, checkPermission } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

// Alertas de stock bajo
router.get('/alerts/low-stock', getLowStockAlerts);

// Obtener inventario de una tienda
router.get('/:storeId', checkStoreAccess, checkPermission('canViewInventory'), getStoreInventory);

// Agregar al inventario (solo admins)
router.post('/', authorize(UserRole.ADMIN), addInventoryValidation, validate, addInventoryItem);

// Actualizar inventario
router.put('/:id', updateInventoryValidation, validate, updateInventoryItem);

// Eliminar del inventario (solo admins)
router.delete('/:id', authorize(UserRole.ADMIN), deleteInventoryItem);

export default router;
