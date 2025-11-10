import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Cargar variables de entorno de producción
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log(`📝 Usando archivo: ${envFile}`);
console.log(`📝 Conectando a: ${process.env.MONGODB_URI?.substring(0, 40)}...`);

async function unlockUser(email: string) {
  try {
    // Conectar directamente a MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado a MongoDB Atlas');

    // Actualizar el usuario directamente
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('No se pudo obtener la base de datos');
    }

    const result = await db.collection('users').updateOne(
      { email },
      { 
        $set: { 
          loginAttempts: 0,
          lockUntil: null
        } 
      }
    );

    if (result.matchedCount === 0) {
      console.log(`❌ Usuario no encontrado: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Usuario desbloqueado: ${email}`);
    console.log(`   - Documentos modificados: ${result.modifiedCount}`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.log('❌ Uso: ts-node unlockUserDirect.ts <email>');
  process.exit(1);
}

unlockUser(email);
