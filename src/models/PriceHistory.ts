import mongoose, { Document, Schema } from 'mongoose';

export interface IPriceHistory extends Document {
  product: mongoose.Types.ObjectId;
  oldPrice: number;
  newPrice: number;
  oldCost?: number;
  newCost?: number;
  changeType: 'increase' | 'decrease' | 'no_change';
  percentageChange: number;
  changedBy: mongoose.Types.ObjectId;
  reason?: string;
  createdAt: Date;
}

const PriceHistorySchema: Schema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    oldPrice: {
      type: Number,
      required: true
    },
    newPrice: {
      type: Number,
      required: true
    },
    oldCost: {
      type: Number
    },
    newCost: {
      type: Number
    },
    changeType: {
      type: String,
      enum: ['increase', 'decrease', 'no_change'],
      required: true
    },
    percentageChange: {
      type: Number,
      required: true
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      maxlength: 500
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Índices
PriceHistorySchema.index({ product: 1, createdAt: -1 });
PriceHistorySchema.index({ createdAt: -1 });
PriceHistorySchema.index({ changedBy: 1 });

export default mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema);
