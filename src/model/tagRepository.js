import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null cho tag hệ thống
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
}, { timestamps: true });

// Một tag phải là duy nhất cho mỗi người tạo (hoặc hệ thống)
tagSchema.index({ name: 1, creatorId: 1 }, { unique: true });

const Tag = mongoose.model('Tag', tagSchema);
export default Tag;