import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import Inventory from '../models/Inventory';
import Product from '../models/Product';
import Store from '../models/Store';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../models/User';
import logger from '../utils/logger';

// @desc    Obtener inventario de una tienda
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
      productIds = products.map(p => p._id.toString());
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

    inventoryItem.updatedBy = req.user?._id!;
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
    let query: any = {};

    // Si es usuario, solo ver su tienda
    if (req.user?.role === UserRole.USER) {
      query.store = req.user.store;
    }

    const inventory = await Inventory.find(query)
      .populate('product')
      .populate('store', 'name');

    // Filtrar items con stock bajo
    const lowStockItems = inventory.filter(item => item.quantity <= item.minStock);

    res.json({
      success: true,
      count: lowStockItems.length,
      data: lowStockItems
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
