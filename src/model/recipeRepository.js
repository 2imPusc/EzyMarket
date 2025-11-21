import mongoose from 'mongoose';

const recipeIngredientSchema = new mongoose.Schema({
  ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: false },
  name: { type: String, required: false, trim: true }, // Snapshot canonical name
  quantity: { type: Number, required: false, min: 0 },
  unit: { type: String, required: false, trim: true }, // Human readable input
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: false },
  unitAbbreviation: { type: String, required: false, trim: true }, // Snapshot abbreviation
  note: { type: String, required: false, trim: true },
  optional: { type: Boolean, default: false },
}, { _id: true }); // Keep _id for subdocs to easy update

const recipeSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    imageUrl: { type: String, default: null },
    prepTime: { type: Number, default: 0, min: 0 }, // minutes
    cookTime: { type: Number, default: 0, min: 0 }, // minutes
    servings: { type: Number, default: 1, min: 1 },
    directions: [{ type: String, trim: true }],
    ingredients: [recipeIngredientSchema],
    tag: { type: String, default: 'other', index: true, lowercase: true, trim: true },
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

const Recipe = mongoose.model('Recipe', recipeSchema);
export default Recipe;