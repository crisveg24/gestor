import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Cargar variables de entorno de producción
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log(`📝 Usando archivo: ${envFile}`);
console.log(`📝 Conectando a: ${process.env.MONGODB_URI?.substring(0, 40)}...`);

async function cleanOrphanData() {
  try {
    // Conectar directamente a MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado a MongoDB Atlas\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('No se pudo obtener la base de datos');
    }

    // ==================== LIMPIAR INVENTARIO ====================
    console.log('🧹 [INVENTARIO] Buscando items huérfanos...');
    
    // Obtener todos los items de inventario
    const inventoryItems = await db.collection('inventories').find({}).toArray();
    console.log(`   Total items de inventario: ${inventoryItems.length}`);

    // Obtener IDs válidos de productos y tiendas
    const validProductIds = (await db.collection('products').find({}).project({ _id: 1 }).toArray())
      .map(p => p._id.toString());
    const validStoreIds = (await db.collection('stores').find({}).project({ _id: 1 }).toArray())
      .map(s => s._id.toString());

    console.log(`   Productos válidos: ${validProductIds.length}`);
    console.log(`   Tiendas válidas: ${validStoreIds.length}`);

    // Buscar items con referencias inválidas
    const orphanItems = inventoryItems.filter(item => {
      const hasInvalidProduct = !validProductIds.includes(item.product?.toString());
      const hasInvalidStore = !validStoreIds.includes(item.store?.toString());
      return hasInvalidProduct || hasInvalidStore;
    });

    console.log(`   ❌ Items huérfanos encontrados: ${orphanItems.length}`);

    if (orphanItems.length > 0) {
      const orphanIds = orphanItems.map(item => item._id);
      const deleteResult = await db.collection('inventories').deleteMany({
        _id: { $in: orphanIds }
      });
      console.log(`   ✅ Items eliminados: ${deleteResult.deletedCount}`);
    } else {
      console.log(`   ✅ No hay items huérfanos en inventario`);
    }

    // ==================== LIMPIAR VENTAS ====================
    console.log('\n🧹 [VENTAS] Buscando ventas huérfanas...');
    
    const sales = await db.collection('sales').find({}).toArray();
    console.log(`   Total ventas: ${sales.length}`);

    const orphanSales = sales.filter(sale => {
      const hasInvalidStore = !validStoreIds.includes(sale.store?.toString());
      const hasInvalidProducts = sale.items?.some((item: any) => 
        !validProductIds.includes(item.product?.toString())
      );
      return hasInvalidStore || hasInvalidProducts;
    });

    console.log(`   ❌ Ventas huérfanas encontradas: ${orphanSales.length}`);

    if (orphanSales.length > 0) {
      const orphanSaleIds = orphanSales.map(sale => sale._id);
      const deleteResult = await db.collection('sales').deleteMany({
        _id: { $in: orphanSaleIds }
      });
      console.log(`   ✅ Ventas eliminadas: ${deleteResult.deletedCount}`);
    } else {
      console.log(`   ✅ No hay ventas huérfanas`);
    }

    // ==================== LIMPIAR MOVIMIENTOS DE INVENTARIO ====================
    console.log('\n🧹 [MOVIMIENTOS] Buscando movimientos huérfanos...');
    
    const movements = await db.collection('stockmovements').find({}).toArray();
    console.log(`   Total movimientos: ${movements.length}`);

    const orphanMovements = movements.filter(movement => {
      const hasInvalidProduct = !validProductIds.includes(movement.product?.toString());
      const hasInvalidStore = !validStoreIds.includes(movement.store?.toString());
      return hasInvalidProduct || hasInvalidStore;
    });

    console.log(`   ❌ Movimientos huérfanos encontrados: ${orphanMovements.length}`);

    if (orphanMovements.length > 0) {
      const orphanMovementIds = orphanMovements.map(m => m._id);
      const deleteResult = await db.collection('stockmovements').deleteMany({
        _id: { $in: orphanMovementIds }
      });
      console.log(`   ✅ Movimientos eliminados: ${deleteResult.deletedCount}`);
    } else {
      console.log(`   ✅ No hay movimientos huérfanos`);
    }

    // ==================== RESUMEN ====================
    console.log('\n' + '='.repeat(50));
    console.log('✅ LIMPIEZA COMPLETADA');
    console.log('='.repeat(50));
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanOrphanData();
