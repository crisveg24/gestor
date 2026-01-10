/**
 * Middleware de caché en memoria para endpoints frecuentes
 * Reduce la carga en MongoDB para queries que no cambian frecuentemente
 */

import { Request, Response, NextFunction } from 'express';
import logger from './logger';

interface CacheEntry {
  data: unknown;
  timestamp: number;
  etag: string;
}

interface CacheOptions {
  ttl?: number; // Time to live en segundos (default: 60)
  key?: (req: Request) => string; // Función para generar key personalizada
}

// Cache en memoria simple
const cache = new Map<string, CacheEntry>();

// Limpieza periódica de entradas expiradas (cada 5 minutos)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of cache.entries()) {
    // Limpiar entradas mayores a 10 minutos
    if (now - entry.timestamp > 10 * 60 * 1000) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.debug(`[CACHE] Limpiadas ${cleaned} entradas expiradas`);
  }
}, 5 * 60 * 1000);

/**
 * Genera un ETag basado en los datos
 */
function generateETag(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

/**
 * Genera la key de caché basada en la request
 */
function generateCacheKey(req: Request, customKey?: (req: Request) => string): string {
  if (customKey) {
    return customKey(req);
  }
  
  // Key por defecto: método + path + query params + user id (si existe)
  const userId = (req as unknown as { user?: { _id: string } }).user?._id || 'anonymous';
  const queryStr = JSON.stringify(req.query);
  return `${req.method}:${req.path}:${queryStr}:${userId}`;
}

/**
 * Middleware de caché
 * Cachea respuestas GET exitosas y soporta ETag para validación
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const { ttl = 60, key: customKey } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Solo cachear GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const cacheKey = generateCacheKey(req, customKey);
    const cached = cache.get(cacheKey);
    const now = Date.now();
    
    // Verificar si hay cache válido
    if (cached) {
      const age = (now - cached.timestamp) / 1000;
      
      // Verificar si el cache está dentro del TTL
      if (age < ttl) {
        // Verificar If-None-Match para 304
        const clientEtag = req.headers['if-none-match'];
        if (clientEtag === cached.etag) {
          logger.debug(`[CACHE] 304 Not Modified: ${cacheKey}`);
          return res.status(304).end();
        }
        
        // Retornar cache con headers
        logger.debug(`[CACHE] HIT (${age.toFixed(1)}s): ${cacheKey}`);
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Age', age.toFixed(0));
        res.set('ETag', cached.etag);
        res.set('Cache-Control', `private, max-age=${Math.floor(ttl - age)}`);
        return res.json(cached.data);
      }
      
      // Cache expirado, eliminar
      cache.delete(cacheKey);
    }
    
    // Interceptar res.json para cachear la respuesta
    const originalJson = res.json.bind(res);
    res.json = function(data: unknown) {
      // Solo cachear respuestas exitosas
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const etag = generateETag(data);
        
        cache.set(cacheKey, {
          data,
          timestamp: now,
          etag
        });
        
        logger.debug(`[CACHE] MISS, stored: ${cacheKey}`);
        res.set('X-Cache', 'MISS');
        res.set('ETag', etag);
        res.set('Cache-Control', `private, max-age=${ttl}`);
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Invalida el caché para una ruta específica
 * Útil después de operaciones de escritura (POST, PUT, DELETE)
 */
export function invalidateCache(pattern: string | RegExp): void {
  let invalidated = 0;
  
  for (const key of cache.keys()) {
    if (typeof pattern === 'string') {
      if (key.includes(pattern)) {
        cache.delete(key);
        invalidated++;
      }
    } else {
      if (pattern.test(key)) {
        cache.delete(key);
        invalidated++;
      }
    }
  }
  
  if (invalidated > 0) {
    logger.debug(`[CACHE] Invalidadas ${invalidated} entradas para: ${pattern}`);
  }
}

/**
 * Limpia todo el caché
 */
export function clearCache(): void {
  const size = cache.size;
  cache.clear();
  logger.info(`[CACHE] Limpiado completamente (${size} entradas)`);
}

/**
 * Obtiene estadísticas del caché
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

export default cacheMiddleware;
