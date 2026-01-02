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
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const plans = await MealPlan.find({
    userId,
    date: { $gte: start, $lte: end }
  })
  .populate('meals.items.recipeId', 'title imageUrl prepTime cookTime') // Populate Recipe
  .populate('meals.items.ingredientId', 'name imageURL') // Populate Ingredient
  .populate('meals.items.unitId', 'name abbreviation')   // Populate Unit
  .sort({ date: 1 })
  .lean();

  return plans;
};

const normalizeMealType = (type) => (type === 'snack' ? 'snacks' : type);

const getMealIndex = (plan, inputType) => {
  const t = normalizeMealType(inputType);
  const idx = plan.meals.findIndex(m => m.mealType === t);
  if (idx !== -1) return idx;
  // Fallback for legacy data
  return plan.meals.findIndex(m => m.mealType === 'snack');
};

// --- Inventory helpers ---
const computeExpiryDate = async (ingredientId, purchaseDate = new Date()) => {
  const ing = await Ingredient.findById(ingredientId).lean();
  const days = ing?.defaultExpireDays ?? 7;
  const expiry = new Date(purchaseDate);
  expiry.setDate(expiry.getDate() + days);
  return expiry;
};

const consumeFromFridge = async (userId, ingredientId, unitId, quantity) => {
  let remaining = quantity;
  const items = await FridgeItem.find({
    userId,
    foodId: ingredientId,
    unitId,
    status: 'in-stock'
  }).sort({ expiryDate: 1 });

  for (const fi of items) {
    if (remaining <= 0) break;
    const take = Math.min(fi.quantity, remaining);
    fi.quantity -= take;
    remaining -= take;
    if (fi.quantity <= 0) fi.status = 'used';
    await fi.save();
  }
  return remaining; // >0 means not enough stock; left as-is
};

const restockToFridge = async (userId, ingredientId, unitId, quantity) => {
  const existing = await FridgeItem.findOne({
    userId, foodId: ingredientId, unitId, status: 'in-stock'
  }).sort({ expiryDate: -1 });

  if (existing) {
    existing.quantity += quantity;
    await existing.save();
  } else {
    const expiryDate = await computeExpiryDate(ingredientId);
    await FridgeItem.create({
      userId,
      foodId: ingredientId,
      unitId,
      quantity,
      expiryDate,
      status: 'in-stock'
    });
  }
};

const adjustInventoryForMealItem = async (userId, item, eatenNow) => {
  if (item.itemType === 'ingredient') {
    const qty = item.quantity;
    if (eatenNow) await consumeFromFridge(userId, item.ingredientId, item.unitId, qty);
    else await restockToFridge(userId, item.ingredientId, item.unitId, qty);
  } else if (item.itemType === 'recipe') {
    const recipe = await Recipe.findById(item.recipeId).lean();
    if (!recipe) return;
    for (const ing of recipe.ingredients) {
      if (!ing.ingredientId || !ing.unitId) continue;
      if (ing.optional) continue; // Optional ingredients not strictly consumed
      const qty = (ing.quantity || 0) * (item.quantity || 1);
      if (eatenNow) await consumeFromFridge(userId, ing.ingredientId, ing.unitId, qty);
      else await restockToFridge(userId, ing.ingredientId, ing.unitId, qty);
    }
  }
};

export const addItemToMeal = async (userId, data) => {
  const { date, mealType, itemType, recipeId, ingredientId, unitId, quantity } = data;
  const targetDate = normalizeDate(date);

  let plan = await MealPlan.findOne({ userId, date: targetDate });
  if (!plan) {
    plan = new MealPlan({ userId, date: targetDate });
    await plan.save();
  }

  const mealIndex = getMealIndex(plan, mealType);
  if (mealIndex === -1) throw new Error('Invalid meal type');

  const newItem = {
    itemType,
    quantity: quantity || 1,
    isEaten: false
  };

  if (itemType === 'recipe') {
    if (!recipeId) throw new Error('Recipe ID required');
    newItem.recipeId = recipeId;

    // Merge by recipeId
    const existingIdx = plan.meals[mealIndex].items.findIndex(
      i => i.itemType === 'recipe' && i.recipeId?.toString() === recipeId.toString()
    );
    if (existingIdx >= 0) {
      plan.meals[mealIndex].items[existingIdx].quantity += newItem.quantity;
    } else {
      plan.meals[mealIndex].items.push(newItem);
    }
  } else if (itemType === 'ingredient') {
    if (!ingredientId || !unitId) throw new Error('Ingredient ID and Unit ID required');
    newItem.ingredientId = ingredientId;
    newItem.unitId = unitId;

    // Merge by ingredientId + unitId
    const existingIdx = plan.meals[mealIndex].items.findIndex(
      i => i.itemType === 'ingredient' &&
           i.ingredientId?.toString() === ingredientId.toString() &&
           i.unitId?.toString() === unitId.toString()
    );
    if (existingIdx >= 0) {
      plan.meals[mealIndex].items[existingIdx].quantity += newItem.quantity;
    } else {
      plan.meals[mealIndex].items.push(newItem);
    }
  } else {
    throw new Error('Invalid item type');
  }

  await plan.save();

  // Return the merged/created item
  const mealItems = plan.meals[mealIndex].items;
  const lastItem = mealItems[mealItems.length - 1];
  return lastItem;
};

export const addItemsToMealBulk = async (userId, { date, mealType, items }) => {
  const targetDate = normalizeDate(date);

  let plan = await MealPlan.findOne({ userId, date: targetDate });
  if (!plan) {
    plan = new MealPlan({ userId, date: targetDate });
    await plan.save();
  }

  const mealIndex = getMealIndex(plan, mealType);
  if (mealIndex === -1) {
    throw new Error('Invalid meal type');
  }

  // Consolidate incoming items by key
  const accMap = new Map();
  for (const item of items) {
    const { itemType, recipeId, ingredientId, unitId, quantity } = item;
    if (itemType === 'recipe') {
      if (!recipeId) throw new Error('Recipe ID required for recipe item');
      const key = `r:${recipeId}`;
      accMap.set(key, (accMap.get(key) || 0) + (quantity || 1));
    } else if (itemType === 'ingredient') {
      if (!ingredientId || !unitId) throw new Error('Ingredient ID and Unit ID required for ingredient item');
      const key = `i:${ingredientId}:${unitId}`;
      accMap.set(key, (accMap.get(key) || 0) + (quantity || 1));
    } else {
      throw new Error('Invalid item type');
    }
  }

  // Merge into existing meal items
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

  // Return the whole meal items (or the last N if preferred)
  return plan.meals[mealIndex].items;
};

export const updateItem = async (userId, itemId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new Error('Invalid Item ID');
  }
  const itemObjectId = new mongoose.Types.ObjectId(itemId);

  // Load plan and targetItem to check type and previous isEaten
  const plan = await MealPlan.findOne({ userId, "meals.items._id": itemObjectId });
  if (!plan) return null;

  let targetItem = null;
  let targetMealIndex = -1;
  for (let mi = 0; mi < plan.meals.length; mi++) {
    const found = plan.meals[mi].items.find(item => item._id.equals(itemObjectId));
    if (found) {
      targetItem = found;
      targetMealIndex = mi;
      break;
    }
  }
  if (!targetItem) return null;

  if (updateData.unitId && targetItem.itemType === 'recipe') {
    throw new Error('Cannot update unitId for a recipe item');
  }

  const prevIsEaten = targetItem.isEaten;

  const setData = {};
  if (updateData.quantity !== undefined) setData["meals.$[].items.$[inner].quantity"] = updateData.quantity;
  if (updateData.isEaten !== undefined) setData["meals.$[].items.$[inner].isEaten"] = updateData.isEaten;
  if (updateData.note !== undefined) setData["meals.$[].items.$[inner].note"] = updateData.note;
  if (updateData.unitId !== undefined) setData["meals.$[].items.$[inner].unitId"] = updateData.unitId;

  if (Object.keys(setData).length === 0) {
    return null;
  }

  const updatedPlan = await MealPlan.findOneAndUpdate(
    { userId, "meals.items._id": itemObjectId },
    { $set: setData },
    {
      arrayFilters: [{ "inner._id": itemObjectId }],
      new: true
    }
  );

  // After update, fetch the updated item to compute inventory adjustment correctly
  let updatedItem = null;
  for (const meal of updatedPlan.meals) {
    const found = meal.items.find(i => i._id.equals(itemObjectId));
    if (found) {
      updatedItem = found;
      break;
    }
  }

  if (updatedItem && updateData.isEaten !== undefined && updateData.isEaten !== prevIsEaten) {
    // Adjust inventory only when eaten status toggles
    await adjustInventoryForMealItem(userId, updatedItem, updateData.isEaten);
  }

  return updatedPlan;
};

// removeItem giữ nguyên
export const removeItem = async (userId, itemId) => {
  const result = await MealPlan.findOneAndUpdate(
    { userId, "meals.items._id": itemId },
    { $pull: { "meals.$.items": { _id: itemId } } },
    { new: true }
  );
  if (!result) throw new Error('Meal item not found');
  return { message: 'Item removed' };
};

/**
 * Helper: Tính toán độ sẵn sàng của nguyên liệu cho danh sách Recipes
 * Bây giờ query trực tiếp vào FridgeItem bằng owner (userId hoặc groupId)
 */
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

/**
 * searchRecipesForPlan: truyền groupId nếu cần
 */
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

/**
 * getRecommendationsForPlan: dùng fridge-items của user hoặc group
 */
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