import * as recipeService from '../services/recipeService.js';

const create = async (req, res) => {
  try {
    // Lấy user từ middleware
    const user = req.user;
    
    // ⚠️ QUAN TRỌNG: Middleware của bạn giải mã token ra req.user.
    // Kiểm tra xem ID nằm ở key 'id' hay '_id'.
    // Dựa vào middleware của bạn thì khả năng cao là 'user.id'.
    const creatorId = user.id || user._id; 

    if (!creatorId) {
      return res.status(401).json({ message: 'Token không chứa thông tin ID người dùng hợp lệ.' });
    }

    // Truyền ID chuẩn vào service
    const recipe = await recipeService.createRecipe(creatorId, req.body);
    
    res.status(201).json({ 
      message: 'Tạo công thức thành công', 
      recipe 
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { recipeId } = req.params;
    
    // --- SỬA ĐOẠN NÀY ---
    const user = req.user;
    // Lấy id từ token, ưu tiên .id (theo middleware của bạn) hoặc ._id
    const userId = user.id || user._id; 
    
    if (!userId) {
        return res.status(401).json({ message: 'User ID not found in token' });
    }
    // --------------------

    const isAdmin = req.user.role === 'admin';
    
    // Truyền userId chuẩn vào service
    const recipe = await recipeService.updateRecipe(recipeId, userId, req.body, isAdmin);
    res.status(200).json({ message: 'Updated successfully', recipe });
  } catch (error) {
    const status = error.message === 'Permission denied' ? 403 : 400;
    res.status(status).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { recipeId } = req.params;

    // --- SỬA ĐOẠN NÀY ---
    const user = req.user;
    const userId = user.id || user._id; // Fix tương tự như trên

    if (!userId) {
        return res.status(401).json({ message: 'User ID not found in token' });
    }
    // --------------------

    const isAdmin = req.user.role === 'admin';
    
    // Truyền userId chuẩn vào service
    await recipeService.deleteRecipe(recipeId, userId, isAdmin);
    res.status(200).json({ message: 'Recipe deleted' });
  } catch (error) {
    console.error("Delete Error:", error); // Log ra để xem nếu còn lỗi
    const status = error.message === 'Permission denied' ? 403 : 400;
    res.status(status).json({ message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const recipe = await recipeService.getRecipeById(req.params.recipeId);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
    res.json(recipe);
  } catch (error) {
    res.status(400).json({ message: 'Invalid ID format or Error' });
  }
};

// Handles both Search and Get All
const search = async (req, res) => {
  try {
    const { q, tag, page, limit } = req.query;
    const result = await recipeService.searchRecipes({ q, tag, page, limit });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyRecipes = async (req, res) => {
  try {
    const user = req.user;
    const userId = user.id || user._id; // Lấy ID chuẩn

    if (!userId) return res.status(401).json({ message: 'User ID missing in token' });

    const { q, page, limit } = req.query;
    // Truyền userId vào service
    const result = await recipeService.getMyRecipes(userId, { q, page, limit });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSystem = async (req, res) => {
  try {
    const result = await recipeService.getSystemRecipes(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    // Logic giống hệt ingredient suggestions: tìm các tiêu đề BẮT ĐẦU BẰNG query
    const regex = new RegExp('^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const recipes = await Recipe.find({ title: regex })
      .select('_id title imageUrl') // Chỉ lấy dữ liệu cần thiết
      .limit(10)
      .sort({ title: 1 });

    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 1. Tạo Shopping List
 * Input: recipeId, availableIngredients (mảng tên các món đang có)
 * Output: Danh sách các món CẦN MUA (missing)
 */
const shoppingListFromRecipe = async (req, res) => {
  try {
    const { recipeId, availableIngredients } = req.body;
    if (!recipeId) {
      return res.status(400).json({ message: 'recipeId is required' });
    }

    // Gọi service (Logic đã viết ở file service bước 1)
    const result = await recipeService.buildShoppingList(recipeId, availableIngredients || []);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 2. Master Data Ingredients (Autocomplete)
 * Input: ?q=thit&limit=10
 * Output: ["thịt bò", "thịt heo", ...]
 */
const masterDataIngredients = async (req, res) => {
  try {
    const { q, limit } = req.query;
    // Gọi service
    const docs = await recipeService.suggestIngredientNames(q, parseInt(limit) || 10);
    // Trả về mảng string cho gọn
    res.json({ suggestions: docs.map(d => d.name) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 3. Get Tags (Hardcoded hoặc lấy từ DB)
 */
const getTags = (req, res) => {
  // Danh sách tag cố định của hệ thống
  const tags = ['main', 'appetizer', 'dessert', 'drink', 'salad', 'soup', 'side', 'snack', 'other'];
  res.json({ tags });
};

export default {
  create,
  update,
  delete: remove,
  getById,
  search,
  getMyRecipes,
  getSystem,
  getSuggestions,
  shoppingListFromRecipe,
  masterDataIngredients,
  getTags
};