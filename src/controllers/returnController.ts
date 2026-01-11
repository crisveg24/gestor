import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Return from '../models/Return';
import Sale from '../models/Sale';
import Inventory from '../models/Inventory';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';

// Validaciones
export const createReturnValidation = [
  body('originalSaleId').isMongoId().withMessage('ID de venta inválido'),
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un producto'),
  body('items.*.productId').isMongoId().withMessage('ID de producto inválido'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Cantidad debe ser mayor a 0'),
  body('items.*.reason').notEmpty().withMessage('Razón es requerida'),
  body('returnType').isIn(['refund', 'exchange', 'store_credit']).withMessage('Tipo de devolución inválido'),
  body('reason').notEmpty().withMessage('Razón general es requerida'),
];

export const exchangeItemsValidation = [
  body('exchangeItems').isArray({ min: 1 }).withMessage('Debe incluir productos para el cambio'),
  body('exchangeItems.*.productId').isMongoId().withMessage('ID de producto inválido'),
  body('exchangeItems.*.quantity').isInt({ min: 1 }).withMessage('Cantidad debe ser mayor a 0'),
];

// Crear devolución
export const createReturn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Datos inválidos', errors: errors.array() });
      return;
    }

    const { originalSaleId, items, returnType, reason, notes, customerName, customerPhone, exchangeItems } = req.body;
    const userId = req.user!._id;
    const userStoreId = req.user!.store;

    // Verificar que la venta existe
    const sale = await Sale.findById(originalSaleId)
      .populate('items.product')
      .session(session);
    
    if (!sale) {
      await session.abortTransaction();
      res.status(404).json({ message: 'Venta no encontrada' });
      return;
    }

    // Verificar que la venta es de la misma tienda (o admin puede procesar cualquiera)
    if (req.user!.role !== 'admin' && sale.store.toString() !== userStoreId?.toString()) {
      await session.abortTransaction();
      res.status(403).json({ message: 'No puedes procesar devoluciones de otra tienda' });
      return;
    }

    // Verificar que los productos y cantidades son válidos
    const returnItems = [];
    let totalRefund = 0;

    for (const item of items) {
      const saleItem = sale.items.find(
        (si) => si.product._id.toString() === item.productId
      );
      
      if (!saleItem) {
        await session.abortTransaction();
        res.status(400).json({ 
          message: `Producto ${item.productId} no encontrado en la venta original` 
        });
        return;
      }

      if (item.quantity > saleItem.quantity) {
        await session.abortTransaction();
        res.status(400).json({ 
          message: `Cantidad a devolver excede la cantidad vendida para el producto` 
        });
        return;
      }

      returnItems.push({
        product: new mongoose.Types.ObjectId(item.productId),
        quantity: item.quantity,
        price: saleItem.unitPrice,
        reason: item.reason,
      });

      totalRefund += saleItem.unitPrice * item.quantity;
    }

    // Calcular diferencia si es un cambio
    let priceDifference = 0;
    const processedExchangeItems = [];

    if (returnType === 'exchange' && exchangeItems && exchangeItems.length > 0) {
      let exchangeTotal = 0;

      for (const item of exchangeItems) {
        // Verificar inventario del producto de cambio
        const inventory = await Inventory.findOne({
          product: item.productId,
          store: sale.store,
        }).populate('product').session(session);

        if (!inventory || inventory.quantity < item.quantity) {
          await session.abortTransaction();
          res.status(400).json({ 
            message: `Stock insuficiente para producto de cambio` 
          });
          return;
        }

        const productData = inventory.product as unknown as { price: number };
        processedExchangeItems.push({
          product: new mongoose.Types.ObjectId(item.productId),
          quantity: item.quantity,
          price: productData.price,
        });

        exchangeTotal += productData.price * item.quantity;
      }

      // Diferencia: positivo = cliente paga, negativo = tienda devuelve
      priceDifference = exchangeTotal - totalRefund;
    }

    // Crear la devolución
    const returnDoc = new Return({
      originalSale: sale._id,
      store: sale.store,
      customer: {
        name: customerName,
        phone: customerPhone,
      },
      items: returnItems,
      exchangeItems: processedExchangeItems,
      returnType,
      totalRefund,
      priceDifference,
      reason,
      notes,
      processedBy: userId,
      status: 'pending',
    });

    await returnDoc.save({ session });

    await session.commitTransaction();

    // Poblar para respuesta
    const populatedReturn = await Return.findById(returnDoc._id)
      .populate('originalSale', 'saleNumber total')
      .populate('store', 'name')
      .populate('items.product', 'name sku')
      .populate('exchangeItems.product', 'name sku price')
      .populate('processedBy', 'name');

    res.status(201).json(populatedReturn);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Aprobar devolución (solo admin o manager)
export const approveReturn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const userId = req.user!._id;

    const returnDoc = await Return.findById(id).session(session);

    if (!returnDoc) {
      await session.abortTransaction();
      res.status(404).json({ message: 'Devolución no encontrada' });
      return;
    }

    if (returnDoc.status !== 'pending') {
      await session.abortTransaction();
      res.status(400).json({ message: 'La devolución ya fue procesada' });
      return;
    }

    // Actualizar estado
    returnDoc.status = 'approved';
    returnDoc.approvedBy = userId as mongoose.Types.ObjectId;
    returnDoc.approvedAt = new Date();

    await returnDoc.save({ session });
    await session.commitTransaction();

    const populatedReturn = await Return.findById(returnDoc._id)
      .populate('originalSale', 'saleNumber total')
      .populate('store', 'name')
      .populate('items.product', 'name sku')
      .populate('exchangeItems.product', 'name sku price')
      .populate('processedBy', 'name')
      .populate('approvedBy', 'name');

    res.json(populatedReturn);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Completar devolución (procesar inventario y dinero)
export const completeReturn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const returnDoc = await Return.findById(id)
      .populate('items.product')
      .populate('exchangeItems.product')
      .session(session);

    if (!returnDoc) {
      await session.abortTransaction();
      res.status(404).json({ message: 'Devolución no encontrada' });
      return;
    }

    if (returnDoc.status !== 'approved') {
      await session.abortTransaction();
      res.status(400).json({ 
        message: returnDoc.status === 'pending' 
          ? 'La devolución debe ser aprobada primero' 
          : 'La devolución ya fue completada o rechazada' 
      });
      return;
    }

    // Devolver productos al inventario
    for (const item of returnDoc.items) {
      await Inventory.findOneAndUpdate(
        { product: item.product, store: returnDoc.store },
        { $inc: { quantity: item.quantity } },
        { session, upsert: true }
      );
    }

    // Si es cambio, descontar productos del inventario
    if (returnDoc.returnType === 'exchange' && returnDoc.exchangeItems) {
      for (const item of returnDoc.exchangeItems) {
        const result = await Inventory.findOneAndUpdate(
          { 
            product: item.product, 
            store: returnDoc.store,
            quantity: { $gte: item.quantity }
          },
          { $inc: { quantity: -item.quantity } },
          { session, new: true }
        );

        if (!result) {
          await session.abortTransaction();
          res.status(400).json({ 
            message: 'Stock insuficiente para completar el cambio' 
          });
          return;
        }
      }
    }

    // Actualizar estado
    returnDoc.status = 'completed';
    returnDoc.completedAt = new Date();

    await returnDoc.save({ session });
    await session.commitTransaction();

    const populatedReturn = await Return.findById(returnDoc._id)
      .populate('originalSale', 'saleNumber total')
      .populate('store', 'name')
      .populate('items.product', 'name sku')
      .populate('exchangeItems.product', 'name sku price')
      .populate('processedBy', 'name')
      .populate('approvedBy', 'name');

    res.json(populatedReturn);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Rechazar devolución
export const rejectReturn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const returnDoc = await Return.findById(id);

    if (!returnDoc) {
      res.status(404).json({ message: 'Devolución no encontrada' });
      return;
    }

    if (returnDoc.status !== 'pending') {
      res.status(400).json({ message: 'La devolución ya fue procesada' });
      return;
    }

    returnDoc.status = 'rejected';
    returnDoc.notes = (returnDoc.notes || '') + `\n[RECHAZADO]: ${reason || 'Sin razón especificada'}`;

    await returnDoc.save();

    const populatedReturn = await Return.findById(returnDoc._id)
      .populate('originalSale', 'saleNumber total')
      .populate('store', 'name')
      .populate('items.product', 'name sku')
      .populate('processedBy', 'name');

    res.json(populatedReturn);
  } catch (error) {
    next(error);
  }
};

// Obtener todas las devoluciones
export const getReturns = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, storeId, startDate, endDate, page = 1, limit = 20 } = req.query;
    const userStoreId = req.user!.store;
    const isAdmin = req.user!.role === 'admin';

    const query: Record<string, unknown> = {};

    // Filtro por tienda
    if (storeId) {
      query.store = storeId;
    } else if (!isAdmin && userStoreId) {
      query.store = userStoreId;
    }

    // Filtro por estado
    if (status && ['pending', 'approved', 'completed', 'rejected'].includes(status as string)) {
      query.status = status;
    }

    // Filtro por fecha
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        (query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        (query.createdAt as Record<string, Date>).$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [returns, total] = await Promise.all([
      Return.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('originalSale', 'saleNumber total')
        .populate('store', 'name')
        .populate('items.product', 'name sku')
        .populate('exchangeItems.product', 'name sku price')
        .populate('processedBy', 'name')
        .populate('approvedBy', 'name'),
      Return.countDocuments(query),
    ]);

    res.json({
      returns,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Obtener devolución por ID
export const getReturnById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const returnDoc = await Return.findById(id)
      .populate('originalSale', 'saleNumber total items paymentMethod')
      .populate('store', 'name')
      .populate('items.product', 'name sku price')
      .populate('exchangeItems.product', 'name sku price')
      .populate('processedBy', 'name')
      .populate('approvedBy', 'name');

    if (!returnDoc) {
      res.status(404).json({ message: 'Devolución no encontrada' });
      return;
    }

    res.json(returnDoc);
  } catch (error) {
    next(error);
  }
};

// Obtener resumen de devoluciones
export const getReturnsSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId } = req.query;
    const userStoreId = req.user!.store;
    const isAdmin = req.user!.role === 'admin';

    const storeFilter = storeId 
      ? { store: new mongoose.Types.ObjectId(storeId as string) }
      : !isAdmin && userStoreId
        ? { store: userStoreId }
        : {};

    // Estadísticas por estado
    const statusStats = await Return.aggregate([
      { $match: storeFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalRefund' },
        },
      },
    ]);

    // Estadísticas por tipo
    const typeStats = await Return.aggregate([
      { $match: { ...storeFilter, status: 'completed' } },
      {
        $group: {
          _id: '$returnType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalRefund' },
        },
      },
    ]);

    // Devoluciones del mes
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await Return.aggregate([
      { 
        $match: { 
          ...storeFilter, 
          status: 'completed',
          createdAt: { $gte: startOfMonth }
        } 
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalRefund: { $sum: '$totalRefund' },
        },
      },
    ]);

    res.json({
      byStatus: statusStats,
      byType: typeStats,
      monthly: monthlyStats[0] || { count: 0, totalRefund: 0 },
    });
  } catch (error) {
    next(error);
  }
};

// Buscar venta para devolución
export const searchSaleForReturn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { saleNumber, saleId } = req.query;
    const userStoreId = req.user!.store;
    const isAdmin = req.user!.role === 'admin';

    let sale;

    if (saleId) {
      sale = await Sale.findById(saleId)
        .populate('items.product', 'name sku price')
        .populate('store', 'name');
    } else if (saleNumber) {
      const query: Record<string, unknown> = { saleNumber };
      if (!isAdmin && userStoreId) {
        query.store = userStoreId;
      }
      sale = await Sale.findOne(query)
        .populate('items.product', 'name sku price')
        .populate('store', 'name');
    }

    if (!sale) {
      res.status(404).json({ message: 'Venta no encontrada' });
      return;
    }

    // Obtener devoluciones previas de esta venta
    const previousReturns = await Return.find({
      originalSale: sale._id,
      status: { $in: ['approved', 'completed'] },
    }).select('items status');

    // Calcular cantidades ya devueltas
    const returnedQuantities: Record<string, number> = {};
    for (const ret of previousReturns) {
      for (const item of ret.items) {
        const productId = item.product.toString();
        returnedQuantities[productId] = (returnedQuantities[productId] || 0) + item.quantity;
      }
    }

    // Agregar información de cantidades disponibles para devolver
    const itemsWithAvailable = sale.items.map((item) => {
      const productId = item.product._id.toString();
      const returned = returnedQuantities[productId] || 0;
      return {
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        returnedQuantity: returned,
        availableToReturn: item.quantity - returned,
      };
    });

    res.json({
      sale: {
        ...sale.toObject(),
        items: itemsWithAvailable,
      },
      previousReturns: previousReturns.length,
    });
  } catch (error) {
    next(error);
  }
};
