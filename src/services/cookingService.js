import mongoose from 'mongoose';
import FridgeItem from '../model/fridgeItemRepository.js';
import Recipe from '../model/recipeRepository.js';

// Owner builder consistent with existing patterns (group first)
const buildOwnerQuery = (userId, groupId) => {
  if (groupId) return { groupId: new mongoose.Types.ObjectId(groupId) };
  if (userId) return { userId: new mongoose.Types.ObjectId(userId), groupId: null };
  throw new Error('Either userId or groupId is required');
};

// FIFO consumption with proportional price update and status handling
const consumeFIFO = async (userId, groupId, ingredientId, unitId, quantity) => {
  let remaining = Number(quantity) || 0;
  if (remaining <= 0) return { consumed: 0, details: [] };

  const ownerQuery = buildOwnerQuery(userId, groupId);

  const items = await FridgeItem.find({
    ...ownerQuery,
    // accept both new items and legacy items without itemType
    $or: [{ itemType: 'ingredient' }, { itemType: { $exists: false } }],
    foodId: new mongoose.Types.ObjectId(ingredientId),
    unitId: new mongoose.Types.ObjectId(unitId),
    status: 'in-stock',
    quantity: { $gt: 0 },
  }).sort({ expiryDate: 1 });

  const details = [];
  let totalConsumed = 0;

  for (const it of items) {
    if (remaining <= 0) break;

    const take = Math.min(it.quantity, remaining);
    if (take <= 0) continue;

    // Compute proportional price if present
    const oldQty = it.quantity;
    const oldPrice = it.price || 0;
    const unitPrice = oldQty > 0 && oldPrice > 0 ? (oldPrice / oldQty) : 0;

    it.quantity = oldQty - take;
    remaining -= take;
    totalConsumed += take;

    if (it.quantity <= 0) {
      it.quantity = 0;
      it.status = 'used';
      it.price = 0;
    } else if (unitPrice > 0) {
      // round to 2 decimals
      it.price = Math.round(unitPrice * it.quantity * 100) / 100;
    }

    await it.save();
    details.push({ itemId: it._id, taken: take });
  }

  return { consumed: totalConsumed, remaining, details };
};

export const checkCookability = async ({ recipeId, servings, userId, groupId, verbose = false }) => {
  const recipe = await Recipe.findById(recipeId).lean();
  if (!recipe) throw new Error('Recipe not found');

  const targetServings = Number(servings) || recipe.servings || 1;
  const ratio = targetServings / (recipe.servings || 1);
  const ownerQuery = buildOwnerQuery(userId, groupId);

  const results = [];
  for (const ing of (recipe.ingredients || []).filter(i => i.ingredientId)) {
    const required = Number(ing.quantity) * ratio;
    const matchQuery = {
      ...ownerQuery,
      $or: [{ itemType: 'ingredient' }, { itemType: { $exists: false } }],
      foodId: new mongoose.Types.ObjectId(ing.ingredientId),
      status: 'in-stock',
      quantity: { $gt: 0 },
    };
    if (ing.unitId) matchQuery.unitId = new mongoose.Types.ObjectId(ing.unitId);

    const agg = ing.unitId
      ? await FridgeItem.aggregate([{ $match: matchQuery }, { $group: { _id: null, total: { $sum: '$quantity' } } }])
      : [];
    const available = agg[0]?.total || 0;

    const isEnough = available >= required;
    results.push({
      ingredientId: ing.ingredientId,
      unitId: ing.unitId || null,
      name: ing.name,
      required,
      available,
      missing: isEnough ? 0 : required - available,
      optional: !!ing.optional,
      isEnough,
    });
  }

  const requiredMissing = results
    .filter(r => !r.optional && !r.isEnough)
    .map(({ ingredientId, unitId, name, required, available, missing }) => ({ ingredientId, unitId, name, required, available, missing }));

  const optionalMissing = results
    .filter(r => r.optional && !r.isEnough)
    .map(({ ingredientId, unitId, name, required, available, missing }) => ({ ingredientId, unitId, name, required, available, missing }));

  const response = {
    recipeId,
    recipeTitle: recipe.title,
    servings: targetServings,
    canCook: requiredMissing.length === 0,                    // đủ nguyên liệu bắt buộc
    canCookAll: requiredMissing.length === 0 && optionalMissing.length === 0, // đủ tất cả
    missing: {
      required: requiredMissing,
      optional: optionalMissing,
    },
  };

  if (verbose) response.ingredients = results; // chỉ bật khi cần
  return response;
};

export const cookFromRecipe = async ({ recipeId, servings, userId, groupId, force = false, cookedExpiryDays = 3 }) => {
  const check = await checkCookability({ recipeId, servings, userId, groupId });

  if (!check.canCook && !force) {
    const missingList = (check.missing && check.missing.required) || [];
    const missingNames = missingList
      .map(i => `${i.name} (required ${i.required}, available ${i.available})`)
      .join(', ');
    throw new Error(`Insufficient ingredients: ${missingNames}`);
  }

  const recipe = await Recipe.findById(recipeId).lean();
  const targetServings = Number(servings) || recipe.servings || 1;
  const ratio = targetServings / (recipe.servings || 1);

  // Build list to consume: consume all ingredients that have unitId
  const toConsume = (recipe.ingredients || [])
    .filter(ing => ing.ingredientId && ing.unitId)
    .map(ing => ({
      ingredientId: ing.ingredientId,
      unitId: ing.unitId,
      qty: Number(ing.quantity) * ratio,
      optional: !!ing.optional,
      name: ing.name,
    }));

  const consumptionDetails = [];
  const insufficients = [];

  for (const req of toConsume) {
    const result = await consumeFIFO(userId, groupId, req.ingredientId, req.unitId, req.qty);
    consumptionDetails.push({
      ingredientId: req.ingredientId,
      unitId: req.unitId,
      name: req.name,
      requested: req.qty,
      consumed: result.consumed,
      remainingToConsume: result.remaining,
      details: result.details,
      optional: req.optional,
    });

    if (result.remaining > 0 && !req.optional) {
      insufficients.push({
        name: req.name,
        required: req.qty,
        missing: result.remaining,
      });
    }
  }

  // Create cooked recipe fridge item (servings, no unitId)
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + Number(cookedExpiryDays));

  const cookedItem = await FridgeItem.create({
    userId: groupId ? null : new mongoose.Types.ObjectId(userId),
    groupId: groupId ? new mongoose.Types.ObjectId(groupId) : null,
    itemType: 'recipe',
    recipeId: new mongoose.Types.ObjectId(recipe._id),
    unitId: null,
    quantity: targetServings,
    purchaseDate: new Date(),
    expiryDate: expiry,
    status: 'in-stock',
    cookedFrom: { recipeId: recipe._id, cookedAt: new Date() },
    price: 0, // optional: aggregate cost later if needed
  });

  const populatedCooked = await FridgeItem.findById(cookedItem._id)
    .populate('recipeId', 'title imageUrl servings')
    .lean();

  // Sau vòng for tiêu thụ:
  const optionalInsufficients = consumptionDetails
    .filter(d => d.optional && d.remainingToConsume > 0)
    .map(d => ({ name: d.name, required: d.requested, missing: d.remainingToConsume }));

  return {
    message: 'Cooking completed',
    cookedItem: populatedCooked,
    consumption: consumptionDetails,
    warnings: [
      // hiện tại chỉ có thiếu required
      ...insufficients,
      // thêm thiếu optional nếu muốn
      ...optionalInsufficients,
    ],
  };
};