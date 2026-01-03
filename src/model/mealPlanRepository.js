import mongoose from 'mongoose';

/**
 * Status flow:
 * planned → cooked → eaten (for recipes that need cooking)
 * planned → eaten (for ingredients/ready-to-eat items)
 * planned → consumed (auto-reconciled at end of day)
 * planned → skipped (not available in fridge at reconcile time)
 */
const MEAL_ITEM_STATUS = ['planned', 'cooked', 'eaten', 'consumed', 'skipped'];

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

    // ====== NEW FIELDS ======
    // Status tracking cho workflow mới
    status: {
      type: String,
      enum: MEAL_ITEM_STATUS,
      default: 'planned',
    },

    // Link đến món đã nấu trong fridge (sau khi cook recipe)
    cookedFridgeItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FridgeItem',
    },

    // Timestamps cho tracking
    cookedAt: { type: Date },
    eatenAt: { type: Date },
    consumedAt: { type: Date },

    // ====== EXISTING FIELDS ======
    isEaten: { type: Boolean, default: false }, // Backward compatibility
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

// Sync isEaten với status để backward compatibility
mealItemSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.isEaten = ['eaten', 'consumed'].includes(this.status);
  }
  if (this.isModified('isEaten') && !this.isModified('status')) {
    // Legacy update via isEaten
    if (this.isEaten && this.status === 'planned') {
      this.status = 'eaten';
      this.eatenAt = new Date();
    }
  }
  next();
});

const mealSectionSchema = new mongoose.Schema(
  {
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack', 'snacks'],
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
      totalPlanned: { type: Number, default: 0 },
      totalCooked: { type: Number, default: 0 },
      totalEaten: { type: Number, default: 0 },
      isFullyCompleted: { type: Boolean, default: false },
    },
    // Track if this plan has been reconciled
    isReconciled: { type: Boolean, default: false },
    reconciledAt: { type: Date },
  },
  { timestamps: true }
);

mealPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

mealPlanSchema.pre('save', function (next) {
  if (this.meals.length === 0) {
    const types = ['breakfast', 'lunch', 'dinner', 'snacks'];
    this.meals = types.map((type) => ({ mealType: type, items: [] }));
  }

  // Update summary counts
  let totalPlanned = 0, totalCooked = 0, totalEaten = 0;
  for (const meal of this.meals) {
    for (const item of meal.items) {
      if (item.status === 'planned') totalPlanned++;
      if (item.status === 'cooked') totalCooked++;
      if (['eaten', 'consumed'].includes(item.status)) totalEaten++;
    }
  }
  this.summary.totalPlanned = totalPlanned;
  this.summary.totalCooked = totalCooked;
  this.summary.totalEaten = totalEaten;
  this.summary.isFullyCompleted = totalPlanned === 0 && totalCooked === 0;

  next();
});

const MealPlan = mongoose.model('MealPlan', mealPlanSchema);
export default MealPlan;
