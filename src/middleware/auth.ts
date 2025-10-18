import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole, IUser } from '../models/User';
import { AppError } from './errorHandler';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: IUser;
}

// Middleware de autenticación
export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    // Obtener token del header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('No autorizado - Token no proporcionado', 401);
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };

    // Obtener usuario del token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new AppError('Usuario no encontrado', 401);
    }

    if (!user.isActive) {
      throw new AppError('Cuenta desactivada', 401);
    }

    if (user.isLocked()) {
      throw new AppError('Cuenta bloqueada por múltiples intentos fallidos', 423);
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Token JWT inválido:', { error: error.message, ip: req.ip });
      next(new AppError('Token inválido', 401));
    } else if (error.name === 'TokenExpiredError') {
      logger.warn('Token JWT expirado:', { ip: req.ip });
      next(new AppError('Token expirado', 401));
    } else {
      next(error);
    }
  }
};

// Middleware para verificar roles
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('No autorizado', 401);
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Acceso denegado por rol:', {
        userId: req.user._id,
        role: req.user.role,
        requiredRoles: roles,
        path: req.path
      });
      throw new AppError('No tiene permisos para realizar esta acción', 403);
    }

    next();
  };
};

// Middleware para verificar permisos específicos
export const checkPermission = (permission: keyof IUser['permissions']) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('No autorizado', 401);
    }

    // Los admins tienen todos los permisos
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    if (!req.user.permissions[permission]) {
      logger.warn('Permiso denegado:', {
        userId: req.user._id,
        permission,
        path: req.path
      });
      throw new AppError('No tiene permiso para realizar esta acción', 403);
    }

    next();
  };
};

// Middleware para verificar que el usuario solo acceda a su tienda
export const checkStoreAccess = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new AppError('No autorizado', 401);
  }

  // Los admins pueden acceder a cualquier tienda
  if (req.user.role === UserRole.ADMIN) {
    return next();
  }

  const storeId = req.params.storeId || req.body.store;

  if (!storeId) {
    throw new AppError('ID de tienda no proporcionado', 400);
  }

  if (req.user.store?.toString() !== storeId.toString()) {
    logger.warn('Intento de acceso a tienda no autorizada:', {
      userId: req.user._id,
      userStore: req.user.store,
      requestedStore: storeId
    });
    throw new AppError('No tiene acceso a esta tienda', 403);
  }

  next();
};

// Generar JWT token
export const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generar refresh token
export const generateRefreshToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'refresh-secret', {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};
