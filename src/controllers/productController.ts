import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import Product from '../models/Product';
import Inventory from '../models/Inventory';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import mongoose from 'mongoose';

// @desc    Obtener todos los productos
// @route   GET /api/products
// @access  Private
export const getProducts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, category, isActive, page = 1, limit = 50 } = req.query;

    const query: any = {};

    if (search) {
      query.$text = { $search: search as string };
    }

    if (category) {
      query.category = category;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener producto por ID
// @route   GET /api/products/:id
// @access  Private
export const getProductById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      throw new AppError('Producto no encontrado', 404);
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear producto
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, sku, barcode, category, price, cost } = req.body;

    // Verificar si el SKU ya existe
    const skuExists = await Product.findOne({ sku });
    if (skuExists) {
      throw new AppError('El SKU ya existe', 400);
    }

    const product = await Product.create({
      name,
      description,
      sku,
      barcode,
      category,
      price,
      cost
    });

    logger.info('Producto creado:', {
      productId: product._id,
      sku: product.sku,
      createdBy: req.user?._id
    });

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear producto con inventario
// @route   POST /api/products/with-inventory
// @access  Private
export const createProductWithInventory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, description, sku, barcode, category, price, cost, store, quantity, minStock, maxStock } = req.body;

    // Log EXHAUSTIVO para debugging
    logger.info('🛍️ [BACKEND] Recibiendo petición crear producto con inventario');
    logger.info('🛍️ [BACKEND] Body completo:', req.body);
    logger.info('🛍️ [BACKEND] Campos extraídos:', {
      name, description, sku, barcode, category, price, cost, store, quantity, minStock, maxStock
    });
    logger.info('🛍️ [BACKEND] Tipos de datos:', {
      name: typeof name,
      sku: typeof sku,
      category: typeof category,
      price: typeof price,
      cost: typeof cost,
      store: typeof store,
      quantity: typeof quantity,
      minStock: typeof minStock,
      maxStock: typeof maxStock,
    });
    logger.info('🛍️ [BACKEND] Usuario:', { id: req.user?._id, email: req.user?.email, role: req.user?.role });

    // Validar campos requeridos del producto
    logger.info('🛍️ [BACKEND] Validando campos del producto...');
    if (!name || !sku || !category || price === undefined || cost === undefined) {
      logger.error('❌ [BACKEND] Faltan campos del producto:', {
        hasName: !!name,
        hasSku: !!sku,
        hasCategory: !!category,
        hasPrice: price !== undefined,
        hasCost: cost !== undefined,
      });
      throw new AppError('Faltan campos requeridos del producto (name, sku, category, price, cost)', 400);
    }

    // Validar campos del inventario
    logger.info('🛍️ [BACKEND] Validando campos del inventario...');
    if (!store || quantity === undefined) {
      logger.error('❌ [BACKEND] Faltan campos del inventario:', {
        hasStore: !!store,
        storeValue: store,
        hasQuantity: quantity !== undefined,
        quantityValue: quantity,
      });
      throw new AppError('Se requiere tienda (store) y cantidad (quantity) para crear el inventario', 400);
    }

    logger.info('✅ [BACKEND] Validaciones pasadas correctamente');

    logger.info('✅ [BACKEND] Validaciones pasadas correctamente');

    // Verificar que el SKU no exista
    logger.info('🔍 [BACKEND] Verificando SKU único...');
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      logger.error('❌ [BACKEND] SKU ya existe:', sku);
      throw new AppError('El SKU ya existe', 400);
    }
    logger.info('✅ [BACKEND] SKU único confirmado');

    // Crear el producto
    logger.info('📝 [BACKEND] Creando producto...');
    const productData = {
      name,
      description,
      sku,
      barcode,
      category,
      price,
      cost,
      isActive: true
    };
    logger.info('📝 [BACKEND] Datos del producto a crear:', productData);

    const [product] = await Product.create([productData], { session });
    logger.info('✅ [BACKEND] Producto creado:', { id: product._id, name: product.name });

    // Crear el inventario
    logger.info('📦 [BACKEND] Creando inventario...');
    const inventoryData = {
      store,
      product: product._id,
      quantity: Number(quantity),
      minStock: minStock ? Number(minStock) : 10,
      maxStock: maxStock ? Number(maxStock) : 1000,
      lastRestockDate: new Date(),
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    };
    logger.info('📦 [BACKEND] Datos del inventario a crear:', inventoryData);

    const [inventory] = await Inventory.create([inventoryData], { session });
    logger.info('✅ [BACKEND] Inventario creado:', { id: inventory._id, store, quantity });

    await session.commitTransaction();
    logger.info('✅ [BACKEND] Transacción completada exitosamente');

    logger.info('🎉 [BACKEND] Producto con inventario creado exitosamente:', {
      productId: product._id,
      inventoryId: inventory._id,
      store,
      createdBy: req.user?._id
    });

    res.status(201).json({
      success: true,
      data: {
        product,
        inventory
      }
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('❌ [BACKEND] Error al crear producto con inventario:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Actualizar producto
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, sku, barcode, category, price, cost, isActive } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      throw new AppError('Producto no encontrado', 404);
    }

    // Si se está actualizando el SKU, verificar que no exista
    if (sku && sku !== product.sku) {
      const skuExists = await Product.findOne({ sku });
      if (skuExists) {
        throw new AppError('El SKU ya existe', 400);
      }
    }

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (sku !== undefined) product.sku = sku;
    if (barcode !== undefined) product.barcode = barcode;
    if (category !== undefined) product.category = category;
    if (price !== undefined) product.price = price;
    if (cost !== undefined) product.cost = cost;
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();

    logger.info('Producto actualizado:', {
      productId: product._id,
      updatedBy: req.user?._id
    });

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar producto
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      throw new AppError('Producto no encontrado', 404);
    }

    // Soft delete - marcar como inactivo en lugar de eliminar
    product.isActive = false;
    await product.save();

    logger.info('Producto eliminado (soft delete):', {
      productId: id,
      deletedBy: req.user?._id
    });

    res.json({
      success: true,
      message: 'Producto eliminado'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener categorías
// @route   GET /api/products/categories/list
// @access  Private
export const getCategories = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await Product.distinct('category');

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// Validaciones
export const createProductValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('sku').trim().notEmpty().withMessage('El SKU es requerido').toUpperCase(),
  body('category').trim().notEmpty().withMessage('La categoría es requerida'),
  body('price').isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
  body('cost').isFloat({ min: 0 }).withMessage('El costo debe ser un número positivo')
];

// Validación específica para crear producto con inventario
export const createProductWithInventoryValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('sku').trim().notEmpty().withMessage('El SKU es requerido').toUpperCase(),
  body('category').trim().notEmpty().withMessage('La categoría es requerida'),
  body('price').isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
  body('cost').isFloat({ min: 0 }).withMessage('El costo debe ser un número positivo'),
  // Campos del inventario
  body('store').trim().notEmpty().withMessage('La tienda es requerida'),
  body('quantity').isInt({ min: 0 }).withMessage('La cantidad debe ser un número entero positivo'),
  body('minStock').optional().isInt({ min: 0 }).withMessage('El stock mínimo debe ser un número entero positivo'),
  body('maxStock').optional().isInt({ min: 1 }).withMessage('El stock máximo debe ser un número entero mayor a 0')
];

export const updateProductValidation = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('sku').optional().trim().notEmpty().withMessage('El SKU no puede estar vacío').toUpperCase(),
  body('category').optional().trim().notEmpty().withMessage('La categoría no puede estar vacía'),
  body('price').optional().isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('El costo debe ser un número positivo'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser un booleano')
];
