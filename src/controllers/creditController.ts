import { Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import mongoose from 'mongoose';
import Credit, { CreditType, CreditStatus } from '../models/Credit';
import Inventory from '../models/Inventory';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

// @desc    Crear fiado o apartado
// @route   POST /api/credits
// @access  Private
export const createCredit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      type,
      store,
      customerName,
      customerPhone,
      customerDocument,
      customerAddress,
      items,
      initialPayment,
      paymentMethod,
      dueDate,
      notes
    } = req.body;

    // Validar tipo
    if (!Object.values(CreditType).includes(type)) {
      throw new AppError('Tipo de crédito inválido', 400);
    }

    // Calcular totales
    let totalAmount = 0;
    const creditItems = [];

    for (const item of items) {
      const subtotal = item.quantity * item.unitPrice;
      totalAmount += subtotal;
      creditItems.push({
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal
      });
    }

    // Para apartados, el pago inicial es obligatorio (al menos algo)
    let paidAmount = 0;
    const payments = [];

    if (initialPayment && initialPayment > 0) {
      paidAmount = initialPayment;
      payments.push({
        amount: initialPayment,
        paymentMethod: paymentMethod || 'efectivo',
        date: new Date(),
        receivedBy: req.user?._id,
        notes: 'Pago inicial'
      });
    }

    // Para fiados, descontar del inventario inmediatamente (el cliente se lleva el producto)
    if (type === CreditType.FIADO) {
      for (const item of items) {
        const inventory = await Inventory.findOne({
          store,
          product: item.product
        }).session(session);

        if (!inventory) {
          throw new AppError(`Producto no encontrado en inventario`, 404);
        }

        if (inventory.quantity < item.quantity) {
          throw new AppError(`Stock insuficiente. Disponible: ${inventory.quantity}`, 400);
        }

        inventory.quantity -= item.quantity;
        await inventory.save({ session });
      }
    }

    // Crear el crédito
    const credit = await Credit.create([{
      type,
      status: paidAmount > 0 ? CreditStatus.PARTIAL : CreditStatus.PENDING,
      store,
      customerName,
      customerPhone,
      customerDocument,
      customerAddress,
      items: creditItems,
      totalAmount,
      paidAmount,
      remainingAmount: totalAmount - paidAmount,
      payments,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: req.user?._id,
      notes
    }], { session });

    await session.commitTransaction();

    // Populate para respuesta
    const populatedCredit = await Credit.findById(credit[0]._id)
      .populate('store', 'name')
      .populate('items.product', 'name sku price')
      .populate('createdBy', 'name')
      .populate('payments.receivedBy', 'name');

    logger.info(`${type === CreditType.FIADO ? 'Fiado' : 'Apartado'} creado:`, {
      creditId: credit[0]._id,
      customer: customerName,
      total: totalAmount,
      createdBy: req.user?._id
    });

    res.status(201).json({
      success: true,
      data: populatedCredit
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Obtener todos los créditos (fiados y apartados)
// @route   GET /api/credits
// @access  Private
export const getCredits = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, status, store, search, page = 1, limit = 20 } = req.query;

    const query: any = {};

    // Filtrar por tienda (admins pueden ver todas)
    if (store) {
      query.store = store;
    } else if (req.user?.role !== 'admin' && req.user?.store) {
      query.store = req.user.store;
    }

    if (type) query.type = type;
    if (status) query.status = status;

    // Búsqueda por nombre o teléfono del cliente
    if (search) {
      query.$or = [
        { customerName: new RegExp(search as string, 'i') },
        { customerPhone: new RegExp(search as string, 'i') },
        { customerDocument: new RegExp(search as string, 'i') }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [credits, total] = await Promise.all([
      Credit.find(query)
        .populate('store', 'name')
        .populate('items.product', 'name sku price')
        .populate('createdBy', 'name')
        .populate('payments.receivedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Credit.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        credits,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener un crédito por ID
// @route   GET /api/credits/:id
// @access  Private
export const getCreditById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const credit = await Credit.findById(req.params.id)
      .populate('store', 'name')
      .populate('items.product', 'name sku price barcode')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .populate('payments.receivedBy', 'name');

    if (!credit) {
      throw new AppError('Crédito no encontrado', 404);
    }

    res.json({
      success: true,
      data: credit
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Registrar pago a un crédito
// @route   POST /api/credits/:id/payment
// @access  Private
export const addPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, paymentMethod, notes } = req.body;

    const credit = await Credit.findById(req.params.id).session(session);

    if (!credit) {
      throw new AppError('Crédito no encontrado', 404);
    }

    if (credit.status === CreditStatus.COMPLETED) {
      throw new AppError('Este crédito ya está pagado completamente', 400);
    }

    if (credit.status === CreditStatus.CANCELLED) {
      throw new AppError('Este crédito está cancelado', 400);
    }

    if (amount <= 0) {
      throw new AppError('El monto debe ser mayor a 0', 400);
    }

    if (amount > credit.remainingAmount) {
      throw new AppError(`El monto excede el saldo pendiente ($${credit.remainingAmount.toLocaleString()})`, 400);
    }

    // Agregar pago
    credit.payments.push({
      amount,
      paymentMethod,
      date: new Date(),
      receivedBy: req.user?._id as any,
      notes
    });

    credit.paidAmount += amount;
    credit.remainingAmount = credit.totalAmount - credit.paidAmount;
    credit.updatedBy = req.user?._id as any;

    // Actualizar status
    if (credit.remainingAmount <= 0) {
      credit.status = CreditStatus.COMPLETED;
      credit.completedDate = new Date();

      // Si es apartado, ahora descontar del inventario (el cliente se lleva el producto)
      if (credit.type === CreditType.APARTADO) {
        const stockErrors: string[] = [];
        
        // Primero verificar que hay stock suficiente para todos los items
        for (const item of credit.items) {
          const inventory = await Inventory.findOne({
            store: credit.store,
            product: item.product
          }).session(session).populate('product', 'name');

          if (!inventory) {
            stockErrors.push(`Producto no encontrado en inventario`);
          } else if (inventory.quantity < item.quantity) {
            const productName = (inventory.product as any)?.name || 'Producto';
            stockErrors.push(`${productName}: Stock insuficiente (disponible: ${inventory.quantity}, necesario: ${item.quantity})`);
          }
        }

        // Si hay errores de stock, abortar
        if (stockErrors.length > 0) {
          throw new AppError(`No se puede completar el apartado:\n${stockErrors.join('\n')}`, 400);
        }

        // Ahora sí descontar el inventario
        for (const item of credit.items) {
          const inventory = await Inventory.findOne({
            store: credit.store,
            product: item.product
          }).session(session);

          if (inventory) {
            inventory.quantity -= item.quantity;
            await inventory.save({ session });
          }
        }
      }
    } else {
      credit.status = CreditStatus.PARTIAL;
    }

    await credit.save({ session });
    await session.commitTransaction();

    // Populate para respuesta
    const populatedCredit = await Credit.findById(credit._id)
      .populate('store', 'name')
      .populate('items.product', 'name sku price')
      .populate('createdBy', 'name')
      .populate('payments.receivedBy', 'name');

    logger.info('Pago registrado:', {
      creditId: credit._id,
      amount,
      newBalance: credit.remainingAmount,
      status: credit.status
    });

    res.json({
      success: true,
      message: credit.status === CreditStatus.COMPLETED 
        ? '¡Crédito pagado completamente!' 
        : `Pago registrado. Saldo pendiente: $${credit.remainingAmount.toLocaleString()}`,
      data: populatedCredit
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Cancelar un crédito
// @route   PUT /api/credits/:id/cancel
// @access  Private/Admin
export const cancelCredit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reason } = req.body;

    const credit = await Credit.findById(req.params.id).session(session);

    if (!credit) {
      throw new AppError('Crédito no encontrado', 404);
    }

    if (credit.status === CreditStatus.COMPLETED) {
      throw new AppError('No se puede cancelar un crédito ya completado', 400);
    }

    // Si es fiado, devolver productos al inventario
    if (credit.type === CreditType.FIADO) {
      for (const item of credit.items) {
        const inventory = await Inventory.findOne({
          store: credit.store,
          product: item.product
        }).session(session);

        if (inventory) {
          inventory.quantity += item.quantity;
          await inventory.save({ session });
        }
      }
    }

    credit.status = CreditStatus.CANCELLED;
    credit.updatedBy = req.user?._id as any;
    credit.notes = credit.notes 
      ? `${credit.notes}\n\n[CANCELADO] ${reason || 'Sin razón especificada'}`
      : `[CANCELADO] ${reason || 'Sin razón especificada'}`;

    await credit.save({ session });
    await session.commitTransaction();

    logger.info('Crédito cancelado:', {
      creditId: credit._id,
      reason,
      cancelledBy: req.user?._id
    });

    res.json({
      success: true,
      message: 'Crédito cancelado exitosamente',
      data: credit
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Obtener resumen de créditos por tienda
// @route   GET /api/credits/summary
// @access  Private
export const getCreditSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { store } = req.query;

    const storeFilter = store 
      ? { store: new mongoose.Types.ObjectId(store as string) }
      : req.user?.role !== 'admin' && req.user?.store
        ? { store: req.user.store }
        : {};

    const summary = await Credit.aggregate([
      { $match: { ...storeFilter, status: { $nin: [CreditStatus.CANCELLED] } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          pendingAmount: { $sum: '$remainingAmount' }
        }
      }
    ]);

    // Créditos pendientes (por cobrar)
    const pendingCredits = await Credit.find({
      ...storeFilter,
      status: { $in: [CreditStatus.PENDING, CreditStatus.PARTIAL] }
    })
      .populate('store', 'name')
      .populate('items.product', 'name')
      .sort({ remainingAmount: -1 })
      .limit(10);

    // Créditos vencidos
    const overdueCredits = await Credit.find({
      ...storeFilter,
      status: { $in: [CreditStatus.PENDING, CreditStatus.PARTIAL] },
      dueDate: { $lt: new Date() }
    })
      .populate('store', 'name')
      .sort({ dueDate: 1 });

    res.json({
      success: true,
      data: {
        summary: {
          fiados: summary.find(s => s._id === CreditType.FIADO) || { count: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 },
          apartados: summary.find(s => s._id === CreditType.APARTADO) || { count: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 }
        },
        pendingCredits,
        overdueCredits,
        overdueCount: overdueCredits.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Validaciones
export const createCreditValidation = [
  body('type').isIn(Object.values(CreditType)).withMessage('Tipo de crédito inválido'),
  body('store').isMongoId().withMessage('ID de tienda inválido'),
  body('customerName').trim().notEmpty().withMessage('El nombre del cliente es requerido'),
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un producto'),
  body('items.*.product').isMongoId().withMessage('ID de producto inválido'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Cantidad debe ser al menos 1'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Precio debe ser mayor o igual a 0')
];

export const addPaymentValidation = [
  param('id').isMongoId().withMessage('ID de crédito inválido'),
  body('amount').isFloat({ min: 1 }).withMessage('El monto debe ser mayor a 0'),
  body('paymentMethod').isIn(['efectivo', 'nequi', 'daviplata', 'llave_bancolombia', 'tarjeta', 'transferencia'])
    .withMessage('Método de pago inválido')
];
