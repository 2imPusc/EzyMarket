import mongoose from 'mongoose';
const { Schema } = mongoose;

const fridgeItemSchema = new Schema({
  fridgeId: { // ID của tủ lạnh mà item này thuộc về
    type: Schema.Types.ObjectId,
    ref: 'Fridge', // Giả định bạn có một model 'Fridge'
    required: true,
    index: true,
  },
  foodId: { // Liên kết đến model Ingredient
    type: Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true,
  },
  unitId: { // Liên kết đến model Unit
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
    index: true, // Index để query nhanh khi check hạn sử dụng
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
  addedAt: { // Ghi lại thời điểm thêm vào DB, khác với purchaseDate
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true, // Tự động quản lý createdAt và updatedAt
});

export default mongoose.model('FridgeItem', fridgeItemSchema);