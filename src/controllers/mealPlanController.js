import * as mealPlanService from '../services/mealPlanService.js';

// ✅ HELPER: Lấy groupId từ user
const getGroupId = (user) => user?.groupId || user?.group_id || null;

// GET /api/meal-plans?startDate=...&endDate=...
const getPlan = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const groupId = getGroupId(req.user);  // ✅ THÊM
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const plans = await mealPlanService.getPlanByDateRange(userId, startDate, endDate, groupId);  // ✅ SỬA
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/meal-plans/items
const addItem = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const groupId = getGroupId(req.user);  // ✅ THÊM
    
    const newItem = await mealPlanService.addItemToMeal(userId, req.body, groupId);  // ✅ SỬA
    res.status(201).json({ 
      message: 'Item added to plan', 
      item: newItem,
      note: 'Inventory will be consumed when you cook or mark as eaten'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// POST /api/meal-plans/items/bulk
const addItemsBulk = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const groupId = getGroupId(req.user);  // ✅ THÊM
    const { date, mealType, items } = req.body;

    if (!date || !mealType || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Date, mealType, and a list of items are required' });
    }

    const addedItems = await mealPlanService.addItemsToMealBulk(userId, req.body, groupId);  // ✅ SỬA
    res.status(201).json({
      message: `${addedItems.length} items added to plan`,
      items: addedItems,
      note: 'Inventory will be consumed when you cook or mark as eaten'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PATCH /api/meal-plans/items/:itemId - Update item
const updateItem = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { itemId } = req.params;

    const updatedPlan = await mealPlanService.updateItem(userId, itemId, req.body);

    if (!updatedPlan) {
      return res.status(404).json({ message: 'Meal item not found or no changes made' });
    }

    res.json({ message: 'Item updated', plan: updatedPlan });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/meal-plans/items/:itemId - Remove item
const removeItem = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { itemId } = req.params;

    await mealPlanService.removeItem(userId, itemId);
    res.json({ message: 'Item removed successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ===============================================
//          NEW ENDPOINTS
// ===============================================

// POST /api/meal-plans/items/:itemId/cook - Nấu recipe đã plan
const cookItem = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const groupId = req.user.groupId || req.user.group_id || null;
    const { itemId } = req.params;
    const { force, cookedExpiryDays } = req.body;

    const result = await mealPlanService.cookPlannedItem(userId, itemId, {
      groupId,
      force: force === true,
      cookedExpiryDays: cookedExpiryDays || 3,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Cook item error:', error);
    
    if (error.message.includes('must be cooked first')) {
      return res.status(400).json({ message: error.message, error: 'MUST_COOK_FIRST' });
    }
    if (error.message.includes('Insufficient ingredients')) {
      return res.status(400).json({ message: error.message, error: 'INSUFFICIENT_INGREDIENTS' });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Only recipe')) {
      return res.status(400).json({ message: error.message, error: 'INVALID_ITEM_TYPE' });
    }
    if (error.message.includes('already')) {
      return res.status(400).json({ message: error.message, error: 'ALREADY_PROCESSED' });
    }

    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// POST /api/meal-plans/items/:itemId/eat - Đánh dấu đã ăn
const eatItem = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const groupId = req.user.groupId || req.user.group_id || null;
    const { itemId } = req.params;
    const forceEat = req.body?.forceEat === true;

    const result = await mealPlanService.markItemEaten(userId, itemId, {
      groupId,
      forceEat: forceEat === true,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Eat item error:', error);

    if (error.message.includes('Insufficient ingredient')) {
      return res.status(400).json({ 
        message: error.message, 
        error: 'INSUFFICIENT_IN_FRIDGE' 
      });
    }
    if (error.message.includes('must be cooked first')) {
      return res.status(400).json({ message: error.message, error: 'MUST_COOK_FIRST' });
    }
    if (error.message.includes('already')) {
      return res.status(400).json({ message: error.message, error: 'ALREADY_PROCESSED' });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// GET /api/meal-plans/:planId/availability - Kiểm tra nguyên liệu
const checkAvailability = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const groupId = req.user.groupId || req.user.group_id || null;
    const { planId } = req.params;

    const result = await mealPlanService.checkPlanAvailability(userId, planId, { groupId });

    res.status(200).json(result);
  } catch (error) {
    console.error('Check availability error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// ===============================================
//          SEARCH & RECOMMENDATIONS
// ===============================================

const parseFridgeIds = (queryParam) => {
  if (!queryParam) return null;
  if (Array.isArray(queryParam)) return queryParam;
  return queryParam.split(',').map((id) => id.trim());
};

const searchRecipes = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { q, page, limit, fridgeIds } = req.query;

    const targetFridgeIds = parseFridgeIds(fridgeIds);

    const results = await mealPlanService.searchRecipesForPlan(
      userId,
      q || '',
      targetFridgeIds,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { limit, fridgeIds } = req.query;

    const targetFridgeIds = parseFridgeIds(fridgeIds);

    const results = await mealPlanService.getRecommendationsForPlan(
      userId,
      targetFridgeIds,
      parseInt(limit) || 10
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/meal-plans/:date/complete - Hoàn thành ngày
const completeDay = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const groupId = req.user.groupId || req.user.group_id || null;
    const { date } = req.params;
    const { action } = req.body; // 'skip' | 'consume'

    const result = await mealPlanService.completeDayPlan(userId, date, {
      action: action || 'skip',
      groupId,
    });

    res.json(result);
  } catch (error) {
    console.error('Complete day error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

export default {
  getPlan,
  addItem,
  addItemsBulk,
  updateItem,
  removeItem,
  cookItem,
  eatItem,
  checkAvailability,
  searchRecipes,
  getRecommendations,
  completeDay,
};