import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetLoginAttempts,
  createUserValidation,
  updateUserValidation
} from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../models/User';

const router = express.Router();

// Todas las rutas requieren autenticación y rol de administrador
router.use(protect, authorize(UserRole.ADMIN));

router.get('/', getUsers);
router.post('/', createUserValidation, validate, createUser);
router.get('/:id', getUserById);
router.put('/:id', updateUserValidation, validate, updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/reset-attempts', resetLoginAttempts);

export default router;
