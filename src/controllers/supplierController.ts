import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Supplier from '../models/Supplier';
import logger from '../utils/logger';
import mongoose from 'mongoose';

// @desc    Obtener todos los proveedores
// @route   GET /api/suppliers
// @access  Private
export const getSuppliers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, isActive, category, page = 1, limit = 10 } = req.query;
    
    const query: any = {};
    
    // Filtro por estado activo
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Filtro por categoría
    if (category) {
      query.categories = category;
    }
    
    // Búsqueda por texto
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const [suppliers, total] = await Promise.all([
      Supplier.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email'),
      Supplier.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: {
        suppliers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error: any) {
    logger.error('Error al obtener proveedores:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener proveedores'
    });
  }
};

// @desc    Obtener un proveedor por ID
// @route   GET /api/suppliers/:id
// @access  Private
export const getSupplierById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!supplier) {
      res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
      return;
    }
    
    res.json({
      success: true,
      data: supplier
    });
  } catch (error: any) {
    logger.error('Error al obtener proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener proveedor'
    });
  }
};

// @desc    Crear nuevo proveedor
// @route   POST /api/suppliers
// @access  Private (Admin)
export const createSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      contactName,
      email,
      phone,
      address,
      city,
      country,
      taxId,
      categories,
      paymentTerms,
      website,
      notes,
      rating
    } = req.body;
    
    // Verificar si ya existe un proveedor con el mismo email
    const existingSupplier = await Supplier.findOne({ email });
    if (existingSupplier) {
      res.status(400).json({
        success: false,
        message: 'Ya existe un proveedor con ese email'
      });
      return;
    }
    
    const supplier = await Supplier.create({
      name,
      contactName,
      email,
      phone,
      address,
      city,
      country,
      taxId,
      categories,
      paymentTerms,
      website,
      notes,
      rating,
      createdBy: req.user!._id,
      updatedBy: req.user!._id
    });
    
    logger.info(`Proveedor creado: ${supplier.name} por ${req.user!.email}`);
    
    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Proveedor creado exitosamente'
    });
  } catch (error: any) {
    logger.error('Error al crear proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear proveedor'
    });
  }
};

// @desc    Actualizar proveedor
// @route   PUT /api/suppliers/:id
// @access  Private (Admin)
export const updateSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
      return;
    }
    
    // Si se está cambiando el email, verificar que no exista otro proveedor con ese email
    if (req.body.email && req.body.email !== supplier.email) {
      const existingSupplier = await Supplier.findOne({ email: req.body.email });
      if (existingSupplier) {
        res.status(400).json({
          success: false,
          message: 'Ya existe un proveedor con ese email'
        });
        return;
      }
    }
    
    const {
      name,
      contactName,
      email,
      phone,
      address,
      city,
      country,
      taxId,
      categories,
      paymentTerms,
      website,
      notes,
      rating,
      isActive
    } = req.body;
    
    supplier.name = name || supplier.name;
    supplier.contactName = contactName || supplier.contactName;
    supplier.email = email || supplier.email;
    supplier.phone = phone || supplier.phone;
    supplier.address = address !== undefined ? address : supplier.address;
    supplier.city = city !== undefined ? city : supplier.city;
    supplier.country = country || supplier.country;
    supplier.taxId = taxId !== undefined ? taxId : supplier.taxId;
    supplier.categories = categories || supplier.categories;
    supplier.paymentTerms = paymentTerms || supplier.paymentTerms;
    supplier.website = website !== undefined ? website : supplier.website;
    supplier.notes = notes !== undefined ? notes : supplier.notes;
    supplier.rating = rating !== undefined ? rating : supplier.rating;
    supplier.isActive = isActive !== undefined ? isActive : supplier.isActive;
    supplier.updatedBy = req.user!._id as mongoose.Types.ObjectId;
    
    await supplier.save();
    
    logger.info(`Proveedor actualizado: ${supplier.name} por ${req.user!.email}`);
    
    res.json({
      success: true,
      data: supplier,
      message: 'Proveedor actualizado exitosamente'
    });
  } catch (error: any) {
    logger.error('Error al actualizar proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar proveedor'
    });
  }
};

// @desc    Eliminar proveedor (soft delete)
// @route   DELETE /api/suppliers/:id
// @access  Private (Admin)
export const deleteSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
      return;
    }
    
    // Soft delete - solo marcar como inactivo
    supplier.isActive = false;
    supplier.updatedBy = req.user!._id as mongoose.Types.ObjectId;
    await supplier.save();
    
    logger.info(`Proveedor desactivado: ${supplier.name} por ${req.user!.email}`);
    
    res.json({
      success: true,
      message: 'Proveedor desactivado exitosamente'
    });
  } catch (error: any) {
    logger.error('Error al eliminar proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar proveedor'
    });
  }
};

// @desc    Obtener todas las categorías de proveedores
// @route   GET /api/suppliers/categories/list
// @access  Private
export const getSupplierCategories = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await Supplier.distinct('categories');
    
    res.json({
      success: true,
      data: categories.filter(cat => cat) // Filtrar valores nulos o vacíos
    });
  } catch (error: any) {
    logger.error('Error al obtener categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías'
    });
  }
};
