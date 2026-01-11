import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import Inventory from '../models/Inventory';
import Product from '../models/Product';
import Store from '../models/Store';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../models/User';
import logger from '../utils/logger';
import mongoose from 'mongoose';

// @desc    Obtener inventario (todas las tiendas o filtrado por tienda)
// @route   GET /api/inventory
// @access  Private
export const getAllInventory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { store, search, category, lowStock } = req.query;
    const user = req.user;

    logger.info('📦 [INVENTORY] Obteniendo inventario:', {
      userId: user?._id,
      userRole: user?.role,
      userStore: user?.store,
      filterStore: store,
      search,
      category,
      lowStock
    });

    let query: any = {};

    // Filtrar por tienda si se especifica
    if (store && store !== 'all') {
      query.store = store;
      logger.info('📦 [INVENTORY] Filtrando por tienda específica:', store);
    }
    // Si no es admin y no se especifica tienda, usar la tienda del usuario
    else if (user?.role !== UserRole.ADMIN && user?.store) {
      query.store = user.store;
      logger.info('📦 [INVENTORY] Usuario no-admin, usando su tienda:', user.store);
    }
    // Si es admin y store='all', mostrar todas las tiendas
    else if (user?.role === UserRole.ADMIN && store === 'all') {
      logger.info('📦 [INVENTORY] Admin solicitó todas las tiendas');
      // No filtrar por tienda
    }
    // Si es admin y no especifica store, usar su tienda si la tiene
    else if (user?.role === UserRole.ADMIN && user?.store) {
      query.store = user.store;
      logger.info('📦 [INVENTORY] Admin usando su tienda por defecto:', user.store);
    }

    // Construir filtros de producto
    const productQuery: any = {};
    if (search) {
      productQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) {
      productQuery.category = category;
    }

    // Obtener productos que coincidan con los filtros
    let productIds: string[] | undefined;
    if (search || category) {
      const products = await Product.find(productQuery).select('_id');
      productIds = products.map(p => String(p._id));
      query.product = { $in: productIds };
      logger.info('📦 [INVENTORY] Productos encontrados con filtros:', productIds.length);
    }

    logger.info('📦 [INVENTORY] Query final:', query);

    const inventory = await Inventory.find(query)
      .populate('product')
      .populate('store', 'name email')
      .sort({ 'product.name': 1 });

    logger.info('📦 [INVENTORY] Inventario obtenido:', inventory.length, 'items');

    // Filtrar por stock bajo si se solicita
    let result = inventory;
    if (lowStock === 'true') {
      result = inventory.filter(item => item.quantity <= item.minStock);
      logger.info('📦 [INVENTORY] Filtrado por stock bajo:', result.length, 'items');
    }

    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    logger.error('❌ [INVENTORY] Error al obtener inventario:', error);
    next(error);
  }
};

// @desc    Obtener inventario de una tienda específica
// @route   GET /api/inventory/:storeId
// @access  Private
export const getStoreInventory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { search, category, lowStock } = req.query;

    let query: any = { store: storeId };

    // Construir filtros
    const productQuery: any = {};
    if (search) {
      productQuery.$text = { $search: search as string };
    }
    if (category) {
      productQuery.category = category;
    }

    // Obtener productos que coincidan con los filtros
    let productIds: string[] | undefined;
    if (search || category) {
      const products = await Product.find(productQuery).select('_id');
      productIds = products.map(p => String(p._id));
      query.product = { $in: productIds };
    }

    const inventory = await Inventory.find(query)
      .populate('product')
      .populate('store', 'name')
      .sort({ 'product.name': 1 });

    // Filtrar por stock bajo si se solicita
    let result = inventory;
    if (lowStock === 'true') {
      result = inventory.filter(item => item.quantity <= item.minStock);
    }

    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Agregar producto al inventario
// @route   POST /api/inventory
// @access  Private/Admin
export const addInventoryItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { store, product, quantity, minStock, maxStock } = req.body;

    // Verificar que la tienda existe
    const storeExists = await Store.findById(store);
    if (!storeExists) {
      throw new AppError('Tienda no encontrada', 404);
    }

    // Verificar que el producto existe
    const productExists = await Product.findById(product);
    if (!productExists) {
      throw new AppError('Producto no encontrado', 404);
    }

    // Verificar si el producto ya existe en el inventario de esta tienda
    const existingItem = await Inventory.findOne({ store, product });
    if (existingItem) {
      throw new AppError('El producto ya existe en el inventario de esta tienda', 400);
    }

    const inventoryItem = await Inventory.create({
      store,
      product,
      quantity,
      minStock,
      maxStock,
      lastRestockDate: new Date(),
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await inventoryItem.populate('product store');

    logger.info('Item agregado al inventario:', {
      inventoryId: inventoryItem._id,
      store,
      product,
      quantity,
      addedBy: req.user?._id
    });

    res.status(201).json({
      success: true,
      data: inventoryItem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar cantidad de inventario
// @route   PUT /api/inventory/:id
// @access  Private
export const updateInventoryItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity, minStock, maxStock, operation } = req.body;

    const inventoryItem = await Inventory.findById(id);

    if (!inventoryItem) {
      throw new AppError('Item de inventario no encontrado', 404);
    }

    // Verificar acceso a la tienda
    if (req.user?.role !== UserRole.ADMIN) {
      if (inventoryItem.store.toString() !== req.user?.store?.toString()) {
        throw new AppError('No tiene acceso a esta tienda', 403);
      }
    }

    // Actualizar según la operación
    if (operation === 'add') {
      inventoryItem.quantity += quantity;
      inventoryItem.lastRestockDate = new Date();
    } else if (operation === 'subtract') {
      if (inventoryItem.quantity < quantity) {
        throw new AppError('Cantidad insuficiente en inventario', 400);
      }
      inventoryItem.quantity -= quantity;
    } else {
      // Actualización directa
      if (quantity !== undefined) inventoryItem.quantity = quantity;
    }

    if (minStock !== undefined) inventoryItem.minStock = minStock;
    if (maxStock !== undefined) inventoryItem.maxStock = maxStock;

    inventoryItem.updatedBy = req.user?._id as any;
    await inventoryItem.save();

    await inventoryItem.populate('product store');

    logger.info('Inventario actualizado:', {
      inventoryId: inventoryItem._id,
      operation,
      quantity,
      updatedBy: req.user?._id
    });

    res.json({
      success: true,
      data: inventoryItem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar item del inventario
// @route   DELETE /api/inventory/:id
// @access  Private/Admin
export const deleteInventoryItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const inventoryItem = await Inventory.findById(id);

    if (!inventoryItem) {
      throw new AppError('Item de inventario no encontrado', 404);
    }

    await inventoryItem.deleteOne();

    logger.info('Item eliminado del inventario:', {
      inventoryId: id,
      deletedBy: req.user?._id
    });

    res.json({
      success: true,
      message: 'Item eliminado del inventario'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener alertas de stock bajo
// @route   GET /api/inventory/alerts/low-stock
// @access  Private
export const getLowStockAlerts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { storeId } = req.query;
    let query: any = {};

    // Si es usuario, solo ver su tienda
    if (req.user?.role === UserRole.USER) {
      query.store = req.user.store;
    } else if (storeId) {
      // Admin puede filtrar por tienda específica
      query.store = storeId;
    }

    const inventory = await Inventory.find(query)
      .populate('product')
      .populate('store', 'name');

    // Filtrar items con stock bajo
    const lowStockItems = inventory.filter(item => item.quantity <= item.minStock);

    // Mapear a formato más útil para el frontend
    const mappedItems = lowStockItems.map(item => {
      const product = item.product as any;
      const store = item.store as any;
      return {
        _id: item._id,
        productId: product?._id,
        productName: product?.name || 'Producto desconocido',
        sku: product?.sku || '',
        currentStock: item.quantity,
        minStock: item.minStock,
        storeId: store?._id,
        storeName: store?.name || 'Tienda desconocida',
        isCritical: item.quantity === 0,
      };
    });

    // Ordenar: primero los críticos (stock 0), luego por menor stock
    mappedItems.sort((a, b) => {
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      return a.currentStock - b.currentStock;
    });

    res.json({
      success: true,
      count: mappedItems.length,
      criticalCount: mappedItems.filter(i => i.isCritical).length,
      data: mappedItems
    });
  } catch (error) {
    next(error);
  }
};

// Validaciones
export const addInventoryValidation = [
  body('store').isMongoId().withMessage('ID de tienda inválido'),
  body('product').isMongoId().withMessage('ID de producto inválido'),
  body('quantity').isInt({ min: 0 }).withMessage('La cantidad debe ser un número positivo'),
  body('minStock').optional().isInt({ min: 0 }).withMessage('El stock mínimo debe ser un número positivo'),
  body('maxStock').optional().isInt({ min: 1 }).withMessage('El stock máximo debe ser un número positivo')
];

export const updateInventoryValidation = [
  body('quantity').optional().isInt({ min: 0 }).withMessage('La cantidad debe ser un número positivo'),
  body('operation').optional().isIn(['add', 'subtract', 'set']).withMessage('Operación inválida'),
  body('minStock').optional().isInt({ min: 0 }).withMessage('El stock mínimo debe ser un número positivo'),
  body('maxStock').optional().isInt({ min: 1 }).withMessage('El stock máximo debe ser un número positivo')
];

// @desc    Ajustar stock de inventario
// @route   POST /api/inventory/:id/adjust
// @access  Private
export const adjustInventory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { quantity, reason } = req.body;

    logger.info('📦 [ADJUST] Ajustando inventario:', { id, quantity, reason });

    const inventory = await Inventory.findById(id).populate('product').session(session);
    if (!inventory) {
      throw new AppError('Item de inventario no encontrado', 404);
    }

    const previousStock = inventory.quantity;
    inventory.quantity += quantity;
    
    if (inventory.quantity < 0) {
      throw new AppError('El ajuste resultaría en stock negativo', 400);
    }

    inventory.updatedBy = req.user?._id as any;
    await inventory.save({ session });

    // Crear registro de movimiento (si tienes un modelo StockMovement)
    // const movement = await StockMovement.create([{
    //   inventory: id,
    //   type: 'ajuste',
    //   quantity,
    //   previousStock,
    //   newStock: inventory.quantity,
    //   reason,
    //   createdBy: req.user?._id
    // }], { session });

    await session.commitTransaction();

    logger.info('✅ [ADJUST] Stock ajustado:', { 
      previousStock, 
      newStock: inventory.quantity 
    });

    res.json({
      success: true,
      data: inventory,
      message: 'Stock ajustado exitosamente'
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('❌ [ADJUST] Error:', error);
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Transferir stock entre tiendas
// @route   POST /api/inventory/:id/transfer
// @access  Private/Admin
export const transferInventory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { toStore, quantity } = req.body;

    logger.info('🔄 [TRANSFER] Transfiriendo inventario:', { id, toStore, quantity });

    // Verificar inventario origen
    const fromInventory = await Inventory.findById(id).populate('product').session(session);
    if (!fromInventory) {
      throw new AppError('Item de inventario origen no encontrado', 404);
    }

    if (fromInventory.quantity < quantity) {
      throw new AppError('Stock insuficiente para transferir', 400);
    }

    // Verificar tienda destino
    const toStoreExists = await Store.findById(toStore).session(session);
    if (!toStoreExists) {
      throw new AppError('Tienda destino no encontrada', 404);
    }

    // Reducir stock de origen
    fromInventory.quantity -= quantity;
    fromInventory.updatedBy = req.user?._id as any;
    await fromInventory.save({ session });

    // Buscar o crear inventario en tienda destino
    let toInventory = await Inventory.findOne({
      product: fromInventory.product,
      store: toStore
    }).session(session);

    if (toInventory) {
      toInventory.quantity += quantity;
      toInventory.updatedBy = req.user?._id as any;
      await toInventory.save({ session });
    } else {
      const created = await Inventory.create([{
        product: fromInventory.product,
        store: toStore,
        quantity,
        minStock: fromInventory.minStock,
        maxStock: fromInventory.maxStock,
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      }], { session });
      toInventory = created[0];
    }

    await session.commitTransaction();

    logger.info('✅ [TRANSFER] Transferencia completada');

    res.json({
      success: true,
      data: { fromInventory, toInventory },
      message: 'Transferencia realizada exitosamente'
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('❌ [TRANSFER] Error:', error);
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Obtener historial de movimientos de un item
// @route   GET /api/inventory/:id/movements
// @access  Private
export const getInventoryMovements = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    logger.info('📋 [MOVEMENTS] Obteniendo movimientos:', id);

    // Por ahora retornamos array vacío
    // Cuando implementes el modelo StockMovement, descomenta esto:
    // const movements = await StockMovement.find({ inventory: id })
    //   .populate('createdBy', 'name')
    //   .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: [] // movements
    });
  } catch (error) {
    logger.error('❌ [MOVEMENTS] Error:', error);
    next(error);
  }
};

// Validaciones para ajuste y transferencia
export const adjustInventoryValidation = [
  body('quantity').isInt({ min: -9999, max: 9999 }).withMessage('Cantidad inválida'),
  body('reason').notEmpty().withMessage('El motivo es requerido')
];

export const transferInventoryValidation = [
  body('toStore').isMongoId().withMessage('ID de tienda destino inválido'),
  body('quantity').isInt({ min: 1 }).withMessage('La cantidad debe ser mayor a 0')
];
