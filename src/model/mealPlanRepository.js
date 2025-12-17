import mongoose from 'mongoose';

const mealItemSchema = new mongoose.Schema(
  {
    // Phân loại rõ ràng
    itemType: {
      type: String,
      enum: ['recipe', 'ingredient'],
      required: true,
    },

    // Reference IDs
    recipeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipe',
    },
    ingredientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
    },

    // Số lượng & Đơn vị
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    // Nếu là Ingredient thì BẮT BUỘC phải có unitId để biết ăn bao nhiêu (gram, quả...)
    // Nếu là Recipe thì quantity hiểu là "số suất" (servings), unitId có thể null
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
    },

    isEaten: { type: Boolean, default: false },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

// Validate: Phải có 1 trong 2 ID
mealItemSchema.pre('validate', function (next) {
  if (this.itemType === 'recipe' && !this.recipeId) {
    next(new Error('recipeId is required when itemType is recipe'));
  } else if (this.itemType === 'ingredient' && (!this.ingredientId || !this.unitId)) {
    // Ingredient bắt buộc cần Unit để tính toán shopping list sau này
    next(new Error('ingredientId and unitId are required when itemType is ingredient'));
  } else {
    next();
  }
});

const mealSectionSchema = new mongoose.Schema(
  {
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      required: true,
    },
    items: [mealItemSchema],
  },
  { _id: false }
);

const mealPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: { type: Date, required: true },
    meals: {
      type: [mealSectionSchema],
      default: [],
    },
    summary: {
      totalCalories: { type: Number, default: 0 },
      isFullyCompleted: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

mealPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

mealPlanSchema.pre('save', function (next) {
  if (this.meals.length === 0) {
    const types = ['breakfast', 'lunch', 'dinner', 'snack'];
    this.meals = types.map((type) => ({ mealType: type, items: [] }));
  }
  next();
});

const MealPlan = mongoose.model('MealPlan', mealPlanSchema);
export default MealPlan;
