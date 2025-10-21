import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  createProductWithInventory,
  createProductsWithSizeCurve,
  updateProduct,
  deleteProduct,
  getCategories,
  createProductValidation,
  createProductWithInventoryValidation,
  createSizeCurveValidation,
  updateProductValidation
} from '../controllers/productController';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

// Rutas accesibles para todos los usuarios autenticados
router.get('/', getProducts);
router.get('/categories/list', getCategories);

// Ruta para crear productos con curva de tallas (todos los usuarios autenticados)
// IMPORTANTE: Esta ruta debe ir ANTES de /:id para que no se confunda
router.post('/size-curve', createSizeCurveValidation, validate, createProductsWithSizeCurve);

// Ruta para crear producto con inventario (todos los usuarios autenticados)
// IMPORTANTE: Esta ruta debe ir ANTES de /:id para que no se confunda
router.post('/with-inventory', createProductWithInventoryValidation, validate, createProductWithInventory);

// Rutas solo para administradores
router.post('/', authorize(UserRole.ADMIN), createProductValidation, validate, createProduct);

// Estas rutas deben ir al final porque /:id puede coincidir con cualquier cosa
router.get('/:id', getProductById);
router.put('/:id', authorize(UserRole.ADMIN), updateProductValidation, validate, updateProduct);
router.delete('/:id', authorize(UserRole.ADMIN), deleteProduct);

export default router;
