import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import User, { UserRole } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, store, isActive } = req.query;

    const query: any = {};
    
    if (role) query.role = role;
    if (store) query.store = store;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .populate('store', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener usuario por ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).populate('store');

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear nuevo usuario
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role, store, permissions } = req.body;

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new AppError('El usuario ya existe', 400);
    }

    // Nota: La tienda es opcional, puede asignarse después
    const userData: any = {
      name,
      email,
      password,
      role,
      permissions: permissions || undefined
    };

    // Solo asignar tienda si se proporciona y no es admin
    if (role !== UserRole.ADMIN && store) {
      userData.store = store;
    }

    const user = await User.create(userData);

    // Populate store info
    await user.populate('store', 'name');

    logger.info('Usuario creado:', {
      userId: user._id,
      email: user.email,
      role: user.role,
      createdBy: req.user?._id
    });

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar usuario
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role, store, permissions, isActive } = req.body;

    const user = await User.findById(id);

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    // Validar que usuarios normales tengan asignada una tienda
    if (role === UserRole.USER && !store && !user.store) {
      throw new AppError('Los usuarios deben estar asignados a una tienda', 400);
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (store !== undefined) user.store = store;
    if (permissions !== undefined) user.permissions = { ...user.permissions, ...permissions };
    if (isActive !== undefined) user.isActive = isActive;

    // Si cambió a admin, remover la tienda
    if (role === UserRole.ADMIN) {
      user.store = undefined;
    }

    await user.save();

    logger.info('Usuario actualizado:', {
      userId: user._id,
      updatedBy: req.user?._id
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar usuario
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    // Soft delete
    user.isActive = false;
    await user.save();

    logger.info('Usuario eliminado (soft delete):', {
      userId: id,
      deletedBy: req.user?._id
    });

    res.json({
      success: true,
      message: 'Usuario eliminado'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resetear intentos de login de un usuario
// @route   POST /api/users/:id/reset-attempts
// @access  Private/Admin
export const resetLoginAttempts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    await user.resetLoginAttempts();

    logger.info('Intentos de login reseteados:', {
      userId: id,
      resetBy: req.user?._id
    });

    res.json({
      success: true,
      message: 'Intentos de login reseteados'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restablecer contraseña de usuario
// @route   PATCH /api/users/:id/reset-password
// @access  Private/Admin
export const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
    }

    const user = await User.findById(id).select('+password');

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    user.password = password;
    await user.save();

    logger.info('Contraseña restablecida:', {
      userId: id,
      resetBy: req.user?._id
    });

    res.json({
      success: true,
      message: 'Contraseña restablecida exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activar/desactivar usuario
// @route   PATCH /api/users/:id/activate
// @access  Private/Admin
export const toggleUserActive = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(id);

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    user.isActive = isActive;
    await user.save();

    logger.info('Estado de usuario cambiado:', {
      userId: id,
      isActive,
      changedBy: req.user?._id
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Validaciones
export const createUserValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('role').isIn(Object.values(UserRole)).withMessage('Rol inválido'),
  body('store').optional({ values: 'falsy' }).isMongoId().withMessage('ID de tienda inválido'),
];

export const updateUserValidation = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('email').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('role').optional().isIn(Object.values(UserRole)).withMessage('Rol inválido'),
  body('store').optional({ values: 'falsy' }).isMongoId().withMessage('ID de tienda inválido'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser un booleano')
];
