import Recipe from '../model/recipeRepository.js';
import Ingredient from '../model/ingredientRepository.js';
import Unit from '../model/unitRepository.js';
import Fridge from '../model/fridgeRepository.js';
import FridgeItem from '../model/fridgeItemRepository.js';
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
  return Promise.all(ingredientsInput.map(async (item) => {
    const resolvedItem = {
      name: item.name,
      quantity: item.quantity,
      unitText: item.unitText,
      note: item.note,
      optional: item.optional,
      
      // --- SỬA TẠI ĐÂY ---
      // Đổi từ ingredientRefId thành ingredientId để khớp với Schema
      ingredientId: null, 
      // ------------------

      unitId: null,
    };

    // --- BƯỚC VALIDATE INGREDIENT ---
    if (item.ingredientId) {
      if (!mongoose.Types.ObjectId.isValid(item.ingredientId)) {
        throw new Error(`Invalid format for ingredientId: ${item.ingredientId}`);
      }
      
      const ingDoc = await Ingredient.findOne({
        _id: item.ingredientId,
        creatorId: { $in: [userId, null] }
      }).lean();

      if (!ingDoc) {
        throw new Error(`Ingredient with ID '${item.ingredientId}' not found or you don't have permission to use it.`);
      }
      
      // --- SỬA TẠI ĐÂY ---
      resolvedItem.ingredientId = ingDoc._id; // Gán đúng vào ingredientId
      // ------------------
      
      resolvedItem.name = ingDoc.name;
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
      resolvedItem.unitText = unitDoc.abbreviation || unitDoc.name;
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

/**
 * Tính toán Shopping List dựa trên thực phẩm có trong tủ lạnh
 * @param {string} recipeId
 * @param {string} userId
 * @param {string} [specificFridgeId] - Nếu muốn chỉ định lấy từ 1 tủ lạnh cụ thể
 */
export const buildShoppingListFromFridge = async (recipeId, userId, specificFridgeId = null) => {
  // 1. Lấy thông tin Recipe
  const recipe = await Recipe.findById(recipeId).lean();
  if (!recipe) throw new Error('Recipe not found');

  // 2. Xác định danh sách tủ lạnh cần quét
  let fridgeIds = [];
  if (specificFridgeId) {
    fridgeIds = [specificFridgeId];
  } else {
    const fridges = await Fridge.find({ owner: userId }).select('_id');
    fridgeIds = fridges.map(f => f._id);
  }

  // Nếu không có tủ lạnh, toàn bộ nguyên liệu là thiếu
  if (fridgeIds.length === 0) {
    return {
      recipeId: recipe._id,
      title: recipe.title,
      missing: recipe.ingredients.map(mapIngredientToMissing)
    };
  }

  // 3. Lấy tất cả item còn hạn (in-stock) trong tủ lạnh
  const fridgeItems = await FridgeItem.find({
    fridgeId: { $in: fridgeIds },
    status: 'in-stock'
  }).lean();

  // 4. TẠO KHO HÀNG (INVENTORY MAP) DỰA TRÊN ID
  // Key = "ingredientId_unitId"
  // Value = Tổng số lượng
  const inventoryMap = {};

  // Map phụ để kiểm tra Unit Mismatch (Cùng Ingredient nhưng khác Unit)
  // Key = "ingredientId" -> Value = Array of unitIds đang có
  const existingIngredientsMap = {};

  for (const item of fridgeItems) {
    // Chỉ xử lý nếu item trong tủ lạnh có liên kết Ingredient và Unit hợp lệ
    if (item.foodId && item.unitId) {
      const ingIdStr = item.foodId.toString();
      const unitIdStr = item.unitId.toString();

      // 4.1. Cộng dồn số lượng cho Key chính xác (Ing + Unit)
      const exactKey = `${ingIdStr}_${unitIdStr}`;
      inventoryMap[exactKey] = (inventoryMap[exactKey] || 0) + item.quantity;

      // 4.2. Lưu lại để check mismatch sau này
      if (!existingIngredientsMap[ingIdStr]) {
        existingIngredientsMap[ingIdStr] = new Set();
      }
      existingIngredientsMap[ingIdStr].add(unitIdStr);
    }
  }

  // 5. SO SÁNH VÀ TÍNH TOÁN
  const missing = [];

  for (const recipeIng of recipe.ingredients) {
    // Trường hợp 1: Recipe Item là text nhập tay (không có ingredientId) -> Luôn thiếu
    if (!recipeIng.ingredientId) {
      missing.push(mapIngredientToMissing(recipeIng));
      continue;
    }

    const ingIdStr = recipeIng.ingredientId.toString();
    // Nếu recipe không chọn unit (trường hợp hiếm), coi như unitId là 'null'
    const unitIdStr = recipeIng.unitId ? recipeIng.unitId.toString() : 'null';
    const requiredQty = recipeIng.quantity;

    // Tạo key để tra cứu trong kho
    const lookupKey = `${ingIdStr}_${unitIdStr}`;
    const availableQty = inventoryMap[lookupKey] || 0;

    // Logic trừ kho
    if (availableQty >= requiredQty) {
      // Đủ hàng -> Bỏ qua, không thêm vào list thiếu
      continue; 
    } else {
      // Thiếu hàng (hoặc chỉ có một phần) -> Tính phần còn thiếu
      const missingQty = requiredQty - availableQty;

      // Logic check Unit Mismatch:
      // Kiểm tra xem user có Ingredient này không, nhưng ở Unit khác
      let inventoryNote = null;
      if (existingIngredientsMap[ingIdStr]) {
         // Nếu trong Set các unit đang có của ingredient này KHÔNG chứa unitIdStr cần tìm
         // tức là user có hàng, nhưng lệch đơn vị tính.
         if (!existingIngredientsMap[ingIdStr].has(unitIdStr) && existingIngredientsMap[ingIdStr].size > 0) {
             inventoryNote = "Có sẵn trong tủ lạnh nhưng khác đơn vị tính. Hãy kiểm tra lại.";
         }
      }

      missing.push({
        name: recipeIng.name,         // Tên hiển thị từ Recipe
        quantity: missingQty,         // Số lượng CẦN MUA THÊM
        unitId: recipeIng.unitId,
        unitText: recipeIng.unitText,
        note: recipeIng.note,
        optional: recipeIng.optional,
        haveQuantity: availableQty,   // Số lượng đang có (cùng đơn vị)
        inventoryNote: inventoryNote  // Cảnh báo khác đơn vị
      });
    }
  }

  return {
    recipeId: recipe._id,
    title: recipe.title,
    missing
  };
};

// Helper function để map item thiếu hoàn toàn
const mapIngredientToMissing = (ing) => ({
  name: ing.name,
  quantity: ing.quantity,
  unitId: ing.unitId,
  unitText: ing.unitText,
  note: ing.note,
  optional: ing.optional,
  haveQuantity: 0,
  inventoryNote: null
});

export const suggestIngredientNames = async (prefix = '', limit = 10) => {
  if (!prefix) return await Ingredient.find().select('name').limit(limit).lean();
  const regex = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return await Ingredient.find({ name: regex }).select('name').limit(limit).lean();
};