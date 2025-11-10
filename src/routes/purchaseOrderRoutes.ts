import express from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrderStats
} from '../controllers/purchaseOrderController';
import { protect, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = express.Router();

// Validaciones
const createPurchaseOrderValidation = [
  body('supplier').trim().notEmpty().withMessage('El proveedor es requerido'),
  body('store').trim().notEmpty().withMessage('La tienda es requerida'),
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un producto'),
  body('items.*.product').trim().notEmpty().withMessage('El producto es requerido'),
  body('items.*.quantityOrdered').isInt({ min: 1 }).withMessage('La cantidad debe ser al menos 1'),
  body('items.*.unitCost').isFloat({ min: 0 }).withMessage('El costo unitario debe ser mayor o igual a 0'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('El impuesto debe ser mayor o igual a 0'),
  body('shippingCost').optional().isFloat({ min: 0 }).withMessage('El costo de envío debe ser mayor o igual a 0'),
  validate
];

const updatePurchaseOrderValidation = [
  body('items').optional().isArray({ min: 1 }).withMessage('Debe incluir al menos un producto'),
  body('items.*.product').optional().trim().notEmpty().withMessage('El producto es requerido'),
  body('items.*.quantityOrdered').optional().isInt({ min: 1 }).withMessage('La cantidad debe ser al menos 1'),
  body('items.*.unitCost').optional().isFloat({ min: 0 }).withMessage('El costo unitario debe ser mayor o igual a 0'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('El impuesto debe ser mayor o igual a 0'),
  body('shippingCost').optional().isFloat({ min: 0 }).withMessage('El costo de envío debe ser mayor o igual a 0'),
  validate
];

const receivePurchaseOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un producto recibido'),
  body('items.*.productId').trim().notEmpty().withMessage('El ID del producto es requerido'),
  body('items.*.quantityReceived').isInt({ min: 0 }).withMessage('La cantidad recibida debe ser mayor o igual a 0'),
  validate
];

const cancelPurchaseOrderValidation = [
  body('cancellationReason').optional().trim().notEmpty().withMessage('La razón de cancelación no puede estar vacía'),
  validate
];

// Rutas públicas para usuarios autenticados
router.use(protect);

// GET /api/purchase-orders/stats/summary - debe ir ANTES de /:id
router.get('/stats/summary', authorize(UserRole.ADMIN), getPurchaseOrderStats);

// GET /api/purchase-orders
router.get('/', getPurchaseOrders);

// GET /api/purchase-orders/:id
router.get('/:id', getPurchaseOrderById);

// POST /api/purchase-orders/:id/receive - Recibir orden (actualiza inventario)
router.post('/:id/receive', receivePurchaseOrderValidation, receivePurchaseOrder);

// Rutas solo para administradores
router.post('/', authorize(UserRole.ADMIN), createPurchaseOrderValidation, createPurchaseOrder);
router.put('/:id', authorize(UserRole.ADMIN), updatePurchaseOrderValidation, updatePurchaseOrder);
router.post('/:id/cancel', authorize(UserRole.ADMIN), cancelPurchaseOrderValidation, cancelPurchaseOrder);

export default router;
