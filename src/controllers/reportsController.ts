import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Sale, { SaleStatus } from '../models/Sale';
import logger from '../utils/logger';

// @desc    Estadísticas generales
// @route   GET /api/reports/stats
// @access  Private
export const getStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo } = req.query;

    const query: any = { status: SaleStatus.COMPLETED };

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) query.createdAt.$lte = new Date(dateTo as string);
    }

    const sales = await Sale.find(query);

    const totalIngresos = sales.reduce((sum, sale) => sum + sale.finalTotal, 0);
    const totalVentas = sales.length;

    res.json({
      success: true,
      data: {
        totalIngresos,
        totalVentas,
      },
    });
  } catch (error) {
    logger.error('❌ [REPORTS] Error en stats:', error);
    next(error);
  }
};

// @desc    Ventas por categoría
// @route   GET /api/reports/by-category
// @access  Private
export const getSalesByCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo } = req.query;

    const matchQuery: any = { status: SaleStatus.COMPLETED };

    if (dateFrom || dateTo) {
      matchQuery.createdAt = {};
      if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) matchQuery.createdAt.$lte = new Date(dateTo as string);
    }

    const salesByCategory = await Sale.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: '$productInfo.category',
          total: { $sum: '$items.subtotal' },
          cantidad: { $sum: '$items.quantity' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json({
      success: true,
      data: salesByCategory.map((item) => ({
        categoria: item._id,
        total: item.total,
        cantidad: item.cantidad,
      })),
    });
  } catch (error) {
    logger.error('❌ [REPORTS] Error en by-category:', error);
    next(error);
  }
};

// @desc    Ventas por método de pago
// @route   GET /api/reports/by-payment-method
// @access  Private
export const getSalesByPaymentMethod = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo } = req.query;

    const matchQuery: any = { status: SaleStatus.COMPLETED };

    if (dateFrom || dateTo) {
      matchQuery.createdAt = {};
      if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) matchQuery.createdAt.$lte = new Date(dateTo as string);
    }

    const salesByPaymentMethod = await Sale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$finalTotal' },
          cantidad: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json({
      success: true,
      data: salesByPaymentMethod.map((item) => ({
        metodoPago: item._id,
        total: item.total,
        cantidad: item.cantidad,
      })),
    });
  } catch (error) {
    logger.error('❌ [REPORTS] Error en by-payment-method:', error);
    next(error);
  }
};

// @desc    Top productos más vendidos
// @route   GET /api/reports/top-products
// @access  Private
export const getTopProducts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo, limit = 10 } = req.query;

    const matchQuery: any = { status: SaleStatus.COMPLETED };

    if (dateFrom || dateTo) {
      matchQuery.createdAt = {};
      if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) matchQuery.createdAt.$lte = new Date(dateTo as string);
    }

    const topProducts = await Sale.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalVendido: { $sum: '$items.quantity' },
          ingresos: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalVendido: -1 } },
      { $limit: parseInt(limit as string) },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
    ]);

    res.json({
      success: true,
      data: topProducts.map((item) => ({
        producto: item.productInfo.name,
        sku: item.productInfo.sku,
        cantidadVendida: item.totalVendido,
        ingresos: item.ingresos,
      })),
    });
  } catch (error) {
    logger.error('❌ [REPORTS] Error en top-products:', error);
    next(error);
  }
};

// @desc    Ventas por tienda
// @route   GET /api/reports/by-store
// @access  Private/Admin
export const getSalesByStore = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo } = req.query;

    const matchQuery: any = { status: SaleStatus.COMPLETED };

    if (dateFrom || dateTo) {
      matchQuery.createdAt = {};
      if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) matchQuery.createdAt.$lte = new Date(dateTo as string);
    }

    const salesByStore = await Sale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$store',
          total: { $sum: '$finalTotal' },
          cantidad: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'storeInfo',
        },
      },
      { $unwind: '$storeInfo' },
    ]);

    res.json({
      success: true,
      data: salesByStore.map((item) => ({
        tienda: item.storeInfo.name,
        total: item.total,
        cantidad: item.cantidad,
      })),
    });
  } catch (error) {
    logger.error('❌ [REPORTS] Error en by-store:', error);
    next(error);
  }
};

// @desc    Tendencia de ventas (por día/mes)
// @route   GET /api/reports/sales-trend
// @access  Private
export const getSalesTrend = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo } = req.query;

    const matchQuery: any = { status: SaleStatus.COMPLETED };

    if (dateFrom || dateTo) {
      matchQuery.createdAt = {};
      if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) matchQuery.createdAt.$lte = new Date(dateTo as string);
    }

    const salesTrend = await Sale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          totalIngresos: { $sum: '$finalTotal' },
          totalVentas: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: salesTrend.map((item) => ({
        fecha: item._id,
        ingresos: item.totalIngresos,
        ventas: item.totalVentas,
      })),
    });
  } catch (error) {
    logger.error('❌ [REPORTS] Error en sales-trend:', error);
    next(error);
  }
};
