import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  cost: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del producto es requerido'],
      trim: true,
      maxlength: [200, 'El nombre no puede exceder 200 caracteres']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
    },
    sku: {
      type: String,
      required: [true, 'El SKU es requerido'],
      unique: true,
      trim: true,
      uppercase: true
    },
    barcode: {
      type: String,
      trim: true,
      sparse: true // Permite múltiples valores null
    },
    category: {
      type: String,
      required: [true, 'La categoría es requerida'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'El precio es requerido'],
      min: [0, 'El precio no puede ser negativo']
    },
    cost: {
      type: Number,
      required: [true, 'El costo es requerido'],
      min: [0, 'El costo no puede ser negativo']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Índices
ProductSchema.index({ sku: 1 });
ProductSchema.index({ barcode: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ name: 'text', description: 'text' }); // Búsqueda de texto

export default mongoose.model<IProduct>('Product', ProductSchema);
