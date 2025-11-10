import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Store from '../models/Store';
import User, { UserRole } from '../models/User';
import Product from '../models/Product';
import Supplier from '../models/Supplier';
import PurchaseOrder, { PurchaseOrderStatus } from '../models/PurchaseOrder';
import logger from '../utils/logger';
import path from 'path';

// Cargar variables de entorno según el ambiente
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', '..', envFile) });

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Archivo .env:', envFile);
console.log('MONGODB_URI:', process.env.MONGODB_URI?.substring(0, 30) + '...');

const connectDB = async () => {
  try {
    console.log('Intentando conectar a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gestor-tiendas');
    logger.info('MongoDB conectado para seed');
  } catch (error) {
    logger.error('Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    // Limpiar datos existentes
    await Store.deleteMany({});
    await User.deleteMany({});
    await Product.deleteMany({});
    await Supplier.deleteMany({});
    await PurchaseOrder.deleteMany({});

    logger.info('Datos antiguos eliminados');

    // Crear tiendas
    const stores = await Store.insertMany([
      {
        name: 'Tienda Centro',
        address: 'Av. Principal #123, Centro',
        phone: '+1234567890',
        email: 'centro@tienda.com',
        isActive: true
      },
      {
        name: 'Tienda Norte',
        address: 'Calle Norte #456, Zona Norte',
        phone: '+1234567891',
        email: 'norte@tienda.com',
        isActive: true
      },
      {
        name: 'Tienda Sur',
        address: 'Av. Sur #789, Zona Sur',
        phone: '+1234567892',
        email: 'sur@tienda.com',
        isActive: true
      },
      {
        name: 'Tienda Este',
        address: 'Calle Este #321, Zona Este',
        phone: '+1234567893',
        email: 'este@tienda.com',
        isActive: true
      }
    ]);

    logger.info(`${stores.length} tiendas creadas`);

    // Crear usuario administrador
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    await User.create({
      name: 'Administrador Principal',
      email: 'admin@tienda.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
      permissions: {
        canAddInventory: true,
        canRemoveInventory: true,
        canViewInventory: true,
        canAddSale: true,
        canViewSales: true,
        canViewReports: true
      }
    });

    logger.info('Administrador creado');

    // Crear usuarios para cada tienda
    const users = [];
    for (let i = 0; i < stores.length; i++) {
      const userPassword = await bcrypt.hash('User123!', 12);
      const user = await User.create({
        name: `Usuario ${stores[i].name}`,
        email: `usuario${i + 1}@tienda.com`,
        password: userPassword,
        role: UserRole.USER,
        store: stores[i]._id,
        isActive: true,
        permissions: {
          canAddInventory: false,
          canRemoveInventory: true,
          canViewInventory: true,
          canAddSale: true,
          canViewSales: true,
          canViewReports: false
        }
      });
      users.push(user);
    }

    logger.info(`${users.length} usuarios creados`);

    // Crear productos de ejemplo
    const products = await Product.insertMany([
      {
        name: 'Laptop Dell XPS 13',
        description: 'Laptop ultraportátil con procesador Intel i7',
        sku: 'LAP-001',
        barcode: '7501234567890',
        category: 'Electrónica',
        price: 1299.99,
        cost: 899.99,
        isActive: true
      },
      {
        name: 'Mouse Inalámbrico Logitech',
        description: 'Mouse inalámbrico con batería de larga duración',
        sku: 'MOU-001',
        barcode: '7501234567891',
        category: 'Accesorios',
        price: 29.99,
        cost: 15.99,
        isActive: true
      },
      {
        name: 'Teclado Mecánico RGB',
        description: 'Teclado mecánico con iluminación RGB personalizable',
        sku: 'KEY-001',
        barcode: '7501234567892',
        category: 'Accesorios',
        price: 89.99,
        cost: 49.99,
        isActive: true
      },
      {
        name: 'Monitor LG 27" 4K',
        description: 'Monitor 4K UHD de 27 pulgadas',
        sku: 'MON-001',
        barcode: '7501234567893',
        category: 'Electrónica',
        price: 399.99,
        cost: 299.99,
        isActive: true
      },
      {
        name: 'Auriculares Sony WH-1000XM4',
        description: 'Auriculares con cancelación de ruido',
        sku: 'AUD-001',
        barcode: '7501234567894',
        category: 'Audio',
        price: 349.99,
        cost: 249.99,
        isActive: true
      },
      {
        name: 'Webcam Logitech 1080p',
        description: 'Webcam Full HD para videoconferencias',
        sku: 'WEB-001',
        barcode: '7501234567895',
        category: 'Accesorios',
        price: 79.99,
        cost: 49.99,
        isActive: true
      },
      {
        name: 'Disco Duro Externo 2TB',
        description: 'Disco duro portátil de 2TB USB 3.0',
        sku: 'HDD-001',
        barcode: '7501234567896',
        category: 'Almacenamiento',
        price: 89.99,
        cost: 59.99,
        isActive: true
      },
      {
        name: 'Memoria USB 64GB',
        description: 'Memoria USB 3.0 de alta velocidad',
        sku: 'USB-001',
        barcode: '7501234567897',
        category: 'Almacenamiento',
        price: 19.99,
        cost: 9.99,
        isActive: true
      },
      {
        name: 'Router WiFi 6',
        description: 'Router inalámbrico de última generación',
        sku: 'ROU-001',
        barcode: '7501234567898',
        category: 'Redes',
        price: 149.99,
        cost: 99.99,
        isActive: true
      },
      {
        name: 'Cable HDMI 2.1 3m',
        description: 'Cable HDMI 2.1 de 3 metros',
        sku: 'CAB-001',
        barcode: '7501234567899',
        category: 'Accesorios',
        price: 24.99,
        cost: 12.99,
        isActive: true
      }
    ]);

    logger.info(`${products.length} productos creados`);

    // Crear proveedores
    const adminUser = await User.findOne({ role: UserRole.ADMIN });
    
    const suppliers = await Supplier.insertMany([
      {
        name: 'TechDistribuciones S.A.',
        contactName: 'Carlos Mendoza',
        email: 'ventas@techdist.com',
        phone: '+57 300 1234567',
        address: 'Carrera 50 #45-30',
        city: 'Bogotá',
        country: 'Colombia',
        taxId: '900123456-7',
        categories: ['Electrónica', 'Computadoras', 'Accesorios'],
        paymentTerms: '30 días',
        website: 'www.techdist.com',
        rating: 5,
        isActive: true,
        createdBy: adminUser!._id,
        updatedBy: adminUser!._id
      },
      {
        name: 'ElectroMax Ltda',
        contactName: 'María González',
        email: 'pedidos@electromax.com',
        phone: '+57 310 7654321',
        address: 'Avenida 68 #120-45',
        city: 'Medellín',
        country: 'Colombia',
        taxId: '800987654-3',
        categories: ['Electrónica', 'Audio', 'Celulares'],
        paymentTerms: 'Contado',
        rating: 4,
        isActive: true,
        createdBy: adminUser!._id,
        updatedBy: adminUser!._id
      },
      {
        name: 'CompuPartes Colombia',
        contactName: 'Jorge Ramírez',
        email: 'info@compupartes.com',
        phone: '+57 320 5551234',
        address: 'Calle 100 #15-20',
        city: 'Cali',
        country: 'Colombia',
        taxId: '900555777-1',
        categories: ['Computadoras', 'Redes', 'Accesorios'],
        paymentTerms: '15 días',
        rating: 4,
        isActive: true,
        createdBy: adminUser!._id,
        updatedBy: adminUser!._id
      }
    ]);

    logger.info(`${suppliers.length} proveedores creados`);

    // Crear órdenes de compra de ejemplo
    const purchaseOrders = await PurchaseOrder.insertMany([
      {
        supplier: suppliers[0]._id,
        store: stores[0]._id,
        items: [
          {
            product: products[0]._id, // Laptop
            quantityOrdered: 10,
            quantityReceived: 10,
            unitCost: 699.99
          },
          {
            product: products[1]._id, // Mouse
            quantityOrdered: 50,
            quantityReceived: 50,
            unitCost: 15.99
          }
        ],
        tax: 0,
        shippingCost: 50,
        expectedDeliveryDate: new Date('2025-11-15'),
        receivedDate: new Date('2025-11-14'),
        status: PurchaseOrderStatus.RECEIVED,
        paymentStatus: 'paid',
        createdBy: adminUser!._id,
        updatedBy: adminUser!._id,
        receivedBy: adminUser!._id
      },
      {
        supplier: suppliers[1]._id,
        store: stores[1]._id,
        items: [
          {
            product: products[3]._id, // Smartphone
            quantityOrdered: 20,
            quantityReceived: 0,
            unitCost: 399.99
          }
        ],
        tax: 0,
        shippingCost: 30,
        expectedDeliveryDate: new Date('2025-11-20'),
        status: PurchaseOrderStatus.PENDING,
        paymentStatus: 'pending',
        createdBy: adminUser!._id,
        updatedBy: adminUser!._id
      },
      {
        supplier: suppliers[2]._id,
        store: stores[0]._id,
        items: [
          {
            product: products[5]._id, // Webcam
            quantityOrdered: 15,
            quantityReceived: 10,
            unitCost: 49.99
          },
          {
            product: products[8]._id, // Cable HDMI
            quantityOrdered: 100,
            quantityReceived: 100,
            unitCost: 12.99
          }
        ],
        tax: 0,
        shippingCost: 25,
        expectedDeliveryDate: new Date('2025-11-18'),
        receivedDate: new Date('2025-11-17'),
        status: PurchaseOrderStatus.PARTIAL,
        paymentStatus: 'partial',
        createdBy: adminUser!._id,
        updatedBy: adminUser!._id,
        receivedBy: adminUser!._id
      }
    ]);

    logger.info(`${purchaseOrders.length} órdenes de compra creadas`);

    logger.info('\n=== CREDENCIALES DE ACCESO ===');
    logger.info('\nAdministrador:');
    logger.info('Email: admin@tienda.com');
    logger.info('Password: Admin123!');
    
    logger.info('\nUsuarios de tienda:');
    for (let i = 0; i < users.length; i++) {
      logger.info(`\n${stores[i].name}:`);
      logger.info(`Email: usuario${i + 1}@tienda.com`);
      logger.info(`Password: User123!`);
    }

    logger.info('\n=== Seed completado exitosamente ===');
    process.exit(0);
  } catch (error) {
    logger.error('Error en seed:', error);
    process.exit(1);
  }
};

seedData();
