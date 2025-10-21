import express from 'express';
import {
  getAllInventory,
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

// Alertas de stock bajo (debe ir antes que las rutas con parámetros)
router.get('/alerts/low-stock', getLowStockAlerts);

// Obtener todo el inventario con filtros opcionales (debe ir antes que /:storeId)
router.get('/', getAllInventory);

// Obtener inventario de una tienda específica
router.get('/:storeId', checkStoreAccess, checkPermission('canViewInventory'), getStoreInventory);

// Agregar al inventario (solo admins)
router.post('/', authorize(UserRole.ADMIN), addInventoryValidation, validate, addInventoryItem);

// Actualizar inventario
router.put('/:id', updateInventoryValidation, validate, updateInventoryItem);

// Eliminar del inventario (solo admins)
router.delete('/:id', authorize(UserRole.ADMIN), deleteInventoryItem);

export default router;
