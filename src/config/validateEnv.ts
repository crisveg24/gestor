import logger from '../utils/logger';

interface EnvVariable {
  name: string;
  required: boolean;
  description: string;
}

const requiredEnvVars: EnvVariable[] = [
  {
    name: 'MONGODB_URI',
    required: true,
    description: 'URI de conexión a MongoDB'
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'Clave secreta para firmar tokens JWT'
  },
  {
    name: 'JWT_REFRESH_SECRET',
    required: true,
    description: 'Clave secreta para firmar refresh tokens'
  },
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Entorno de ejecución (development/production)'
  },
  {
    name: 'PORT',
    required: false,
    description: 'Puerto del servidor'
  }
];

/**
 * Valida que todas las variables de entorno requeridas estén definidas.
 * Lanza un error si falta alguna variable requerida en producción.
 */
export const validateEnv = (): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  const missingVars: string[] = [];
  const warnings: string[] = [];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar.name];
    
    if (!value) {
      if (envVar.required) {
        missingVars.push(`${envVar.name} - ${envVar.description}`);
      } else {
        warnings.push(`${envVar.name} - ${envVar.description}`);
      }
    }
  }

  // Validaciones adicionales de seguridad
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET debería tener al menos 32 caracteres para mayor seguridad');
  }

  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    warnings.push('JWT_REFRESH_SECRET debería tener al menos 32 caracteres para mayor seguridad');
  }

  if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    warnings.push('JWT_SECRET y JWT_REFRESH_SECRET no deberían ser iguales');
  }

  // Mostrar advertencias
  if (warnings.length > 0) {
    logger.warn('⚠️ Advertencias de configuración:');
    warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }

  // En producción, fallar si faltan variables requeridas
  if (missingVars.length > 0) {
    const errorMessage = `❌ Variables de entorno requeridas no definidas:\n${missingVars.map(v => `  - ${v}`).join('\n')}`;
    
    if (isProduction) {
      logger.error(errorMessage);
      throw new Error('Configuración incompleta. El servidor no puede iniciar en producción sin las variables requeridas.');
    } else {
      logger.warn(errorMessage);
      logger.warn('⚠️ Continuando en modo desarrollo con valores por defecto...');
    }
  } else {
    logger.info('✅ Todas las variables de entorno requeridas están configuradas');
  }
};

export default validateEnv;
