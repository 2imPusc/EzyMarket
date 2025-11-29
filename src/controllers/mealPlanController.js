import * as mealPlanService from '../services/mealPlanService.js';

// GET /api/meal-plans?startDate=...&endDate=...
const getPlan = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const plans = await mealPlanService.getPlanByDateRange(userId, startDate, endDate);
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/meal-plans/items
const addItem = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    // Client cần gửi itemType: 'recipe' hoặc 'ingredient'
    const { date, mealType, itemType, recipeId, ingredientId, unitId, quantity } = req.body;

    if (!date || !mealType || !itemType) {
      return res.status(400).json({ message: 'Date, mealType, and itemType are required' });
    }

    const newItem = await mealPlanService.addItemToMeal(userId, req.body);
    res.status(201).json({ message: 'Item added', item: newItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/meal-plans/items/:itemId
const updateItem = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { itemId } = req.params;
    
    // --- SỬA TẠI ĐÂY: Lấy quantity thay vì servings ---
    const { quantity, isEaten, note, unitId } = req.body;
    
    // Truyền đúng object xuống service
    const updatedPlan = await mealPlanService.updateItem(userId, itemId, { 
      quantity, 
      isEaten, 
      note, 
      unitId 
    });

    // Nếu service trả về null nghĩa là không tìm thấy item hoặc không có gì update
    if (!updatedPlan) {
        return res.status(404).json({ message: 'Meal item not found or no changes made' });
    }

    res.json({ message: 'Item updated', plan: updatedPlan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/meal-plans/items/:itemId
const removeItem = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { itemId } = req.params;

    await mealPlanService.removeItem(userId, itemId);
    res.json({ message: 'Item removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  getPlan,
  addItem,
  updateItem,
  removeItem
};