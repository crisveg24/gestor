import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import connectDB from '../config/database';
import logger from '../utils/logger';

// Cargar variables de entorno
// Si NODE_ENV=production, cargar .env.production, sino .env
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log(`📝 Usando archivo de configuración: ${envFile}`);
console.log(`📝 MongoDB URI: ${process.env.MONGODB_URI?.substring(0, 30)}...`);

async function unlockUser(email: string) {
  try {
    // Conectar a base de datos
    await connectDB();

    const user = await User.findOne({ email });

    if (!user) {
      logger.error(`Usuario no encontrado: ${email}`);
      process.exit(1);
    }

    // Resetear intentos de login y desbloquear
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    logger.info(`✅ Usuario desbloqueado exitosamente: ${email}`);
    logger.info(`   - Login attempts: ${user.loginAttempts}`);
    logger.info(`   - Lock until: ${user.lockUntil || 'N/A'}`);

    process.exit(0);
  } catch (error) {
    logger.error('Error al desbloquear usuario:', error);
    process.exit(1);
  }
}

// Obtener email del argumento de línea de comando
const email = process.argv[2];

if (!email) {
  console.log('Uso: npm run unlock-user <email>');
  console.log('Ejemplo: npm run unlock-user admin@tienda.com');
  process.exit(1);
}

unlockUser(email);
