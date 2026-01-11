import mongoose, { Schema, Document } from 'mongoose';

export enum TransferStatus {
  PENDING = 'pending',       // Creada, pendiente de envío
  IN_TRANSIT = 'in_transit', // En camino
  RECEIVED = 'received',     // Recibida en tienda destino
  CANCELLED = 'cancelled'    // Cancelada
}

export interface ITransferItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  receivedQuantity?: number; // Cantidad realmente recibida
  notes?: string;
}

export interface ITransfer extends Document {
  transferNumber: string;
  fromStore: mongoose.Types.ObjectId;
  toStore: mongoose.Types.ObjectId;
  items: ITransferItem[];
  status: TransferStatus;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  sentAt?: Date;
  sentBy?: mongoose.Types.ObjectId;
  receivedAt?: Date;
  receivedBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransferItemSchema = new Schema<ITransferItem>({
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
  receivedQuantity: {
    type: Number,
    min: 0
  },
  notes: String
});

const TransferSchema = new Schema<ITransfer>({
  transferNumber: {
    type: String,
    required: true,
    unique: true
  },
  fromStore: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  toStore: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  items: {
    type: [TransferItemSchema],
    required: true,
    validate: {
      validator: function(items: ITransferItem[]) {
        return items.length > 0;
      },
      message: 'La transferencia debe tener al menos un producto'
    }
  },
  status: {
    type: String,
    enum: Object.values(TransferStatus),
    default: TransferStatus.PENDING
  },
  notes: String,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sentAt: Date,
  sentBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedAt: Date,
  receivedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: String
}, {
  timestamps: true
});

// Índices para búsquedas
TransferSchema.index({ fromStore: 1, status: 1 });
TransferSchema.index({ toStore: 1, status: 1 });
TransferSchema.index({ transferNumber: 1 });
TransferSchema.index({ createdAt: -1 });

// Generar número de transferencia antes de guardar
TransferSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Transfer').countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    this.transferNumber = `TR${year}${month}-${(count + 1).toString().padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model<ITransfer>('Transfer', TransferSchema);
