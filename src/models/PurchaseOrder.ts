import mongoose, { Document, Schema } from 'mongoose';

export enum PurchaseOrderStatus {
  PENDING = 'pending',      // Pendiente de recibir
  RECEIVED = 'received',    // Recibida completamente
  PARTIAL = 'partial',      // Recibida parcialmente
  CANCELLED = 'cancelled'   // Cancelada
}

export interface IPurchaseOrderItem {
  product: mongoose.Types.ObjectId;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  subtotal: number;
}

export interface IPurchaseOrder extends Document {
  orderNumber: string;
  supplier: mongoose.Types.ObjectId;
  store: mongoose.Types.ObjectId;
  items: IPurchaseOrderItem[];
  totalCost: number;
  tax: number;
  shippingCost: number;
  finalTotal: number;
  status: PurchaseOrderStatus;
  expectedDeliveryDate?: Date;
  receivedDate?: Date;
  notes?: string;
  invoiceNumber?: string;
  paymentStatus: 'pending' | 'partial' | 'paid';
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  receivedBy?: mongoose.Types.ObjectId;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderSchema: Schema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'El proveedor es requerido']
    },
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
      quantityOrdered: {
        type: Number,
        required: true,
        min: [1, 'La cantidad ordenada debe ser al menos 1']
      },
      quantityReceived: {
        type: Number,
        default: 0,
        min: [0, 'La cantidad recibida no puede ser negativa']
      },
      unitCost: {
        type: Number,
        required: true,
        min: [0, 'El costo unitario no puede ser negativo']
      },
      subtotal: {
        type: Number,
        required: true,
        min: [0, 'El subtotal no puede ser negativo']
      }
    }],
    totalCost: {
      type: Number,
      required: true,
      min: [0, 'El costo total no puede ser negativo']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'El impuesto no puede ser negativo']
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: [0, 'El costo de envío no puede ser negativo']
    },
    finalTotal: {
      type: Number,
      required: true,
      min: [0, 'El total final no puede ser negativo']
    },
    status: {
      type: String,
      enum: Object.values(PurchaseOrderStatus),
      default: PurchaseOrderStatus.PENDING
    },
    expectedDeliveryDate: {
      type: Date
    },
    receivedDate: {
      type: Date
    },
    notes: {
      type: String,
      maxlength: [1000, 'Las notas no pueden exceder 1000 caracteres']
    },
    invoiceNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'El número de factura no puede exceder 100 caracteres']
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending'
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
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
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
PurchaseOrderSchema.index({ orderNumber: 1 });
PurchaseOrderSchema.index({ supplier: 1, createdAt: -1 });
PurchaseOrderSchema.index({ store: 1, createdAt: -1 });
PurchaseOrderSchema.index({ status: 1 });
PurchaseOrderSchema.index({ expectedDeliveryDate: 1 });
PurchaseOrderSchema.index({ createdAt: -1 });

// Generar número de orden antes de guardar
PurchaseOrderSchema.pre<IPurchaseOrder>('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const count = await mongoose.model('PurchaseOrder').countDocuments();
    const year = new Date().getFullYear();
    this.orderNumber = `PO-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  
  // Calcular subtotales de items
  this.items.forEach((item: IPurchaseOrderItem) => {
    item.subtotal = item.quantityOrdered * item.unitCost;
  });
  
  // Calcular total
  this.totalCost = this.items.reduce((sum: number, item: IPurchaseOrderItem) => sum + item.subtotal, 0);
  
  // Calcular total final
  this.finalTotal = this.totalCost + this.tax + this.shippingCost;
  
  next();
});

export default mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
