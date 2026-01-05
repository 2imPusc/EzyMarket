import mongoose from 'mongoose';
import MealPlan from '../model/mealPlanRepository.js';
import Recipe from '../model/recipeRepository.js';
import FridgeItem from '../model/fridgeItemRepository.js';
import * as cookingService from './cookingService.js';

// ===============================================
//                HELPERS
// ===============================================

const normalizeDate = (dateString) => {
  const d = new Date(dateString);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Chuẩn hóa mealType: luôn về lowercase và 'snacks'
const normalizeMealType = (type) => {
  if (!type) throw new Error('Meal type is required');
  const lower = type.toLowerCase().trim();
  return lower === 'snack' ? 'snacks' : lower;
};

const getMealIndex = (plan, inputType) => {
  const normalized = normalizeMealType(inputType);
  const idx = plan.meals.findIndex((m) => m.mealType === normalized);
  if (idx === -1) {
    throw new Error(`Invalid meal type '${normalized}'. Plan only contains: ${plan.meals.map(m => m.mealType).join(', ')}`);
  }
  return idx;
};

// ✅ HELPER QUAN TRỌNG: Query theo Group hoặc User
const buildMealPlanQuery = (userId, groupId) => {
  if (groupId) {
    return { groupId: new mongoose.Types.ObjectId(groupId) };
  }
  return { userId: new mongoose.Types.ObjectId(userId), groupId: null };
};

// ===============================================
//          GET PLAN
// ===============================================

export const getPlanByDateRange = async (userId, startDate, endDate, groupId = null) => {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const query = {
    ...buildMealPlanQuery(userId, groupId),
    date: { $gte: start, $lte: end },
  };

  const plans = await MealPlan.find(query)
    .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime servings')
    .populate('meals.items.ingredientId', 'name imageURL')
    .populate('meals.items.unitId', 'name abbreviation')
    .populate('meals.items.cookedFridgeItemId', 'quantity status expiryDate')
    .sort({ date: 1 })
    .lean();

  return plans;
};

// ===============================================
//     ADD ITEM
// ===============================================

// ===============================================
//     ADD ITEM TO MEAL (SỬA LỖI VALIDATION)
// ===============================================

export const addItemToMeal = async (userId, data, groupId = null) => {
  const { date, mealType, itemType, recipeId, ingredientId, quantity, unitId, note } = data;

  if (!date || !mealType || !itemType || !quantity) {
    throw new Error('Missing required fields: date, mealType, itemType, quantity');
  }

  const normalized = normalizeMealType(mealType);
  const normalizedDate = normalizeDate(date);
  
  // 1. Tạo query để TÌM KIẾM (Search Query)
  // Nếu có groupId thì chỉ tìm theo groupId. Nếu không thì tìm theo userId.
  const searchQuery = buildMealPlanQuery(userId, groupId);
  
  // 2. Tìm plan trong database
  let plan = await MealPlan.findOne({ ...searchQuery, date: normalizedDate });

  // Định nghĩa cấu trúc các bữa ăn mặc định
  const defaultMeals = [
    { mealType: 'breakfast', items: [] },
    { mealType: 'lunch', items: [] },
    { mealType: 'dinner', items: [] },
    { mealType: 'snacks', items: [] },
  ];

  // 3. Logic Tạo Mới (Create) hoặc Sửa Lỗi (Heal)
  if (!plan || !plan.meals || plan.meals.length === 0) {
    if (!plan) {
      // ✅ FIX QUAN TRỌNG NHẤT Ở ĐÂY:
      // Khi tạo mới, ta KHÔNG ĐƯỢC dùng 'searchQuery' vì nó có thể thiếu userId.
      // Ta phải gán tường minh userId và groupId.
      
      console.log('Creating new plan for User:', userId, 'Group:', groupId); // Log check

      plan = new MealPlan({
        userId: new mongoose.Types.ObjectId(userId), // <--- BẮT BUỘC PHẢI CÓ
        groupId: groupId ? new mongoose.Types.ObjectId(groupId) : null,
        date: normalizedDate,
        meals: defaultMeals,
      });
    } else {
      // Trường hợp plan đã có nhưng mảng meals bị rỗng (lỗi dữ liệu cũ)
      plan.meals = defaultMeals;
    }
    
    await plan.save();
    // Reload lại plan để đảm bảo lấy đủ trường
    plan = await MealPlan.findById(plan._id);
  }

  // --- Logic thêm Item vào Meal (như cũ) ---

  const mealIdx = getMealIndex(plan, normalized);
  const qty = Number(quantity) || 1;

  const newItem = {
    itemType,
    quantity: qty,
    status: 'planned',
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

  // Check trùng item để merge quantity
  const existingIdx = plan.meals[mealIdx].items.findIndex((item) => {
    if (item.status !== 'planned') return false; 
    if (item.itemType !== itemType) return false;

    if (itemType === 'recipe') {
      return item.recipeId && item.recipeId.toString() === recipeId;
    }
    return (
      item.ingredientId && item.ingredientId.toString() === ingredientId &&
      item.unitId && item.unitId.toString() === unitId
    );
  });

  if (existingIdx !== -1) {
    plan.meals[mealIdx].items[existingIdx].quantity += qty;
  } else {
    plan.meals[mealIdx].items.push(newItem);
  }

  await plan.save();

  const updatedPlan = await MealPlan.findById(plan._id)
    .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime servings')
    .populate('meals.items.ingredientId', 'name imageURL')
    .populate('meals.items.unitId', 'name abbreviation');

  const mealItems = updatedPlan.meals[mealIdx].items;
  return existingIdx !== -1 ? mealItems[existingIdx] : mealItems[mealItems.length - 1];
};

// ===============================================
//     BULK ADD 
// ===============================================

export const addItemsToMealBulk = async (userId, data, groupId = null) => {
  // ✅ Lấy mealType từ data tổng (Root Level)
  const { date, mealType, items } = data;

  if (!date || !mealType || !Array.isArray(items) || items.length === 0) {
    throw new Error('Missing required fields: date, mealType, items[]');
  }

  const normalizedDate = normalizeDate(date);
  // ✅ Chuẩn hóa mealType 1 lần duy nhất cho cả mảng
  const normalizedMealType = normalizeMealType(mealType);
  
  const ownerQuery = buildMealPlanQuery(userId, groupId);

  let plan = await MealPlan.findOne({ ...ownerQuery, date: normalizedDate });

  const defaultMeals = [
    { mealType: 'breakfast', items: [] },
    { mealType: 'lunch', items: [] },
    { mealType: 'dinner', items: [] },
    { mealType: 'snacks', items: [] },
  ];

  // Logic tạo mới / sửa lỗi data rỗng (Giữ nguyên logic fix userId)
  if (!plan || !plan.meals || plan.meals.length === 0) {
    if (!plan) {
      plan = new MealPlan({
        userId: new mongoose.Types.ObjectId(userId),
        groupId: groupId ? new mongoose.Types.ObjectId(groupId) : null,
        date: normalizedDate,
        meals: defaultMeals,
      });
    } else {
      plan.meals = defaultMeals;
    }
    await plan.save();
    plan = await MealPlan.findById(plan._id);
  }

  // ✅ Tìm index của bữa ăn (VD: dinner) 1 lần duy nhất
  const mealIndex = getMealIndex(plan, normalizedMealType);

  // Xử lý từng item
  for (const item of items) {
    // ❌ Không lấy mealType từ item nữa
    const { itemType, recipeId, ingredientId, quantity, unitId, note } = item;
    
    const newItem = {
      itemType,
      quantity: quantity || 1,
      status: 'planned',
      isEaten: false,
      note: note || '',
    };

    if (itemType === 'recipe') {
      if (!recipeId) throw new Error('recipeId is required for recipe item');
      newItem.recipeId = new mongoose.Types.ObjectId(recipeId);
    } else {
      if (!ingredientId || !unitId) throw new Error('ingredientId and unitId are required');
      newItem.ingredientId = new mongoose.Types.ObjectId(ingredientId);
      newItem.unitId = new mongoose.Types.ObjectId(unitId);
    }

    // Push thẳng vào mealIndex đã tìm được ở trên
    plan.meals[mealIndex].items.push(newItem);
  }

  await plan.save();

  const updatedPlan = await MealPlan.findById(plan._id)
    .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime servings')
    .populate('meals.items.ingredientId', 'name imageURL')
    .populate('meals.items.unitId', 'name abbreviation');

  // Trả về danh sách items của bữa ăn đó
  return updatedPlan.meals[mealIndex].items;
};

// ===============================================
//     COOK PLANNED ITEM
// ===============================================

export const cookPlannedItem = async (userId, itemId, options = {}) => {
  const { groupId, force = false, cookedExpiryDays = 3 } = options;
  if (!mongoose.Types.ObjectId.isValid(itemId)) throw new Error('Invalid item ID');
  const itemObjectId = new mongoose.Types.ObjectId(itemId);

  // ✅ SỬA: Dùng buildMealPlanQuery để hỗ trợ Group
  const ownerQuery = buildMealPlanQuery(userId, groupId);
  const plan = await MealPlan.findOne({
    ...ownerQuery,
    'meals.items._id': itemObjectId,
  });

  if (!plan) throw new Error('Meal item not found (check group/personal context)');

  let targetItem = null;
  let targetMealIndex = -1;
  let targetItemIndex = -1;

  // Logic tìm item trong mảng meals (giữ nguyên)
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

  if (!targetItem) throw new Error('Meal item not found');
  if (targetItem.itemType !== 'recipe') throw new Error('Only recipe items can be cooked.');
  if (targetItem.status !== 'planned') throw new Error(`Item is already ${targetItem.status}.`);

  // Call cooking service
  const cookResult = await cookingService.cookFromRecipe({
    recipeId: targetItem.recipeId.toString(),
    servings: targetItem.quantity,
    userId,
    groupId,
    force,
    cookedExpiryDays,
  });

  plan.meals[targetMealIndex].items[targetItemIndex].status = 'cooked';
  plan.meals[targetMealIndex].items[targetItemIndex].cookedAt = new Date();
  plan.meals[targetMealIndex].items[targetItemIndex].cookedFridgeItemId = cookResult.cookedItem._id;

  await plan.save();

  const updatedPlan = await MealPlan.findById(plan._id)
    .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime servings')
    .populate('meals.items.cookedFridgeItemId', 'quantity status expiryDate');

  return {
    message: 'Recipe cooked successfully',
    item: updatedPlan.meals[targetMealIndex].items[targetItemIndex],
    cookingDetails: cookResult,
  };
};

// ===============================================
//     MARK ITEM EATEN
// ===============================================

export const markItemEaten = async (userId, itemId, options = {}) => {
  const { groupId, forceEat = false } = options;
  if (!mongoose.Types.ObjectId.isValid(itemId)) throw new Error('Invalid item ID');
  const itemObjectId = new mongoose.Types.ObjectId(itemId);

  // ✅ SỬA: Dùng buildMealPlanQuery
  const ownerQuery = buildMealPlanQuery(userId, groupId);
  const plan = await MealPlan.findOne({
    ...ownerQuery,
    'meals.items._id': itemObjectId,
  });

  if (!plan) throw new Error('Meal item not found');

  // ... (Logic tìm item giữ nguyên) ...
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

  if (!targetItem) throw new Error('Meal item not found');
  if (['eaten', 'consumed', 'skipped'].includes(targetItem.status)) {
    throw new Error(`Item is already ${targetItem.status}`);
  }

  let consumptionResult = null;

  if (targetItem.itemType === 'ingredient') {
    consumptionResult = await consumeIngredientFromFridge(
      userId,
      groupId,
      targetItem.ingredientId,
      targetItem.unitId,
      targetItem.quantity
    );

    if (!consumptionResult.fullyConsumed && !forceEat) {
      throw new Error(`Insufficient ingredient. Missing: ${consumptionResult.remaining}. Use forceEat=true.`);
    }

  } else if (targetItem.itemType === 'recipe') {
    if (targetItem.status === 'planned') throw new Error('Recipe must be cooked first. Use /cook endpoint.');

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
        throw new Error('Cooked dish not found in fridge. Use forceEat=true.');
      }
    }
  }

  plan.meals[targetMealIndex].items[targetItemIndex].status = 'eaten';
  plan.meals[targetMealIndex].items[targetItemIndex].eatenAt = new Date();
  plan.meals[targetMealIndex].items[targetItemIndex].isEaten = true;

  await plan.save();

  const updatedPlan = await MealPlan.findById(plan._id)
    .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime servings')
    .populate('meals.items.ingredientId', 'name imageURL')
    .populate('meals.items.unitId', 'name abbreviation');

  return {
    message: 'Item marked as eaten',
    item: updatedPlan.meals[targetMealIndex].items[targetItemIndex],
    consumption: consumptionResult,
  };
};

// ===============================================
//     CONSUME INGREDIENT FROM FRIDGE
// ===============================================

const consumeIngredientFromFridge = async (userId, groupId, ingredientId, unitId, quantity) => {
  let remaining = Number(quantity) || 0;
  if (remaining <= 0) return { consumed: 0, details: [] };

  const ownerQuery = buildMealPlanQuery(userId, groupId);

  const items = await FridgeItem.find({
    ...ownerQuery,
    $or: [{ itemType: 'ingredient' }, { itemType: { $exists: false } }],
    foodId: new mongoose.Types.ObjectId(ingredientId),
    unitId: new mongoose.Types.ObjectId(unitId),
    status: 'in-stock',
    quantity: { $gt: 0 },
  }).sort({ expiryDate: 1 });

  const details = [];
  let totalConsumed = 0;

  for (const item of items) {
    if (remaining <= 0) break;
    const take = Math.min(item.quantity, remaining);
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

  return { consumed: totalConsumed, remaining, details, fullyConsumed: remaining <= 0 };
};

// ===============================================
//     CHECK AVAILABILITY
// ===============================================

export const checkPlanAvailability = async (userId, planId, options = {}) => {
  const { groupId } = options;
  // ✅ SỬA: Query theo Group
  const ownerQuery = buildMealPlanQuery(userId, groupId);
  
  const plan = await MealPlan.findOne({ _id: planId, ...ownerQuery })
    .populate('meals.items.recipeId')
    .populate('meals.items.ingredientId')
    .lean();

  if (!plan) throw new Error('Meal plan not found');

  // ... (Phần logic check giữ nguyên, code cũ đã tốt) ...
  const results = {
    planId: plan._id,
    date: plan.date,
    meals: [],
    summary: { totalItems: 0, availableItems: 0, missingItems: [] },
  };

  for (const meal of plan.meals) {
    const mealResult = { mealType: meal.mealType, items: [] };
    for (const item of meal.items) {
      if (item.status !== 'planned') {
        mealResult.items.push({ ...item, availability: { status: item.status, checked: false } });
        continue;
      }
      results.summary.totalItems++;
      let availability;

      if (item.itemType === 'ingredient') {
        availability = await checkIngredientAvailability(
          userId, groupId, item.ingredientId._id || item.ingredientId, item.unitId, item.quantity
        );
      } else if (item.itemType === 'recipe') {
        const cookCheck = await cookingService.checkCookability({
          recipeId: (item.recipeId._id || item.recipeId).toString(),
          servings: item.quantity,
          userId, groupId, verbose: true,
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
          name: item.itemType === 'recipe' ? item.recipeId?.title : item.ingredientId?.name,
          ...availability,
        });
      }
      mealResult.items.push({ ...item, availability });
    }
    results.meals.push(mealResult);
  }
  return results;
};

const checkIngredientAvailability = async (userId, groupId, ingredientId, unitId, quantity) => {
  const ownerQuery = buildMealPlanQuery(userId, groupId);
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
    { $group: { _id: null, total: { $sum: '$quantity' } } },
  ]);
  const available = agg[0]?.total || 0;
  const required = Number(quantity) || 0;
  return { available, required, isEnough: available >= required, missing: Math.max(0, required - available) };
};

// ===============================================
//     UPDATE ITEM
// ===============================================

export const updateItem = async (userId, itemId, updateData, groupId) => {
  if (!mongoose.Types.ObjectId.isValid(itemId)) throw new Error('Invalid item ID');
  const itemObjectId = new mongoose.Types.ObjectId(itemId);

  // ✅ SỬA: Dùng buildMealPlanQuery
  const ownerQuery = buildMealPlanQuery(userId, groupId);
  const plan = await MealPlan.findOne({ ...ownerQuery, 'meals.items._id': itemObjectId });
  
  if (!plan) throw new Error('Meal plan/item not found');

  let currentItem = null;
  plan.meals.forEach(m => m.items.forEach(i => {
    if (i._id.equals(itemObjectId)) currentItem = i;
  }));

  if (currentItem && currentItem.status !== 'planned') {
    if (updateData.quantity !== undefined || updateData.unitId !== undefined) {
      throw new Error(`Cannot update quantity/unit for item with status '${currentItem.status}'.`);
    }
  }

  const setData = {};
  if (updateData.quantity !== undefined) setData['meals.$[].items.$[inner].quantity'] = updateData.quantity;
  if (updateData.note !== undefined) setData['meals.$[].items.$[inner].note'] = updateData.note;
  if (updateData.unitId !== undefined) setData['meals.$[].items.$[inner].unitId'] = new mongoose.Types.ObjectId(updateData.unitId);

  if (Object.keys(setData).length === 0) return null;

  // ✅ SỬA: findOneAndUpdate với query đúng
  return await MealPlan.findOneAndUpdate(
    { ...ownerQuery, 'meals.items._id': itemObjectId },
    { $set: setData },
    { arrayFilters: [{ 'inner._id': itemObjectId }], new: true }
  ).populate('meals.items.recipeId').populate('meals.items.ingredientId').populate('meals.items.unitId');
};

// ===============================================
//     REMOVE ITEM
// ===============================================

export const removeItem = async (userId, itemId, groupId) => {
  if (!mongoose.Types.ObjectId.isValid(itemId)) throw new Error('Invalid item ID');
  const itemObjectId = new mongoose.Types.ObjectId(itemId);
  
  // ✅ SỬA: Dùng buildMealPlanQuery
  const ownerQuery = buildMealPlanQuery(userId, groupId);

  const result = await MealPlan.findOneAndUpdate(
    { ...ownerQuery, 'meals.items._id': itemObjectId },
    { $pull: { 'meals.$[].items': { _id: itemObjectId } } },
    { new: true }
  );

  if (!result) throw new Error('Meal item not found');
  return { message: 'Item removed successfully' };
};

// ===============================================
//     SEARCH & COMPLETE (Giữ nguyên)
// ===============================================

// ✅ FIX: Thêm tham số groupId vào cuối
export const searchRecipesForPlan = async (userId, query, targetFridgeIds, page = 1, limit = 20, groupId = null) => {
  const skip = (page - 1) * limit;
  const searchQuery = query ? { title: { $regex: query, $options: 'i' } } : {};

  const recipes = await Recipe.find(searchQuery)
    .skip(skip)
    .limit(limit)
    .lean();

  const enriched = await Promise.all(
    recipes.map(async (recipe) => {
      // ✅ FIX: Truyền groupId vào checkCookability
      const check = await cookingService.checkCookability({
        recipeId: recipe._id.toString(),
        userId,
        groupId, // <--- Quan trọng: Check kho của Group
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

// ✅ FIX: Thêm tham số groupId vào cuối
export const getRecommendationsForPlan = async (userId, targetFridgeIds, limit = 10, groupId = null) => {
  // Simple logic: lấy 50 món đầu (có thể cải thiện logic gợi ý sau)
  const recipes = await Recipe.find().limit(50).lean();

  const withAvailability = await Promise.all(
    recipes.map(async (recipe) => {
      // ✅ FIX: Truyền groupId vào checkCookability
      const check = await cookingService.checkCookability({
        recipeId: recipe._id.toString(),
        userId,
        groupId, // <--- Quan trọng
      });
      return {
        ...recipe,
        canCook: check.canCook,
        missingCount: check.missing?.required?.length || 0,
      };
    })
  );

  return withAvailability
    .sort((a, b) => {
      if (a.canCook && !b.canCook) return -1;
      if (!a.canCook && b.canCook) return 1;
      return a.missingCount - b.missingCount;
    })
    .slice(0, limit);
};

export const completeDayPlan = async (userId, date, options = {}) => {
  const { action = 'skip', groupId } = options;
  const targetDate = normalizeDate(date);
  const ownerQuery = buildMealPlanQuery(userId, groupId);

  const plan = await MealPlan.findOne({ ...ownerQuery, date: targetDate });
  if (!plan) throw new Error('No meal plan found for this date');
  if (plan.isReconciled) {
    return { status: 'ALREADY_COMPLETED', message: 'This day has already been completed', completedAt: plan.reconciledAt };
  }

  const results = { consumed: [], skipped: [], alreadyProcessed: [] };

  for (let mi = 0; mi < plan.meals.length; mi++) {
    const meal = plan.meals[mi];
    for (let ii = 0; ii < meal.items.length; ii++) {
      const item = meal.items[ii];
      if (['cooked', 'eaten', 'consumed', 'skipped'].includes(item.status)) {
        results.alreadyProcessed.push({ itemId: item._id, status: item.status });
        continue;
      }
      if (action === 'skip') {
        plan.meals[mi].items[ii].status = 'skipped';
        plan.meals[mi].items[ii].consumedAt = new Date();
        results.skipped.push({ itemId: item._id });
      } else if (action === 'consume') {
        let consumed = false;
        if (item.itemType === 'ingredient') {
          const availability = await checkIngredientAvailability(
            userId, groupId, item.ingredientId, item.unitId, item.quantity
          );
          if (availability.isEnough) {
            await consumeIngredientFromFridge(
              userId, groupId, item.ingredientId, item.unitId, item.quantity
            );
            consumed = true;
          }
        }
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

  plan.isReconciled = true;
  plan.reconciledAt = new Date();
  await plan.save();

  return {
    status: 'COMPLETED',
    message: `Day completed`,
    summary: { consumed: results.consumed.length, skipped: results.skipped.length },
    details: results,
  };
};