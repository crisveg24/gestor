import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createProductValidation,
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
router.get('/:id', getProductById);

// Rutas solo para administradores
router.post('/', authorize(UserRole.ADMIN), createProductValidation, validate, createProduct);
router.put('/:id', authorize(UserRole.ADMIN), updateProductValidation, validate, updateProduct);
router.delete('/:id', authorize(UserRole.ADMIN), deleteProduct);

export default router;
