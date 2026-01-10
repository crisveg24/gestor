import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Store from '../models/Store';
import Product from '../models/Product';
import Inventory from '../models/Inventory';
import Sale from '../models/Sale';
import PurchaseOrder from '../models/PurchaseOrder';
import Supplier from '../models/Supplier';
import path from 'path';

// Cargar variables de entorno de producción
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', '..', envFile) });

console.log('🧹 Script de limpieza de datos para producción');
console.log('================================================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Archivo .env:', envFile);
console.log('MONGODB_URI:', process.env.MONGODB_URI?.substring(0, 40) + '...');

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

const cleanData = async () => {
  try {
    await connectDB();

    console.log('\n🗑️  Iniciando limpieza de datos...');
    console.log('================================================');

    // Contar datos antes de eliminar
    const productCount = await Product.countDocuments();
    const inventoryCount = await Inventory.countDocuments();
    const storeCount = await Store.countDocuments();
    const saleCount = await Sale.countDocuments();
    const purchaseOrderCount = await PurchaseOrder.countDocuments();
    const supplierCount = await Supplier.countDocuments();

    console.log('\n📊 Datos actuales:');
    console.log(`   - Productos: ${productCount}`);
    console.log(`   - Inventarios: ${inventoryCount}`);
    console.log(`   - Tiendas: ${storeCount}`);
    console.log(`   - Ventas: ${saleCount}`);
    console.log(`   - Órdenes de compra: ${purchaseOrderCount}`);
    console.log(`   - Proveedores: ${supplierCount}`);

    // Confirmar antes de eliminar
    console.log('\n⚠️  ADVERTENCIA: Esta acción eliminará TODOS los datos listados arriba.');
    console.log('   Los USUARIOS se mantendrán intactos.');
    
    // Eliminar en orden correcto (dependencias primero)
    console.log('\n🔄 Eliminando datos...');

    // 1. Ventas (dependen de inventario y productos)
    const deletedSales = await Sale.deleteMany({});
    console.log(`   ✅ Ventas eliminadas: ${deletedSales.deletedCount}`);

    // 2. Órdenes de compra (dependen de productos y proveedores)
    const deletedPurchaseOrders = await PurchaseOrder.deleteMany({});
    console.log(`   ✅ Órdenes de compra eliminadas: ${deletedPurchaseOrders.deletedCount}`);

    // 3. Inventarios (dependen de productos y tiendas)
    const deletedInventory = await Inventory.deleteMany({});
    console.log(`   ✅ Inventarios eliminados: ${deletedInventory.deletedCount}`);

    // 4. Productos
    const deletedProducts = await Product.deleteMany({});
    console.log(`   ✅ Productos eliminados: ${deletedProducts.deletedCount}`);

    // 5. Proveedores
    const deletedSuppliers = await Supplier.deleteMany({});
    console.log(`   ✅ Proveedores eliminados: ${deletedSuppliers.deletedCount}`);

    // 6. Tiendas
    const deletedStores = await Store.deleteMany({});
    console.log(`   ✅ Tiendas eliminadas: ${deletedStores.deletedCount}`);

    console.log('\n================================================');
    console.log('🎉 Limpieza completada exitosamente!');
    console.log('\n📌 Nota: Los usuarios NO fueron eliminados.');
    console.log('   Puedes crear nuevas tiendas y asignar usuarios desde el panel admin.');

  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Conexión a MongoDB cerrada');
    process.exit(0);
  }
};

// Ejecutar
cleanData();
