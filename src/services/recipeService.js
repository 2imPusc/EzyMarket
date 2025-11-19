import Recipe from '../model/recipeRepository.js';
import Ingredient from '../model/ingredientRepository.js';
import mongoose from 'mongoose';

export const findRecipesByKeywords = async (q, page = 1, limit = 20) => {
  const skip = (Math.max(parseInt(page, 10), 1) - 1) * parseInt(limit, 10);
  const filter = q ? { $text: { $search: q } } : {};
  const [recipes, total] = await Promise.all([
    Recipe.find(filter).select('-__v').sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
    Recipe.countDocuments(filter),
  ]);
  return { recipes, total, page: parseInt(page, 10), limit: parseInt(limit, 10) };
};

/**
 * Suggest recipes based on available ingredient names (array of strings)
 * Strategy:
 *  - normalize provided names (lowercase, trim)
 *  - compute matchCount between recipe.ingredients.name and available list
 *  - score = matchCount / totalRequired (exclude optional)
 *  - return recipes with score >= threshold (default 0.6), sorted by score desc
 */
export const suggestRecipes = async (availableNames = [], options = {}) => {
  const threshold = options.threshold ?? 0.6;
  const limit = options.limit ?? 20;
  const normalized = new Set(availableNames.map((n) => (n || '').toLowerCase().trim()));
  const allRecipes = await Recipe.find().lean();
  const scored = allRecipes
    .map((r) => {
      const required = r.ingredients.filter((i) => !i.optional);
      const totalReq = required.length || r.ingredients.length || 1;
      const matchCount = required.reduce((acc, ing) => acc + (normalized.has((ing.name || '').toLowerCase().trim()) ? 1 : 0), 0);
      const score = matchCount / totalReq;
      return { recipe: r, score, matchCount, totalReq };
    })
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({ recipe: s.recipe, score: s.score, matchCount: s.matchCount, totalReq: s.totalReq }));
  return scored;
};

/**
 * Create shopping list from a recipe and available ingredients list.
 * Input: recipeId, availableNames (array of strings)
 * Output: missingIngredients array (objects from recipe.ingredients that are not satisfied)
 */
export const buildShoppingListFromRecipe = async (recipeId, availableNames = []) => {
  if (!mongoose.Types.ObjectId.isValid(recipeId)) throw new Error('Invalid recipeId');
  const recipe = await Recipe.findById(recipeId).lean();
  if (!recipe) throw new Error('Recipe not found');
  const have = new Set(availableNames.map((n) => (n || '').toLowerCase().trim()));
  const missing = recipe.ingredients
    .filter((ing) => !have.has((ing.name || '').toLowerCase().trim()))
    .map((ing) => ({
      name: ing.name,
      quantity: ing.quantity ?? null,
      unit: ing.unit ?? null,
      note: ing.note ?? null,
      optional: ing.optional ?? false,
    }));
  return { recipeId: recipe._id, title: recipe.title, missing };
};

/** master-data ingredients: autocomplete by prefix */
export const suggestIngredientNames = async (prefix = '', limit = 10) => {
  if (!prefix) return Ingredient.find().select('name -_id').limit(limit).lean();
  const regex = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const docs = await Ingredient.find({ name: regex }).select('name -_id').limit(limit).lean();
  return docs.map((d) => d.name);
};