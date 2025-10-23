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

    // Obtener todos los productos del inventario en una sola query
    const productIds = items.map((item: any) => item.product);
    const inventoryItems = await Inventory.find({
      store,
      product: { $in: productIds }
    }).session(session);

    // Crear un mapa para acceso rápido
    const inventoryMap = new Map();
    inventoryItems.forEach(inv => {
      inventoryMap.set(inv.product.toString(), inv);
    });

    // Validar y actualizar inventario
    const saleItems = [];
    const bulkOps = [];
    
    for (const item of items) {
      const inventoryItem = inventoryMap.get(item.product);

      if (!inventoryItem) {
        await session.abortTransaction();
        throw new AppError(`Producto no encontrado en el inventario: ${item.product}`, 404);
      }

      if (inventoryItem.quantity < item.quantity) {
        await session.abortTransaction();
        throw new AppError(
          `Stock insuficiente para un producto. Disponible: ${inventoryItem.quantity}`,
          400
        );
      }

      // Preparar actualización bulk
      bulkOps.push({
        updateOne: {
          filter: { _id: inventoryItem._id },
          update: { 
            $inc: { quantity: -item.quantity },
            $set: { updatedBy: req.user?._id }
          }
        }
      });

      saleItems.push({
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice
      });
    }

    // Ejecutar todas las actualizaciones de inventario en una sola operación
    if (bulkOps.length > 0) {
      await Inventory.bulkWrite(bulkOps, { session });
    }

    // Calcular totales
    const total = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
    const finalDiscount = discount || 0;
    const finalTax = tax || 0;
    const finalTotal = total + finalTax - finalDiscount;

    // Crear venta
    const sale = await Sale.create([{
      store,
      items: saleItems,
      total,
      tax: finalTax,
      discount: finalDiscount,
      finalTotal,
      paymentMethod,
      soldBy: req.user?._id as any,
      notes
    }], { session });

    await session.commitTransaction();

    // Log sin hacer populate innecesario
    logger.info('Venta creada:', {
      saleId: sale[0]._id,
      store,
      total: sale[0].finalTotal,
      soldBy: req.user?._id
    });

    // Responder inmediatamente sin populate para mayor velocidad
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

// @desc    Actualizar venta
// @route   PUT /api/sales/:id
// @access  Private/Admin/Manager
export const updateSale = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes, paymentMethod, discount } = req.body;

    logger.info('📝 [SALES] Actualizando venta:', { id, notes, paymentMethod, discount });

    const sale = await Sale.findById(id);

    if (!sale) {
      throw new AppError('Venta no encontrada', 404);
    }

    // Solo se pueden editar ventas completadas
    if (sale.status !== SaleStatus.COMPLETED) {
      throw new AppError('Solo se pueden editar ventas completadas', 400);
    }

    // Validar permisos de tienda
    if (req.user?.role !== 'admin' && sale.store.toString() !== req.user?.store?._id?.toString()) {
      throw new AppError('No tienes permiso para editar ventas de otras tiendas', 403);
    }

    // Actualizar campos permitidos
    if (notes !== undefined) sale.notes = notes;
    if (paymentMethod !== undefined) sale.paymentMethod = paymentMethod;
    if (discount !== undefined) {
      sale.discount = discount;
      // Recalcular total final
      sale.finalTotal = sale.total + sale.tax - sale.discount;
    }

    // Registrar quién modificó
    sale.modifiedBy = req.user?._id as any;
    sale.modifiedAt = new Date();

    await sale.save();

    logger.info('✅ [SALES] Venta actualizada:', { 
      saleId: id,
      modifiedBy: req.user?._id,
      modifiedByName: req.user?.name 
    });

    res.json({
      success: true,
      data: sale,
      message: 'Venta actualizada exitosamente'
    });
  } catch (error) {
    logger.error('❌ [SALES] Error al actualizar venta:', error);
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
        inventoryItem.updatedBy = req.user?._id as any;
        await inventoryItem.save({ session });
      }
    }

    // Actualizar venta
    sale.status = SaleStatus.CANCELLED;
    sale.cancelledBy = req.user?._id as any;
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
  body('paymentMethod').isIn(['efectivo', 'nequi', 'daviplata', 'llave_bancolombia', 'tarjeta', 'transferencia']).withMessage('Método de pago inválido'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('El impuesto debe ser positivo'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('El descuento debe ser positivo')
];

export const updateSaleValidation = [
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres'),
  body('paymentMethod').optional().isIn(['efectivo', 'nequi', 'daviplata', 'llave_bancolombia', 'tarjeta', 'transferencia']).withMessage('Método de pago inválido'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('El descuento debe ser positivo')
];

export const cancelSaleValidation = [
  body('reason').notEmpty().withMessage('La razón de cancelación es requerida')
];

// @desc    Obtener datos para corte de caja diario
// @route   GET /api/sales/daily-cut
// @access  Private
export const getDailyCut = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId, date } = req.query;

    // Determinar la tienda a consultar
    let targetStore = storeId;
    if (req.user?.role !== UserRole.ADMIN) {
      // Si no es admin, solo puede ver su propia tienda
      if (!req.user?.store) {
        throw new AppError('No tienes una tienda asignada', 403);
      }
      if (storeId && storeId !== req.user?.store?.toString()) {
        throw new AppError('No tiene acceso a esta tienda', 403);
      }
      targetStore = req.user?.store?.toString();
    }

    if (!targetStore) {
      throw new AppError('Debe especificar una tienda', 400);
    }

    // Determinar el rango de fechas (por defecto: día actual)
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Obtener la tienda
    const store = await Store.findById(targetStore);
    if (!store) {
      throw new AppError('Tienda no encontrada', 404);
    }

    // Query base
    const matchQuery: any = {
      store: targetStore,
      status: SaleStatus.COMPLETED,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    };

    // Obtener todas las ventas del día con detalles
    const sales = await Sale.find(matchQuery)
      .populate('soldBy', 'name email')
      .populate('items.product', 'name sku')
      .sort({ createdAt: -1 });

    // Agrupar por método de pago
    const paymentMethods = await Sale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$finalTotal' },
          count: { $sum: 1 },
          transactions: {
            $push: {
              id: '$_id',
              total: '$finalTotal',
              createdAt: '$createdAt'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          method: '$_id',
          total: 1,
          count: 1,
          transactions: 1
        }
      }
    ]);

    // Calcular totales
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.finalTotal, 0);
    const totalTax = sales.reduce((sum, sale) => sum + sale.tax, 0);
    const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount, 0);

    res.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        store: {
          _id: store._id,
          name: store.name,
          address: store.address
        },
        summary: {
          totalSales,
          totalRevenue,
          totalTax,
          totalDiscount
        },
        paymentMethods,
        sales
      }
    });
  } catch (error) {
    next(error);
  }
};
