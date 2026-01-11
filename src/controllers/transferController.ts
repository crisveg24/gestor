import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Transfer, { TransferStatus } from '../models/Transfer';
import Inventory from '../models/Inventory';
import Store from '../models/Store';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../models/User';

// @desc    Crear una nueva transferencia
// @route   POST /api/transfers
// @access  Private/Admin
export const createTransfer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { fromStore, toStore, items, notes } = req.body;

    // Validar que las tiendas existan y sean diferentes
    if (fromStore === toStore) {
      throw new AppError('La tienda origen y destino no pueden ser la misma', 400);
    }

    const [fromStoreDoc, toStoreDoc] = await Promise.all([
      Store.findById(fromStore),
      Store.findById(toStore)
    ]);

    if (!fromStoreDoc) {
      throw new AppError('Tienda origen no encontrada', 404);
    }
    if (!toStoreDoc) {
      throw new AppError('Tienda destino no encontrada', 404);
    }

    // Validar disponibilidad de stock en tienda origen
    const stockErrors: string[] = [];
    for (const item of items) {
      const inventory = await Inventory.findOne({
        store: fromStore,
        product: item.product
      }).populate('product', 'name');

      if (!inventory) {
        const productName = (inventory as any)?.product?.name || item.product;
        stockErrors.push(`Producto ${productName} no existe en tienda origen`);
      } else if (inventory.quantity < item.quantity) {
        const productName = (inventory as any).product?.name || item.product;
        stockErrors.push(`Stock insuficiente para ${productName}: disponible ${inventory.quantity}, solicitado ${item.quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      throw new AppError(stockErrors.join('. '), 400);
    }

    // Crear la transferencia
    const transfer = await Transfer.create({
      fromStore,
      toStore,
      items,
      notes,
      createdBy: req.user!._id,
      status: TransferStatus.PENDING
    });

    // Poblar datos para la respuesta
    await transfer.populate([
      { path: 'fromStore', select: 'name' },
      { path: 'toStore', select: 'name' },
      { path: 'items.product', select: 'name sku' },
      { path: 'createdBy', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      data: transfer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener todas las transferencias
// @route   GET /api/transfers
// @access  Private
export const getTransfers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, fromStore, toStore, page = 1, limit = 20 } = req.query;

    let query: any = {};

    // Filtrar por estado
    if (status) {
      query.status = status;
    }

    // Si no es admin, solo ver transferencias de su tienda
    if (req.user?.role !== UserRole.ADMIN) {
      query.$or = [
        { fromStore: req.user?.store },
        { toStore: req.user?.store }
      ];
    } else {
      // Admin puede filtrar por tienda
      if (fromStore) {
        query.fromStore = fromStore;
      }
      if (toStore) {
        query.toStore = toStore;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [transfers, total] = await Promise.all([
      Transfer.find(query)
        .populate('fromStore', 'name')
        .populate('toStore', 'name')
        .populate('items.product', 'name sku')
        .populate('createdBy', 'name')
        .populate('sentBy', 'name')
        .populate('receivedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transfer.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: transfers.length,
      total,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data: transfers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener una transferencia por ID
// @route   GET /api/transfers/:id
// @access  Private
export const getTransferById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transfer = await Transfer.findById(req.params.id)
      .populate('fromStore', 'name address')
      .populate('toStore', 'name address')
      .populate('items.product', 'name sku barcode price')
      .populate('createdBy', 'name')
      .populate('sentBy', 'name')
      .populate('receivedBy', 'name')
      .populate('cancelledBy', 'name');

    if (!transfer) {
      throw new AppError('Transferencia no encontrada', 404);
    }

    // Verificar acceso
    if (req.user?.role !== UserRole.ADMIN) {
      const userStore = req.user?.store?.toString();
      if (transfer.fromStore._id.toString() !== userStore && 
          transfer.toStore._id.toString() !== userStore) {
        throw new AppError('No tiene acceso a esta transferencia', 403);
      }
    }

    res.json({
      success: true,
      data: transfer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enviar transferencia (marcar como en tránsito y descontar inventario)
// @route   PUT /api/transfers/:id/send
// @access  Private
export const sendTransfer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await Transfer.findById(req.params.id).session(session);

    if (!transfer) {
      throw new AppError('Transferencia no encontrada', 404);
    }

    if (transfer.status !== TransferStatus.PENDING) {
      throw new AppError(`No se puede enviar una transferencia en estado ${transfer.status}`, 400);
    }

    // Verificar acceso (solo puede enviar la tienda origen o admin)
    if (req.user?.role !== UserRole.ADMIN) {
      if (transfer.fromStore.toString() !== req.user?.store?.toString()) {
        throw new AppError('Solo la tienda origen puede enviar la transferencia', 403);
      }
    }

    // Descontar inventario de tienda origen
    for (const item of transfer.items) {
      const inventory = await Inventory.findOne({
        store: transfer.fromStore,
        product: item.product
      }).session(session);

      if (!inventory || inventory.quantity < item.quantity) {
        throw new AppError(`Stock insuficiente para producto ${item.product}`, 400);
      }

      inventory.quantity -= item.quantity;
      await inventory.save({ session });
    }

    // Actualizar estado de la transferencia
    transfer.status = TransferStatus.IN_TRANSIT;
    transfer.sentAt = new Date();
    transfer.sentBy = req.user!._id as mongoose.Types.ObjectId;
    await transfer.save({ session });

    await session.commitTransaction();

    await transfer.populate([
      { path: 'fromStore', select: 'name' },
      { path: 'toStore', select: 'name' },
      { path: 'items.product', select: 'name sku' }
    ]);

    res.json({
      success: true,
      message: 'Transferencia enviada. El inventario ha sido descontado de la tienda origen.',
      data: transfer
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Recibir transferencia (marcar como recibida y agregar al inventario destino)
// @route   PUT /api/transfers/:id/receive
// @access  Private
export const receiveTransfer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { receivedItems } = req.body; // Array con { productId, receivedQuantity, notes }

    const transfer = await Transfer.findById(req.params.id).session(session);

    if (!transfer) {
      throw new AppError('Transferencia no encontrada', 404);
    }

    if (transfer.status !== TransferStatus.IN_TRANSIT) {
      throw new AppError(`Solo se pueden recibir transferencias en tránsito. Estado actual: ${transfer.status}`, 400);
    }

    // Verificar acceso (solo puede recibir la tienda destino o admin)
    if (req.user?.role !== UserRole.ADMIN) {
      if (transfer.toStore.toString() !== req.user?.store?.toString()) {
        throw new AppError('Solo la tienda destino puede recibir la transferencia', 403);
      }
    }

    // Procesar cada item
    for (const item of transfer.items) {
      // Buscar si hay info de recepción personalizada
      const receivedInfo = receivedItems?.find(
        (r: any) => r.productId === item.product.toString()
      );

      // Cantidad a agregar al inventario
      const quantityToAdd = receivedInfo?.receivedQuantity ?? item.quantity;
      item.receivedQuantity = quantityToAdd;
      if (receivedInfo?.notes) {
        item.notes = receivedInfo.notes;
      }

      // Agregar al inventario de tienda destino
      const existingInventory = await Inventory.findOne({
        store: transfer.toStore,
        product: item.product
      }).session(session);

      if (existingInventory) {
        existingInventory.quantity += quantityToAdd;
        await existingInventory.save({ session });
      } else {
        // Crear nuevo registro de inventario
        await Inventory.create([{
          store: transfer.toStore,
          product: item.product,
          quantity: quantityToAdd,
          minStock: 5,
          maxStock: 100
        }], { session });
      }
    }

    // Actualizar estado de la transferencia
    transfer.status = TransferStatus.RECEIVED;
    transfer.receivedAt = new Date();
    transfer.receivedBy = req.user!._id as mongoose.Types.ObjectId;
    await transfer.save({ session });

    await session.commitTransaction();

    await transfer.populate([
      { path: 'fromStore', select: 'name' },
      { path: 'toStore', select: 'name' },
      { path: 'items.product', select: 'name sku' }
    ]);

    res.json({
      success: true,
      message: 'Transferencia recibida. El inventario ha sido agregado a la tienda destino.',
      data: transfer
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Cancelar transferencia
// @route   PUT /api/transfers/:id/cancel
// @access  Private/Admin
export const cancelTransfer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reason } = req.body;

    const transfer = await Transfer.findById(req.params.id).session(session);

    if (!transfer) {
      throw new AppError('Transferencia no encontrada', 404);
    }

    if (transfer.status === TransferStatus.RECEIVED) {
      throw new AppError('No se puede cancelar una transferencia ya recibida', 400);
    }

    if (transfer.status === TransferStatus.CANCELLED) {
      throw new AppError('La transferencia ya está cancelada', 400);
    }

    // Si estaba en tránsito, devolver inventario a tienda origen
    const wasInTransit = transfer.status === TransferStatus.IN_TRANSIT;
    if (wasInTransit) {
      for (const item of transfer.items) {
        const inventory = await Inventory.findOne({
          store: transfer.fromStore,
          product: item.product
        }).session(session);

        if (inventory) {
          inventory.quantity += item.quantity;
          await inventory.save({ session });
        } else {
          await Inventory.create([{
            store: transfer.fromStore,
            product: item.product,
            quantity: item.quantity,
            minStock: 5,
            maxStock: 100
          }], { session });
        }
      }
    }

    // Actualizar estado
    transfer.status = TransferStatus.CANCELLED;
    transfer.cancelledAt = new Date();
    transfer.cancelledBy = req.user!._id as mongoose.Types.ObjectId;
    transfer.cancellationReason = reason || 'Sin motivo especificado';
    await transfer.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: wasInTransit
        ? 'Transferencia cancelada. El inventario ha sido devuelto a la tienda origen.'
        : 'Transferencia cancelada.',
      data: transfer
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Resumen de transferencias
// @route   GET /api/transfers/summary
// @access  Private
export const getTransfersSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId } = req.query;

    let matchQuery: any = {};

    if (req.user?.role !== UserRole.ADMIN) {
      const userStoreId = req.user?.store?.toString();
      if (userStoreId) {
        matchQuery.$or = [
          { fromStore: new mongoose.Types.ObjectId(userStoreId) },
          { toStore: new mongoose.Types.ObjectId(userStoreId) }
        ];
      }
    } else if (storeId) {
      matchQuery.$or = [
        { fromStore: new mongoose.Types.ObjectId(storeId as string) },
        { toStore: new mongoose.Types.ObjectId(storeId as string) }
      ];
    }

    const summary = await Transfer.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Formatear respuesta
    const result = {
      pending: 0,
      inTransit: 0,
      received: 0,
      cancelled: 0,
      total: 0
    };

    for (const item of summary) {
      switch (item._id) {
        case TransferStatus.PENDING:
          result.pending = item.count;
          break;
        case TransferStatus.IN_TRANSIT:
          result.inTransit = item.count;
          break;
        case TransferStatus.RECEIVED:
          result.received = item.count;
          break;
        case TransferStatus.CANCELLED:
          result.cancelled = item.count;
          break;
      }
      result.total += item.count;
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Validaciones
export const createTransferValidation = [
  body('fromStore').isMongoId().withMessage('ID de tienda origen inválido'),
  body('toStore').isMongoId().withMessage('ID de tienda destino inválido'),
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un producto'),
  body('items.*.product').isMongoId().withMessage('ID de producto inválido'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('La cantidad debe ser al menos 1'),
  body('notes').optional().isString()
];

export const receiveTransferValidation = [
  body('receivedItems').optional().isArray(),
  body('receivedItems.*.productId').optional().isMongoId(),
  body('receivedItems.*.receivedQuantity').optional().isInt({ min: 0 }),
  body('receivedItems.*.notes').optional().isString()
];

export const cancelTransferValidation = [
  body('reason').optional().isString().isLength({ max: 500 })
];
