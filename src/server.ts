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

// Trust proxy - necesario para Render y rate limiting
app.set('trust proxy', 1);

// Middlewares de seguridad
app.use(helmet({
  contentSecurityPolicy: false, // Deshabilitado para permitir CSP del frontend
  crossOriginEmbedderPolicy: false,
}));

// CORS - Configuración mejorada para producción
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://gestor-fronted.vercel.app',
  'https://gestor-frontend.vercel.app', // Variante del dominio Vercel
  'https://vrmajo.xyz',
  'https://www.vrmajo.xyz'
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Permitir requests sin origin (como mobile apps o curl requests)
    if (!origin) return callback(null, true);
    
    // En desarrollo, permitir todos los orígenes
    if (process.env.NODE_ENV === 'development') {
      logger.info(`✅ [CORS] Permitido en desarrollo: ${origin}`);
      return callback(null, true);
    }
    
    // En producción, verificar lista de orígenes permitidos
    if (allowedOrigins.indexOf(origin) !== -1) {
      logger.info(`✅ [CORS] Origin permitido: ${origin}`);
      callback(null, true);
    } else {
      logger.warn(`❌ [CORS] Origin bloqueado: ${origin}`);
      logger.warn(`❌ [CORS] Orígenes permitidos: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200,
  preflightContinue: false
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
import reportRoutes from './routes/reportRoutes';
import seedRoutes from './routes/seed.routes';
import supplierRoutes from './routes/supplierRoutes';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);

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
    version: '1.1.8',
    endpoints: {
      auth: '/api/auth',
      stores: '/api/stores',
      users: '/api/users',
      products: '/api/products',
      inventory: '/api/inventory',
      sales: '/api/sales',
      dashboard: '/api/dashboard',
      reports: '/api/reports',
      suppliers: '/api/suppliers',
      purchaseOrders: '/api/purchase-orders'
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
