import mongoose from 'mongoose';
import MealPlan from '../model/mealPlanRepository.js';
import Recipe from '../model/recipeRepository.js';
import FridgeItem from '../model/fridgeItemRepository.js';
import Ingredient from '../model/ingredientRepository.js';
import * as cookingService from './cookingService.js';

// ===============================================
//                HELPERS
// ===============================================

const normalizeDate = (dateString) => {
  const d = new Date(dateString);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const normalizeMealType = (type) => (type === 'snack' ? 'snacks' : type);

const getMealIndex = (plan, inputType) => {
  const t = normalizeMealType(inputType);
  const idx = plan.meals.findIndex((m) => m.mealType === t);
  if (idx !== -1) return idx;
  return plan.meals.findIndex((m) => m.mealType === 'snack');
};

const buildOwnerQuery = (userId, groupId) => {
  if (groupId) return { groupId: new mongoose.Types.ObjectId(groupId) };
  if (userId) return { userId: new mongoose.Types.ObjectId(userId), groupId: null };
  throw new Error('Either userId or groupId is required');
};

// ===============================================
//          GET PLAN (giữ nguyên)
// ===============================================

export const getPlanByDateRange = async (userId, startDate, endDate) => {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const plans = await MealPlan.find({
    userId,
    date: { $gte: start, $lte: end },
  })
    .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime servings')
    .populate('meals.items.ingredientId', 'name imageURL')
    .populate('meals.items.unitId', 'name abbreviation')
    .populate('meals.items.cookedFridgeItemId', 'quantity status expiryDate')
    .sort({ date: 1 })
    .lean();

  return plans;
};

// ===============================================
//     ADD ITEM - KHÔNG TRỪ INVENTORY
// ===============================================

export const addItemToMeal = async (userId, data) => {
  const { date, mealType, itemType, recipeId, ingredientId, unitId, quantity, note } = data;
  const targetDate = normalizeDate(date);
  const qty = quantity || 1;

  // Find or create plan
  let plan = await MealPlan.findOne({ userId, date: targetDate });
  if (!plan) {
    plan = new MealPlan({ userId, date: targetDate, meals: [] });
    await plan.save(); // Trigger pre-save to init meals
    plan = await MealPlan.findById(plan._id);
  }

  const mealIndex = getMealIndex(plan, mealType);
  if (mealIndex === -1) {
    throw new Error(`Invalid meal type: ${mealType}`);
  }

  // Build new item - status defaults to 'planned'
  const newItem = {
    itemType,
    quantity: qty,
    status: 'planned', // ✅ Luôn bắt đầu với planned
    isEaten: false,
    note: note || '',
  };

  if (itemType === 'recipe') {
    if (!recipeId) throw new Error('recipeId is required for recipe type');
    newItem.recipeId = new mongoose.Types.ObjectId(recipeId);
  } else if (itemType === 'ingredient') {
    if (!ingredientId || !unitId) {
      throw new Error('ingredientId and unitId are required for ingredient type');
    }
    newItem.ingredientId = new mongoose.Types.ObjectId(ingredientId);
    newItem.unitId = new mongoose.Types.ObjectId(unitId);
  }

  // Check for existing same item and merge quantity (optional behavior)
  const existingIdx = plan.meals[mealIndex].items.findIndex((item) => {
    if (item.itemType !== itemType || item.status !== 'planned') return false;
    if (itemType === 'recipe') {
      return item.recipeId?.toString() === recipeId;
    }
    return (
      item.ingredientId?.toString() === ingredientId &&
      item.unitId?.toString() === unitId
    );
  });

  if (existingIdx !== -1) {
    // Merge quantity
    plan.meals[mealIndex].items[existingIdx].quantity += qty;
  } else {
    // Add new item
    plan.meals[mealIndex].items.push(newItem);
  }

  await plan.save();

  // ❌ KHÔNG gọi consumeFromFridge ở đây nữa

  // Populate và return item mới thêm
  const updatedPlan = await MealPlan.findById(plan._id)
    .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime servings')
    .populate('meals.items.ingredientId', 'name imageURL')
    .populate('meals.items.unitId', 'name abbreviation');

  const mealItems = updatedPlan.meals[mealIndex].items;
  return mealItems[mealItems.length - 1];
};

// ===============================================
//     BULK ADD - KHÔNG TRỪ INVENTORY
// ===============================================

export const addItemsToMealBulk = async (userId, data) => {
  const { date, mealType, items } = data;
  const targetDate = normalizeDate(date);

  let plan = await MealPlan.findOne({ userId, date: targetDate });
  if (!plan) {
    plan = new MealPlan({ userId, date: targetDate, meals: [] });
    await plan.save();
    plan = await MealPlan.findById(plan._id);
  }

  const mealIndex = getMealIndex(plan, mealType);
  if (mealIndex === -1) {
    throw new Error(`Invalid meal type: ${mealType}`);
  }

  // Add each item
  for (const item of items) {
    const newItem = {
      itemType: item.itemType,
      quantity: item.quantity || 1,
      status: 'planned',
      isEaten: false,
      note: item.note || '',
    };

    if (item.itemType === 'recipe') {
      newItem.recipeId = new mongoose.Types.ObjectId(item.recipeId);
    } else {
      newItem.ingredientId = new mongoose.Types.ObjectId(item.ingredientId);
      newItem.unitId = new mongoose.Types.ObjectId(item.unitId);
    }

    plan.meals[mealIndex].items.push(newItem);
  }

  await plan.save();

  // ❌ KHÔNG gọi consumeFromFridge

  const updatedPlan = await MealPlan.findById(plan._id)
    .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime servings')
    .populate('meals.items.ingredientId', 'name imageURL')
    .populate('meals.items.unitId', 'name abbreviation');

  return updatedPlan.meals[mealIndex].items;
};

// ===============================================
//     COOK PLANNED ITEM - ✅ NEW
// ===============================================

/**
 * Nấu một recipe đã được plan
 * - Gọi cookingService để trừ nguyên liệu và tạo món đã nấu
 * - Update status của meal item thành 'cooked'
 * - Link đến cookedFridgeItemId
 */
export const cookPlannedItem = async (userId, itemId, options = {}) => {
  const { groupId, force = false, cookedExpiryDays = 3 } = options;

  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new Error('Invalid item ID');
  }

  const itemObjectId = new mongoose.Types.ObjectId(itemId);

  // Find the meal plan containing this item
  const plan = await MealPlan.findOne({
    userId,
    'meals.items._id': itemObjectId,
  });

  if (!plan) {
    throw new Error('Meal item not found');
  }

  // Find the specific item
  let targetItem = null;
  let targetMealIndex = -1;
  let targetItemIndex = -1;

  for (let mi = 0; mi < plan.meals.length; mi++) {
    const meal = plan.meals[mi];
    for (let ii = 0; ii < meal.items.length; ii++) {
      if (meal.items[ii]._id.toString() === itemId) {
        targetItem = meal.items[ii];
        targetMealIndex = mi;
        targetItemIndex = ii;
        break;
      }
    }
    if (targetItem) break;
  }

  if (!targetItem) {
    throw new Error('Meal item not found');
  }

  // Validate
  if (targetItem.itemType !== 'recipe') {
    throw new Error('Only recipe items can be cooked. Use markItemEaten for ingredients.');
  }

  if (targetItem.status !== 'planned') {
    throw new Error(`Item is already ${targetItem.status}. Cannot cook again.`);
  }

  // Call cooking service
  const cookResult = await cookingService.cookFromRecipe({
    recipeId: targetItem.recipeId.toString(),
    servings: targetItem.quantity,
    userId,
    groupId,
    force,
    cookedExpiryDays,
  });

  // Update meal item
  plan.meals[targetMealIndex].items[targetItemIndex].status = 'cooked';
  plan.meals[targetMealIndex].items[targetItemIndex].cookedAt = new Date();
  plan.meals[targetMealIndex].items[targetItemIndex].cookedFridgeItemId = cookResult.cookedItem._id;

  await plan.save();

  // Return updated item with populated data
  const updatedPlan = await MealPlan.findById(plan._id)
    .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime servings')
    .populate('meals.items.cookedFridgeItemId', 'quantity status expiryDate');

  const updatedItem = updatedPlan.meals[targetMealIndex].items[targetItemIndex];

  return {
    message: 'Recipe cooked successfully',
    item: updatedItem,
    cookingDetails: cookResult,
  };
};

// ===============================================
//     MARK ITEM EATEN - ✅ NEW
// ===============================================

/**
 * Đánh dấu item đã ăn
 * - Với ingredient: trừ từ fridge ngay lập tức
 * - Với recipe đã cooked: trừ từ cooked item trong fridge
 */
export const markItemEaten = async (userId, itemId, options = {}) => {
  const { groupId, forceEat = false } = options;  // Thêm forceEat option

  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new Error('Invalid item ID');
  }

  const itemObjectId = new mongoose.Types.ObjectId(itemId);

  const plan = await MealPlan.findOne({
    userId,
    'meals.items._id': itemObjectId,
  });

  if (!plan) {
    throw new Error('Meal item not found');
  }

  // Find item
  let targetItem = null;
  let targetMealIndex = -1;
  let targetItemIndex = -1;

  for (let mi = 0; mi < plan.meals.length; mi++) {
    const meal = plan.meals[mi];
    for (let ii = 0; ii < meal.items.length; ii++) {
      if (meal.items[ii]._id.toString() === itemId) {
        targetItem = meal.items[ii];
        targetMealIndex = mi;
        targetItemIndex = ii;
        break;
      }
    }
    if (targetItem) break;
  }

  if (!targetItem) {
    throw new Error('Meal item not found');
  }

  // Validate status
  if (['eaten', 'consumed', 'skipped'].includes(targetItem.status)) {
    throw new Error(`Item is already ${targetItem.status}`);
  }

  let consumptionResult = null;

  if (targetItem.itemType === 'ingredient') {
    // Trừ ingredient từ fridge
    consumptionResult = await consumeIngredientFromFridge(
      userId,
      groupId,
      targetItem.ingredientId,
      targetItem.unitId,
      targetItem.quantity
    );

    // ✅ Kiểm tra kết quả consumption
    if (!consumptionResult.fullyConsumed && !forceEat) {
      // Không đủ trong fridge và không force
      throw new Error(
        `Insufficient ingredient in fridge. ` +
        `Required: ${targetItem.quantity}, ` +
        `Available: ${consumptionResult.consumed}, ` +
        `Missing: ${consumptionResult.remaining}. ` +
        `Use forceEat=true to mark as eaten anyway.`
      );
    }

  } else if (targetItem.itemType === 'recipe') {
    if (targetItem.status === 'planned') {
      throw new Error('Recipe must be cooked first. Use /cook endpoint.');
    }

    // Recipe đã cooked → trừ từ cooked fridge item
    if (targetItem.cookedFridgeItemId) {
      const cookedItem = await FridgeItem.findById(targetItem.cookedFridgeItemId);
      if (cookedItem && cookedItem.status === 'in-stock') {
        cookedItem.quantity -= targetItem.quantity;
        if (cookedItem.quantity <= 0) {
          cookedItem.quantity = 0;
          cookedItem.status = 'used';
        }
        await cookedItem.save();
        consumptionResult = { consumed: targetItem.quantity, fromCookedItem: true };
      } else if (!forceEat) {
        throw new Error('Cooked dish not found in fridge. Use forceEat=true to mark as eaten anyway.');
      }
    }
  }

  // Update status
  plan.meals[targetMealIndex].items[targetItemIndex].status = 'eaten';
  plan.meals[targetMealIndex].items[targetItemIndex].eatenAt = new Date();
  plan.meals[targetMealIndex].items[targetItemIndex].isEaten = true;

  await plan.save();

  // Populate và return item đã cập nhật
  const updatedPlan = await MealPlan.findById(plan._id)
    .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime servings')
    .populate('meals.items.ingredientId', 'name imageURL')
    .populate('meals.items.unitId', 'name abbreviation');

  return {
    message: consumptionResult?.fullyConsumed === false && forceEat
      ? 'Item marked as eaten (forced - fridge not fully consumed)'
      : 'Item marked as eaten',
    item: updatedPlan.meals[targetMealIndex].items[targetItemIndex],
    consumption: consumptionResult,
  };
};

// ===============================================
//     CONSUME INGREDIENT FROM FRIDGE (FIFO)
// ===============================================

const consumeIngredientFromFridge = async (userId, groupId, ingredientId, unitId, quantity) => {
  let remaining = Number(quantity) || 0;
  if (remaining <= 0) return { consumed: 0, details: [] };

  const ownerQuery = buildOwnerQuery(userId, groupId);

  const items = await FridgeItem.find({
    ...ownerQuery,
    $or: [{ itemType: 'ingredient' }, { itemType: { $exists: false } }],
    foodId: new mongoose.Types.ObjectId(ingredientId),
    unitId: new mongoose.Types.ObjectId(unitId),
    status: 'in-stock',
    quantity: { $gt: 0 },
  }).sort({ expiryDate: 1 }); // FIFO by expiry

  const details = [];
  let totalConsumed = 0;

  for (const item of items) {
    if (remaining <= 0) break;

    const take = Math.min(item.quantity, remaining);
    if (take <= 0) continue;

    item.quantity -= take;
    remaining -= take;
    totalConsumed += take;

    if (item.quantity <= 0) {
      item.quantity = 0;
      item.status = 'used';
    }

    await item.save();
    details.push({ itemId: item._id, taken: take });
  }

  return {
    consumed: totalConsumed,
    remaining,
    details,
    fullyConsumed: remaining <= 0,
  };
};

// ===============================================
//     CHECK AVAILABILITY FOR PLAN
// ===============================================

/**
 * Kiểm tra nguyên liệu có sẵn cho một meal plan
 * Dùng để hiển thị trạng thái và tạo shopping list
 */
export const checkPlanAvailability = async (userId, planId, options = {}) => {
  const { groupId } = options;

  const plan = await MealPlan.findOne({ _id: planId, userId })
    .populate('meals.items.recipeId')
    .populate('meals.items.ingredientId')
    .lean();

  if (!plan) {
    throw new Error('Meal plan not found');
  }

  const results = {
    planId: plan._id,
    date: plan.date,
    meals: [],
    summary: {
      totalItems: 0,
      availableItems: 0,
      missingItems: [],
    },
  };

  for (const meal of plan.meals) {
    const mealResult = {
      mealType: meal.mealType,
      items: [],
    };

    for (const item of meal.items) {
      if (item.status !== 'planned') {
        // Already cooked/eaten, skip availability check
        mealResult.items.push({
          ...item,
          availability: { status: item.status, checked: false },
        });
        continue;
      }

      results.summary.totalItems++;
      let availability;

      if (item.itemType === 'ingredient') {
        availability = await checkIngredientAvailability(
          userId,
          groupId,
          item.ingredientId._id || item.ingredientId,
          item.unitId,
          item.quantity
        );
      } else if (item.itemType === 'recipe') {
        // Use cooking service to check
        const cookCheck = await cookingService.checkCookability({
          recipeId: (item.recipeId._id || item.recipeId).toString(),
          servings: item.quantity,
          userId,
          groupId,
          verbose: true,
        });
        availability = {
          canCook: cookCheck.canCook,
          available: cookCheck.canCook ? item.quantity : 0,
          required: item.quantity,
          missing: cookCheck.missing,
        };
      }

      if (availability.canCook !== false && availability.available >= availability.required) {
        results.summary.availableItems++;
      } else {
        results.summary.missingItems.push({
          itemType: item.itemType,
          name: item.itemType === 'recipe' 
            ? item.recipeId?.title 
            : item.ingredientId?.name,
          ...availability,
        });
      }

      mealResult.items.push({
        ...item,
        availability,
      });
    }

    results.meals.push(mealResult);
  }

  return results;
};

const checkIngredientAvailability = async (userId, groupId, ingredientId, unitId, quantity) => {
  const ownerQuery = buildOwnerQuery(userId, groupId);

  const agg = await FridgeItem.aggregate([
    {
      $match: {
        ...ownerQuery,
        $or: [{ itemType: 'ingredient' }, { itemType: { $exists: false } }],
        foodId: new mongoose.Types.ObjectId(ingredientId),
        unitId: new mongoose.Types.ObjectId(unitId),
        status: 'in-stock',
        quantity: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$quantity' },
      },
    },
  ]);

  const available = agg[0]?.total || 0;
  const required = Number(quantity) || 0;

  return {
    available,
    required,
    isEnough: available >= required,
    missing: Math.max(0, required - available),
  };
};

// ===============================================
//     UPDATE ITEM (SỬA LẠI - không auto consume)
// ===============================================

export const updateItem = async (userId, itemId, updateData, groupId) => {
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new Error('Invalid item ID');
  }

  const itemObjectId = new mongoose.Types.ObjectId(itemId);

  const plan = await MealPlan.findOne({
    userId,
    'meals.items._id': itemObjectId,
  });

  if (!plan) {
    throw new Error('Meal plan not found');
  }

  // Build update
  const setData = {};
  if (updateData.quantity !== undefined) {
    setData['meals.$[].items.$[inner].quantity'] = updateData.quantity;
  }
  if (updateData.note !== undefined) {
    setData['meals.$[].items.$[inner].note'] = updateData.note;
  }
  if (updateData.unitId !== undefined) {
    setData['meals.$[].items.$[inner].unitId'] = new mongoose.Types.ObjectId(updateData.unitId);
  }

  // ❌ Không tự động update isEaten/status ở đây
  // Dùng markItemEaten hoặc cookPlannedItem thay thế

  if (Object.keys(setData).length === 0) {
    return null;
  }

  const updatedPlan = await MealPlan.findOneAndUpdate(
    { userId, 'meals.items._id': itemObjectId },
    { $set: setData },
    {
      arrayFilters: [{ 'inner._id': itemObjectId }],
      new: true,
    }
  )
    .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime servings')
    .populate('meals.items.ingredientId', 'name imageURL')
    .populate('meals.items.unitId', 'name abbreviation');

  return updatedPlan;
};

// ===============================================
//     REMOVE ITEM (SỬA LẠI - không hoàn trả)
// ===============================================

export const removeItem = async (userId, itemId, groupId) => {
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new Error('Invalid item ID');
  }

  const itemObjectId = new mongoose.Types.ObjectId(itemId);

  // Chỉ đơn giản xóa item, không hoàn trả vì chưa trừ
  const result = await MealPlan.findOneAndUpdate(
    { userId, 'meals.items._id': itemObjectId },
    { $pull: { 'meals.$[].items': { _id: itemObjectId } } },
    { new: true }
  );

  if (!result) {
    throw new Error('Meal item not found');
  }

  return { message: 'Item removed successfully' };
};

// ===============================================
//     SEARCH & RECOMMENDATIONS (giữ nguyên)
// ===============================================

export const searchRecipesForPlan = async (userId, query, targetFridgeIds, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const searchQuery = query
    ? { title: { $regex: query, $options: 'i' } }
    : {};

  const recipes = await Recipe.find(searchQuery)
    .skip(skip)
    .limit(limit)
    .lean();

  // Enrich with availability info
  const enriched = await Promise.all(
    recipes.map(async (recipe) => {
      const check = await cookingService.checkCookability({
        recipeId: recipe._id.toString(),
        userId,
        groupId: null,
      });
      return {
        ...recipe,
        canCook: check.canCook,
        missingCount: check.missing?.required?.length || 0,
      };
    })
  );

  return {
    recipes: enriched,
    page,
    limit,
    total: await Recipe.countDocuments(searchQuery),
  };
};

export const getRecommendationsForPlan = async (userId, targetFridgeIds, limit = 10) => {
  // Simple recommendation: recipes that can be cooked
  const recipes = await Recipe.find().limit(50).lean();

  const withAvailability = await Promise.all(
    recipes.map(async (recipe) => {
      const check = await cookingService.checkCookability({
        recipeId: recipe._id.toString(),
        userId,
        groupId: null,
      });
      return {
        ...recipe,
        canCook: check.canCook,
        missingCount: check.missing?.required?.length || 0,
      };
    })
  );

  // Sort by canCook first, then by missing count
  return withAvailability
    .sort((a, b) => {
      if (a.canCook && !b.canCook) return -1;
      if (!a.canCook && b.canCook) return 1;
      return a.missingCount - b.missingCount;
    })
    .slice(0, limit);
};

// ===============================================
//     COMPLETE DAY - MANUAL RECONCILE (SIMPLE)
// ===============================================

/**
 * Hoàn thành ngày - đánh dấu tất cả items chưa xử lý
 * @param {string} userId
 * @param {string} date
 * @param {object} options
 * @param {string} options.action - 'skip' | 'consume'
 *   - skip: Đánh dấu skipped, KHÔNG trừ fridge
 *   - consume: Cố gắng trừ fridge, nếu không đủ thì skip
 */
export const completeDayPlan = async (userId, date, options = {}) => {
  const { action = 'skip', groupId } = options;
  const targetDate = normalizeDate(date);

  const plan = await MealPlan.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    date: targetDate,
  });

  if (!plan) {
    throw new Error('No meal plan found for this date');
  }

  if (plan.isReconciled) {
    return {
      status: 'ALREADY_COMPLETED',
      message: 'This day has already been completed',
      completedAt: plan.reconciledAt,
    };
  }

  const results = {
    consumed: [],
    skipped: [],
    alreadyProcessed: [],
  };

  // Process each meal
  for (let mi = 0; mi < plan.meals.length; mi++) {
    const meal = plan.meals[mi];

    for (let ii = 0; ii < meal.items.length; ii++) {
      const item = meal.items[ii];

      // Skip already processed items
      if (['cooked', 'eaten', 'consumed', 'skipped'].includes(item.status)) {
        results.alreadyProcessed.push({
          itemId: item._id,
          status: item.status,
        });
        continue;
      }

      // Handle based on action
      if (action === 'skip') {
        // Simply mark as skipped
        plan.meals[mi].items[ii].status = 'skipped';
        plan.meals[mi].items[ii].consumedAt = new Date();
        results.skipped.push({ itemId: item._id });
      } else if (action === 'consume') {
        // Try to consume from fridge
        let consumed = false;

        if (item.itemType === 'ingredient') {
          const availability = await checkIngredientAvailability(
            userId,
            groupId,
            item.ingredientId,
            item.unitId,
            item.quantity
          );

          if (availability.isEnough) {
            await consumeIngredientFromFridge(
              userId,
              groupId,
              item.ingredientId,
              item.unitId,
              item.quantity
            );
            consumed = true;
          }
        }
        // Recipe không auto-cook trong simple mode, chỉ skip

        if (consumed) {
          plan.meals[mi].items[ii].status = 'consumed';
          plan.meals[mi].items[ii].consumedAt = new Date();
          results.consumed.push({ itemId: item._id });
        } else {
          plan.meals[mi].items[ii].status = 'skipped';
          plan.meals[mi].items[ii].consumedAt = new Date();
          results.skipped.push({ itemId: item._id });
        }
      }
    }
  }

  // Mark plan as completed
  plan.isReconciled = true;
  plan.reconciledAt = new Date();
  await plan.save();

  return {
    status: 'COMPLETED',
    message: `Day completed: ${results.consumed.length} consumed, ${results.skipped.length} skipped`,
    summary: {
      consumed: results.consumed.length,
      skipped: results.skipped.length,
      alreadyProcessed: results.alreadyProcessed.length,
    },
    details: results,
  };
};