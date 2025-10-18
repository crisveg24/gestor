import mongoose, { Document, Schema } from 'mongoose';

export interface IStore extends Document {
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la tienda es requerido'],
      unique: true,
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    address: {
      type: String,
      required: [true, 'La dirección es requerida'],
      trim: true,
      maxlength: [200, 'La dirección no puede exceder 200 caracteres']
    },
    phone: {
      type: String,
      required: [true, 'El teléfono es requerido'],
      trim: true,
      match: [/^[0-9\-\+\(\)\s]+$/, 'Por favor ingrese un número de teléfono válido']
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido']
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

// Índices para mejorar el rendimiento
StoreSchema.index({ name: 1 });
StoreSchema.index({ isActive: 1 });

export default mongoose.model<IStore>('Store', StoreSchema);
