import mongoose from 'mongoose';

const shoppingItemSchema = new mongoose.Schema({
  ingredientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
    default: null,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
  },
  isPurchased: {
    type: Boolean,
    default: false,
  },
  price: {
    type: Number,
    default: null,
  },
  servingQuantity: {
    type: Number,
    default: null,
  },
  expiryDate: {
    type: Date,
    default: null,
  },
});

const shoppingListSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
    },
    items: [shoppingItemSchema],
  },
  { timestamps: true }
);

export default mongoose.model('ShoppingList', shoppingListSchema);
