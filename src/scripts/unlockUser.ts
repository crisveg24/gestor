import dotenv from 'dotenv';
import User from '../models/User';
import connectDB from '../config/database';
import logger from '../utils/logger';

// Cargar variables de entorno
dotenv.config();

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
