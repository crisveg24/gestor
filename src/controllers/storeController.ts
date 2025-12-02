import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import Store from '../models/Store';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

// @desc    Obtener todas las tiendas
// @route   GET /api/stores
// @access  Private/Admin
export const getStores = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isActive } = req.query;

    const query: any = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const stores = await Store.find(query).sort({ name: 1 });

    res.json({
      success: true,
      count: stores.length,
      data: stores
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener tienda por ID
// @route   GET /api/stores/:id
// @access  Private
export const getStoreById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const store = await Store.findById(id);

    if (!store) {
      throw new AppError('Tienda no encontrada', 404);
    }

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear tienda
// @route   POST /api/stores
// @access  Private/Admin
export const createStore = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, address, phone, email } = req.body;

    const store = await Store.create({
      name,
      address,
      phone,
      email
    });

    logger.info('Tienda creada:', {
      storeId: store._id,
      name: store.name,
      createdBy: req.user?._id
    });

    res.status(201).json({
      success: true,
      data: store
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar tienda
// @route   PUT /api/stores/:id
// @access  Private/Admin
export const updateStore = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, address, phone, email, isActive } = req.body;

    const store = await Store.findById(id);

    if (!store) {
      throw new AppError('Tienda no encontrada', 404);
    }

    if (name !== undefined) store.name = name;
    if (address !== undefined) store.address = address;
    if (phone !== undefined) store.phone = phone;
    if (email !== undefined) store.email = email;
    if (isActive !== undefined) store.isActive = isActive;

    await store.save();

    logger.info('Tienda actualizada:', {
      storeId: store._id,
      updatedBy: req.user?._id
    });

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activar/desactivar tienda
// @route   PATCH /api/stores/:id/toggle
// @access  Private/Admin
export const toggleStoreActive = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const store = await Store.findById(id);

    if (!store) {
      throw new AppError('Tienda no encontrada', 404);
    }

    store.isActive = isActive;
    await store.save();

    logger.info('Estado de tienda cambiado:', {
      storeId: id,
      isActive,
      changedBy: req.user?._id
    });

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar tienda
// @route   DELETE /api/stores/:id
// @access  Private/Admin
export const deleteStore = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const store = await Store.findById(id);

    if (!store) {
      throw new AppError('Tienda no encontrada', 404);
    }

    // Soft delete
    store.isActive = false;
    await store.save();

    logger.info('Tienda eliminada (soft delete):', {
      storeId: id,
      deletedBy: req.user?._id
    });

    res.json({
      success: true,
      message: 'Tienda eliminada'
    });
  } catch (error) {
    next(error);
  }
};

// Validaciones
export const createStoreValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('address').trim().notEmpty().withMessage('La dirección es requerida'),
  body('phone').trim().notEmpty().withMessage('El teléfono es requerido'),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail()
];

export const updateStoreValidation = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('address').optional().trim().notEmpty().withMessage('La dirección no puede estar vacía'),
  body('phone').optional().trim().notEmpty().withMessage('El teléfono no puede estar vacío'),
  body('email').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser un booleano')
];
