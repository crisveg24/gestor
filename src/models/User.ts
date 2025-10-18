import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export interface IPermissions {
  canAddInventory: boolean;
  canRemoveInventory: boolean;
  canViewInventory: boolean;
  canAddSale: boolean;
  canViewSales: boolean;
  canViewReports: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  store?: mongoose.Types.ObjectId;
  permissions: IPermissions;
  isActive: boolean;
  loginAttempts: number;
  lockUntil?: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
  incLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido']
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
      select: false
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: function(this: IUser) {
        return this.role === UserRole.USER;
      }
    },
    permissions: {
      canAddInventory: { type: Boolean, default: false },
      canRemoveInventory: { type: Boolean, default: true },
      canViewInventory: { type: Boolean, default: true },
      canAddSale: { type: Boolean, default: true },
      canViewSales: { type: Boolean, default: true },
      canViewReports: { type: Boolean, default: false }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

// Índices
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ store: 1 });
UserSchema.index({ isActive: 1 });

// Hash password antes de guardar
UserSchema.pre<IUser>('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    this.password = await bcrypt.hash(this.password, rounds);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Comparar contraseñas
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Verificar si la cuenta está bloqueada
UserSchema.methods.isLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Incrementar intentos de login
UserSchema.methods.incLoginAttempts = async function(): Promise<void> {
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
  const lockTime = parseInt(process.env.LOCK_TIME || '15') * 60 * 1000; // minutos a ms
  
  // Si hay lock y ya expiró, resetear
  if (this.lockUntil && this.lockUntil < Date.now()) {
    await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
    return;
  }
  
  // Incrementar intentos
  const updates: any = { $inc: { loginAttempts: 1 } };
  
  // Bloquear cuenta si se alcanza el límite
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  await this.updateOne(updates);
};

// Resetear intentos de login
UserSchema.methods.resetLoginAttempts = async function(): Promise<void> {
  await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

export default mongoose.model<IUser>('User', UserSchema);
