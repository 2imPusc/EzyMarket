import mongoose from 'mongoose';

const recipeIngredientSchema = new mongoose.Schema({
  ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: false },
  name: { type: String, required: true }, // snapshot canonical name
  quantity: { type: Number, required: false },
  unit: { type: String, required: false }, // human readable
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: false }, // optional ref
  unitAbbreviation: { type: String, required: false }, // snapshot
  note: { type: String, required: false },
  optional: { type: Boolean, default: false },
});

const recipeSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String },
    imageUrl: { type: String, default: null },
    prepTime: { type: Number, default: 0 }, // minutes
    cookTime: { type: Number, default: 0 }, // minutes
    servings: { type: Number, default: 1 },
    directions: [{ type: String }],
    ingredients: [recipeIngredientSchema],
    tag: { type: String, default: 'other', index: true },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// text index for searching title + description + ingredient names
recipeSchema.index({ title: 'text', description: 'text', 'ingredients.name': 'text' });

export default mongoose.model('Recipe', recipeSchema);