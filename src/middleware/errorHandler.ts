import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err } as AppError;
  error.message = err.message;

  // Log del error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Errores de Mongoose - Cast Error
  if ((err as any).name === 'CastError') {
    const message = 'Recurso no encontrado';
    error = new AppError(message, 404);
  }

  // Errores de Mongoose - Duplicado
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];
    const message = `El ${field} ya existe`;
    error = new AppError(message, 400);
  }

  // Errores de Mongoose - Validación
  if ((err as any).name === 'ValidationError') {
    const message = Object.values((err as any).errors)
      .map((val: any) => val.message)
      .join(', ');
    error = new AppError(message, 400);
  }

  // Respuesta
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Error del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Ruta no encontrada - ${req.originalUrl}`, 404);
  next(error);
};
