import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Cargar variables de entorno de producción
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log(`📝 Usando archivo: ${envFile}`);
console.log(`📝 Conectando a: ${process.env.MONGODB_URI?.substring(0, 40)}...`);

async function resetAdminPassword() {
  try {
    // Conectar directamente a MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado a MongoDB Atlas');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('No se pudo obtener la base de datos');
    }

    const email = 'admin@tienda.com';
    const password = 'Admin123!';

    // Buscar el usuario
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      console.log('❌ Usuario no encontrado. Creando nuevo usuario admin...');
      
      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Crear usuario admin
      await db.collection('users').insertOne({
        name: 'Administrador',
        email,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      console.log('✅ Usuario admin creado exitosamente');
    } else {
      console.log('✅ Usuario encontrado. Actualizando contraseña...');
      
      // Hash de la nueva contraseña
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Actualizar contraseña y resetear intentos
      await db.collection('users').updateOne(
        { email },
        { 
          $set: { 
            password: hashedPassword,
            loginAttempts: 0,
            lockUntil: null,
            isActive: true,
            updatedAt: new Date(),
          } 
        }
      );
      
      console.log('✅ Contraseña actualizada exitosamente');
    }

    console.log('\n📋 Credenciales:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetAdminPassword();
