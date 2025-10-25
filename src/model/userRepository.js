import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  avatar: { type: String },
  emailVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  email: { type: String, required: true, unique: true },
  groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
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
