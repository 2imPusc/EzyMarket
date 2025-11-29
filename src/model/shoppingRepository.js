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
  unit: {
    type: String,
    default: '',
  },
  isPurchased: {
    type: Boolean,
    default: false,
  },
});

const shoppingListSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
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
