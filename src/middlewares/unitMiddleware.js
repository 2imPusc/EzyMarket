import mongoose from 'mongoose';
import Recipe from '../model/recipeRepository.js';
import FridgeItem from '../model/fridgeItemRepository.js';
import MealPlan from '../model/mealPlanRepository.js';

const unitMiddleware = {
  // Validate input khi tạo/update unit
  validateUnitInput: (req, res, next) => {
    const { name, abbreviation, type } = req.body;

    if (!name || !abbreviation || !type) {
      return res.status(400).json({
        message: 'name, abbreviation, and type are required',
      });
    }

    if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 50) {
      return res.status(400).json({
        message: 'Name must be between 1 and 50 characters',
      });
    }

    if (
      typeof abbreviation !== 'string' ||
      abbreviation.trim().length < 1 ||
      abbreviation.trim().length > 20
    ) {
      return res.status(400).json({
        message: 'Abbreviation must be between 1 and 20 characters',
      });
    }

    const validTypes = ['weight', 'volume', 'count', 'length', 'area', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: `Type must be one of: ${validTypes.join(', ')}`,
      });
    }

    next();
  },

  validateUpdateInput: (req, res, next) => {
    const { name, abbreviation, type } = req.body;

    if (!name && !abbreviation && !type) {
      return res.status(400).json({
        message: 'At least one field (name, abbreviation, type) must be provided',
      });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 50) {
        return res.status(400).json({
          message: 'Name must be between 1 and 50 characters',
        });
      }
    }

    if (abbreviation !== undefined) {
      if (
        typeof abbreviation !== 'string' ||
        abbreviation.trim().length < 1 ||
        abbreviation.trim().length > 20
      ) {
        return res.status(400).json({
          message: 'Abbreviation must be between 1 and 20 characters',
        });
      }
    }

    if (type !== undefined) {
      const validTypes = ['weight', 'volume', 'count', 'length', 'area', 'other'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          message: `Type must be one of: ${validTypes.join(', ')}`,
        });
      }
    }

    next();
  },

  validateObjectId: (req, res, next) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid unit ID format',
      });
    }

    next();
  },

  validateIdsArray: (req, res, next) => {
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        message: 'ids must be an array',
      });
    }

    if (ids.length === 0) {
      return res.status(400).json({
        message: 'ids array cannot be empty',
      });
    }

    // Validate each ID
    const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: 'Invalid unit IDs provided',
        invalidIds,
      });
    }

    next();
  },

  checkUnitUsage: async (req, res, next) => {
    try {
      const { id } = req.params;

      const [recipeCount, fridgeCount, mealPlanCount] = await Promise.all([
        Recipe.countDocuments({ 'ingredients.unitId': id }),
        FridgeItem.countDocuments({ unitId: id }),
        MealPlan.countDocuments({ 'meals.items.unitId': id }),
      ]);

      if (recipeCount > 0 || fridgeCount > 0 || mealPlanCount > 0) {
        return res.status(400).json({
          message: 'Cannot delete unit because it is being used',
          usage: {
            recipes: recipeCount,
            fridgeItems: fridgeCount,
            mealPlans: mealPlanCount,
          },
        });
      }

      next();
    } catch (err) {
      console.error('Check unit usage error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  checkUnitsUsage: async (req, res, next) => {
    try {
      const { ids } = req.body;

      const [recipeCount, fridgeCount, mealPlanCount] = await Promise.all([
        Recipe.countDocuments({ 'ingredients.unitId': { $in: ids } }),
        FridgeItem.countDocuments({ unitId: { $in: ids } }),
        MealPlan.countDocuments({ 'meals.items.unitId': { $in: ids } }),
      ]);

      if (recipeCount > 0 || fridgeCount > 0 || mealPlanCount > 0) {
        return res.status(400).json({
          message: 'Some units are being used and cannot be deleted',
          usage: {
            recipes: recipeCount,
            fridgeItems: fridgeCount,
            mealPlans: mealPlanCount,
          },
        });
      }

      next();
    } catch (err) {
      console.error('Check units usage error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};

export default unitMiddleware;
