import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import logger from '../utils/logger';

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Log exhaustivo de errores de validación
    logger.error('❌ [VALIDATION] Errores de validación encontrados');
    logger.error('❌ [VALIDATION] URL:', req.originalUrl);
    logger.error('❌ [VALIDATION] Método:', req.method);
    logger.error('❌ [VALIDATION] Body recibido:', req.body);
    logger.error('❌ [VALIDATION] Errores:', errors.array());
    
    const formattedErrors = errors.array().map(err => ({
      field: err.type === 'field' ? err.path : undefined,
      message: err.msg
    }));
    
    logger.error('❌ [VALIDATION] Errores formateados:', formattedErrors);
    
    res.status(400).json({
      success: false,
      errors: formattedErrors
    });
    return;
  }
  
  logger.info('✅ [VALIDATION] Validación exitosa para:', req.originalUrl);
  next();
};
