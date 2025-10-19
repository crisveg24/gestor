import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Store from '../models/Store';
import User, { UserRole } from '../models/User';
import Product from '../models/Product';

const router = Router();

router.post('/execute-seed', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Verificar que estemos en producción
    if (process.env.NODE_ENV !== 'production') {
      res.status(403).json({ 
        success: false, 
        message: 'Este endpoint solo está disponible en producción' 
      });
      return;
    }

    // Limpiar datos existentes
    await Store.deleteMany({});
    await User.deleteMany({});
    await Product.deleteMany({});

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

    // Crear usuarios para cada tienda
    for (let i = 0; i < stores.length; i++) {
      const userPassword = await bcrypt.hash('User123!', 12);
      await User.create({
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
    }

    // Crear productos de ejemplo
    await Product.insertMany([
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
      }
    ]);

    res.json({
      success: true,
      message: 'Base de datos sembrada exitosamente',
      data: {
        stores: stores.length,
        users: 5,
        products: 5
      }
    });
  } catch (error) {
    console.error('Error en seed:', error);
    res.status(500).json({
      success: false,
      message: 'Error al sembrar la base de datos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
