import MealPlan from '../model/mealPlanRepository.js';
import Recipe from '../model/recipeRepository.js';
import FridgeItem from '../model/fridgeItemRepository.js';
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

export const addItemToMeal = async (userId, data) => {
  const { date, mealType, itemType, recipeId, ingredientId, unitId, quantity } = data;
  const targetDate = normalizeDate(date);

  let plan = await MealPlan.findOne({ userId, date: targetDate });
  if (!plan) {
    plan = new MealPlan({ userId, date: targetDate });
    await plan.save();
  }

  const mealIndex = plan.meals.findIndex(m => m.mealType === mealType);
  if (mealIndex === -1) throw new Error('Invalid meal type');

  // Chuẩn bị item data dựa trên type
  const newItem = {
    itemType,
    quantity: quantity || 1,
    isEaten: false
  };

  if (itemType === 'recipe') {
    if (!recipeId) throw new Error('Recipe ID required');
    newItem.recipeId = recipeId;
    // Recipe có thể không cần unit (mặc định là suất)
  } else if (itemType === 'ingredient') {
    if (!ingredientId || !unitId) throw new Error('Ingredient ID and Unit ID required');
    newItem.ingredientId = ingredientId;
    newItem.unitId = unitId;
  } else {
    throw new Error('Invalid item type');
  }

  plan.meals[mealIndex].items.push(newItem);
  await plan.save();

  return plan.meals[mealIndex].items[plan.meals[mealIndex].items.length - 1];
};

export const addItemsToMealBulk = async (userId, { date, mealType, items }) => {
  const targetDate = normalizeDate(date);

  // 1. Tìm hoặc tạo mới Document cho ngày đó
  let plan = await MealPlan.findOne({ userId, date: targetDate });

  if (!plan) {
    plan = new MealPlan({ userId, date: targetDate });
    // Lưu lần đầu để hook pre-save chạy và tạo ra cấu trúc 4 bữa ăn (breakfast, lunch...)
    await plan.save();
  }

  // 2. Tìm đúng mealType
  const mealIndex = plan.meals.findIndex(m => m.mealType === mealType);
  if (mealIndex === -1) {
    throw new Error('Invalid meal type');
  }

  // 3. Chuẩn bị danh sách item để push
  const validItems = items.map(item => {
    const { itemType, recipeId, ingredientId, unitId, quantity } = item;
    
    const newItem = {
      itemType,
      quantity: quantity || 1,
      isEaten: false
    };

    // Validate từng item
    if (itemType === 'recipe') {
      if (!recipeId) throw new Error('Recipe ID required for recipe item');
      newItem.recipeId = recipeId;
    } else if (itemType === 'ingredient') {
      if (!ingredientId || !unitId) throw new Error('Ingredient ID and Unit ID required for ingredient item');
      newItem.ingredientId = ingredientId;
      newItem.unitId = unitId;
    } else {
      throw new Error('Invalid item type');
    }

    return newItem;
  });

  // 4. Push toàn bộ vào mảng items của bữa ăn đó
  plan.meals[mealIndex].items.push(...validItems);
  
  // 5. Save một lần duy nhất (Atomic Operation)
  await plan.save();

  // Trả về danh sách các item vừa thêm (để frontend update UI nếu cần)
  // Lấy N phần tử cuối cùng của mảng
  const addedItems = plan.meals[mealIndex].items.slice(-validItems.length);
  return addedItems;
};

export const updateItem = async (userId, itemId, updateData) => {
  // 1. Ép kiểu ObjectId cho itemId
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new Error('Invalid Item ID');
  }
  const itemObjectId = new mongoose.Types.ObjectId(itemId);

  // Nếu yêu cầu cập nhật unitId, phải kiểm tra xem item đó có phải là Ingredient không
  if (updateData.unitId) {
    const plan = await MealPlan.findOne({ userId, "meals.items._id": itemObjectId });
    
    if (plan) {
      // Tìm item cụ thể trong mảng nested để check type
      let targetItem = null;
      for (const meal of plan.meals) {
        targetItem = meal.items.find(item => item._id.equals(itemObjectId));
        if (targetItem) break;
      }

      if (targetItem && targetItem.itemType === 'recipe') {
        throw new Error('Cannot update unitId for a recipe item');
      }
    }
  }

  // 2. Tạo dynamic set data (LƯU Ý: Dùng quantity thay vì servings)
  const setData = {};
  
  // --- SỬA TÊN TRƯỜNG TẠI ĐÂY ---
  if (updateData.quantity !== undefined) setData["meals.$[].items.$[inner].quantity"] = updateData.quantity;
  // -------------------------------
  
  if (updateData.isEaten !== undefined) setData["meals.$[].items.$[inner].isEaten"] = updateData.isEaten;
  if (updateData.note !== undefined) setData["meals.$[].items.$[inner].note"] = updateData.note;
  if (updateData.unitId !== undefined) setData["meals.$[].items.$[inner].unitId"] = updateData.unitId;

  // Nếu không có trường nào hợp lệ để update, trả về null ngay
  if (Object.keys(setData).length === 0) {
      console.log("No valid fields to update"); // Log để debug
      return null;
  }

  const result = await MealPlan.findOneAndUpdate(
    { 
      userId, 
      "meals.items._id": itemObjectId // Dùng ObjectId đã ép kiểu để query chính xác
    },
    { $set: setData },
    { 
      arrayFilters: [{ "inner._id": itemObjectId }], // Dùng ObjectId đã ép kiểu
      new: true 
    }
  );

  return result;
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