import mongoose from 'mongoose';
const { Schema } = mongoose;

const fridgeItemSchema = new Schema({
  // owner: user or group (at least one is required)
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

  // NEW: item type (ingredient or recipe)
  itemType: {
    type: String,
    enum: ['ingredient', 'recipe'],
    required: true,
    default: 'ingredient',
    index: true,
  },

  // Ingredient link
  foodId: {
    type: Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: function () {
      return this.itemType === 'ingredient';
    },
    default: null,
  },
  // Recipe link (for cooked dishes stored in the fridge)
  recipeId: {
    type: Schema.Types.ObjectId,
    ref: 'Recipe',
    required: function () {
      return this.itemType === 'recipe';
    },
    default: null,
  },

  // Unit is required for ingredients, not required for recipe servings
  unitId: {
    type: Schema.Types.ObjectId,
    ref: 'Unit',
    required: function () {
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
    enum: ['in-stock', 'used', 'expired', 'discarded'],
    default: 'in-stock',
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },

  // NEW: trace cooked dish origin
  cookedFrom: {
    recipeId: { type: Schema.Types.ObjectId, ref: 'Recipe', default: null },
    cookedAt: { type: Date, default: null },
  },
}, {
  timestamps: true,
});

// Validator: must have at least userId or groupId, and correct refs per type
fridgeItemSchema.pre('validate', function (next) {
  if (!this.userId && !this.groupId) {
    return next(new Error('Either userId or groupId is required for a fridge item'));
  }
  if (this.itemType === 'ingredient') {
    if (!this.foodId) return next(new Error('foodId is required for ingredient item'));
    if (!this.unitId) return next(new Error('unitId is required for ingredient item'));
  }
  if (this.itemType === 'recipe') {
    if (!this.recipeId) return next(new Error('recipeId is required for recipe item'));
    // unitId may be null for servings
  }
  next();
});

// Static helpers thuận tiện cho service layer
fridgeItemSchema.statics.createItem = function (data) {
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