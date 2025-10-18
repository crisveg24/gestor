import mongoose, { Document, Schema } from 'mongoose';

export interface IInventory extends Document {
  store: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  quantity: number;
  minStock: number;
  maxStock: number;
  lastRestockDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema: Schema = new Schema(
  {
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'La tienda es requerida']
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'El producto es requerido']
    },
    quantity: {
      type: Number,
      required: [true, 'La cantidad es requerida'],
      min: [0, 'La cantidad no puede ser negativa'],
      default: 0
    },
    minStock: {
      type: Number,
      default: 10,
      min: [0, 'El stock mínimo no puede ser negativo']
    },
    maxStock: {
      type: Number,
      default: 1000,
      min: [0, 'El stock máximo no puede ser negativo']
    },
    lastRestockDate: {
      type: Date
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Índices compuestos para optimizar consultas
InventorySchema.index({ store: 1, product: 1 }, { unique: true });
InventorySchema.index({ store: 1, quantity: 1 });
InventorySchema.index({ product: 1 });

// Validación: maxStock debe ser mayor que minStock
InventorySchema.pre('save', function(next) {
  if (this.maxStock <= this.minStock) {
    next(new Error('El stock máximo debe ser mayor que el stock mínimo'));
  }
  next();
});

export default mongoose.model<IInventory>('Inventory', InventorySchema);
