import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import PurchaseOrder, { PurchaseOrderStatus } from '../models/PurchaseOrder';
import Inventory from '../models/Inventory';
import logger from '../utils/logger';
import mongoose from 'mongoose';

// @desc    Obtener todas las órdenes de compra
// @route   GET /api/purchase-orders
// @access  Private
export const getPurchaseOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { supplier, store, status, page = 1, limit = 10 } = req.query;
    
    const query: any = {};
    
    // Filtro por proveedor
    if (supplier) {
      query.supplier = supplier;
    }
    
    // Filtro por tienda
    if (store) {
      query.store = store;
    } else if (req.user!.role === 'user' && req.user!.store) {
      // Si es usuario regular, solo ver órdenes de su tienda
      query.store = req.user!.store;
    }
    
    // Filtro por estado
    if (status) {
      query.status = status;
    }
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const [orders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('supplier', 'name contactName email phone')
        .populate('store', 'name address')
        .populate('items.product', 'name sku price')
        .populate('createdBy', 'name email')
        .populate('receivedBy', 'name email'),
      PurchaseOrder.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error: any) {
    logger.error('Error al obtener órdenes de compra:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener órdenes de compra'
    });
  }
};

// @desc    Obtener una orden de compra por ID
// @route   GET /api/purchase-orders/:id
// @access  Private
export const getPurchaseOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name contactName email phone address paymentTerms')
      .populate('store', 'name address phone')
      .populate('items.product', 'name sku barcode category price')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('receivedBy', 'name email')
      .populate('cancelledBy', 'name email');
    
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Orden de compra no encontrada'
      });
      return;
    }
    
    // Verificar permisos si es usuario regular
    if (req.user!.role === 'user' && req.user!.store) {
      if (order.store._id.toString() !== req.user!.store.toString()) {
        res.status(403).json({
          success: false,
          message: 'No tienes permiso para ver esta orden'
        });
        return;
      }
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error: any) {
    logger.error('Error al obtener orden de compra:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener orden de compra'
    });
  }
};

// @desc    Crear nueva orden de compra
// @route   POST /api/purchase-orders
// @access  Private (Admin)
export const createPurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      supplier,
      store,
      items,
      tax,
      shippingCost,
      expectedDeliveryDate,
      notes,
      invoiceNumber
    } = req.body;
    
    // Validar que los items no estén vacíos
    if (!items || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'La orden debe tener al menos un producto'
      });
      return;
    }
    
    const order = await PurchaseOrder.create({
      supplier,
      store,
      items,
      tax: tax || 0,
      shippingCost: shippingCost || 0,
      expectedDeliveryDate,
      notes,
      invoiceNumber,
      createdBy: req.user!._id,
      updatedBy: req.user!._id
    });
    
    // Poblar los datos para la respuesta
    await order.populate([
      { path: 'supplier', select: 'name contactName email' },
      { path: 'store', select: 'name address' },
      { path: 'items.product', select: 'name sku price' }
    ]);
    
    logger.info(`Orden de compra creada: ${order.orderNumber} por ${req.user!.email}`);
    
    res.status(201).json({
      success: true,
      data: order,
      message: 'Orden de compra creada exitosamente'
    });
  } catch (error: any) {
    logger.error('Error al crear orden de compra:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear orden de compra'
    });
  }
};

// @desc    Actualizar orden de compra
// @route   PUT /api/purchase-orders/:id
// @access  Private (Admin)
export const updatePurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Orden de compra no encontrada'
      });
      return;
    }
    
    // No permitir actualizar órdenes recibidas o canceladas
    if (order.status === PurchaseOrderStatus.RECEIVED || order.status === PurchaseOrderStatus.CANCELLED) {
      res.status(400).json({
        success: false,
        message: 'No se pueden modificar órdenes recibidas o canceladas'
      });
      return;
    }
    
    const {
      supplier,
      items,
      tax,
      shippingCost,
      expectedDeliveryDate,
      notes,
      invoiceNumber,
      paymentStatus
    } = req.body;
    
    if (supplier) order.supplier = supplier;
    if (items) order.items = items;
    if (tax !== undefined) order.tax = tax;
    if (shippingCost !== undefined) order.shippingCost = shippingCost;
    if (expectedDeliveryDate) order.expectedDeliveryDate = expectedDeliveryDate;
    if (notes !== undefined) order.notes = notes;
    if (invoiceNumber !== undefined) order.invoiceNumber = invoiceNumber;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    order.updatedBy = req.user!._id as mongoose.Types.ObjectId;
    
    await order.save();
    
    await order.populate([
      { path: 'supplier', select: 'name contactName email' },
      { path: 'store', select: 'name address' },
      { path: 'items.product', select: 'name sku price' }
    ]);
    
    logger.info(`Orden de compra actualizada: ${order.orderNumber} por ${req.user!.email}`);
    
    res.json({
      success: true,
      data: order,
      message: 'Orden de compra actualizada exitosamente'
    });
  } catch (error: any) {
    logger.error('Error al actualizar orden de compra:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar orden de compra'
    });
  }
};

// @desc    Recibir orden de compra (actualiza inventario)
// @route   POST /api/purchase-orders/:id/receive
// @access  Private
export const receivePurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { items } = req.body; // Array de { productId, quantityReceived }
    
    const order = await PurchaseOrder.findById(req.params.id).session(session);
    
    if (!order) {
      await session.abortTransaction();
      res.status(404).json({
        success: false,
        message: 'Orden de compra no encontrada'
      });
      return;
    }
    
    // Verificar que la orden esté pendiente
    if (order.status === PurchaseOrderStatus.CANCELLED) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: 'No se puede recibir una orden cancelada'
      });
      return;
    }
    
    // Verificar permisos si es usuario regular
    if (req.user!.role === 'user' && req.user!.store) {
      if (order.store.toString() !== req.user!.store.toString()) {
        await session.abortTransaction();
        res.status(403).json({
          success: false,
          message: 'No tienes permiso para recibir esta orden'
        });
        return;
      }
    }
    
    // Actualizar cantidades recibidas
    for (const receivedItem of items) {
      const orderItem = order.items.find(
        item => item.product.toString() === receivedItem.productId
      );
      
      if (orderItem) {
        orderItem.quantityReceived = receivedItem.quantityReceived;
        
        // Actualizar inventario
        const inventory = await Inventory.findOne({
          store: order.store,
          product: receivedItem.productId
        }).session(session);
        
        if (inventory) {
          inventory.quantity += receivedItem.quantityReceived;
          inventory.lastRestockDate = new Date();
          inventory.updatedBy = req.user!._id as mongoose.Types.ObjectId;
          await inventory.save({ session });
        } else {
          // Si no existe el inventario, crearlo
          await Inventory.create([{
            store: order.store,
            product: receivedItem.productId,
            quantity: receivedItem.quantityReceived,
            lastRestockDate: new Date(),
            createdBy: req.user!._id as mongoose.Types.ObjectId,
            updatedBy: req.user!._id as mongoose.Types.ObjectId
          }], { session });
        }
      }
    }
    
    // Verificar si se recibió todo
    const allReceived = order.items.every(
      item => item.quantityReceived >= item.quantityOrdered
    );
    
    const someReceived = order.items.some(
      item => item.quantityReceived > 0
    );
    
    if (allReceived) {
      order.status = PurchaseOrderStatus.RECEIVED;
    } else if (someReceived) {
      order.status = PurchaseOrderStatus.PARTIAL;
    }
    
    order.receivedDate = new Date();
    order.receivedBy = req.user!._id as mongoose.Types.ObjectId;
    order.updatedBy = req.user!._id as mongoose.Types.ObjectId;
    
    await order.save({ session });
    
    await session.commitTransaction();
    
    await order.populate([
      { path: 'supplier', select: 'name contactName email' },
      { path: 'store', select: 'name address' },
      { path: 'items.product', select: 'name sku price' }
    ]);
    
    logger.info(`Orden de compra recibida: ${order.orderNumber} por ${req.user!.email}`);
    
    res.json({
      success: true,
      data: order,
      message: 'Orden de compra recibida exitosamente'
    });
  } catch (error: any) {
    await session.abortTransaction();
    logger.error('Error al recibir orden de compra:', error);
    res.status(500).json({
      success: false,
      message: 'Error al recibir orden de compra'
    });
  } finally {
    session.endSession();
  }
};

// @desc    Cancelar orden de compra
// @route   POST /api/purchase-orders/:id/cancel
// @access  Private (Admin)
export const cancelPurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cancellationReason } = req.body;
    
    const order = await PurchaseOrder.findById(req.params.id);
    
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Orden de compra no encontrada'
      });
      return;
    }
    
    // No permitir cancelar órdenes ya recibidas
    if (order.status === PurchaseOrderStatus.RECEIVED) {
      res.status(400).json({
        success: false,
        message: 'No se puede cancelar una orden ya recibida'
      });
      return;
    }
    
    order.status = PurchaseOrderStatus.CANCELLED;
    order.cancelledBy = req.user!._id as mongoose.Types.ObjectId;
    order.cancelledAt = new Date();
    order.cancellationReason = cancellationReason;
    order.updatedBy = req.user!._id as mongoose.Types.ObjectId;
    
    await order.save();
    
    await order.populate([
      { path: 'supplier', select: 'name contactName email' },
      { path: 'store', select: 'name address' },
      { path: 'items.product', select: 'name sku price' }
    ]);
    
    logger.info(`Orden de compra cancelada: ${order.orderNumber} por ${req.user!.email}`);
    
    res.json({
      success: true,
      data: order,
      message: 'Orden de compra cancelada exitosamente'
    });
  } catch (error: any) {
    logger.error('Error al cancelar orden de compra:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar orden de compra'
    });
  }
};

// @desc    Obtener estadísticas de órdenes de compra
// @route   GET /api/purchase-orders/stats/summary
// @access  Private (Admin)
export const getPurchaseOrderStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo, store } = req.query;
    
    const query: any = {};
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) query.createdAt.$lte = new Date(dateTo as string);
    }
    
    if (store) {
      query.store = store;
    }
    
    const [
      totalOrders,
      pendingOrders,
      receivedOrders,
      cancelledOrders,
      totalSpent
    ] = await Promise.all([
      PurchaseOrder.countDocuments(query),
      PurchaseOrder.countDocuments({ ...query, status: PurchaseOrderStatus.PENDING }),
      PurchaseOrder.countDocuments({ ...query, status: PurchaseOrderStatus.RECEIVED }),
      PurchaseOrder.countDocuments({ ...query, status: PurchaseOrderStatus.CANCELLED }),
      PurchaseOrder.aggregate([
        { $match: { ...query, status: { $ne: PurchaseOrderStatus.CANCELLED } } },
        { $group: { _id: null, total: { $sum: '$finalTotal' } } }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        receivedOrders,
        cancelledOrders,
        totalSpent: totalSpent[0]?.total || 0
      }
    });
  } catch (error: any) {
    logger.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};
