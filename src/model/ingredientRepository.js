import mongoose from 'mongoose';

export const DEFAULT_EXPIRE_DAYS = {
  vegetables: 5,
  fruits: 7,
  meat: 3,
  seafood: 2,
  dairy: 5,
  grains: 180,
  spices: 365,
  beverages: 30,
  condiments: 180,
  frozen: 180,
  canned: 365,
  bakery: 3,
  snacks: 90,
  other: 7,
};

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
    unique: true,
    trim: true,
    index: true, 
  },
  imageURL: {
    type: String,
    default: null, 
  },
  foodCategory: {
    type: String,
    required: true,
    enum: [
      'vegetables',      // Rau củ
      'fruits',          // Trái cây
      'meat',            // Thịt
      'seafood',         // Hải sản
      'dairy',           // Sữa và chế phẩm
      'grains',          // Ngũ cốc
      'spices',          // Gia vị
      'beverages',       // Đồ uống
      'condiments',      // Gia vị/Nước chấm
      'frozen',          // Đồ đông lạnh
      'canned',          // Đồ hộp
      'bakery',          // Bánh mì/Bánh ngọt
      'snacks',          // Đồ ăn vặt
      'other',           // Khác
    ],
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