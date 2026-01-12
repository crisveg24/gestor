import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Interfaces para errores de Mongoose
interface MongooseCastError extends Error {
  name: 'CastError';
  kind: string;
  value: unknown;
  path: string;
}

interface MongooseDuplicateKeyError extends Error {
  code: 11000;
  keyValue: Record<string, unknown>;
  keyPattern: Record<string, number>;
}

interface MongooseValidationError extends Error {
  name: 'ValidationError';
  errors: Record<string, { message: string; kind: string; path: string }>;
}

type MongooseError = MongooseCastError | MongooseDuplicateKeyError | MongooseValidationError;

// Type guards para identificar errores de Mongoose
const isCastError = (err: Error): err is MongooseCastError => {
  return err.name === 'CastError';
};

const isDuplicateKeyError = (err: Error): err is MongooseDuplicateKeyError => {
  return 'code' in err && (err as MongooseDuplicateKeyError).code === 11000;
};

const isValidationError = (err: Error): err is MongooseValidationError => {
  return err.name === 'ValidationError' && 'errors' in err;
};

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
  err: AppError | Error | MongooseError,
  req: Request,
  res: Response,
  _next: NextFunction
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
  if (isCastError(err)) {
    const message = 'Recurso no encontrado';
    error = new AppError(message, 404);
  }

  // Errores de Mongoose - Duplicado
  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue)[0];
    const message = `El ${field} ya existe`;
    error = new AppError(message, 400);
  }

  // Errores de Mongoose - Validación
  if (isValidationError(err)) {
    const message = Object.values(err.errors)
      .map((val) => val.message)
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

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(`Ruta no encontrada - ${req.originalUrl}`, 404);
  next(error);
};
