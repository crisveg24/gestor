import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';

// Cargar variables de entorno según el ambiente
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', '..', envFile) });

console.log('🌱 SEED DE PRODUCCIÓN');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MongoDB:', process.env.MONGODB_URI?.substring(0, 40) + '...\n');

async function seedProduction() {
  try {
    // Conectar a MongoDB
    console.log('📡 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log('✅ Conectado a MongoDB Atlas\n');

    const db = mongoose.connection.db!;

    // ==================== TIENDAS ====================
    console.log('🏪 Creando tiendas...');
    await db.collection('stores').deleteMany({});
    
    await db.collection('stores').insertMany([
      {
        name: 'Tienda Centro',
        address: 'Av. Principal #123, Centro',
        phone: '+1234567890',
        email: 'centro@tienda.com',
        city: 'Ciudad Principal',
        country: 'Colombia',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Tienda Norte',
        address: 'Calle Norte #456, Zona Norte',
        phone: '+1234567891',
        email: 'norte@tienda.com',
        city: 'Ciudad Principal',
        country: 'Colombia',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Tienda Sur',
        address: 'Av. Sur #789, Zona Sur',
        phone: '+1234567892',
        email: 'sur@tienda.com',
        city: 'Ciudad Principal',
        country: 'Colombia',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Tienda Este',
        address: 'Calle Este #321, Zona Este',
        phone: '+1234567893',
        email: 'este@tienda.com',
        city: 'Ciudad Principal',
        country: 'Colombia',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const stores = await db.collection('stores').find({}).toArray();
    console.log(`   ✅ ${stores.length} tiendas creadas\n`);

    // ==================== USUARIO ADMIN ====================
    console.log('👤 Creando usuario administrador...');
    await db.collection('users').deleteMany({});

    const adminPassword = await bcrypt.hash('Admin123!', 12);
    await db.collection('users').insertOne({
      name: 'Administrador Principal',
      email: 'admin@tienda.com',
      password: adminPassword,
      role: 'admin',
      isActive: true,
      loginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`   ✅ Usuario admin creado (admin@tienda.com / Admin123!)\n`);

    // ==================== USUARIOS NORMALES ====================
    console.log('👥 Creando usuarios de tiendas...');
    const userPassword = await bcrypt.hash('User123!', 12);
    
    await db.collection('users').insertMany([
      {
        name: 'Carlos Vendedor',
        email: 'carlos@tienda.com',
        password: userPassword,
        role: 'user',
        store: stores[0]._id,
        isActive: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'María García',
        email: 'maria@tienda.com',
        password: userPassword,
        role: 'user',
        store: stores[1]._id,
        isActive: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log(`   ✅ 2 usuarios normales creados\n`);

    // ==================== PRODUCTOS ====================
    console.log('📦 Creando productos...');
    await db.collection('products').deleteMany({});

    await db.collection('products').insertMany([
      {
        name: 'Laptop HP ProBook 450',
        sku: 'LAP-HP-001',
        barcode: '7501234567890',
        category: 'Electrónica',
        description: 'Laptop empresarial HP ProBook 450 G8',
        cost: 800,
        price: 1200,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Mouse Logitech MX Master 3',
        sku: 'ACC-LOG-001',
        barcode: '7501234567891',
        category: 'Accesorios',
        description: 'Mouse inalámbrico ergonómico',
        cost: 50,
        price: 85,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Teclado Mecánico Razer',
        sku: 'ACC-RAZ-001',
        barcode: '7501234567892',
        category: 'Accesorios',
        description: 'Teclado mecánico gaming RGB',
        cost: 80,
        price: 140,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Monitor Samsung 27" 4K',
        sku: 'MON-SAM-001',
        barcode: '7501234567893',
        category: 'Monitores',
        description: 'Monitor 4K UHD 27 pulgadas',
        cost: 300,
        price: 450,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Disco SSD Samsung 1TB',
        sku: 'STO-SAM-001',
        barcode: '7501234567894',
        category: 'Almacenamiento',
        description: 'SSD NVMe 1TB',
        cost: 90,
        price: 150,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const products = await db.collection('products').find({}).toArray();
    console.log(`   ✅ ${products.length} productos creados\n`);

    // ==================== INVENTARIO ====================
    console.log('📊 Creando inventario...');
    await db.collection('inventories').deleteMany({});

    const inventoryItems = [];
    for (const product of products) {
      for (const store of stores) {
        inventoryItems.push({
          product: product._id,
          store: store._id,
          quantity: Math.floor(Math.random() * 50) + 10,
          minStock: 5,
          maxStock: 100,
          lastUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    await db.collection('inventories').insertMany(inventoryItems);
    console.log(`   ✅ ${inventoryItems.length} items de inventario creados\n`);

    // ==================== PROVEEDORES ====================
    console.log('🚚 Creando proveedores...');
    await db.collection('suppliers').deleteMany({});

    const admin = await db.collection('users').findOne({ email: 'admin@tienda.com' });

    await db.collection('suppliers').insertMany([
      {
        name: 'Tech Supplies Co.',
        contactName: 'Juan Pérez',
        email: 'ventas@techsupplies.com',
        phone: '+1234567800',
        address: 'Zona Industrial #100',
        city: 'Ciudad Principal',
        country: 'Colombia',
        nit: '900123456-1',
        categories: ['Electrónica', 'Accesorios'],
        paymentTerms: '30 días',
        rating: 4.5,
        isActive: true,
        createdBy: admin?._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Office Depot',
        contactName: 'María López',
        email: 'contact@officedepot.com',
        phone: '+1234567801',
        address: 'Av. Comercial #200',
        city: 'Ciudad Principal',
        country: 'Colombia',
        nit: '900123457-2',
        categories: ['Oficina', 'Accesorios'],
        paymentTerms: '15 días',
        rating: 4.0,
        isActive: true,
        createdBy: admin?._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log(`   ✅ 2 proveedores creados\n`);

    // ==================== RESUMEN ====================
    console.log('='.repeat(50));
    console.log('✅ SEED COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(50));
    console.log(`🏪 Tiendas: ${stores.length}`);
    console.log(`👤 Usuarios: ${await db.collection('users').countDocuments()}`);
    console.log(`📦 Productos: ${products.length}`);
    console.log(`📊 Inventario: ${inventoryItems.length} items`);
    console.log(`🚚 Proveedores: 2`);
    console.log('\n📝 Credenciales de acceso:');
    console.log('   Admin: admin@tienda.com / Admin123!');
    console.log('   Usuario: carlos@tienda.com / User123!');
    console.log('   Usuario: maria@tienda.com / User123!');
    console.log('='.repeat(50));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

seedProduction();
