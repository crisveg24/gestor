import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import logger from '../utils/logger';
import { AppError } from './errorHandler';

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.error('[VALIDATION] Errores de validación:', {
      url: req.originalUrl,
      method: req.method,
      errors: errors.array()
    });
    
    const formattedErrors = errors.array().map(err => ({
      field: err.type === 'field' ? err.path : undefined,
      message: err.msg
    }));
    
    res.status(400).json({
      success: false,
      errors: formattedErrors
    });
    return;
  }
  
  next();
};

/**
 * Middleware para validar que un parámetro de la URL sea un ObjectId válido de MongoDB.
 * Previene errores de CastError y posibles ataques con IDs malformados.
 * @param paramName - Nombre del parámetro a validar (por defecto 'id')
 */
export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    
    if (!id) {
      return next(new AppError(`El parámetro ${paramName} es requerido`, 400));
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn('[VALIDATION] ObjectId inválido:', { paramName, id, url: req.originalUrl });
      return next(new AppError(`El ${paramName} proporcionado no es válido`, 400));
    }
    
    next();
  };
};

/**
 * Middleware para validar múltiples ObjectIds en los parámetros de la URL.
 * @param paramNames - Array de nombres de parámetros a validar
 */
export const validateObjectIds = (...paramNames: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const paramName of paramNames) {
      const id = req.params[paramName];
      
      if (id && !mongoose.Types.ObjectId.isValid(id)) {
        logger.warn('[VALIDATION] ObjectId inválido:', { paramName, id, url: req.originalUrl });
        return next(new AppError(`El ${paramName} proporcionado no es válido`, 400));
      }
    }
    
    next();
  };
};
