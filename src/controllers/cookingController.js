import * as cookingService from '../services/cookingService.js';

const cookingController = {
  // POST /api/cooking/cook
  cook: async (req, res) => {
    try {
      const user = req.user;
      const groupId = user?.groupId ?? user?.group_id ?? null;
      const userId = user?.id ?? user?._id;

      const { recipeId, servings, force, cookedExpiryDays } = req.body;
      if (!recipeId) {
        return res.status(400).json({ message: 'recipeId is required' });
      }

      const result = await cookingService.cookFromRecipe({
        recipeId,
        servings,
        userId,
        groupId,
        force: force === true,
        cookedExpiryDays,
      });

      res.status(201).json(result);
    } catch (err) {
      console.error('Cook error:', err);
      if (err.message.startsWith('Insufficient ingredients')) {
        return res.status(400).json({ message: err.message, error: 'INSUFFICIENT_INGREDIENTS' });
      }
      if (err.message === 'Recipe not found') {
        return res.status(404).json({ message: err.message });
      }
      res.status(500).json({ message: err.message || 'Internal server error' });
    }
  },

  // GET /api/cooking/check/:recipeId
  check: async (req, res) => {
    try {
      const user = req.user;
      const groupId = user?.groupId ?? user?.group_id ?? null;
      const userId = user?.id ?? user?._id;

      const { recipeId } = req.params;
      const { servings, verbose } = req.query;

      const result = await cookingService.checkCookability({
        recipeId,
        servings: servings ? parseInt(servings, 10) : undefined,
        userId,
        groupId,
        verbose: String(verbose).toLowerCase() === 'true',
      });

      res.status(200).json(result);
    } catch (err) {
      console.error('Check cookability error:', err);
      if (err.message === 'Recipe not found') return res.status(404).json({ message: err.message });
      res.status(500).json({ message: err.message || 'Internal server error' });
    }
  },
};

export default cookingController;