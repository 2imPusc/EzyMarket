import Ingredient from '../model/ingredientRepository.js';
import { DEFAULT_EXPIRE_DAYS } from '../model/ingredientRepository.js';

const ingredientController = {
  // CREATE - Thêm nguyên liệu mới
  create: async (req, res) => {
    try {
      const { name, imageURL, foodCategory, defaultExpireDays } = req.body;

      if (!name || !foodCategory) {
        return res.status(400).json({ message: 'Name and foodCategory are required' });
      }

      const existingIngredient = await Ingredient.findOne({ name: name.toLowerCase() });
      if (existingIngredient) {
        return res.status(400).json({ message: 'Ingredient with this name already exists' });
      }

      const ingredientData = {
        name: name.toLowerCase(),
        imageURL: imageURL || null,
        foodCategory,
        // only include if provided so model default function runs otherwise
      };
      if (defaultExpireDays !== undefined) ingredientData.defaultExpireDays = defaultExpireDays;

      const newIngredient = new Ingredient(ingredientData);

      await newIngredient.save();
      res.status(201).json({
        message: 'Ingredient created successfully',
        ingredient: newIngredient,
      });
    } catch (err) {
      console.error('Create ingredient error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET ALL - Lấy danh sách nguyên liệu (có pagination, filter)
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 20, category, search } = req.query;

      // Build query
      const query = {};
      if (category) query.foodCategory = category;
      if (search) query.name = new RegExp(search, 'i');  // Search không phân biệt hoa/thường

      // Pagination
      const skip = (page - 1) * limit;
      const ingredients = await Ingredient.find(query)
        .select('-__v')
        .sort({ name: 1 })  // Sort theo tên A-Z
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Ingredient.countDocuments(query);

      res.status(200).json({
        ingredients,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error('Get all ingredients error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET BY ID - Lấy chi tiết 1 nguyên liệu
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      const ingredient = await Ingredient.findById(id).select('-__v');
      if (!ingredient) {
        return res.status(404).json({ message: 'Ingredient not found' });
      }

      res.status(200).json(ingredient);
    } catch (err) {
      console.error('Get ingredient by ID error:', err);
      if (err.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid ingredient ID' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // UPDATE - Cập nhật nguyên liệu
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, imageURL, foodCategory, defaultExpireDays } = req.body;

      const ingredient = await Ingredient.findById(id);
      if (!ingredient) {
        return res.status(404).json({ message: 'Ingredient not found' });
      }

      if (name && name.toLowerCase() !== ingredient.name) {
        const duplicate = await Ingredient.findOne({ name: name.toLowerCase() });
        if (duplicate) {
          return res.status(400).json({ message: 'Ingredient with this name already exists' });
        }
        ingredient.name = name.toLowerCase();
      }

      if (imageURL !== undefined) ingredient.imageURL = imageURL;

      // Nếu đổi category
      if (foodCategory && foodCategory !== ingredient.foodCategory) {
        ingredient.foodCategory = foodCategory;
        // Nếu client không cung cấp defaultExpireDays thì set theo mapping
        if (defaultExpireDays === undefined || defaultExpireDays === null) {
          ingredient.defaultExpireDays = DEFAULT_EXPIRE_DAYS[foodCategory] ?? 7;
        }
      }

      // Nếu client cung cấp explicit defaultExpireDays -> ghi đè
      if (defaultExpireDays !== undefined && defaultExpireDays !== null) {
        ingredient.defaultExpireDays = defaultExpireDays;
      }

      await ingredient.save();
      res.status(200).json({
        message: 'Ingredient updated successfully',
        ingredient,
      });
    } catch (err) {
      console.error('Update ingredient error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // DELETE - Xóa nguyên liệu
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const ingredient = await Ingredient.findByIdAndDelete(id);
      if (!ingredient) {
        return res.status(404).json({ message: 'Ingredient not found' });
      }

      res.status(200).json({ message: 'Ingredient deleted successfully' });
    } catch (err) {
      console.error('Delete ingredient error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET CATEGORIES - Lấy danh sách các categories
  getCategories: async (req, res) => {
    try {
      const categories = [
        'vegetables', 'fruits', 'meat', 'seafood', 'dairy', 
        'grains', 'spices', 'beverages', 'condiments', 'frozen',
        'canned', 'bakery', 'snacks', 'other'
      ];
      res.status(200).json({ categories });
    } catch (err) {
      console.error('Get categories error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};

export default ingredientController;