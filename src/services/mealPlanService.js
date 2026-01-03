import MealPlan from '../model/mealPlanRepository.js';
import Recipe from '../model/recipeRepository.js';
import FridgeItem from '../model/fridgeItemRepository.js';
import Ingredient from '../model/ingredientRepository.js';
import mongoose from 'mongoose';

const normalizeDate = (dateString) => {
  const d = new Date(dateString);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const getPlanByDateRange = async (userId, startDate, endDate) => {
  // ...existing code...
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const plans = await MealPlan.find({
    userId,
    date: { $gte: start, $lte: end }
  })
  .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime')
  .populate('meals.items.ingredientId', 'name imageURL')
  .populate('meals.items.unitId', 'name abbreviation')
  .sort({ date: 1 })
  .lean();

  return plans;
};

const normalizeMealType = (type) => (type === 'snack' ? 'snacks' : type);

const getMealIndex = (plan, inputType) => {
  const t = normalizeMealType(inputType);
  const idx = plan.meals.findIndex(m => m.mealType === t);
  if (idx !== -1) return idx;
  return plan.meals.findIndex(m => m.mealType === 'snack');
};

// ===============================================
//          INVENTORY HELPERS (ĐÃ SỬA)
// ===============================================

/**
 * Trừ nguyên liệu từ tủ lạnh (FIFO)
 */
const consumeFromFridge = async (userId, groupId, ingredientId, unitId, quantity) => {
  let remaining = quantity;
  
  // LOGIC QUAN TRỌNG: Nếu có nhóm thì tìm theo groupId, nếu không tìm theo userId
  const query = {
    foodId: ingredientId,
    unitId: unitId,
    status: 'in-stock',
    ...(groupId ? { groupId } : { userId, groupId: null }) 
  };

  const items = await FridgeItem.find(query).sort({ expiryDate: 1 });

  for (const fi of items) {
    if (remaining <= 0) break;
    const take = Math.min(Number(fi.quantity) || 0, remaining);
    if (take > 0) {
      fi.quantity -= take;
      remaining -= take;
      if (fi.quantity <= 0) fi.status = 'used';
      await fi.save();
    }
  }
  return remaining;
};

/**
 * Hoàn trả nguyên liệu về tủ lạnh
 */
const restockToFridge = async (userId, groupId, ingredientId, unitId, quantity) => {
  const query = {
    foodId: ingredientId,
    unitId: unitId,
    status: 'in-stock',
    ...(groupId ? { groupId } : { userId, groupId: null })
  };

  const existing = await FridgeItem.findOne(query).sort({ expiryDate: -1 });

  if (existing) {
    existing.quantity += quantity;
    await existing.save();
  } else {
    const ing = await Ingredient.findById(ingredientId).lean();
    const days = ing?.defaultExpireDays ?? 7;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    // Tạo mới item với đúng Owner (Cá nhân hoặc Nhóm)
    await FridgeItem.create({
      userId: groupId ? null : userId,
      groupId: groupId || null,
      foodId: ingredientId,
      unitId,
      quantity,
      expiryDate,
      status: 'in-stock'
    });
  }
};

/**
 * Trừ nguyên liệu khi THÊM item vào meal
 * Xử lý cả recipe (trừ tất cả ingredients) và ingredient đơn lẻ
 */
const consumeInventoryForItem = async (userId, groupId, itemType, itemData, quantity) => {
  if (itemType === 'ingredient') {
    await consumeFromFridge(userId, groupId, itemData.ingredientId, itemData.unitId, quantity);
  } else if (itemType === 'recipe') {
    const recipe = await Recipe.findById(itemData.recipeId).lean();
    if (!recipe) return;
    for (const ing of recipe.ingredients) {
      if (!ing.ingredientId || !ing.unitId) continue;
      const consumeQty = (ing.quantity || 0) * quantity;
      await consumeFromFridge(userId, groupId, ing.ingredientId, ing.unitId, consumeQty);
    }
  }
};

/**
 * Hoàn trả nguyên liệu khi XÓA item khỏi meal
 */
const restockInventoryForItem = async (userId, itemType, itemData, quantity) => {
  if (itemType === 'ingredient') {
    await restockToFridge(userId, itemData.ingredientId, itemData.unitId, quantity);
  } else if (itemType === 'recipe') {
    const recipe = await Recipe.findById(itemData.recipeId).lean();
    if (!recipe) return;
    
    for (const ing of recipe.ingredients) {
      if (!ing.ingredientId || !ing.unitId) continue;
      if (ing.optional) continue;
      
      const restockQty = (ing.quantity || 0) * quantity;
      await restockToFridge(userId, ing.ingredientId, ing.unitId, restockQty);
    }
  }
};

// ===============================================
//          ADD ITEM (ĐÃ SỬA)
// ===============================================

export const addItemToMeal = async (userId, data) => {
  const { date, mealType, itemType, recipeId, ingredientId, unitId, quantity } = data;
  const targetDate = normalizeDate(date);
  const qty = quantity || 1;

  let plan = await MealPlan.findOne({ userId, date: targetDate });
  if (!plan) {
    plan = new MealPlan({ userId, date: targetDate });
    await plan.save();
  }

  const mealIndex = getMealIndex(plan, mealType);
  if (mealIndex === -1) throw new Error('Invalid meal type');

  const newItem = {
    itemType,
    quantity: qty,
    isEaten: false
  };

  let addedQty = qty; // Số lượng thực sự được thêm mới (để trừ inventory)

  if (itemType === 'recipe') {
    if (!recipeId) throw new Error('Recipe ID required');
    newItem.recipeId = recipeId;

    // Merge nếu đã tồn tại
    const existingIdx = plan.meals[mealIndex].items.findIndex(
      i => i.itemType === 'recipe' && i.recipeId?.toString() === recipeId.toString()
    );
    if (existingIdx >= 0) {
      plan.meals[mealIndex].items[existingIdx].quantity += qty;
      addedQty = qty; // Chỉ trừ phần mới thêm
    } else {
      plan.meals[mealIndex].items.push(newItem);
    }
  } else if (itemType === 'ingredient') {
    if (!ingredientId || !unitId) throw new Error('Ingredient ID and Unit ID required');
    newItem.ingredientId = ingredientId;
    newItem.unitId = unitId;

    // Merge nếu đã tồn tại
    const existingIdx = plan.meals[mealIndex].items.findIndex(
      i => i.itemType === 'ingredient' &&
           i.ingredientId?.toString() === ingredientId.toString() &&
           i.unitId?.toString() === unitId.toString()
    );
    if (existingIdx >= 0) {
      plan.meals[mealIndex].items[existingIdx].quantity += qty;
      addedQty = qty;
    } else {
      plan.meals[mealIndex].items.push(newItem);
    }
  } else {
    throw new Error('Invalid item type');
  }

  await plan.save();

  // 🔥 TRỪ INVENTORY NGAY KHI THÊM
  await consumeInventoryForItem(userId, groupId, itemType, { recipeId, ingredientId, unitId }, qty);

  // 3. QUAN TRỌNG: Load lại item và Populate để trả về cho Frontend hiển thị ngay
  const updatedPlan = await MealPlan.findById(plan._id)
    .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime')
    .populate('meals.items.ingredientId', 'name imageURL')
    .populate('meals.items.unitId', 'name abbreviation');

  const mealItems = updatedPlan.meals[mealIndex].items;
  return mealItems[mealItems.length - 1];
};

// ===============================================
//          BULK ADD (ĐÃ SỬA)
// ===============================================

export const addItemsToMealBulk = async (userId, data) => {
  const { date, mealType, items, groupId } = data;
  const targetDate = normalizeDate(date);

  let plan = await MealPlan.findOne({ userId, date: targetDate });
  if (!plan) {
    plan = new MealPlan({ userId, date: targetDate });
    await plan.save();
  }

  const mealIndex = getMealIndex(plan, mealType);
  if (mealIndex === -1) throw new Error('Invalid meal type');

  // Consolidate items và track số lượng để trừ inventory
  const accMap = new Map();
  const inventoryUpdates = []; // Track để trừ inventory sau

  for (const item of items) {
    const { itemType, recipeId, ingredientId, unitId, quantity } = item;
    const qty = quantity || 1;

    if (itemType === 'recipe') {
      if (!recipeId) throw new Error('Recipe ID required for recipe item');
      const key = `r:${recipeId}`;
      accMap.set(key, (accMap.get(key) || 0) + qty);
      inventoryUpdates.push({ itemType, recipeId, quantity: qty });
    } else if (itemType === 'ingredient') {
      if (!ingredientId || !unitId) throw new Error('Ingredient ID and Unit ID required');
      const key = `i:${ingredientId}:${unitId}`;
      accMap.set(key, (accMap.get(key) || 0) + qty);
      inventoryUpdates.push({ itemType, ingredientId, unitId, quantity: qty });
    } else {
      throw new Error('Invalid item type');
    }
  }

  // Merge vào meal plan
  for (const [key, qty] of accMap.entries()) {
    if (key.startsWith('r:')) {
      const recipeId = key.split(':')[1];
      const idx = plan.meals[mealIndex].items.findIndex(
        i => i.itemType === 'recipe' && i.recipeId?.toString() === recipeId.toString()
      );
      if (idx >= 0) {
        plan.meals[mealIndex].items[idx].quantity += qty;
      } else {
        plan.meals[mealIndex].items.push({
          itemType: 'recipe',
          recipeId,
          quantity: qty,
          isEaten: false
        });
      }
    } else {
      const [, ingredientId, unitId] = key.split(':');
      const idx = plan.meals[mealIndex].items.findIndex(
        i => i.itemType === 'ingredient' &&
             i.ingredientId?.toString() === ingredientId.toString() &&
             i.unitId?.toString() === unitId.toString()
      );
      if (idx >= 0) {
        plan.meals[mealIndex].items[idx].quantity += qty;
      } else {
        plan.meals[mealIndex].items.push({
          itemType: 'ingredient',
          ingredientId,
          unitId,
          quantity: qty,
          isEaten: false
        });
      }
    }
  }

  await plan.save();

  // 🔥 TRỪ INVENTORY CHO TẤT CẢ ITEMS
  for (const update of inventoryUpdates) {
    await consumeInventoryForItem(userId, groupId, update.itemType, update, update.quantity);
  }

  return plan.meals[mealIndex].items;
};

// ===============================================
//          UPDATE ITEM (ĐÃ SỬA)
// ===============================================

export const updateItem = async (userId, itemId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new Error('Invalid Item ID');
  }
  const itemObjectId = new mongoose.Types.ObjectId(itemId);

  const plan = await MealPlan.findOne({ userId, "meals.items._id": itemObjectId });
  if (!plan) return null;

  // Tìm item hiện tại
  let targetItem = null;
  for (const meal of plan.meals) {
    const found = meal.items.find(item => item._id.equals(itemObjectId));
    if (found) {
      targetItem = found;
      break;
    }
  }
  if (!targetItem) return null;

  if (updateData.unitId && targetItem.itemType === 'recipe') {
    throw new Error('Cannot update unitId for a recipe item');
  }

  const prevQuantity = targetItem.quantity;

  // Build update object
  const setData = {};
  if (updateData.quantity !== undefined) setData["meals.$[].items.$[inner].quantity"] = updateData.quantity;
  if (updateData.isEaten !== undefined) setData["meals.$[].items.$[inner].isEaten"] = updateData.isEaten;
  if (updateData.note !== undefined) setData["meals.$[].items.$[inner].note"] = updateData.note;
  if (updateData.unitId !== undefined) setData["meals.$[].items.$[inner].unitId"] = updateData.unitId;

  if (Object.keys(setData).length === 0) return null;

  const updatedPlan = await MealPlan.findOneAndUpdate(
    { userId, "meals.items._id": itemObjectId },
    { $set: setData },
    {
      arrayFilters: [{ "inner._id": itemObjectId }],
      new: true
    }
  );

  // 🔥 XỬ LÝ THAY ĐỔI QUANTITY: Tính delta và cập nhật inventory
  if (updateData.quantity !== undefined && updateData.quantity !== prevQuantity) {
    const delta = updateData.quantity - prevQuantity;
    const itemData = {
      recipeId: targetItem.recipeId,
      ingredientId: targetItem.ingredientId,
      unitId: updateData.unitId || targetItem.unitId
    };

    if (delta > 0) {
      await consumeInventoryForItem(userId, groupId, targetItem.itemType, itemData, delta);
    } else {
      await restockInventoryForItem(userId, groupId, targetItem.itemType, itemData, Math.abs(delta));
    }
  }

  return updatedPlan;
};

// ===============================================
//          REMOVE ITEM (ĐÃ SỬA)
// ===============================================

export const removeItem = async (userId, itemId) => {
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new Error('Invalid Item ID');
  }
  const itemObjectId = new mongoose.Types.ObjectId(itemId);

  // Tìm item trước khi xóa để lấy thông tin hoàn trả
  const plan = await MealPlan.findOne({ userId, "meals.items._id": itemObjectId });
  if (!plan) throw new Error('Meal item not found');

  let targetItem = null;
  for (const meal of plan.meals) {
    const found = meal.items.find(item => item._id.equals(itemObjectId));
    if (found) {
      targetItem = found;
      break;
    }
  }
  if (!targetItem) throw new Error('Meal item not found');

  // Xóa item khỏi meal plan
  const result = await MealPlan.findOneAndUpdate(
    { userId, "meals.items._id": itemObjectId },
    { $pull: { "meals.$.items": { _id: itemObjectId } } },
    { new: true }
  );

  // 🔥 HOÀN TRẢ INVENTORY KHI XÓA
  await restockInventoryForItem(userId, groupId, targetItem.itemType, targetItem, targetItem.quantity);

  return { message: 'Item removed and inventory restored' };
};

// ===============================================
//     SEARCH & RECOMMENDATIONS (GIỮ NGUYÊN)
// ===============================================

const enrichRecipesWithInventory = async (recipes, userId, groupId = null, targetOwnerIds = null) => {
  const query = { status: 'in-stock' };

  if (Array.isArray(targetOwnerIds) && targetOwnerIds.length > 0) {
    query.$or = [
      { userId: { $in: targetOwnerIds } },
      { groupId: { $in: targetOwnerIds } }
    ];
  } else if (groupId) {
    query.groupId = groupId;
  } else {
    query.userId = userId;
  }

  const fridgeItems = await FridgeItem.find(query).lean();

  const inventoryMap = {};
  for (const item of fridgeItems) {
    if (item.foodId && item.unitId) {
      const key = `${item.foodId.toString()}_${item.unitId.toString()}`;
      inventoryMap[key] = (inventoryMap[key] || 0) + item.quantity;
    }
  }

  return recipes.map(recipe => {
    let missingCount = 0;

    const enrichedIngredients = recipe.ingredients.map(ing => {
      if (!ing.ingredientId) return { ...ing, available: 0, isEnough: false };

      const ingId = ing.ingredientId.toString();
      const unitId = ing.unitId ? ing.unitId.toString() : 'null';
      const key = `${ingId}_${unitId}`;

      const available = inventoryMap[key] || 0;
      const isEnough = available >= ing.quantity;

      if (!isEnough && !ing.optional) missingCount++;

      return {
        ...ing,
        availableQuantity: available,
        isEnough
      };
    });

    return {
      _id: recipe._id,
      title: recipe.title,
      imageUrl: recipe.imageUrl,
      cookTime: recipe.cookTime,
      prepTime: recipe.prepTime,
      ingredients: enrichedIngredients,
      missingIngredientsCount: missingCount,
      canCook: missingCount === 0
    };
  });
};

export const searchRecipesForPlan = async (userId, query, groupId = null, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const filter = {};
  if (query) filter.$text = { $search: query };

  const recipes = await Recipe.find(filter)
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(limit)
    .lean();

  return await enrichRecipesWithInventory(recipes, userId, groupId);
};

export const getRecommendationsForPlan = async (userId, groupId = null, limit = 10) => {
  const query = { status: 'in-stock' };
  if (groupId) query.groupId = groupId;
  else query.userId = userId;

  const fridgeItems = await FridgeItem.find(query)
    .populate('foodId', 'name')
    .lean();

  const ingredientNames = fridgeItems.map(item => item.foodId?.name).filter(Boolean);
  if (ingredientNames.length === 0) return [];

  const recipes = await Recipe.find({
    'ingredients.name': { $in: ingredientNames.map(n => new RegExp(`^${n}`, 'i')) }
  })
  .limit(limit)
  .lean();

  return await enrichRecipesWithInventory(recipes, userId, groupId);
};