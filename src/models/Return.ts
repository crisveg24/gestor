import mongoose, { Document, Schema, Types } from 'mongoose';

export type ReturnStatus = 'pending' | 'approved' | 'completed' | 'rejected';
export type ReturnType = 'refund' | 'exchange' | 'store_credit';

export interface IReturnItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
  reason: string;
}

export interface IExchangeItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
}

export interface IReturn extends Document {
  returnNumber: string;
  originalSale: Types.ObjectId;
  store: Types.ObjectId;
  customer?: {
    name: string;
    phone?: string;
  };
  items: IReturnItem[];
  exchangeItems?: IExchangeItem[];
  returnType: ReturnType;
  status: ReturnStatus;
  totalRefund: number;
  priceDifference: number; // Diferencia a favor/en contra del cliente en cambios
  reason: string;
  notes?: string;
  processedBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const returnItemSchema = new Schema<IReturnItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true },
});

const exchangeItemSchema = new Schema<IExchangeItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
});

const returnSchema = new Schema<IReturn>(
  {
    returnNumber: {
      type: String,
      required: true,
      unique: true,
    },
    originalSale: {
      type: Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    customer: {
      name: { type: String },
      phone: { type: String },
    },
    items: {
      type: [returnItemSchema],
      required: true,
      validate: [(val: IReturnItem[]) => val.length > 0, 'Debe incluir al menos un producto'],
    },
    exchangeItems: {
      type: [exchangeItemSchema],
      default: [],
    },
    returnType: {
      type: String,
      enum: ['refund', 'exchange', 'store_credit'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'completed', 'rejected'],
      default: 'pending',
    },
    totalRefund: {
      type: Number,
      required: true,
      min: 0,
    },
    priceDifference: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
returnSchema.index({ store: 1, status: 1 });
returnSchema.index({ originalSale: 1 });
returnSchema.index({ returnNumber: 1 });
returnSchema.index({ createdAt: -1 });

// Generar número de devolución automáticamente
returnSchema.pre('save', async function (next) {
  if (!this.returnNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Contar devoluciones del día
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    const count = await mongoose.model('Return').countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });
    
    const sequence = (count + 1).toString().padStart(3, '0');
    this.returnNumber = `DEV-${year}${month}${day}-${sequence}`;
  }
  next();
});

const Return = mongoose.model<IReturn>('Return', returnSchema);

export default Return;
