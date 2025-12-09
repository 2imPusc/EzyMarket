import mongoose from 'mongoose';
const { Schema } = mongoose;

const fridgeItemSchema = new Schema({
  // owner: có thể là user hoặc group (ít nhất 1 trong 2 phải có)
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null,
  },
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    index: true,
    default: null,
  },

  // Liên kết đến model Ingredient
  foodId: {
    type: Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true,
  },
  // Liên kết đến model Unit
  unitId: {
    type: Schema.Types.ObjectId,
    ref: 'Unit',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
    required: true,
    index: true,
  },
  price: {
    type: Number,
    min: 0,
    default: 0,
  },
  status: {
    type: String,
    enum: ['in-stock', 'used', 'expired', 'discarded'],
    default: 'in-stock',
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Validator: bắt buộc có ít nhất userId hoặc groupId
fridgeItemSchema.pre('validate', function(next) {
  if (!this.userId && !this.groupId) {
    return next(new Error('Either userId or groupId is required for a fridge item'));
  }
  next();
});

// Static helpers thuận tiện cho service layer
fridgeItemSchema.statics.createItem = function(data) {
  return this.create(data);
};

fridgeItemSchema.statics.findByOwner = function({ userId = null, groupId = null }, options = {}) {
  const query = groupId ? { groupId } : { userId };
  const q = this.find(query);
  if (options.populate) q.populate(options.populate);
  if (options.sort) q.sort(options.sort);
  if (options.limit) q.limit(Number(options.limit));
  if (options.skip) q.skip(Number(options.skip));
  return q.exec();
};

fridgeItemSchema.statics.findByIdItem = function(id) {
  return this.findById(id).exec();
};

fridgeItemSchema.statics.updateItem = function(id, update) {
  return this.findByIdAndUpdate(id, update, { new: true }).exec();
};

fridgeItemSchema.statics.deleteItem = function(id) {
  return this.findByIdAndDelete(id).exec();
};

export default mongoose.model('FridgeItem', fridgeItemSchema);