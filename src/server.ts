import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import connectDB from './config/database';
import { errorHandler, notFound } from './middleware/errorHandler';
import logger from './utils/logger';

// Cargar variables de entorno
dotenv.config();

// Conectar a base de datos
connectDB();

// Inicializar app
const app: Application = express();

// Middlewares de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos por defecto
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.http(message.trim())
    }
  }));
}

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitizar datos contra inyección NoSQL
app.use(mongoSanitize());

// Rutas
import authRoutes from './routes/authRoutes';
import storeRoutes from './routes/storeRoutes';
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import salesRoutes from './routes/salesRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import seedRoutes from './routes/seed.routes';

app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/seed', seedRoutes);

// Ruta de health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta raíz
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API de Gestor de Tiendas',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      stores: '/api/stores',
      users: '/api/users',
      products: '/api/products',
      inventory: '/api/inventory',
      sales: '/api/sales',
      dashboard: '/api/dashboard'
    }
  });
});

// Manejo de errores
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Servidor corriendo en modo ${process.env.NODE_ENV} en el puerto ${PORT}`);
});

// Manejo de promesas rechazadas no controladas
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

export default app;
