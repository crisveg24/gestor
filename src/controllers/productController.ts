import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

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

export const updateProductValidation = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('sku').optional().trim().notEmpty().withMessage('El SKU no puede estar vacío').toUpperCase(),
  body('category').optional().trim().notEmpty().withMessage('La categoría no puede estar vacía'),
  body('price').optional().isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('El costo debe ser un número positivo'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser un booleano')
];
