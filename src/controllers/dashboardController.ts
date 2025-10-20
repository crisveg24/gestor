import { Response, NextFunction } from 'express';
import Sale, { SaleStatus } from '../models/Sale';
import Inventory from '../models/Inventory';
import Store from '../models/Store';
import User, { UserRole } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

// @desc    Obtener estadísticas globales (todos los stores)
// @route   GET /api/dashboard/global
// @access  Private/Admin
export const getGlobalStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const query: any = { status: SaleStatus.COMPLETED };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    // Estadísticas de ventas globales
    const salesStats = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$finalTotal' },
          averageTicket: { $avg: '$finalTotal' }
        }
      }
    ]);

    // Ventas por tienda
    const salesByStore = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$store',
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$finalTotal' }
        }
      },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'store'
        }
      },
      { $unwind: '$store' },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Total de tiendas activas
    const totalStores = await Store.countDocuments({ isActive: true });

    // Total de usuarios activos
    const totalUsers = await User.countDocuments({ isActive: true });

    // Productos con stock bajo (global)
    const lowStockCount = await Inventory.countDocuments({
      $expr: { $lte: ['$quantity', '$minStock'] }
    });

    // Ventas del día actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySales = await Sale.aggregate([
      {
        $match: {
          status: SaleStatus.COMPLETED,
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$finalTotal' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalStores,
          totalUsers,
          lowStockCount,
          ...(salesStats[0] || { totalSales: 0, totalRevenue: 0, averageTicket: 0 })
        },
        today: todaySales[0] || { count: 0, revenue: 0 },
        salesByStore
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener estadísticas por tienda
// @route   GET /api/dashboard/store/:storeId
// @access  Private
export const getStoreStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    // Verificar acceso
    if (req.user?.role !== UserRole.ADMIN) {
      if (storeId !== req.user?.store?.toString()) {
        throw new AppError('No tiene acceso a esta tienda', 403);
      }
    }

    const query: any = { store: storeId, status: SaleStatus.COMPLETED };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    // Estadísticas de ventas
    const salesStats = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$finalTotal' },
          totalTax: { $sum: '$tax' },
          totalDiscount: { $sum: '$discount' },
          averageTicket: { $avg: '$finalTotal' }
        }
      }
    ]);

    // Ventas por día (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesByDay = await Sale.aggregate([
      {
        $match: {
          store: storeId,
          status: SaleStatus.COMPLETED,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$finalTotal' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Productos más vendidos
    const topProducts = await Sale.aggregate([
      { $match: query },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    // Inventario actual
    const inventoryStats = await Inventory.aggregate([
      { $match: { store: storeId } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$quantity', '$minStock'] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Ventas del día actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySales = await Sale.aggregate([
      {
        $match: {
          store: storeId,
          status: SaleStatus.COMPLETED,
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$finalTotal' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        sales: salesStats[0] || { totalSales: 0, totalRevenue: 0, totalTax: 0, totalDiscount: 0, averageTicket: 0 },
        today: todaySales[0] || { count: 0, revenue: 0 },
        salesByDay,
        topProducts,
        inventory: inventoryStats[0] || { totalProducts: 0, totalQuantity: 0, lowStockCount: 0 }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Comparación de rendimiento entre tiendas
// @route   GET /api/dashboard/comparison
// @access  Private/Admin
export const getStoresComparison = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const query: any = { status: SaleStatus.COMPLETED };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const comparison = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$store',
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$finalTotal' },
          averageTicket: { $avg: '$finalTotal' },
          totalTax: { $sum: '$tax' },
          totalDiscount: { $sum: '$discount' }
        }
      },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'store'
        }
      },
      { $unwind: '$store' },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Agregar datos de inventario para cada tienda
    for (const item of comparison) {
      const inventoryData = await Inventory.aggregate([
        { $match: { store: item._id } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            lowStockCount: {
              $sum: {
                $cond: [{ $lte: ['$quantity', '$minStock'] }, 1, 0]
              }
            }
          }
        }
      ]);

      item.inventory = inventoryData[0] || { totalProducts: 0, lowStockCount: 0 };
    }

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Estadísticas por método de pago del día
// @route   GET /api/dashboard/payment-methods
// @access  Private
export const getPaymentMethodsStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId, date } = req.query;

    // Determinar la tienda a consultar
    let targetStore = storeId;
    if (req.user?.role !== UserRole.ADMIN) {
      // Si no es admin, solo puede ver su propia tienda
      if (storeId && storeId !== req.user?.store?.toString()) {
        throw new AppError('No tiene acceso a esta tienda', 403);
      }
      targetStore = req.user?.store?.toString();
    }

    // Determinar el rango de fechas (por defecto: día actual)
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Query base
    const matchQuery: any = {
      status: SaleStatus.COMPLETED,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    };

    // Filtrar por tienda si se especificó
    if (targetStore) {
      matchQuery.store = targetStore;
    }

    // Agregación por método de pago
    const stats = await Sale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$finalTotal' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          method: '$_id',
          total: 1,
          count: 1
        }
      }
    ]);

    // Calcular el total general y porcentajes
    const grandTotal = stats.reduce((sum, item) => sum + item.total, 0);
    
    const statsWithPercentage = stats.map(item => ({
      ...item,
      percentage: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0
    }));

    // Asegurar que todos los métodos estén presentes (incluso con $0)
    const allMethods = ['efectivo', 'nequi', 'daviplata', 'llave_bancolombia', 'tarjeta', 'transferencia'];
    const existingMethods = new Set(statsWithPercentage.map(s => s.method));
    
    for (const method of allMethods) {
      if (!existingMethods.has(method)) {
        statsWithPercentage.push({
          method,
          total: 0,
          count: 0,
          percentage: 0
        });
      }
    }

    // Ordenar por total descendente
    statsWithPercentage.sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: statsWithPercentage
    });
  } catch (error) {
    next(error);
  }
};
