import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import CashRegister, { CashRegisterStatus } from '../models/CashRegister';
import Sale, { SaleStatus } from '../models/Sale';
import Store from '../models/Store';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../models/User';

// @desc    Abrir caja del día
// @route   POST /api/cash-register/open
// @access  Private
export const openCashRegister = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { storeId, openingAmount } = req.body;

    // Determinar tienda
    const targetStore = req.user?.role === UserRole.ADMIN 
      ? storeId 
      : req.user?.store?.toString();

    if (!targetStore) {
      throw new AppError('Tienda no especificada', 400);
    }

    // Verificar que la tienda exista
    const store = await Store.findById(targetStore);
    if (!store) {
      throw new AppError('Tienda no encontrada', 404);
    }

    // Verificar que no haya una caja abierta
    const existingOpen = await CashRegister.findOne({
      store: targetStore,
      status: CashRegisterStatus.OPEN
    });

    if (existingOpen) {
      throw new AppError('Ya hay una caja abierta para esta tienda. Ciérrala primero.', 400);
    }

    // Crear registro de caja
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cashRegister = await CashRegister.create({
      store: targetStore,
      date: today,
      openingAmount,
      openedAt: new Date(),
      openedBy: req.user?._id,
      status: CashRegisterStatus.OPEN,
      movements: [],
      salesByMethod: {
        efectivo: 0,
        nequi: 0,
        daviplata: 0,
        llave_bancolombia: 0,
        tarjeta: 0,
        transferencia: 0
      }
    });

    await cashRegister.populate([
      { path: 'store', select: 'name' },
      { path: 'openedBy', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Caja abierta exitosamente',
      data: cashRegister
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener estado actual de la caja
// @route   GET /api/cash-register/current
// @access  Private
export const getCurrentCashRegister = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId } = req.query;

    const targetStore = req.user?.role === UserRole.ADMIN 
      ? storeId || req.user?.store 
      : req.user?.store?.toString();

    if (!targetStore) {
      throw new AppError('Tienda no especificada', 400);
    }

    const cashRegister = await CashRegister.findOne({
      store: targetStore,
      status: CashRegisterStatus.OPEN
    })
      .populate('store', 'name')
      .populate('openedBy', 'name')
      .populate('movements.createdBy', 'name');

    if (!cashRegister) {
      res.json({
        success: true,
        data: null,
        message: 'No hay caja abierta'
      });
      return;
    }

    // Obtener ventas del día por método de pago
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const salesByMethod = await Sale.aggregate([
      {
        $match: {
          store: new mongoose.Types.ObjectId(targetStore as string),
          status: SaleStatus.COMPLETED,
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$finalTotal' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Actualizar salesByMethod en el registro
    const salesMethodSummary: any = {
      efectivo: 0,
      nequi: 0,
      daviplata: 0,
      llave_bancolombia: 0,
      tarjeta: 0,
      transferencia: 0
    };

    for (const method of salesByMethod) {
      if (salesMethodSummary.hasOwnProperty(method._id)) {
        salesMethodSummary[method._id] = method.total;
      }
    }

    // Calcular totales
    const totalSalesEfectivo = salesMethodSummary.efectivo;
    const totalMovementsIncome = cashRegister.movements
      .filter(m => m.type === 'income')
      .reduce((sum, m) => sum + m.amount, 0);
    const totalMovementsExpense = cashRegister.movements
      .filter(m => m.type === 'expense')
      .reduce((sum, m) => sum + m.amount, 0);

    const expectedAmount = cashRegister.openingAmount + totalSalesEfectivo + totalMovementsIncome - totalMovementsExpense;

    res.json({
      success: true,
      data: {
        ...cashRegister.toObject(),
        salesByMethod: salesMethodSummary,
        calculatedTotals: {
          openingAmount: cashRegister.openingAmount,
          salesEfectivo: totalSalesEfectivo,
          otherIncome: totalMovementsIncome,
          expenses: totalMovementsExpense,
          expectedAmount: Math.round(expectedAmount),
          totalSalesAllMethods: Object.values(salesMethodSummary).reduce((a: number, b: any) => a + b, 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Agregar movimiento a la caja
// @route   POST /api/cash-register/movement
// @access  Private
export const addCashMovement = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { storeId, type, amount, description, reference } = req.body;

    const targetStore = req.user?.role === UserRole.ADMIN 
      ? storeId 
      : req.user?.store?.toString();

    const cashRegister = await CashRegister.findOne({
      store: targetStore,
      status: CashRegisterStatus.OPEN
    });

    if (!cashRegister) {
      throw new AppError('No hay caja abierta. Abre la caja primero.', 400);
    }

    cashRegister.movements.push({
      type,
      amount,
      description,
      reference,
      createdAt: new Date(),
      createdBy: req.user!._id as mongoose.Types.ObjectId
    });

    await cashRegister.save();

    res.json({
      success: true,
      message: `${type === 'income' ? 'Ingreso' : 'Egreso'} registrado`,
      data: cashRegister
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cerrar caja del día
// @route   POST /api/cash-register/close
// @access  Private
export const closeCashRegister = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { storeId, actualClosingAmount, closingNotes } = req.body;

    const targetStore = req.user?.role === UserRole.ADMIN 
      ? storeId 
      : req.user?.store?.toString();

    const cashRegister = await CashRegister.findOne({
      store: targetStore,
      status: CashRegisterStatus.OPEN
    });

    if (!cashRegister) {
      throw new AppError('No hay caja abierta para cerrar', 400);
    }

    // Obtener ventas del día
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const salesByMethod = await Sale.aggregate([
      {
        $match: {
          store: new mongoose.Types.ObjectId(targetStore as string),
          status: SaleStatus.COMPLETED,
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$finalTotal' },
          count: { $sum: 1 }
        }
      }
    ]);

    const salesMethodSummary: any = {
      efectivo: 0,
      nequi: 0,
      daviplata: 0,
      llave_bancolombia: 0,
      tarjeta: 0,
      transferencia: 0
    };

    for (const method of salesByMethod) {
      if (salesMethodSummary.hasOwnProperty(method._id)) {
        salesMethodSummary[method._id] = method.total;
      }
    }

    // Calcular monto esperado
    const totalMovementsIncome = cashRegister.movements
      .filter(m => m.type === 'income')
      .reduce((sum, m) => sum + m.amount, 0);
    const totalMovementsExpense = cashRegister.movements
      .filter(m => m.type === 'expense')
      .reduce((sum, m) => sum + m.amount, 0);

    const expectedAmount = cashRegister.openingAmount + 
                          salesMethodSummary.efectivo + 
                          totalMovementsIncome - 
                          totalMovementsExpense;

    // Actualizar registro de cierre
    cashRegister.status = CashRegisterStatus.CLOSED;
    cashRegister.expectedClosingAmount = Math.round(expectedAmount);
    cashRegister.actualClosingAmount = actualClosingAmount;
    cashRegister.difference = actualClosingAmount - Math.round(expectedAmount);
    cashRegister.closingNotes = closingNotes;
    cashRegister.closedAt = new Date();
    cashRegister.closedBy = req.user!._id as mongoose.Types.ObjectId;
    cashRegister.salesByMethod = salesMethodSummary;

    await cashRegister.save();

    await cashRegister.populate([
      { path: 'store', select: 'name' },
      { path: 'openedBy', select: 'name' },
      { path: 'closedBy', select: 'name' }
    ]);

    // Mensaje según diferencia
    let message = 'Caja cerrada exitosamente.';
    if (cashRegister.difference! > 0) {
      message += ` Sobrante: $${cashRegister.difference!.toLocaleString('es-CO')}`;
    } else if (cashRegister.difference! < 0) {
      message += ` Faltante: $${Math.abs(cashRegister.difference!).toLocaleString('es-CO')}`;
    }

    res.json({
      success: true,
      message,
      data: cashRegister
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Historial de cajas
// @route   GET /api/cash-register/history
// @access  Private
export const getCashRegisterHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId, startDate, endDate, limit = 30 } = req.query;

    const targetStore = req.user?.role === UserRole.ADMIN 
      ? storeId 
      : req.user?.store?.toString();

    let query: any = { status: CashRegisterStatus.CLOSED };

    if (targetStore) {
      query.store = targetStore;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const history = await CashRegister.find(query)
      .populate('store', 'name')
      .populate('openedBy', 'name')
      .populate('closedBy', 'name')
      .sort({ date: -1 })
      .limit(Number(limit));

    // Estadísticas
    const stats = await CashRegister.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          totalDifference: { $sum: '$difference' },
          avgDifference: { $avg: '$difference' },
          daysWithShortage: {
            $sum: { $cond: [{ $lt: ['$difference', 0] }, 1, 0] }
          },
          daysWithSurplus: {
            $sum: { $cond: [{ $gt: ['$difference', 0] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      count: history.length,
      stats: stats[0] || { totalDays: 0, totalDifference: 0 },
      data: history
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener detalle de un arqueo
// @route   GET /api/cash-register/:id
// @access  Private
export const getCashRegisterById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cashRegister = await CashRegister.findById(req.params.id)
      .populate('store', 'name')
      .populate('openedBy', 'name')
      .populate('closedBy', 'name')
      .populate('movements.createdBy', 'name');

    if (!cashRegister) {
      throw new AppError('Registro de caja no encontrado', 404);
    }

    // Verificar acceso
    if (req.user?.role !== UserRole.ADMIN) {
      if (cashRegister.store._id.toString() !== req.user?.store?.toString()) {
        throw new AppError('No tienes acceso a este registro', 403);
      }
    }

    res.json({
      success: true,
      data: cashRegister
    });
  } catch (error) {
    next(error);
  }
};

// Validaciones
export const openCashRegisterValidation = [
  body('storeId').optional().isMongoId().withMessage('ID de tienda inválido'),
  body('openingAmount').isFloat({ min: 0 }).withMessage('El monto de apertura debe ser un número positivo')
];

export const addMovementValidation = [
  body('storeId').optional().isMongoId().withMessage('ID de tienda inválido'),
  body('type').isIn(['income', 'expense']).withMessage('Tipo debe ser income o expense'),
  body('amount').isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0'),
  body('description').trim().notEmpty().withMessage('La descripción es requerida')
];

export const closeCashRegisterValidation = [
  body('storeId').optional().isMongoId().withMessage('ID de tienda inválido'),
  body('actualClosingAmount').isFloat({ min: 0 }).withMessage('El monto de cierre debe ser un número positivo'),
  body('closingNotes').optional().isString()
];
