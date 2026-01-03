import mongoose from 'mongoose';
const { Schema } = mongoose;

const fridgeItemSchema = new Schema({
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

  // 🔥 THÊM: Loại item (ingredient hoặc recipe)
  itemType: {
    type: String,
    enum: ['ingredient', 'recipe'],
    default: 'ingredient',
    required: true,
  },

  // Cho ingredient
  foodId: {
    type: Schema.Types.ObjectId,
    ref: 'Ingredient',
    default: null,
  },

  // 🔥 THÊM: Cho recipe (món đã nấu)
  recipeId: {
    type: Schema.Types.ObjectId,
    ref: 'Recipe',
    default: null,
  },

  unitId: {
    type: Schema.Types.ObjectId,
    ref: 'Unit',
    required: function() {
      // 🔥 Chỉ bắt buộc unitId cho ingredient, không bắt buộc cho recipe
      return this.itemType === 'ingredient';
    },
    default: null,
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
    enum: ['in-stock', 'consumed', 'expired', 'discarded'],
    default: 'in-stock',
  },

  // 🔥 THÊM: Ghi lại nguồn gốc (nấu từ recipe nào, khi nào)
  cookedFrom: {
    recipeId: { type: Schema.Types.ObjectId, ref: 'Recipe', default: null },
    cookedAt: { type: Date, default: null },
  },

  addedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Cập nhật validator
fridgeItemSchema.pre('validate', function(next) {
  if (!this.userId && !this.groupId) {
    return next(new Error('Either userId or groupId is required'));
  }
  if (this.itemType === 'ingredient' && !this.foodId) {
    return next(new Error('foodId is required for ingredient type'));
  }
  if (this.itemType === 'recipe' && !this.recipeId) {
    return next(new Error('recipeId is required for recipe type'));
  }
  // 🔥 Bỏ validate unitId cho recipe
  if (this.itemType === 'ingredient' && !this.unitId) {
    return next(new Error('unitId is required for ingredient type'));
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