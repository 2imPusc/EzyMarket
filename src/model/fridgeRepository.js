import mongoose from 'mongoose';
const { Schema } = mongoose;

const fridgeSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    default: 'My Fridge',
  },
  owner: { // TRƯỜNG QUAN TRỌNG NHẤT
    type: Schema.Types.ObjectId,
    ref: 'User', 
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model('Fridge', fridgeSchema);