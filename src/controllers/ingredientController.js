import Ingredient from '../model/ingredientRepository.js';
import { DEFAULT_EXPIRE_DAYS } from '../model/ingredientRepository.js';

const ingredientController = {
  // CREATE - Thêm nguyên liệu mới (hỗ trợ cả user và admin)
  create: async (req, res) => {
    try {
      const { name, imageURL, foodCategory, defaultExpireDays } = req.body;
      const { id: userId, role } = req.user; // Lấy thông tin người dùng từ token

      if (!name || !foodCategory) {
        return res.status(400).json({ message: 'Name and foodCategory are required' });
      }

      // -- LOGIC MỚI --
      // Nếu người dùng là admin và muốn tạo nguyên liệu hệ thống, họ có thể gửi creatorId: null
      // Nếu không, creatorId sẽ là id của người dùng đang đăng nhập.
      const creatorId = (role === 'admin' && req.body.creatorId === null) ? null : userId;
      
      // Kiểm tra trùng lặp dựa trên cả tên và người tạo
      const existingIngredient = await Ingredient.findOne({ 
        name: name.toLowerCase(), 
        creatorId: creatorId 
      });

      if (existingIngredient) {
        const message = creatorId === null 
          ? 'An ingredient with this name already exists in the system.'
          : 'You already have a custom ingredient with this name.';
        return res.status(409).json({ message }); // 409 Conflict: Trùng lặp
      }

      const ingredientData = {
        name: name.toLowerCase(),
        imageURL: imageURL || null,
        foodCategory,
        creatorId: creatorId, // <-- THÊM CREATOR_ID
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

  // GET ALL - Lấy danh sách nguyên liệu của hệ thống + cá nhân
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 20, category, search } = req.query;
      const { id: userId } = req.user; // Lấy id người dùng

      // -- LOGIC MỚI --
      // Xây dựng query cơ bản: lấy của hệ thống (null) HOẶC của người dùng hiện tại
      const query = {
        creatorId: { $in: [userId, null] }
      };

      // Thêm các bộ lọc khác
      if (category) query.foodCategory = category;
      if (search) query.name = new RegExp(search, 'i');

      // Pagination
      const skip = (page - 1) * limit;
      const ingredients = await Ingredient.find(query)
        .select('-__v')
        .sort({ name: 1 })
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

  // GET BY ID - Lấy chi tiết 1 nguyên liệu (có kiểm tra quyền)
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;

      const ingredient = await Ingredient.findById(id).select('-__v');
      if (!ingredient) {
        return res.status(404).json({ message: 'Ingredient not found' });
      }

      // -- LOGIC MỚI --
      // Cho phép xem nếu là nguyên liệu hệ thống hoặc là của chính người dùng
      if (ingredient.creatorId && ingredient.creatorId.toString() !== userId) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to view this ingredient.' });
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

  // UPDATE - Cập nhật nguyên liệu (có kiểm tra quyền)
  update: async (req, res) => {
    try {
      const { id: ingredientId } = req.params;
      const { id: userId, role } = req.user;
      
      const ingredient = await Ingredient.findById(ingredientId);
      if (!ingredient) {
        return res.status(404).json({ message: 'Ingredient not found' });
      }

      // -- LOGIC MỚI: KIỂM TRA QUYỀN SỞ HỮU --
      // Cho phép sửa nếu:
      // 1. Bạn là admin.
      // 2. Hoặc, đây là nguyên liệu của bạn (creatorId khớp với userId).
      const isOwner = ingredient.creatorId && ingredient.creatorId.toString() === userId;
      if (role !== 'admin' && !isOwner) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to update this ingredient.' });
      }

      // ... (Phần logic update bên dưới giữ nguyên)
      const { name, imageURL, foodCategory, defaultExpireDays } = req.body;
      if (name && name.toLowerCase() !== ingredient.name) {
        const duplicate = await Ingredient.findOne({ 
          name: name.toLowerCase(), 
          creatorId: ingredient.creatorId,
          _id: { $ne: ingredientId } // Loại trừ chính nó
        });
        if (duplicate) {
          return res.status(409).json({ message: 'An ingredient with this name already exists.' });
        }
        ingredient.name = name.toLowerCase();
      }
      // ... (Các phần if còn lại giữ nguyên)

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

  // DELETE - Xóa nguyên liệu (có kiểm tra quyền)
  delete: async (req, res) => {
    try {
      const { id: ingredientId } = req.params;
      const { id: userId, role } = req.user;

      const ingredient = await Ingredient.findById(ingredientId);
      if (!ingredient) {
        return res.status(404).json({ message: 'Ingredient not found' });
      }

      // -- LOGIC MỚI: KIỂM TRA QUYỀN SỞ HỮU --
      const isOwner = ingredient.creatorId && ingredient.creatorId.toString() === userId;
      if (role !== 'admin' && !isOwner) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this ingredient.' });
      }
      
      // Logic xóa
      await Ingredient.findByIdAndDelete(ingredientId);
      res.status(200).json({ message: 'Ingredient deleted successfully' });
    } catch (err) {
      console.error('Delete ingredient error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  getSuggestions: async (req, res) => {
    try {
      // Dùng 'q' (query) làm tên tham số, đây là một quy ước phổ biến
      const { q } = req.query;
      const { id: userId } = req.user;

      if (!q) {
        return res.status(200).json([]); // Trả về mảng rỗng nếu không có query
      }

      // Tạo biểu thức chính quy để tìm các tên BẮT ĐẦU BẰNG query (case-insensitive)
      // Dấu '^' là mấu chốt cho hiệu năng và sự liên quan
      const regex = new RegExp('^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      const ingredients = await Ingredient.find({
        // Tìm trong cả nguyên liệu hệ thống và nguyên liệu cá nhân
        creatorId: { $in: [userId, null] },
        name: regex,
      })
      .select('_id name creatorId') // <-- CHỈ LẤY CÁC TRƯỜNG CẦN THIẾT
      .limit(10) // <-- Giới hạn số lượng kết quả trả về để đảm bảo tốc độ
      .sort({ name: 1 });

      res.status(200).json(ingredients);
    } catch (err) {
      console.error('Get ingredient suggestions error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // TODO: Need to review
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