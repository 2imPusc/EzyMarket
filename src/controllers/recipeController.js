import Recipe from '../model/recipeRepository.js';
import { findRecipesByKeywords, suggestRecipes, buildShoppingListFromRecipe, suggestIngredientNames } from '../services/recipeService.js';
import mongoose from 'mongoose';
import Ingredient from '../model/ingredientRepository.js';
import Unit from '../model/unitRepository.js';

const recipeController = {
  // POST /api/recipes
  create: async (req, res) => {
    try {
      const creatorId = req.user.id;
      const { title, description, imageUrl, prepTime, cookTime, servings, directions = [], ingredients = [], tag } = req.body;
      if (!title || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ message: 'Title and ingredients are required' });
      }
      // normalize ingredient names
      const normalizedIngredients = [];
      for (const i of ingredients) {
        let ingredientId = i.ingredientId && mongoose.Types.ObjectId.isValid(i.ingredientId) ? i.ingredientId : undefined;
        let unitId = i.unitId && mongoose.Types.ObjectId.isValid(i.unitId) ? i.unitId : undefined;

        // resolve ingredient name
        let name = i.name ? String(i.name).trim().toLowerCase() : '';
        if (ingredientId) {
          const ing = await Ingredient.findById(ingredientId).select('name');
          if (!ing) return res.status(400).json({ message: `ingredientId ${ingredientId} not found` });
          name = String(ing.name).toLowerCase().trim();
        }
        if (!name) return res.status(400).json({ message: 'Each ingredient needs ingredientId or name' });

        // resolve unit
        let unit = i.unit ? String(i.unit).trim() : null;
        let unitAbbrev = null;
        if (unitId) {
          const u = await Unit.findById(unitId).select('name abbreviation');
          if (!u) return res.status(400).json({ message: `unitId ${unitId} not found` });
          unit = u.name;
          unitAbbrev = u.abbreviation ?? null;
        }

        normalizedIngredients.push({
          ingredientId,
          name,
          quantity: i.quantity ?? null,
          unit,
          unitId,
          unitAbbreviation: unitAbbrev,
          optional: !!i.optional,
        });
      }
      const newRecipe = new Recipe({
        creatorId,
        title: title.trim(),
        description: description ?? '',
        imageUrl: imageUrl ?? null,
        prepTime: prepTime ?? 0,
        cookTime: cookTime ?? 0,
        servings: servings ?? 1,
        directions,
        ingredients: normalizedIngredients,
        tag: tag ?? 'other',
      });
      await newRecipe.save();
      res.status(201).json({ message: 'Recipe created', recipe: newRecipe });
    } catch (err) {
      console.error('Create recipe error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET /api/recipes/my-recipes
  getMyRecipes: async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const skip = (Math.max(parseInt(page, 10), 1) - 1) * Math.min(parseInt(limit, 10), 100);
      const [recipes, total] = await Promise.all([
        Recipe.find({ creatorId: userId }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
        Recipe.countDocuments({ creatorId: userId }),
      ]);
      res.status(200).json({ recipes, pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / limit) } });
    } catch (err) {
      console.error('Get my recipes error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET /api/recipes/:recipeId
  getById: async (req, res) => {
    try {
      const { recipeId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(recipeId)) return res.status(400).json({ message: 'Invalid recipe ID' });
      const recipe = await Recipe.findById(recipeId).populate('creatorId', 'userName email avatar').lean();
      if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
      res.status(200).json(recipe);
    } catch (err) {
      console.error('Get recipe by id error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // PUT /api/recipes/:recipeId
  update: async (req, res) => {
    try {
      const { recipeId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(recipeId)) return res.status(400).json({ message: 'Invalid recipe ID' });

      const recipe = await Recipe.findById(recipeId);
      if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

      const userId = req.user.id;
      if (recipe.creatorId.toString() !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Updatable scalar fields
      const updatable = ['title', 'description', 'imageUrl', 'prepTime', 'cookTime', 'servings', 'directions', 'tag'];
      updatable.forEach((k) => {
        if (req.body[k] !== undefined) {
          if (k === 'title' && typeof req.body.title === 'string') recipe.title = req.body.title.trim();
          else recipe[k] = req.body[k];
        }
      });

      // If ingredients provided -> replace after resolving/validating each item
      if (req.body.ingredients !== undefined) {
        if (!Array.isArray(req.body.ingredients)) {
          return res.status(400).json({ message: 'ingredients must be an array' });
        }

        const newIngredients = [];
        for (const item of req.body.ingredients) {
          if (!item || ( !item.ingredientId && !item.name )) {
            return res.status(400).json({ message: 'Each ingredient must include ingredientId or name' });
          }

          // Validate and resolve ingredientId if provided
          let ingredientId = undefined;
          let name = item.name ? String(item.name).trim() : '';
          if (item.ingredientId) {
            if (!mongoose.Types.ObjectId.isValid(item.ingredientId)) {
              return res.status(400).json({ message: `Invalid ingredientId: ${item.ingredientId}` });
            }
            ingredientId = item.ingredientId;
            const ingDoc = await Ingredient.findById(ingredientId).select('name');
            if (!ingDoc) return res.status(400).json({ message: `ingredientId ${ingredientId} not found` });
            name = String(ingDoc.name).toLowerCase().trim();
          } else {
            // normalize provided name
            name = String(name).toLowerCase();
            if (!name) return res.status(400).json({ message: 'Ingredient name is required when no ingredientId provided' });
          }

          // Validate and resolve unitId if provided
          let unit = item.unit ? String(item.unit).trim() : null;
          let unitId = undefined;
          let unitAbbreviation = null;
          if (item.unitId) {
            if (!mongoose.Types.ObjectId.isValid(item.unitId)) {
              return res.status(400).json({ message: `Invalid unitId: ${item.unitId}` });
            }
            unitId = item.unitId;
            const unitDoc = await Unit.findById(unitId).select('name abbreviation');
            if (!unitDoc) return res.status(400).json({ message: `unitId ${unitId} not found` });
            unit = unitDoc.name ?? unit;
            unitAbbreviation = unitDoc.abbreviation ?? null;
          }

          newIngredients.push({
            ingredientId: ingredientId ?? undefined,
            name,
            quantity: item.quantity ?? null,
            unit: unit ?? null,
            unitId: unitId ?? undefined,
            unitAbbreviation: unitAbbreviation ?? null,
            note: item.note ?? null,
            optional: !!item.optional,
          });
        }

        recipe.ingredients = newIngredients;
      }

      // Save and return populated document
      await recipe.save();
      const populated = await Recipe.findById(recipe._id).populate('creatorId', 'userName email avatar').lean();
      return res.status(200).json({ message: 'Recipe updated', recipe: populated });
    } catch (err) {
      console.error('Update recipe error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // DELETE /api/recipes/:recipeId
  delete: async (req, res) => {
    try {
      const { recipeId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(recipeId)) return res.status(400).json({ message: 'Invalid recipe ID' });
      const recipe = await Recipe.findById(recipeId);
      if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
      const userId = req.user.id;
      if (recipe.creatorId.toString() !== userId && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

      await Recipe.findByIdAndDelete(recipeId);
      res.status(200).json({ message: 'Recipe deleted' });
    } catch (err) {
      console.error('Delete recipe error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET /api/recipes/search?q=
  search: async (req, res) => {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      const result = await findRecipesByKeywords(q || '', page, limit);
      res.status(200).json(result);
    } catch (err) {
      console.error('Search recipes error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // POST /api/recipes/suggestions
  suggestions: async (req, res) => {
    try {
      const { availableIngredients = [], threshold, limit } = req.body;
      if (!Array.isArray(availableIngredients)) return res.status(400).json({ message: 'availableIngredients must be an array of strings' });
      const suggestions = await suggestRecipes(availableIngredients, { threshold, limit });
      res.status(200).json({ suggestions });
    } catch (err) {
      console.error('Recipe suggestions error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // POST /api/shopping-list/from-recipe
  shoppingListFromRecipe: async (req, res) => {
    try {
      const { recipeId, availableIngredients = [] } = req.body;
      if (!recipeId) return res.status(400).json({ message: 'recipeId is required' });
      const list = await buildShoppingListFromRecipe(recipeId, availableIngredients);
      res.status(200).json(list);
    } catch (err) {
      console.error('Shopping list error:', err);
      res.status(500).json({ message: err.message || 'Internal server error' });
    }
  },

  // GET /api/master-data/ingredients
  masterDataIngredients: async (req, res) => {
    try {
      const { q = '', limit = 10 } = req.query;
      const names = await suggestIngredientNames(q, parseInt(limit, 10));
      res.status(200).json({ suggestions: names });
    } catch (err) {
      console.error('Master data ingredients error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};

export default recipeController;