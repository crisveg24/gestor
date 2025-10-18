import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  registerValidation,
  loginValidation,
  changePasswordValidation
} from '../controllers/authController';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../models/User';

const router = express.Router();

// Rutas públicas
router.post('/login', loginValidation, validate, login);

// Rutas protegidas
router.use(protect);

router.get('/me', getMe);
router.put('/profile', updateProfile);
router.put('/password', changePasswordValidation, validate, changePassword);

// Rutas solo para administradores
router.post('/register', authorize(UserRole.ADMIN), registerValidation, validate, register);

export default router;
