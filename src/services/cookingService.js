import mongoose from 'mongoose';
import FridgeItem from '../model/fridgeItemRepository.js';
import Recipe from '../model/recipeRepository.js';

/**
 * Kiểm tra có đủ nguyên liệu để nấu không
 */
export const checkCookability = async ({ recipeId, servings, userId, groupId }) => {
  const recipe = await Recipe.findById(recipeId).lean();
  if (!recipe) throw new Error('Recipe not found');

  const targetServings = servings || recipe.servings || 1;
  const ratio = targetServings / (recipe.servings || 1);

  const ownerQuery = groupId 
    ? { groupId: new mongoose.Types.ObjectId(groupId) } 
    : { userId: new mongoose.Types.ObjectId(userId), groupId: null };

  const results = [];

  for (const ing of recipe.ingredients.filter(i => i.ingredientId)) {
    const required = ing.quantity * ratio;

    const matchQuery = {
      ...ownerQuery,
      // 🔥 SỬA: Chấp nhận cả item cũ không có itemType
      $or: [
        { itemType: 'ingredient' },
        { itemType: { $exists: false } }  // Item cũ chưa có trường này
      ],
      foodId: new mongoose.Types.ObjectId(ing.ingredientId),
      status: 'in-stock',
      quantity: { $gt: 0 },
    };
    
    if (ing.unitId) {
      matchQuery.unitId = new mongoose.Types.ObjectId(ing.unitId);
    }

    const available = await FridgeItem.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);

    const totalAvailable = available[0]?.total || 0;

    results.push({
      ingredientId: ing.ingredientId,
      unitId: ing.unitId,
      name: ing.name,
      required,
      available: totalAvailable,
      isEnough: totalAvailable >= required,
      missing: totalAvailable >= required ? 0 : required - totalAvailable,
      optional: ing.optional || false,
    });
  }

  // 🔥 Chỉ xét nguyên liệu BẮT BUỘC (không optional)
  const canCook = results
    .filter(r => !r.optional)
    .every(r => r.isEnough);

  return {
    recipeId,
    recipeTitle: recipe.title,
    servings: targetServings,
    canCook,
    ingredients: results,
    missingIngredients: results.filter(r => !r.isEnough && !r.optional),
  };
};

/**
 * Nấu ăn: Trừ nguyên liệu từ tủ lạnh → Tạo món ăn mới
 * @param {Object} options
 * @param {boolean} options.force - Nếu true, cho phép nấu dù thiếu nguyên liệu
 */
export const cookRecipe = async ({ recipeId, servings, userId, groupId, force = false }) => {
  // 1. 🔥 KIỂM TRA KHẢ NĂNG NẤU TRƯỚC
  const cookabilityCheck = await checkCookability({ recipeId, servings, userId, groupId });
  
  if (!cookabilityCheck.canCook && !force) {
    // 🔥 KHÔNG CHO PHÉP NẤU nếu thiếu nguyên liệu và không force
    const missingNames = cookabilityCheck.missingIngredients
      .map(i => `${i.name} (cần ${i.required}, có ${i.available})`)
      .join(', ');
    
    throw new Error(`Insufficient ingredients: ${missingNames}`);
  }

  const recipe = await Recipe.findById(recipeId).lean();
  const targetServings = servings || recipe.servings || 1;
  const ratio = targetServings / (recipe.servings || 1);

  // 2. Trừ nguyên liệu từ tủ lạnh (FIFO)
  const consumedItems = [];
  const insufficientItems = [];

  const ownerQuery = groupId 
    ? { groupId: new mongoose.Types.ObjectId(groupId) } 
    : { userId: new mongoose.Types.ObjectId(userId), groupId: null };

  // Chỉ trừ nguyên liệu bắt buộc có đủ thông tin
  const requiredIngredients = recipe.ingredients
    .filter(ing => !ing.optional && ing.ingredientId && ing.unitId)
    .map(ing => ({
      ingredientId: ing.ingredientId,
      unitId: ing.unitId,
      quantity: ing.quantity * ratio,
      name: ing.name,
    }));

  for (const req of requiredIngredients) {
    let remaining = req.quantity;

    const fridgeItems = await FridgeItem.find({
      ...ownerQuery,
      // 🔥 SỬA: Thêm điều kiện chấp nhận item cũ
      $or: [
        { itemType: 'ingredient' },
        { itemType: { $exists: false } }
      ],
      foodId: new mongoose.Types.ObjectId(req.ingredientId),
      unitId: new mongoose.Types.ObjectId(req.unitId),
      status: 'in-stock',
      quantity: { $gt: 0 },
    }).sort({ expiryDate: 1 });

    // 🔥 DEBUG: Log để kiểm tra
    console.log(`Found ${fridgeItems.length} fridge items for ${req.name}`);

    for (const item of fridgeItems) {
      if (remaining <= 0) break;

      const take = Math.min(item.quantity, remaining);
      
      // 🔥 DEBUG: Log trước khi trừ
      console.log(`Taking ${take} from item ${item._id}, before: ${item.quantity}`);
      
      item.quantity -= take;
      remaining -= take;

      if (item.quantity <= 0) {
        item.status = 'consumed';
        item.quantity = 0;
      }

      // 🔥 DEBUG: Log sau khi trừ
      console.log(`After: ${item.quantity}, status: ${item.status}`);

      await item.save();
      consumedItems.push({ 
        itemId: item._id, 
        ingredientName: req.name,
        taken: take 
      });
    }

    if (remaining > 0) {
      insufficientItems.push({
        name: req.name,
        required: req.quantity,
        missing: remaining,
      });
    }
  }

  // 3. Tính ngày hết hạn cho món đã nấu (mặc định 3 ngày)
  const cookedExpiryDays = 3;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + cookedExpiryDays);

  // 4. Tạo fridge item mới cho món đã nấu
  const cookedItem = new FridgeItem({
    userId: groupId ? null : userId,
    groupId: groupId || null,
    itemType: 'recipe',
    recipeId: recipe._id,
    unitId: null,
    quantity: targetServings,
    purchaseDate: new Date(),
    expiryDate,
    status: 'in-stock',
    cookedFrom: {
      recipeId: recipe._id,
      cookedAt: new Date(),
    },
  });

  await cookedItem.save();

  // 5. Populate và trả về
  const populatedItem = await FridgeItem.findById(cookedItem._id)
    .populate('recipeId', 'title imageUrl servings')
    .lean();

  return {
    message: 'Cooking completed successfully',
    cookedItem: populatedItem,
    consumedIngredients: consumedItems,
    totalConsumed: consumedItems.length,
    // Chỉ có warnings nếu force = true và thiếu nguyên liệu
    warnings: force && insufficientItems.length > 0 ? insufficientItems : undefined,
  };
};