import Recipe from '../model/recipeRepository.js';
import Ingredient from '../model/ingredientRepository.js';
import Unit from '../model/unitRepository.js';
import tagService from './tagService.js';
import mongoose from 'mongoose';

const resolveIngredients = async (ingredientsInput) => {
  if (!Array.isArray(ingredientsInput)) return [];

  return Promise.all(ingredientsInput.map(async (item) => {
    let resolvedName = item.name;
    let resolvedUnitText = item.unitText || item.unit; // Hỗ trợ cả key cũ "unit"

    // Cố gắng tìm tên chuẩn từ ingredientId
    if (item.ingredientId && mongoose.Types.ObjectId.isValid(item.ingredientId)) {
      const ingDoc = await Ingredient.findById(item.ingredientId).select('name').lean();
      if (ingDoc) resolvedName = ingDoc.name;
    }

    // Nếu người dùng cung cấp unitId, ưu tiên lấy tên/viết tắt từ đó làm unitText
    if (item.unitId && mongoose.Types.ObjectId.isValid(item.unitId)) {
      const unitDoc = await Unit.findById(item.unitId).select('name abbreviation').lean();
      if (unitDoc) resolvedUnitText = unitDoc.abbreviation || unitDoc.name;
    }

    return {
      ingredientId: item.ingredientId || null,
      name: resolvedName || 'Unknown Ingredient',
      quantity: item.quantity || 0,
      unitId: item.unitId || null,
      unitText: resolvedUnitText || '', // Luôn đảm bảo có giá trị
      note: item.note || '',
      optional: !!item.optional,
    };
  }));
};

export const createRecipe = async (userId, data) => {
  const resolvedIngredients = await resolveIngredients(data.ingredients);
  const tagIds = await tagService.findOrCreateTags(data.tags, userId);
  
  const newRecipe = new Recipe({
    ...data,
    creatorId: userId,
    ingredients: resolvedIngredients,
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

  // Nếu client gửi lên một mảng tags mới
  if (data.tags) {
    data.tags = await tagService.findOrCreateTags(data.tags, userId);
  }

  if (data.ingredients) {
    data.ingredients = await resolveIngredients(data.ingredients);
  }

  Object.assign(recipe, data);
  return await recipe.save();
};

export const deleteRecipe = async (recipeId, userId, isAdmin = false) => {
  // Validate đầu vào
  if (!userId) throw new Error('User ID is required for deletion check'); // Thêm dòng này

  const recipe = await Recipe.findById(recipeId);
  if (!recipe) throw new Error('Recipe not found');

  // So sánh an toàn hơn
  // Ép kiểu String để so sánh, tránh lỗi toString()
  const creatorIdStr = String(recipe.creatorId);
  const userIdStr = String(userId);

  if (creatorIdStr !== userIdStr && !isAdmin) {
    throw new Error('Permission denied');
  }
  
  return await Recipe.deleteOne({ _id: recipeId });
};

export const getRecipeById = async (recipeId) => {
  if (!mongoose.Types.ObjectId.isValid(recipeId)) throw new Error('Invalid ID');
  const recipe = await Recipe.findById(recipeId)
    .populate('creatorId', 'userName email avatar') // Populate user info
    .lean();
  return recipe;
};

export const searchRecipes = async ({ q, tag, page = 1, limit = 20 }) => {
  const skip = (Math.max(parseInt(page), 1) - 1) * parseInt(limit);
  const lim = parseInt(limit);
  const filter = {};

  if (tag) {
    const tagDoc = await tagService.findByName(tag);
    if (tagDoc) {
      filter.tags = tagDoc._id;
    } else {
      return { recipes: [], total: 0, page: parseInt(page), limit: lim, totalPages: 0 };
    }
  }

  // Chỉ cần một điều kiện: nếu có 'q', thì dùng $text search.
  if (q) {
    filter.$text = { $search: q };
  }

  // Luôn sắp xếp theo độ liên quan nếu có tìm kiếm, nếu không thì theo ngày tạo.
  const sort = q ? { score: { $meta: 'textScore' } } : { createdAt: -1 };
  const projection = q ? { score: { $meta: 'textScore' } } : {};
  
  const [recipes, total] = await Promise.all([
    Recipe.find(filter, projection).sort(sort).skip(skip).limit(lim).lean(),
    Recipe.countDocuments(filter),
  ]);

  return { recipes, total, page: parseInt(page), limit: lim, totalPages: Math.ceil(total / lim) };
};

export const getMyRecipes = async (userId, { q, page = 1, limit = 20 }) => {
  const skip = (Math.max(parseInt(page), 1) - 1) * parseInt(limit);
  const filter = { creatorId: userId };
  if (q) filter.$text = { $search: q };

  const [recipes, total] = await Promise.all([
    Recipe.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Recipe.countDocuments(filter),
  ]);

  return { recipes, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) };
};

export const getSystemRecipes = async ({ q, tag, page = 1, limit = 20 }) => {
  const skip = (Math.max(parseInt(page), 1) - 1) * parseInt(limit);
  const lim = parseInt(limit);
  
  const filter = { creatorId: null }; // <-- Mấu chốt là ở đây
  if (tag) {
    // Cần tìm tagId trước
    const tagDoc = await tagService.findByName(tag);
    if (tagDoc && tagDoc.creatorId === null) { // Đảm bảo đó là tag hệ thống
        filter.tags = tagDoc._id;
    } else {
        // Nếu tag không tồn tại trong hệ thống, trả về rỗng
        return { recipes: [], total: 0, page: parseInt(page), limit: lim, totalPages: 0 };
    }
  }
  if (q) filter.$text = { $search: q };

  const [recipes, total] = await Promise.all([
    Recipe.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
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