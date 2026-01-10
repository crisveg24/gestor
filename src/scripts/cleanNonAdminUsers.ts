import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User, { UserRole } from '../models/User';
import path from 'path';

// Cargar variables de entorno de producción
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', '..', envFile) });

console.log('🧹 Script de limpieza de usuarios no-admin');
console.log('==========================================');
console.log('NODE_ENV:', process.env.NODE_ENV);

const connectDB = async () => {
  try {
    console.log('\n📡 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gestor-tiendas');
    console.log('✅ MongoDB conectado');
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

const cleanNonAdminUsers = async () => {
  try {
    await connectDB();

    // Ver usuarios actuales
    const users = await User.find({}, 'name email role isActive');
    console.log('\n📊 Usuarios actuales:');
    users.forEach(u => {
      const status = u.isActive ? '✅' : '❌';
      console.log(`   ${status} [${u.role.toUpperCase()}] ${u.name} <${u.email}>`);
    });

    // Contar usuarios por tipo
    const adminCount = users.filter(u => u.role === UserRole.ADMIN).length;
    const userCount = users.filter(u => u.role === UserRole.USER).length;

    console.log(`\n   Total: ${users.length} usuarios (${adminCount} admins, ${userCount} usuarios)`);

    // Eliminar usuarios que NO son admin
    console.log('\n🔄 Eliminando usuarios no-admin...');
    const deleted = await User.deleteMany({ role: { $ne: UserRole.ADMIN } });
    console.log(`   ✅ Usuarios eliminados: ${deleted.deletedCount}`);

    // Mostrar usuarios restantes
    const remaining = await User.find({}, 'name email role');
    console.log('\n📋 Usuarios restantes (solo admins):');
    remaining.forEach(u => {
      console.log(`   ✅ [${u.role.toUpperCase()}] ${u.name} <${u.email}>`);
    });

    console.log('\n==========================================');
    console.log('🎉 Limpieza de usuarios completada!');

  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Conexión a MongoDB cerrada');
    process.exit(0);
  }
};

// Ejecutar
cleanNonAdminUsers();
