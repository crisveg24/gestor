import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', '..', envFile) });

async function checkDatabase() {
  try {
    console.log('📡 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado\n');

    const db = mongoose.connection.db!;

    // Contar documentos en cada colección
    const storesCount = await db.collection('stores').countDocuments();
    const usersCount = await db.collection('users').countDocuments();
    const productsCount = await db.collection('products').countDocuments();
    const inventoryCount = await db.collection('inventories').countDocuments();
    const suppliersCount = await db.collection('suppliers').countDocuments();

    console.log('📊 Estado de la Base de Datos:');
    console.log('================================');
    console.log(`Tiendas:     ${storesCount}`);
    console.log(`Usuarios:    ${usersCount}`);
    console.log(`Productos:   ${productsCount}`);
    console.log(`Inventario:  ${inventoryCount}`);
    console.log(`Proveedores: ${suppliersCount}`);
    console.log('================================\n');

    // Mostrar un producto de ejemplo
    if (productsCount > 0) {
      console.log('📦 Primer producto en la BD:');
      const firstProduct = await db.collection('products').findOne({});
      console.log(JSON.stringify(firstProduct, null, 2));
    } else {
      console.log('⚠️  No hay productos en la base de datos');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDatabase();
