import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  avartar: { type: String },
  createdAt: { type: Date, default: Date.now },
  email: { type: String, required: true, unique: true },
  groupIds: [{ type: mongoose.Schema.Types.Array, ref: 'Group' }],
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String, unique: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  refreshToken: { type: String },
  updatedAt: { type: Date, default: Date.now },
  userName: { type: String, required: true },
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
