import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Sale, { SaleStatus } from '../models/Sale';
import Inventory from '../models/Inventory';
import Store from '../models/Store';
import User, { UserRole } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

// Helper para convertir string a ObjectId de forma segura
const toObjectId = (id: string | undefined): mongoose.Types.ObjectId | undefined => {
  if (!id) return undefined;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return undefined;
  }
};

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

    // Comparar con período anterior para growth
    const periodDays = 30; // Por defecto últimos 30 días
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (periodDays * 2));
    const previousPeriodEnd = new Date();
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - periodDays);

    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(currentPeriodStart.getDate() - periodDays);

    const currentPeriodSales = await Sale.aggregate([
      {
        $match: {
          status: SaleStatus.COMPLETED,
          createdAt: { $gte: currentPeriodStart }
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

    const previousPeriodSales = await Sale.aggregate([
      {
        $match: {
          status: SaleStatus.COMPLETED,
          createdAt: { 
            $gte: previousPeriodStart,
            $lte: previousPeriodEnd
          }
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

    const current = currentPeriodSales[0] || { count: 0, revenue: 0 };
    const previous = previousPeriodSales[0] || { count: 0, revenue: 0 };

    // Calcular porcentajes de crecimiento
    const salesGrowth = previous.count > 0 
      ? ((current.count - previous.count) / previous.count) * 100 
      : 0;
    
    const revenueGrowth = previous.revenue > 0
      ? ((current.revenue - previous.revenue) / previous.revenue) * 100
      : 0;

    // Total de productos únicos
    const totalProducts = await Inventory.distinct('product').then(products => products.length);

    res.json({
      success: true,
      data: {
        overview: {
          totalStores,
          totalUsers,
          totalProducts,
          lowStockCount,
          ...(salesStats[0] || { totalSales: 0, totalRevenue: 0, averageTicket: 0 })
        },
        growth: {
          sales: Math.round(salesGrowth * 100) / 100,
          revenue: Math.round(revenueGrowth * 100) / 100
        },
        today: {
          sales: todaySales[0]?.count || 0,
          revenue: todaySales[0]?.revenue || 0
        },
        period: {
          current: {
            sales: current.count,
            revenue: Math.round(current.revenue * 100) / 100
          },
          previous: {
            sales: previous.count,
            revenue: Math.round(previous.revenue * 100) / 100
          }
        },
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

    // Convertir storeId a ObjectId
    const storeObjectId = toObjectId(storeId);
    if (!storeObjectId) {
      throw new AppError('ID de tienda inválido', 400);
    }

    const query: any = { store: storeObjectId, status: SaleStatus.COMPLETED };

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
          store: storeObjectId,
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
      { $match: { store: storeObjectId } },
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
          store: storeObjectId,
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

// @desc    Tendencia de ventas (últimos 30 días)
// @route   GET /api/dashboard/sales-trend
// @access  Private
export const getSalesTrend = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId, days = 30 } = req.query;

    // Determinar la tienda a consultar
    let targetStore = storeId;
    if (req.user?.role !== UserRole.ADMIN) {
      if (storeId && storeId !== req.user?.store?.toString()) {
        throw new AppError('No tiene acceso a esta tienda', 403);
      }
      targetStore = req.user?.store?.toString();
    }

    // Calcular fecha de inicio
    const daysBack = parseInt(days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    // Query base
    const matchQuery: any = {
      status: SaleStatus.COMPLETED,
      createdAt: { $gte: startDate }
    };

    if (targetStore) {
      const storeObjectId = toObjectId(targetStore as string);
      if (storeObjectId) {
        matchQuery.store = storeObjectId;
      }
    }

    // Agregación por día
    const salesByDay = await Sale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sales: { $sum: 1 },
          revenue: { $sum: '$finalTotal' },
          averageTicket: { $avg: '$finalTotal' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          sales: 1,
          revenue: { $round: ['$revenue', 2] },
          averageTicket: { $round: ['$averageTicket', 2] }
        }
      }
    ]);

    // Llenar días sin ventas con ceros
    const result = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existing = salesByDay.find(d => d.date === dateStr);
      
      result.push(existing || {
        date: dateStr,
        sales: 0,
        revenue: 0,
        averageTicket: 0
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Productos más vendidos
// @route   GET /api/dashboard/top-products
// @access  Private
export const getTopProducts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId, limit = 10, startDate, endDate } = req.query;

    // Determinar la tienda a consultar
    let targetStore = storeId;
    if (req.user?.role !== UserRole.ADMIN) {
      if (storeId && storeId !== req.user?.store?.toString()) {
        throw new AppError('No tiene acceso a esta tienda', 403);
      }
      targetStore = req.user?.store?.toString();
    }

    // Query base
    const matchQuery: any = { status: SaleStatus.COMPLETED };

    if (targetStore) {
      const storeObjectId = toObjectId(targetStore as string);
      if (storeObjectId) {
        matchQuery.store = storeObjectId;
      }
    }

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate as string);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate as string);
    }

    // Agregación de productos más vendidos
    const topProducts = await Sale.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          salesCount: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit as string) || 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: '$product.name',
          sku: '$product.sku',
          category: '$product.category',
          price: '$product.price',
          totalQuantity: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          salesCount: 1,
          averagePerSale: { 
            $round: [{ $divide: ['$totalQuantity', '$salesCount'] }, 2] 
          }
        }
      }
    ]);

    res.json({
      success: true,
      count: topProducts.length,
      data: topProducts
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
      const storeObjectId = toObjectId(targetStore as string);
      if (storeObjectId) {
        matchQuery.store = storeObjectId;
      }
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
