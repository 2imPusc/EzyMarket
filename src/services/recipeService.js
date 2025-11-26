import Recipe from '../model/recipeRepository.js';
import Ingredient from '../model/ingredientRepository.js';
import Unit from '../model/unitRepository.js';
import tagService from './tagService.js';
import mongoose from 'mongoose';

/**
 * Xác thực và giải quyết (validate and resolve) một mảng các nguyên liệu đầu vào.
 * Hàm này sẽ NÉM LỖI (throw error) nếu bất kỳ ingredientId hoặc unitId nào không hợp lệ.
 * @param {Array} ingredientsInput - Mảng nguyên liệu từ req.body.
 * @param {string} userId - ID của người dùng để kiểm tra quyền sở hữu nguyên liệu cá nhân.
 * @returns {Promise<Array>} - Mảng các nguyên liệu đã được xác thực và làm giàu thông tin.
 */
const resolveAndValidateIngredients = async (ingredientsInput = [], userId) => {
  // Dùng Promise.all để xử lý đồng thời và dừng lại ngay khi có lỗi
  return Promise.all(ingredientsInput.map(async (item) => {
    const resolvedItem = {
      name: item.name, // Giữ lại tên người dùng nhập làm snapshot
      quantity: item.quantity,
      unitText: item.unitText,
      note: item.note,
      optional: item.optional,
      ingredientRefId: null, // Mặc định là null
      ingredientRefType: undefined,
      unitId: null, // Mặc định là null
    };

    // --- BƯỚC VALIDATE INGREDIENT ---
    if (item.ingredientId) {
      if (!mongoose.Types.ObjectId.isValid(item.ingredientId)) {
        throw new Error(`Invalid format for ingredientId: ${item.ingredientId}`);
      }
      
      // Tìm ingredient VÀ đảm bảo nó là của hệ thống hoặc của chính người dùng
      const ingDoc = await Ingredient.findOne({
        _id: item.ingredientId,
        creatorId: { $in: [userId, null] }
      }).lean();

      if (!ingDoc) {
        throw new Error(`Ingredient with ID '${item.ingredientId}' not found or you don't have permission to use it.`);
      }
      
      resolvedItem.ingredientRefId = ingDoc._id;
      resolvedItem.ingredientRefType = 'Ingredient'; // Giờ chúng ta chỉ có 1 loại Ingredient
      resolvedItem.name = ingDoc.name; // Ghi đè bằng tên chuẩn từ DB
    }

    // --- BƯỚC VALIDATE UNIT ---
    if (item.unitId) {
      if (!mongoose.Types.ObjectId.isValid(item.unitId)) {
        throw new Error(`Invalid format for unitId: ${item.unitId}`);
      }

      const unitDoc = await Unit.findById(item.unitId).lean();
      if (!unitDoc) {
        throw new Error(`Unit with ID '${item.unitId}' not found.`);
      }

      resolvedItem.unitId = unitDoc._id;
      resolvedItem.unitText = unitDoc.abbreviation || unitDoc.name; // Ghi đè bằng đơn vị chuẩn
    }

    return resolvedItem;
  }));
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
  
  if (recipe.creatorId.toString() !== userId.toString() && !isAdmin) {
    throw new Error('Permission denied');
  }

  if (data.tags) {
    data.tags = await tagService.findOrCreateTags(data.tags, userId);
    // BỎ logic tagsSearch ở đây
  }

  if (data.ingredients) {
    data.ingredients = await resolveAndValidateIngredients(data.ingredients, userId);
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
    .populate('tags', 'name') // Populate tag để hiện tên
    .lean();
};

// --- SEARCH CHUẨN ---
export const searchRecipes = async ({ q, tagId, page = 1, limit = 20 }) => {
  const skip = (Math.max(parseInt(page), 1) - 1) * parseInt(limit);
  const lim = parseInt(limit);
  const filter = {};

  // 1. Filter theo ID Tag (Nhanh, Chính xác)
  if (tagId) {
    filter.tags = tagId; 
  }

  // 2. Filter theo Text
  let projection = {};
  let sort = { createdAt: -1 };

  if (q) {
    filter.$text = { $search: q };
    projection = { score: { $meta: 'textScore' } };
    sort = { score: { $meta: 'textScore' } };
  }

  const [recipes, total] = await Promise.all([
    Recipe.find(filter, projection)
      .sort(sort)
      .skip(skip)
      .limit(lim)
      .populate('creatorId', 'userName avatar') 
      .populate('tags', 'name') 
      .lean(),
    Recipe.countDocuments(filter),
  ]);

  return { recipes, total, page: parseInt(page), limit: lim, totalPages: Math.ceil(total / lim) };
};

export const getMyRecipes = async (userId, { q, page = 1, limit = 20 }) => {
  const skip = (Math.max(parseInt(page), 1) - 1) * parseInt(limit);
  const filter = { creatorId: userId };
  
  // Logic Text Search tương tự
  let projection = {};
  let sort = { createdAt: -1 };

  if (q) {
    filter.$text = { $search: q };
    projection = { score: { $meta: 'textScore' } };
    sort = { score: { $meta: 'textScore' } };
  }

  const [recipes, total] = await Promise.all([
    Recipe.find(filter, projection).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
    Recipe.countDocuments(filter),
  ]);

  return { recipes, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) };
};

export const getSystemRecipes = async ({ q, tagId, page = 1, limit = 20 }) => {
  const skip = (Math.max(parseInt(page), 1) - 1) * parseInt(limit);
  const lim = parseInt(limit);
  
  const filter = { creatorId: null }; 

  // SỬA: Dùng tagId thay vì tag name
  if (tagId) {
      filter.tags = tagId;
  }
  
  let projection = {};
  let sort = { createdAt: -1 };

  if (q) {
    filter.$text = { $search: q };
    projection = { score: { $meta: 'textScore' } };
    sort = { score: { $meta: 'textScore' } };
  }

  const [recipes, total] = await Promise.all([
    Recipe.find(filter, projection).sort(sort).skip(skip).limit(lim).lean(),
    Recipe.countDocuments(filter),
  ]);

  return { recipes, total, page: parseInt(page), limit: lim, totalPages: Math.ceil(total / lim) };
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

export const buildShoppingList = async (recipeId, availableNames = []) => {
  const recipe = await Recipe.findById(recipeId).lean();
  if (!recipe) throw new Error('Recipe not found');

  const haveSet = new Set(availableNames.map((n) => (n || '').toLowerCase().trim()));
  
  const missing = recipe.ingredients
    .filter((ing) => !haveSet.has((ing.name || '').toLowerCase().trim()))
    .map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unitAbbreviation || ing.unit,
      note: ing.note,
      optional: ing.optional,
    }));

  return { recipeId: recipe._id, title: recipe.title, missing };
};

export const suggestIngredientNames = async (prefix = '', limit = 10) => {
  if (!prefix) return await Ingredient.find().select('name').limit(limit).lean();
  const regex = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return await Ingredient.find({ name: regex }).select('name').limit(limit).lean();
};