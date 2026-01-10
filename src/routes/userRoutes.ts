import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetLoginAttempts,
  resetPassword,
  generateTemporaryPassword,
  toggleUserActive,
  createUserValidation,
  updateUserValidation
} from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';
import { validate, validateObjectId } from '../middleware/validation';
import { UserRole } from '../models/User';

const router = express.Router();

// Todas las rutas requieren autenticación y rol de administrador
router.use(protect, authorize(UserRole.ADMIN));

router.get('/', getUsers);
router.post('/', createUserValidation, validate, createUser);
router.get('/:id', validateObjectId('id'), getUserById);
router.put('/:id', validateObjectId('id'), updateUserValidation, validate, updateUser);
router.delete('/:id', validateObjectId('id'), deleteUser);
router.post('/:id/reset-attempts', validateObjectId('id'), resetLoginAttempts);
router.patch('/:id/reset-password', validateObjectId('id'), resetPassword);
router.post('/:id/generate-password', validateObjectId('id'), generateTemporaryPassword);
router.patch('/:id/activate', validateObjectId('id'), toggleUserActive);

export default router;
