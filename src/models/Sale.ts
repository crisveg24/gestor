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
  modifiedBy?: mongoose.Types.ObjectId;
  modifiedAt?: Date;
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
      enum: ['efectivo', 'nequi', 'daviplata', 'llave_bancolombia', 'tarjeta', 'transferencia'],
      default: 'efectivo'
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
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date
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

// Índices para búsquedas frecuentes
SaleSchema.index({ store: 1, createdAt: -1 }); // Ventas por tienda ordenadas por fecha
SaleSchema.index({ soldBy: 1 });
SaleSchema.index({ status: 1 });
SaleSchema.index({ createdAt: -1 }); // Consultas de reportes por fecha
SaleSchema.index({ paymentMethod: 1 }); // Filtros por método de pago
SaleSchema.index({ store: 1, status: 1, createdAt: -1 }); // Reportes de tienda con estado

// Calcular subtotales antes de guardar
SaleSchema.pre<ISale>('save', function(next) {
  // Calcular subtotales de items
  this.items.forEach((item: ISaleItem) => {
    item.subtotal = item.quantity * item.unitPrice;
  });
  
  // Calcular total
  this.total = this.items.reduce((sum: number, item: ISaleItem) => sum + item.subtotal, 0);
  
  // Calcular total final
  this.finalTotal = this.total + this.tax - this.discount;
  
  next();
});

export default mongoose.model<ISale>('Sale', SaleSchema);
