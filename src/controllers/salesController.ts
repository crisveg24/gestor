import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import Sale, { SaleStatus } from '../models/Sale';
import Inventory from '../models/Inventory';
import Store from '../models/Store';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../models/User';
import logger from '../utils/logger';
import mongoose from 'mongoose';

// @desc    Crear nueva venta
// @route   POST /api/sales
// @access  Private
export const createSale = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { store, items, tax, discount, paymentMethod, notes } = req.body;

    // Verificar que la tienda existe
    const storeExists = await Store.findById(store);
    if (!storeExists) {
      throw new AppError('Tienda no encontrada', 404);
    }

    // Verificar acceso a la tienda
    if (req.user?.role !== UserRole.ADMIN) {
      if (store !== req.user?.store?.toString()) {
        throw new AppError('No tiene acceso a esta tienda', 403);
      }
    }

    // Validar y actualizar inventario para cada item
    const saleItems = [];
    for (const item of items) {
      const inventoryItem = await Inventory.findOne({
        store,
        product: item.product
      }).populate('product').session(session);

      if (!inventoryItem) {
        await session.abortTransaction();
        throw new AppError(`Producto no encontrado en el inventario: ${item.product}`, 404);
      }

      if (inventoryItem.quantity < item.quantity) {
        await session.abortTransaction();
        throw new AppError(
          `Stock insuficiente para el producto: ${(inventoryItem.product as any).name}. Disponible: ${inventoryItem.quantity}`,
          400
        );
      }

      // Actualizar inventario
      inventoryItem.quantity -= item.quantity;
      inventoryItem.updatedBy = req.user?._id!;
      await inventoryItem.save({ session });

      saleItems.push({
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice
      });
    }

    // Crear venta
    const sale = await Sale.create([{
      store,
      items: saleItems,
      tax: tax || 0,
      discount: discount || 0,
      paymentMethod,
      soldBy: req.user?._id,
      notes
    }], { session });

    await session.commitTransaction();

    await sale[0].populate('store soldBy items.product');

    logger.info('Venta creada:', {
      saleId: sale[0]._id,
      store,
      total: sale[0].finalTotal,
      soldBy: req.user?._id
    });

    res.status(201).json({
      success: true,
      data: sale[0]
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Obtener ventas de una tienda
// @route   GET /api/sales/:storeId
// @access  Private
export const getStoreSales = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate, status, page = 1, limit = 50 } = req.query;

    // Verificar acceso a la tienda
    if (req.user?.role !== UserRole.ADMIN) {
      if (storeId !== req.user?.store?.toString()) {
        throw new AppError('No tiene acceso a esta tienda', 403);
      }
    }

    const query: any = { store: storeId };

    // Filtros
    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const sales = await Sale.find(query)
      .populate('store', 'name')
      .populate('soldBy', 'name email')
      .populate('items.product', 'name sku')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Sale.countDocuments(query);

    res.json({
      success: true,
      count: sales.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: sales
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener venta por ID
// @route   GET /api/sales/detail/:id
// @access  Private
export const getSaleById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const sale = await Sale.findById(id)
      .populate('store')
      .populate('soldBy', 'name email')
      .populate('items.product')
      .populate('cancelledBy', 'name email');

    if (!sale) {
      throw new AppError('Venta no encontrada', 404);
    }

    // Verificar acceso
    if (req.user?.role !== UserRole.ADMIN) {
      if (sale.store._id.toString() !== req.user?.store?.toString()) {
        throw new AppError('No tiene acceso a esta venta', 403);
      }
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancelar venta
// @route   PUT /api/sales/:id/cancel
// @access  Private/Admin
export const cancelSale = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    const sale = await Sale.findById(id).session(session);

    if (!sale) {
      await session.abortTransaction();
      throw new AppError('Venta no encontrada', 404);
    }

    if (sale.status !== SaleStatus.COMPLETED) {
      await session.abortTransaction();
      throw new AppError('Solo se pueden cancelar ventas completadas', 400);
    }

    // Devolver items al inventario
    for (const item of sale.items) {
      const inventoryItem = await Inventory.findOne({
        store: sale.store,
        product: item.product
      }).session(session);

      if (inventoryItem) {
        inventoryItem.quantity += item.quantity;
        inventoryItem.updatedBy = req.user?._id!;
        await inventoryItem.save({ session });
      }
    }

    // Actualizar venta
    sale.status = SaleStatus.CANCELLED;
    sale.cancelledBy = req.user?._id;
    sale.cancelledAt = new Date();
    sale.cancellationReason = reason;
    await sale.save({ session });

    await session.commitTransaction();

    logger.info('Venta cancelada:', {
      saleId: id,
      cancelledBy: req.user?._id,
      reason
    });

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Obtener estadísticas de ventas
// @route   GET /api/sales/:storeId/stats
// @access  Private
export const getSalesStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

    const stats = await Sale.aggregate([
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

    // Ventas por método de pago
    const paymentMethodStats = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$finalTotal' }
        }
      }
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

    res.json({
      success: true,
      data: {
        summary: stats[0] || {
          totalSales: 0,
          totalRevenue: 0,
          totalTax: 0,
          totalDiscount: 0,
          averageTicket: 0
        },
        paymentMethods: paymentMethodStats,
        topProducts
      }
    });
  } catch (error) {
    next(error);
  }
};

// Validaciones
export const createSaleValidation = [
  body('store').isMongoId().withMessage('ID de tienda inválido'),
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un item'),
  body('items.*.product').isMongoId().withMessage('ID de producto inválido'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('La cantidad debe ser al menos 1'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('El precio unitario debe ser positivo'),
  body('paymentMethod').isIn(['cash', 'card', 'transfer', 'other']).withMessage('Método de pago inválido'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('El impuesto debe ser positivo'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('El descuento debe ser positivo')
];

export const cancelSaleValidation = [
  body('reason').notEmpty().withMessage('La razón de cancelación es requerida')
];
