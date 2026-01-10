import express from 'express';
import {
  getStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
  toggleStoreActive,
  createStoreValidation,
  updateStoreValidation
} from '../controllers/storeController';
import { protect, authorize } from '../middleware/auth';
import { validate, validateObjectId } from '../middleware/validation';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

// Rutas para administradores
router.get('/', authorize(UserRole.ADMIN), getStores);
router.post('/', authorize(UserRole.ADMIN), createStoreValidation, validate, createStore);
router.put('/:id', validateObjectId('id'), authorize(UserRole.ADMIN), updateStoreValidation, validate, updateStore);
router.delete('/:id', validateObjectId('id'), authorize(UserRole.ADMIN), deleteStore);
router.patch('/:id/toggle', validateObjectId('id'), authorize(UserRole.ADMIN), toggleStoreActive);

// Ruta accesible para todos los usuarios autenticados
router.get('/:id', validateObjectId('id'), getStoreById);

export default router;
