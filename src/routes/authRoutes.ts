import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  getMe,
  refreshTokens,
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

// Rate limiter específico para login - más estricto que el general
// Limita a 10 intentos cada 15 minutos por IP para prevenir ataques de fuerza bruta
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos máximo
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión desde esta IP. Por favor, intente de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Saltar rate limiting si el login es exitoso (header personalizado)
  skip: (_req, res) => res.statusCode === 200,
});

// Rutas públicas
router.post('/login', loginRateLimiter, loginValidation, validate, login);
router.post('/refresh', refreshTokens); // Endpoint para refrescar tokens

// Rutas protegidas
router.use(protect);

router.get('/me', getMe);
router.put('/profile', updateProfile);
router.put('/password', changePasswordValidation, validate, changePassword);

// Rutas solo para administradores
router.post('/register', authorize(UserRole.ADMIN), registerValidation, validate, register);

export default router;
