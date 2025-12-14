import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now },
  email: { type: String, required: true, unique: true },
  emailVerified: { type: Boolean, default: false },

  // CHANGED: mỗi user chỉ có 1 group (nullable)
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null, index: true },

  // Fields for OTP verification
  lastOTPSentAt: { type: Date },
  otp: { type: String },
  otpAttempts: { type: Number, default: 0 },
  otpExpires: { type: Date },
  otpVerifyAttempts: { type: Number, default: 0 },

  // Reset password OTP fields
  resetPasswordOTP: { type: String },
  resetPasswordOTPExpires: { type: Date },
  resetPasswordAttempts: { type: Number, default: 0 },
  resetPasswordOTPVerifyAttempts: { type: Number, default: 0 },
  lastResetPasswordOTPSentAt: { type: Date },

  // Authentication fields
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  refreshToken: { type: String },
  updatedAt: { type: Date, default: Date.now },
  userName: { type: String },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.matchPassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

export default mongoose.model('User', userSchema);
