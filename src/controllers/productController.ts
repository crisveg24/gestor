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

    console.log('🔍 [PRODUCTS] Búsqueda de productos:', { search, category, isActive });

    const query: any = {};

    // Búsqueda flexible por nombre, SKU o código de barras
    if (search) {
      const searchRegex = new RegExp(search as string, 'i'); // i = case insensitive
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { barcode: searchRegex },
        { description: searchRegex }
      ];
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

    console.log('📋 [PRODUCTS] Query construida:', JSON.stringify(query, null, 2));

    const products = await Product.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(query);

    console.log('✅ [PRODUCTS] Productos encontrados:', products.length);

    res.json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: { products }
    });
  } catch (error) {
    console.error('❌ [PRODUCTS] Error al buscar productos:', error);
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
      cost,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    logger.info('Producto creado:', {
      productId: product._id,
      sku: product.sku,
      createdBy: req.user?._id,
      createdByName: req.user?.name
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
      isActive: true,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
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
    
    // Registrar quién modifica
    product.updatedBy = req.user?._id as any;

    await product.save();

    logger.info('Producto actualizado:', {
      productId: product._id,
      updatedBy: req.user?._id,
      updatedByName: req.user?.name
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

// @desc    Crear múltiples productos con curva de tallas
// @route   POST /api/products/size-curve
// @access  Private/Admin
export const createProductsWithSizeCurve = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      baseName, 
      baseSkuPrefix, 
      description, 
      category, 
      price, 
      cost, 
      sizeType, 
      sizes, // Array de tallas: ["34", "35", "36", ...] o ["XS", "S", "M", ...]
      store, // Tienda para crear inventario
      quantityPerSize, // Cantidad por cada talla
      minStock,
      maxStock
    } = req.body;

    logger.info('👟 [SIZE-CURVE] Creando productos con curva de tallas:', {
      baseName,
      sizeType,
      sizesCount: sizes?.length
    });

    if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
      throw new AppError('Debes proporcionar al menos una talla', 400);
    }

    const createdProducts = [];
    const createdInventories = [];

    for (const size of sizes) {
      // Generar SKU único: BASE-TALLA
      const sku = `${baseSkuPrefix}-${size}`.toUpperCase();
      
      // Verificar si el SKU ya existe
      const skuExists = await Product.findOne({ sku }).session(session);
      if (skuExists) {
        logger.warn(`⚠️ [SIZE-CURVE] SKU ${sku} ya existe, saltando...`);
        continue;
      }

      // Crear nombre con talla: "Zapato Nike Air - Talla 34"
      const productName = `${baseName} - Talla ${size}`;

      // Crear producto
      const product = await Product.create([{
        name: productName,
        baseName,
        description,
        sku,
        category,
        price,
        cost,
        sizeType,
        size,
        isActive: true,
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      }], { session });

      logger.info(`✅ [SIZE-CURVE] Producto creado: ${productName} (${sku}) - ID: ${product[0]._id} por ${req.user?.name}`);
      createdProducts.push(product[0]);

      // Si se proporcionó tienda, crear inventario
      if (store && quantityPerSize !== undefined) {
        const inventory = await Inventory.create([{
          product: product[0]._id,
          store,
          quantity: quantityPerSize,
          minStock: minStock || 5,
          maxStock: maxStock || 50,
          createdBy: req.user?._id,
          updatedBy: req.user?._id
        }], { session });

        logger.info(`📦 [SIZE-CURVE] Inventario creado para producto ${product[0]._id} - Cantidad: ${quantityPerSize}`);
        createdInventories.push(inventory[0]);
      } else {
        logger.info(`⚠️ [SIZE-CURVE] No se creó inventario para ${productName} (sin tienda o cantidad)`);
      }
    }

    await session.commitTransaction();

    logger.info('✅ [SIZE-CURVE] Curva de tallas creada:', {
      productsCreated: createdProducts.length,
      inventoriesCreated: createdInventories.length
    });

    res.status(201).json({
      success: true,
      data: {
        products: createdProducts,
        inventories: createdInventories
      },
      message: `${createdProducts.length} productos creados con sus tallas`
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('❌ [SIZE-CURVE] Error:', error);
    next(error);
  } finally {
    session.endSession();
  }
};

// Validación para curva de tallas
export const createSizeCurveValidation = [
  body('baseName').trim().notEmpty().withMessage('El nombre base es requerido'),
  body('baseSkuPrefix').trim().notEmpty().withMessage('El prefijo de SKU es requerido').toUpperCase(),
  body('category').trim().notEmpty().withMessage('La categoría es requerida'),
  body('price').isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
  body('cost').isFloat({ min: 0 }).withMessage('El costo debe ser un número positivo'),
  body('sizeType').isIn(['zapatos', 'bebe', 'nino', 'adulto', 'unica']).withMessage('Tipo de talla inválido'),
  body('sizes').isArray({ min: 1 }).withMessage('Debes proporcionar al menos una talla'),
  body('store').optional().isMongoId().withMessage('ID de tienda inválido'),
  body('quantityPerSize').optional().isInt({ min: 0 }).withMessage('La cantidad por talla debe ser un número entero positivo')
];
