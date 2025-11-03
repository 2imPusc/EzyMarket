import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
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
    min: 1,  // Ít nhất 1 ngày
    default: 7,  // Mặc định 7 ngày
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
ingredientSchema.index({ name: 'text', foodCategory: 1 });

// Middleware: Update updatedAt trước khi save
ingredientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Ingredient', ingredientSchema);