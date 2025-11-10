import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string; // NIT o RUT
  categories: string[]; // Categorías de productos que suministra
  paymentTerms?: string; // Términos de pago (ej: "30 días", "Contado")
  website?: string;
  notes?: string;
  isActive: boolean;
  rating?: number; // Calificación del proveedor (1-5)
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del proveedor es requerido'],
      trim: true,
      maxlength: [200, 'El nombre no puede exceder 200 caracteres']
    },
    contactName: {
      type: String,
      required: [true, 'El nombre del contacto es requerido'],
      trim: true,
      maxlength: [150, 'El nombre del contacto no puede exceder 150 caracteres']
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido']
    },
    phone: {
      type: String,
      required: [true, 'El teléfono es requerido'],
      trim: true
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'La dirección no puede exceder 300 caracteres']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'La ciudad no puede exceder 100 caracteres']
    },
    country: {
      type: String,
      trim: true,
      default: 'Colombia',
      maxlength: [100, 'El país no puede exceder 100 caracteres']
    },
    taxId: {
      type: String,
      trim: true,
      sparse: true, // Permite múltiples valores null
      maxlength: [50, 'El NIT/RUT no puede exceder 50 caracteres']
    },
    categories: [{
      type: String,
      trim: true
    }],
    paymentTerms: {
      type: String,
      trim: true,
      default: 'Contado',
      maxlength: [200, 'Los términos de pago no pueden exceder 200 caracteres']
    },
    website: {
      type: String,
      trim: true,
      maxlength: [200, 'El sitio web no puede exceder 200 caracteres']
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Las notas no pueden exceder 1000 caracteres']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    rating: {
      type: Number,
      min: [1, 'La calificación mínima es 1'],
      max: [5, 'La calificación máxima es 5'],
      default: null
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

// Índices
SupplierSchema.index({ name: 1 });
SupplierSchema.index({ email: 1 });
SupplierSchema.index({ isActive: 1 });
SupplierSchema.index({ categories: 1 });
SupplierSchema.index({ name: 'text', contactName: 'text' }); // Búsqueda de texto

export default mongoose.model<ISupplier>('Supplier', SupplierSchema);
