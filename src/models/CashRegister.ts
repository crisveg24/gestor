import mongoose, { Document, Schema } from 'mongoose';

export enum CashRegisterStatus {
  OPEN = 'open',
  CLOSED = 'closed'
}

export interface ICashMovement {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  paymentMethod?: string;
  reference?: string; // ID de venta, crédito, etc.
  createdAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

export interface ICashRegister extends Document {
  store: mongoose.Types.ObjectId;
  date: Date;
  status: CashRegisterStatus;
  
  // Apertura
  openingAmount: number;
  openedAt: Date;
  openedBy: mongoose.Types.ObjectId;
  
  // Movimientos del día
  movements: ICashMovement[];
  
  // Cierre
  expectedClosingAmount?: number; // Calculado: apertura + ventas efectivo - egresos
  actualClosingAmount?: number;   // Lo que realmente hay en caja
  difference?: number;            // Diferencia (sobrante/faltante)
  closingNotes?: string;
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  
  // Resumen de ventas por método de pago
  salesByMethod?: {
    efectivo: number;
    nequi: number;
    daviplata: number;
    llave_bancolombia: number;
    tarjeta: number;
    transferencia: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const CashMovementSchema = new Schema<ICashMovement>({
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  paymentMethod: String,
  reference: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const CashRegisterSchema = new Schema<ICashRegister>({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(CashRegisterStatus),
    default: CashRegisterStatus.OPEN
  },
  
  // Apertura
  openingAmount: {
    type: Number,
    required: true,
    min: 0
  },
  openedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  openedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Movimientos
  movements: [CashMovementSchema],
  
  // Cierre
  expectedClosingAmount: Number,
  actualClosingAmount: Number,
  difference: Number,
  closingNotes: String,
  closedAt: Date,
  closedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Resumen por método
  salesByMethod: {
    efectivo: { type: Number, default: 0 },
    nequi: { type: Number, default: 0 },
    daviplata: { type: Number, default: 0 },
    llave_bancolombia: { type: Number, default: 0 },
    tarjeta: { type: Number, default: 0 },
    transferencia: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Índices
CashRegisterSchema.index({ store: 1, date: -1 });
CashRegisterSchema.index({ store: 1, status: 1 });
CashRegisterSchema.index({ openedBy: 1 });
CashRegisterSchema.index({ closedBy: 1 });

// Solo puede haber una caja abierta por tienda
CashRegisterSchema.index(
  { store: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'open' }
  }
);

export default mongoose.model<ICashRegister>('CashRegister', CashRegisterSchema);
