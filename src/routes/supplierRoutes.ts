import express from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierCategories,
  toggleSupplierStatus,
  getSupplierPurchaseOrders
} from '../controllers/supplierController';
import { protect, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = express.Router();

// Validaciones
const createSupplierValidation = [
  body('name').trim().notEmpty().withMessage('El nombre del proveedor es requerido'),
  body('contactName').trim().notEmpty().withMessage('El nombre del contacto es requerido'),
  body('email').trim().isEmail().withMessage('Email inválido'),
  body('phone').trim().notEmpty().withMessage('El teléfono es requerido'),
  body('categories').optional().isArray().withMessage('Las categorías deben ser un array'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('La calificación debe ser entre 1 y 5'),
];

const updateSupplierValidation = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('contactName').optional().trim().notEmpty().withMessage('El nombre del contacto no puede estar vacío'),
  body('email').optional().trim().isEmail().withMessage('Email inválido'),
  body('phone').optional().trim().notEmpty().withMessage('El teléfono no puede estar vacío'),
  body('categories').optional().isArray().withMessage('Las categorías deben ser un array'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('La calificación debe ser entre 1 y 5'),
];

// Rutas públicas para usuarios autenticados
router.use(protect);

// GET /api/suppliers/categories/list - debe ir ANTES de /:id
router.get('/categories/list', getSupplierCategories);

// GET /api/suppliers
router.get('/', getSuppliers);

// GET /api/suppliers/:id
router.get('/:id', getSupplierById);

// GET /api/suppliers/:id/purchase-orders - debe ir ANTES de rutas de admin
router.get('/:id/purchase-orders', getSupplierPurchaseOrders);

// Rutas solo para administradores
router.post('/', authorize(UserRole.ADMIN), createSupplierValidation, validate, createSupplier);
router.put('/:id', authorize(UserRole.ADMIN), updateSupplierValidation, validate, updateSupplier);
router.put('/:id/toggle-status', authorize(UserRole.ADMIN), toggleSupplierStatus);
router.delete('/:id', authorize(UserRole.ADMIN), deleteSupplier);

export default router;
