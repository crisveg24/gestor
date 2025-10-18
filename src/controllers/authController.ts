import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import User, { UserRole } from '../models/User';
import { AuthRequest, generateToken, generateRefreshToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

// @desc    Registrar nuevo usuario (solo admins)
// @route   POST /api/auth/register
// @access  Private/Admin
export const register = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role, store, permissions } = req.body;

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new AppError('El usuario ya existe', 400);
    }

    // Validar que usuarios normales tengan asignada una tienda
    if (role === UserRole.USER && !store) {
      throw new AppError('Los usuarios deben estar asignados a una tienda', 400);
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      store: role === UserRole.USER ? store : undefined,
      permissions: permissions || undefined
    });

    logger.info('Usuario registrado:', {
      userId: user._id,
      email: user.email,
      role: user.role,
      registeredBy: req.user?._id
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        store: user.store,
        permissions: user.permissions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login de usuario
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validar email y password
    if (!email || !password) {
      throw new AppError('Por favor proporcione email y contraseña', 400);
    }

    // Buscar usuario
    const user = await User.findOne({ email }).select('+password').populate('store');

    if (!user) {
      logger.warn('Intento de login fallido - usuario no encontrado:', { email, ip: req.ip });
      throw new AppError('Credenciales inválidas', 401);
    }

    // Verificar si la cuenta está activa
    if (!user.isActive) {
      logger.warn('Intento de login en cuenta desactivada:', { email, userId: user._id });
      throw new AppError('Cuenta desactivada', 401);
    }

    // Verificar si la cuenta está bloqueada
    if (user.isLocked()) {
      logger.warn('Intento de login en cuenta bloqueada:', { email, userId: user._id });
      throw new AppError('Cuenta bloqueada por múltiples intentos fallidos. Intente más tarde.', 423);
    }

    // Verificar contraseña
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.incLoginAttempts();
      logger.warn('Intento de login fallido - contraseña incorrecta:', {
        email,
        userId: user._id,
        attempts: user.loginAttempts + 1
      });
      throw new AppError('Credenciales inválidas', 401);
    }

    // Reset intentos de login
    if (user.loginAttempts > 0 || user.lockUntil) {
      await user.resetLoginAttempts();
    }

    // Generar tokens
    const token = generateToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    logger.info('Login exitoso:', { userId: user._id, email: user.email });

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        store: user.store,
        permissions: user.permissions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener usuario actual
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id).populate('store');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar perfil de usuario
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user?._id);

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    logger.info('Perfil actualizado:', { userId: user._id });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cambiar contraseña
// @route   PUT /api/auth/password
// @access  Private
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id).select('+password');

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    // Verificar contraseña actual
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      throw new AppError('Contraseña actual incorrecta', 401);
    }

    user.password = newPassword;
    await user.save();

    logger.info('Contraseña cambiada:', { userId: user._id });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// Validaciones
export const registerValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener mayúsculas, minúsculas y números'),
  body('role').isIn(Object.values(UserRole)).withMessage('Rol inválido')
];

export const loginValidation = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida')
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('La contraseña actual es requerida'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener mayúsculas, minúsculas y números')
];
