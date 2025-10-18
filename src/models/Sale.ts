import mongoose, { Document, Schema } from 'mongoose';

export enum SaleStatus {
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export interface ISaleItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ISale extends Document {
  store: mongoose.Types.ObjectId;
  items: ISaleItem[];
  total: number;
  tax: number;
  discount: number;
  finalTotal: number;
  paymentMethod: string;
  status: SaleStatus;
  soldBy: mongoose.Types.ObjectId;
  notes?: string;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema: Schema = new Schema(
  {
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'La tienda es requerida']
    },
    items: [{
      product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'La cantidad debe ser al menos 1']
      },
      unitPrice: {
        type: Number,
        required: true,
        min: [0, 'El precio unitario no puede ser negativo']
      },
      subtotal: {
        type: Number,
        required: true,
        min: [0, 'El subtotal no puede ser negativo']
      }
    }],
    total: {
      type: Number,
      required: true,
      min: [0, 'El total no puede ser negativo']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'El impuesto no puede ser negativo']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'El descuento no puede ser negativo']
    },
    finalTotal: {
      type: Number,
      required: true,
      min: [0, 'El total final no puede ser negativo']
    },
    paymentMethod: {
      type: String,
      required: [true, 'El método de pago es requerido'],
      enum: ['cash', 'card', 'transfer', 'other']
    },
    status: {
      type: String,
      enum: Object.values(SaleStatus),
      default: SaleStatus.COMPLETED
    },
    soldBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String,
      maxlength: [500, 'La razón de cancelación no puede exceder 500 caracteres']
    }
  },
  {
    timestamps: true
  }
);

// Índices
SaleSchema.index({ store: 1, createdAt: -1 });
SaleSchema.index({ soldBy: 1 });
SaleSchema.index({ status: 1 });
SaleSchema.index({ createdAt: -1 });

// Calcular subtotales antes de guardar
SaleSchema.pre('save', function(next) {
  // Calcular subtotales de items
  this.items.forEach(item => {
    item.subtotal = item.quantity * item.unitPrice;
  });
  
  // Calcular total
  this.total = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  
  // Calcular total final
  this.finalTotal = this.total + this.tax - this.discount;
  
  next();
});

export default mongoose.model<ISale>('Sale', SaleSchema);
