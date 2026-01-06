import mongoose from 'mongoose';
import Ingredient from '../model/ingredientRepository.js';
import Unit from '../model/unitRepository.js';
import Recipe from '../model/recipeRepository.js';
import tagService from './tagService.js';

/**
 * Xác thực và giải quyết (validate and resolve) một mảng các nguyên liệu đầu vào.
 * Hàm này sẽ NÉM LỖI (throw error) nếu bất kỳ ingredientId hoặc unitId nào không hợp lệ.
 * @param {Array} ingredientsInput - Mảng nguyên liệu từ req.body.
 * @param {string} userId - ID của người dùng để kiểm tra quyền sở hữu nguyên liệu cá nhân.
 * @returns {Promise<Array>} - Mảng các nguyên liệu đã được xác thực và làm giàu thông tin.
 */
const resolveAndValidateIngredients = async (ingredientsInput = [], userId) => {
  return Promise.all(
    (ingredientsInput || []).map(async (item, idx) => {
      const { ingredientId, unitId } = item;

      if (!item.name || typeof item.name !== 'string') {
        throw new Error(`Invalid format: ingredients[${idx}].name`);
      }
      if (item.quantity == null || Number.isNaN(Number(item.quantity)) || Number(item.quantity) < 0) {
        throw new Error(`Invalid format: ingredients[${idx}].quantity`);
      }

      let ingredientDoc = null;
      if (ingredientId) {
        if (!mongoose.Types.ObjectId.isValid(ingredientId)) {
          throw new Error(`Invalid format: ingredients[${idx}].ingredientId`);
        }
        ingredientDoc = await Ingredient.findById(ingredientId).lean();
        if (!ingredientDoc) {
          throw new Error(`Ingredient not found at #${idx + 1}`);
        }
        const isSystemIngredient = ingredientDoc.creatorId == null; // null hoặc undefined
        if (userId === null) {
          if (!isSystemIngredient) throw new Error(`System recipe must use system ingredient at #${idx + 1}`);
        } else {
          if (!isSystemIngredient && String(ingredientDoc.creatorId) !== String(userId)) {
            throw new Error(`Permission denied for ingredient at #${idx + 1}`);
          }
        }
      }

      if (unitId) {
        if (!mongoose.Types.ObjectId.isValid(unitId)) {
          throw new Error(`Invalid format: ingredients[${idx}].unitId`);
        }
        const unitDoc = await Unit.findById(unitId).lean();
        if (!unitDoc) throw new Error(`Unit not found at #${idx + 1}`);
      }

      const unitText = (item.unitText ?? item.unit ?? '').toString().trim();
      if (!unitText) throw new Error(`Invalid format: ingredients[${idx}].unitText`);

      return {
        ingredientId: ingredientDoc?._id ?? null,
        name: item.name.trim(),
        quantity: Number(item.quantity),
        unitId: unitId || null,
        unitText,
        note: item.note?.toString().trim() || undefined,
        optional: Boolean(item.optional),
      };
    })
  );
};

export const createRecipe = async (userId, data) => {
  const tagIds = await tagService.findOrCreateTags(data.tags, userId);
  const validatedIngredients = await resolveAndValidateIngredients(data.ingredients, userId);
  
  // BỎ tagsSearch
  const newRecipe = new Recipe({
    ...data,
    creatorId: userId,
    ingredients: validatedIngredients, 
    tags: tagIds
  });
  
  return await newRecipe.save();
};

export const updateRecipe = async (recipeId, userId, data, isAdmin = false) => {
  const recipe = await Recipe.findById(recipeId);
  if (!recipe) throw new Error('Recipe not found');

  // Admin bỏ qua check; user chỉ sửa recipe của mình; system recipe (creatorId=null) chỉ admin được sửa
  if (!isAdmin) {
    const recipeCreator = recipe.creatorId ? recipe.creatorId.toString() : null;
    const requester = userId?.toString?.() ?? null;
    if (recipeCreator !== requester) {
      throw new Error('Permission denied');
    }
  }

  // Context sở hữu cho tags/ingredients: theo chủ sở hữu của recipe
  const ownerContextId = recipe.creatorId ?? null;

  if (data.tags) {
    data.tags = await tagService.findOrCreateTags(data.tags, ownerContextId);
  }

  if (data.ingredients) {
    data.ingredients = await resolveAndValidateIngredients(data.ingredients, ownerContextId);
  }

  Object.assign(recipe, data);
  return await recipe.save();
};

export const deleteRecipe = async (recipeId, userId, isAdmin = false) => {
  if (!userId) throw new Error('User ID is required');
  const recipe = await Recipe.findById(recipeId);
  if (!recipe) throw new Error('Recipe not found');

  const creatorIdStr = String(recipe.creatorId);
  const userIdStr = String(userId);

  if (creatorIdStr !== userIdStr && !isAdmin) {
    throw new Error('Permission denied');
  }
  
  return await Recipe.deleteOne({ _id: recipeId });
};

export const getRecipeById = async (recipeId) => {
  if (!mongoose.Types.ObjectId.isValid(recipeId)) throw new Error('Invalid ID');
  return await Recipe.findById(recipeId)
    .populate('creatorId', 'userName email avatar')
    // Populate full tag info (limit to useful fields)
    .populate({ path: 'tags', select: '_id name creatorId createdAt updatedAt' })
    .lean();
};

// --- SEARCH CHUẨN ---
export const searchRecipes = async ({ q, tagId, page = 1, limit = 20 }) => {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (tagId) filter.tags = tagId;

  const queryText = (q || '').toString().trim();
  if (!queryText) { /* ...existing no-q behavior... */ }

  // q present -> use contains + startsWith priority on title only
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const esc = escapeRegex(queryText);
  const containsPattern = esc;
  const startsPattern = '^' + esc;

  const orMatch = [
    { title: { $regex: containsPattern, $options: 'i' } },
    { 'ingredients.name': { $regex: containsPattern, $options: 'i' } },
  ];

  const matchFilters = [];
  if (Object.keys(filter).length) matchFilters.push(filter);
  matchFilters.push({ $or: orMatch });

  const matchStage = { $match: matchFilters.length > 1 ? { $and: matchFilters } : matchFilters[0] };

  const addFieldsStage = {
    $addFields: {
      starts: {
        $cond: [
          { $regexMatch: { input: '$title', regex: startsPattern, options: 'i' } },
          1,
          0,
        ],
      },
    },
  };

  const pipelineResults = [
    matchStage,
    addFieldsStage,
    { $sort: { starts: -1, createdAt: -1, title: 1 } },
    { $skip: skip },
    { $limit: limitNum },
    { $project: { __v: 0 } },
  ];

  const pipelineCount = [matchStage, { $count: 'count' }];

  const agg = await Recipe.aggregate([
    { $facet: { results: pipelineResults, totalCount: pipelineCount } },
  ]);

  const recipes = (agg[0] && agg[0].results) || [];
  const total = (agg[0] && agg[0].totalCount && agg[0].totalCount[0] && agg[0].totalCount[0].count) || 0;

  const populated = await Recipe.populate(recipes, [
    { path: 'creatorId', select: 'userName avatar' },
    { path: 'tags', select: '_id name creatorId createdAt updatedAt' },
  ]);

  return { recipes: populated, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

// getMyRecipes - search in title only
export const getMyRecipes = async (userId, { q, page = 1, limit = 20 }) => {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const filter = { creatorId: userId };
  const queryText = (q || '').toString().trim();

  if (!queryText) { /* ...existing no-q behavior... */ }

  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const esc = escapeRegex(queryText);
  const containsPattern = esc;
  const startsPattern = '^' + esc;

  const orMatch = [
    { title: { $regex: containsPattern, $options: 'i' } },
    { 'ingredients.name': { $regex: containsPattern, $options: 'i' } },
  ];

  const matchStage = { $match: { $and: [filter, { $or: orMatch }] } };

  const addFieldsStage = {
    $addFields: {
      starts: {
        $cond: [
          { $regexMatch: { input: '$title', regex: startsPattern, options: 'i' } },
          1,
          0,
        ],
      },
    },
  };

  const pipelineResults = [
    matchStage,
    addFieldsStage,
    { $sort: { starts: -1, createdAt: -1, title: 1 } },
    { $skip: skip },
    { $limit: limitNum },
    { $project: { __v: 0 } },
  ];

  const pipelineCount = [matchStage, { $count: 'count' }];

  const agg = await Recipe.aggregate([{ $facet: { results: pipelineResults, totalCount: pipelineCount } }]);

  const results = (agg[0] && agg[0].results) || [];
  const total = (agg[0] && agg[0].totalCount && agg[0].totalCount[0] && agg[0].totalCount[0].count) || 0;

  const populated = await Recipe.populate(results, [
    { path: 'tags', select: '_id name creatorId createdAt updatedAt' },
  ]);

  return { recipes: populated, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

// getSystemRecipes - search in title only
export const getSystemRecipes = async ({ q, tagId, page = 1, limit = 20 }) => {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const baseFilter = { creatorId: null };
  if (tagId) baseFilter.tags = tagId;

  const queryText = (q || '').toString().trim();
  if (!queryText) { /* ...existing no-q behavior... */ }

  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const esc = escapeRegex(queryText);
  const containsPattern = esc;
  const startsPattern = '^' + esc;

  const orMatch = [
    { title: { $regex: containsPattern, $options: 'i' } },
    { 'ingredients.name': { $regex: containsPattern, $options: 'i' } },
  ];

  const matchStage = { $match: { $and: [baseFilter, { $or: orMatch }] } };

  const addFieldsStage = {
    $addFields: {
      starts: {
        $cond: [
          { $regexMatch: { input: '$title', regex: startsPattern, options: 'i' } },
          1,
          0,
        ],
      },
    },
  };

  const pipelineResults = [
    matchStage,
    addFieldsStage,
    { $sort: { starts: -1, createdAt: -1, title: 1 } },
    { $skip: skip },
    { $limit: limitNum },
    { $project: { __v: 0 } },
  ];

  const pipelineCount = [matchStage, { $count: 'count' }];

  const agg = await Recipe.aggregate([{ $facet: { results: pipelineResults, totalCount: pipelineCount } }]);

  const results = (agg[0] && agg[0].results) || [];
  const total = (agg[0] && agg[0].totalCount && agg[0].totalCount[0] && agg[0].totalCount[0].count) || 0;

  const populated = await Recipe.populate(results, [
    { path: 'tags', select: '_id name creatorId createdAt updatedAt' },
  ]);

  return { recipes: populated, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

/**
 * Đã tối ưu: Sử dụng Aggregation Pipeline thay vì xử lý trên RAM (JS)
 */
export const suggestRecipes = async (availableNames = [], { threshold = 0.6, limit = 20 }) => {
  const normalizedNames = availableNames.map(n => (n || '').toLowerCase().trim()).filter(Boolean);
  if (normalizedNames.length === 0) return [];

  const pipeline = [
    // 1. Pre-filter: Chỉ lấy các recipe có chứa ít nhất 1 nguyên liệu trong list
    { 
      $match: { 
        'ingredients.name': { $in: normalizedNames.map(n => new RegExp(`^${n}$`, 'i')) } 
      } 
    },
    // 2. Add fields để tính toán
    {
      $addFields: {
        // Lọc ra danh sách nguyên liệu BẮT BUỘC (không phải optional)
        requiredIngredients: {
          $filter: {
            input: "$ingredients",
            as: "ing",
            cond: { $eq: ["$$ing.optional", false] }
          }
        }
      }
    },
    {
      $addFields: {
        // Đếm số lượng nguyên liệu bắt buộc khớp với input
        matchedCount: {
          $size: {
            $filter: {
              input: "$requiredIngredients",
              as: "req",
              cond: { $in: [ { $toLower: "$$req.name" }, normalizedNames ] }
            }
          }
        },
        totalRequired: { $size: "$requiredIngredients" }
      }
    },
    // 3. Tính điểm số
    {
      $addFields: {
        score: {
          $cond: [
            { $eq: ["$totalRequired", 0] }, 
            0, 
            { $divide: ["$matchedCount", "$totalRequired"] }
          ]
        }
      }
    },
    // 4. Filter theo threshold và Sort
    { $match: { score: { $gte: threshold } } },
    { $sort: { score: -1 } },
    { $limit: parseInt(limit) },
    // 5. Project output gọn gàng
    {
      $project: {
        _id: 1, title: 1, description: 1, imageUrl: 1, 
        score: 1, matchedCount: 1, totalRequired: 1, ingredients: 1
      }
    }
  ];

  return await Recipe.aggregate(pipeline);
};

/**
 * Helper: Tính toán độ sẵn sàng của nguyên liệu cho danh sách Recipes
 * Bây giờ query trực tiếp vào FridgeItem bằng owner (userId hoặc groupId)
 */
const enrichRecipesWithInventory = async (recipes, userId, groupId = null, targetOwnerIds = null) => {
  // Nếu truyền targetOwnerIds (mảng groupId/userId) thì sử dụng nó, ưu tiên hơn groupId/userId
  const query = { status: 'in-stock' };

  if (Array.isArray(targetOwnerIds) && targetOwnerIds.length > 0) {
    // targetOwnerIds được hiểu là một list owner ids (có thể là group ids hoặc user ids tuỳ ngữ cảnh)
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
 * searchRecipesForPlan: truyền groupId nếu cần (nếu user có group)
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
 * getRecommendationsForPlan: dùng fridge-items của user hoặc group (nếu groupId truyền vào)
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