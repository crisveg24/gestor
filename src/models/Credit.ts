import mongoose, { Document, Schema } from 'mongoose';

// Tipos de crédito
export enum CreditType {
  FIADO = 'fiado',      // Producto llevado sin pagar
  APARTADO = 'apartado' // Producto reservado con pago parcial
}

export enum CreditStatus {
  PENDING = 'pending',       // Pendiente de pago
  PARTIAL = 'partial',       // Pago parcial (solo apartados)
  COMPLETED = 'completed',   // Pagado completamente
  CANCELLED = 'cancelled',   // Cancelado
  OVERDUE = 'overdue'        // Vencido (más de X días sin pago)
}

// Interface para pagos parciales
export interface ICreditPayment {
  amount: number;
  paymentMethod: string;
  date: Date;
  receivedBy: mongoose.Types.ObjectId;
  notes?: string;
}

// Interface para items del crédito
export interface ICreditItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ICredit extends Document {
  type: CreditType;
  status: CreditStatus;
  store: mongoose.Types.ObjectId;
  
  // Información del cliente
  customerName: string;
  customerPhone?: string;
  customerDocument?: string; // Cédula o documento
  customerAddress?: string;
  
  // Items
  items: ICreditItem[];
  
  // Montos
  totalAmount: number;       // Total a pagar
  paidAmount: number;        // Total pagado
  remainingAmount: number;   // Pendiente por pagar
  
  // Pagos
  payments: ICreditPayment[];
  
  // Fechas
  dueDate?: Date;            // Fecha límite de pago
  completedDate?: Date;      // Fecha en que se completó el pago
  
  // Tracking
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const CreditPaymentSchema = new Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['efectivo', 'nequi', 'daviplata', 'llave_bancolombia', 'tarjeta', 'transferencia']
  },
  date: {
    type: Date,
    default: Date.now
  },
  receivedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String
}, { _id: true });

const CreditItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const CreditSchema = new Schema<ICredit>({
  type: {
    type: String,
    enum: Object.values(CreditType),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(CreditStatus),
    default: CreditStatus.PENDING
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  
  // Cliente
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  customerDocument: {
    type: String,
    trim: true
  },
  customerAddress: {
    type: String,
    trim: true
  },
  
  // Items y montos
  items: [CreditItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Pagos
  payments: [CreditPaymentSchema],
  
  // Fechas
  dueDate: Date,
  completedDate: Date,
  
  // Tracking
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, {
  timestamps: true
});

// Índices para búsquedas frecuentes
CreditSchema.index({ store: 1, status: 1 });
CreditSchema.index({ store: 1, type: 1 });
CreditSchema.index({ customerName: 'text', customerPhone: 1 });
CreditSchema.index({ createdAt: -1 });
CreditSchema.index({ dueDate: 1, status: 1 });

// Método para calcular remaining
CreditSchema.pre('save', function(next) {
  this.remainingAmount = this.totalAmount - this.paidAmount;
  
  // Actualizar status basado en pagos
  if (this.remainingAmount <= 0) {
    this.status = CreditStatus.COMPLETED;
    if (!this.completedDate) {
      this.completedDate = new Date();
    }
  } else if (this.paidAmount > 0) {
    this.status = CreditStatus.PARTIAL;
  }
  
  next();
});

export default mongoose.model<ICredit>('Credit', CreditSchema);
