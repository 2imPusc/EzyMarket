import mongoose from 'mongoose';

export const DEFAULT_EXPIRE_DAYS = {
  vegetables: 5,      // Rau củ
  fruits: 7,          // Trái cây
  meat: 3,            // Thịt
  seafood: 2,         // Hải sản
  dairy: 5,           // Sữa và chế phẩm
  grains: 180,        // Ngũ cốc
  spices: 365,        // Gia vị
  beverages: 30,      // Đồ uống
  condiments: 180,    // Gia vị/Nước chấm
  frozen: 180,        // Đồ đông lạnh
  canned: 365,        // Đồ hộp
  bakery: 3,          // Bánh mì/Bánh ngọt
  snacks: 90,         // Đồ ăn vặt
  other: 7,
};

export const INGREDIENT_CATEGORIES = Object.keys(DEFAULT_EXPIRE_DAYS);

const ingredientSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    // unique: true,
    // index: true, 
  },
  imageURL: {
    type: String,
    default: null, 
  },
  foodCategory: {
    type: String,
    required: true,
    enum: INGREDIENT_CATEGORIES,
    default: 'other',
  },
  defaultExpireDays: {
    type: Number,
    required: true,
    min: 1,
    default: function () {
      return DEFAULT_EXPIRE_DAYS[this.foodCategory] ?? 7;
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,  // Tự động quản lý createdAt/updatedAt
});

// Index để search nhanh hơn
ingredientSchema.index({ name: 1, creatorId: 1 }, { unique: true });

// Middleware: Update updatedAt trước khi save
ingredientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Ingredient', ingredientSchema);