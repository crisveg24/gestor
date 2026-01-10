import { Request } from 'express';

/**
 * Interfaz para opciones de paginación
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Interfaz para respuesta paginada
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Valores por defecto para paginación
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Extrae y valida los parámetros de paginación de una request.
 * @param req - Request de Express
 * @returns Objeto con page, limit y skip validados
 */
export function getPaginationParams(req: Request): PaginationOptions {
  const page = Math.max(1, parseInt(req.query.page as string) || DEFAULT_PAGE);
  const requestedLimit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Construye la respuesta paginada estándar.
 * @param data - Array de datos
 * @param total - Total de documentos en la colección
 * @param options - Opciones de paginación usadas
 * @returns Objeto de respuesta paginada
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  options: PaginationOptions
): PaginatedResponse<T> {
  const pages = Math.ceil(total / options.limit);
  
  return {
    data,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      pages,
      hasNext: options.page < pages,
      hasPrev: options.page > 1,
    },
  };
}

/**
 * Helper para construir respuesta JSON de API con paginación.
 * @param data - Array de datos
 * @param total - Total de documentos
 * @param options - Opciones de paginación
 * @param dataKey - Nombre de la clave para los datos (default: 'data')
 */
export function paginatedApiResponse<T>(
  data: T[],
  total: number,
  options: PaginationOptions,
  dataKey: string = 'data'
) {
  const pages = Math.ceil(total / options.limit);
  
  return {
    success: true,
    count: data.length,
    total,
    page: options.page,
    pages,
    [dataKey]: data,
  };
}
