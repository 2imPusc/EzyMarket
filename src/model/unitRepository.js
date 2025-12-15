import mongoose from 'mongoose';

const unitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 1,
    maxlength: 50,
    index: true,
  },
  abbreviation: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 20,
  },
  type: {
    type: String,
    required: true,
    enum: ['weight', 'volume', 'count', 'length', 'area', 'other'],
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

unitSchema.index({ type: 1, name: 1 });

unitSchema.index({ name: 'text', abbreviation: 'text' });

unitSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Unit', unitSchema);
