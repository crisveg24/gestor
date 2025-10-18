import mongoose from 'mongoose';
import logger from '../utils/logger';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gestor-tiendas', {
      // Opciones de conexión para mejor rendimiento y seguridad
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB conectado: ${conn.connection.host}`);

    // Manejo de eventos de conexión
    mongoose.connection.on('error', (err) => {
      logger.error('Error de conexión a MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB desconectado');
    });

    // Manejo de cierre graceful
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB desconectado por cierre de aplicación');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB;
