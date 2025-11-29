import MealPlan from '../model/mealPlanRepository.js';
import mongoose from 'mongoose';
// import Recipe & Ingredient models nếu cần validate kỹ hơn

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

export const updateItem = async (userId, itemId, updateData) => {
  // 1. Ép kiểu ObjectId cho itemId
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new Error('Invalid Item ID');
  }
  const itemObjectId = new mongoose.Types.ObjectId(itemId);

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