import * as recipeService from '../services/recipeService.js';
import mongoose from 'mongoose';
import Recipe from '../model/recipeRepository.js';

const create = async (req, res) => {
  try {
    const user = req.user;
    // Nếu là admin thì creatorId = null (System Recipe)
    // Nếu là user thường thì lấy ID của họ
    const creatorId = user.role === 'admin' ? null : (user.id || user._id); 

    // Nếu không phải admin mà cũng không có ID -> Lỗi
    if (!creatorId && user.role !== 'admin') {
      return res.status(401).json({ message: 'Token does not contain a valid user ID.' });
    }

    const recipe = await recipeService.createRecipe(creatorId, req.body);
    
    res.status(201).json({ 
      message: 'Recipe created successfully', 
      recipe 
    });
  } catch (error) {
    console.error('Create Recipe Error:', error);

    if (
      error.message.includes('Invalid format') || // Bắt lỗi định dạng ID
      error.message.includes('not found') ||       // Bắt TẤT CẢ các lỗi "not found" (cho Ingredient, Unit, etc.)
      error.message.includes('permission')     // Bắt lỗi quyền hạn
    ) {
      // Nếu là lỗi validation hoặc permission, trả về 400 Bad Request
      return res.status(400).json({ message: error.message });
    }

    // Đối với các lỗi khác, trả về 500
    res.status(500).json({ message: 'An unexpected error occurred while creating the recipe.' });
  }
};

const update = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const user = req.user;
    const userId = user.id || user._id; 
    
    if (!userId) {
        return res.status(401).json({ message: 'User ID not found in token' });
    }

    const isAdmin = req.user.role === 'admin';
    
    const recipe = await recipeService.updateRecipe(recipeId, userId, req.body, isAdmin);
    res.status(200).json({ message: 'Updated successfully', recipe });
  } catch (error) {
    console.error('Update Recipe Error:', error);

    if (error.message === 'Permission denied') {
      // Lỗi permission đặc biệt trả về 403 Forbidden
      return res.status(403).json({ message: error.message });
    }

    if (
      error.message.includes('Invalid format') ||
      error.message.includes('not found')
    ) {
      // Các lỗi validation khác trả về 400 Bad Request
      return res.status(400).json({ message: error.message });
    }
    
    // Các lỗi còn lại là 500
    res.status(500).json({ message: 'An unexpected error occurred while updating the recipe.' });
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
    res.status(400).json({ message: 'Invalid ID' });
  }
};

// Search dùng tagId
const search = async (req, res) => {
  try {
    const { q, tagId, page, limit } = req.query; 
    if (tagId && !mongoose.Types.ObjectId.isValid(tagId)) {
       return res.status(400).json({ message: 'Invalid Tag ID format' });
    }
    const result = await recipeService.searchRecipes({ q, tagId, page, limit });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyRecipes = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const result = await recipeService.getMyRecipes(userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSystem = async (req, res) => {
  try {
    // Sửa: Nhận tagId thay vì tag
    const { q, tagId, page, limit } = req.query;
    const result = await recipeService.getSystemRecipes({ q, tagId, page, limit });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// SỬA LỖI QUAN TRỌNG: Phải nhận req, res và trả về response
const getSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const recipes = await Recipe.find({ title: regex })
      .select('_id title imageUrl')
      .limit(10)
      .sort({ title: 1 })
      .lean();
      
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const shoppingListFromRecipe = async (req, res) => {
  try {
    const { recipeId, availableIngredients } = req.body;
    if (!recipeId) return res.status(400).json({ message: 'recipeId required' });
    const result = await recipeService.buildShoppingList(recipeId, availableIngredients || []);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const masterDataIngredients = async (req, res) => {
  try {
    const docs = await recipeService.suggestIngredientNames(req.query.q, parseInt(req.query.limit) || 10);
    res.json({ suggestions: docs.map(d => d.name) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ĐÃ XÓA: const getTags (Vì thừa, dùng tagController)

export default {
  create,
  update,
  delete: remove,
  getById,
  search,
  getMyRecipes,
  getSystem,
  getSuggestions, // Đã fix thành controller
  shoppingListFromRecipe,
  masterDataIngredients
};