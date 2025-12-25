import mongoose from 'mongoose';

const recipeIngredientSchema = new mongoose.Schema({
  ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: false },
  name: { type: String, required: true, trim: true }, // Snapshot canonical name
  quantity: { type: Number, required: true, min: 0 },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: false }, // Để liên kết & tính toán
  unitText: { type: String, required: true, trim: true }, // Để hiển thị chính xác (vd: "muỗng cà phê", "củ")
  note: { type: String, required: false, trim: true },
  optional: { type: Boolean, default: false },
}, { _id: false }); // _id không cần thiết cho sub-document này, giúp tiết kiệm dung lượng

const recipeSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',  
      default: null, 
      index: true
    },
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    imageUrl: { type: String, default: null },
    prepTime: { type: Number, default: 0, min: 0 },
    cookTime: { type: Number, default: 0, min: 0 },
    servings: { type: Number, default: 1, min: 1 },
    directions: [{ type: String, trim: true }],
    ingredients: [recipeIngredientSchema],
    tags: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tag', 
    }],
  },
  {
    timestamps: true,
  }
);

// Text index: title (weight 10), description (weight 5), ingredient names (weight 5)
recipeSchema.index(
  { title: 'text', description: 'text', 'ingredients.name': 'text' },
  { weights: { title: 10, description: 5, 'ingredients.name': 5 } }
);

// Optimize queries filtering by tagId
recipeSchema.index({ tags: 1 });

const Recipe = mongoose.model('Recipe', recipeSchema);
export default Recipe;