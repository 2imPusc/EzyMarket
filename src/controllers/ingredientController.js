import Ingredient from '../model/ingredientRepository.js';
import { DEFAULT_EXPIRE_DAYS, INGREDIENT_CATEGORIES } from '../model/ingredientRepository.js';

const ingredientController = {
  create: async (req, res) => {
    try {
      const { name, imageURL, foodCategory, defaultExpireDays } = req.body;
      const { id: userId, role } = req.user; 

      if (!name || !foodCategory) {
        return res.status(400).json({ message: 'Name and foodCategory are required' });
      }

      // Nếu là admin, creatorId LUÔN LUÔN là null (System Ingredient)
      // Nếu là user, creatorId là userId
      const creatorId = role === 'admin' ? null : userId;
      // -----------------------
      
      const existingIngredient = await Ingredient.findOne({ 
        name: name.toLowerCase(), 
        creatorId: creatorId 
      });

      if (existingIngredient) {
        const message = creatorId === null 
          ? 'An ingredient with this name already exists in the system.'
          : 'You already have a custom ingredient with this name.';
        return res.status(409).json({ message });
      }

      const ingredientData = {
        name: name.toLowerCase(),
        imageURL: imageURL || null,
        foodCategory,
        creatorId: creatorId, 
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

  update: async (req, res) => {
    try {
      const { id: ingredientId } = req.params;
      const { id: userId, role } = req.user;
      
      const ingredient = await Ingredient.findById(ingredientId);
      if (!ingredient) {
        return res.status(404).json({ message: 'Ingredient not found' });
      }

      // --- LOGIC CHECK QUYỀN ---
      if (role === 'admin') {
          // Admin được sửa TẤT CẢ (System + User Personal)
          // HOẶC: Admin chỉ sửa System? -> Thường thì Admin sửa được System là đủ.
          // Nhưng để an toàn cho hệ thống, ta nên giới hạn:
          // Admin chỉ sửa System Ingredient (creatorId == null)
          if (ingredient.creatorId !== null) {
              // Tùy nhu cầu: Nếu bạn muốn admin sửa bài user thì bỏ dòng này
             // return res.status(403).json({ message: 'Admin can only update System Ingredients.' });
          }
      } else {
          // User thường: Phải là chủ sở hữu
          if (ingredient.creatorId?.toString() !== userId) {
              return res.status(403).json({ message: 'Forbidden' });
          }
      }

      const { name, imageURL, foodCategory, defaultExpireDays } = req.body;
      
      // Check trùng tên
      if (name && name.toLowerCase() !== ingredient.name) {
        const duplicate = await Ingredient.findOne({ 
          name: name.toLowerCase(), 
          creatorId: ingredient.creatorId, // Giữ nguyên creatorId cũ (để tránh biến System -> Personal)
          _id: { $ne: ingredientId } 
        });
        if (duplicate) {
          return res.status(409).json({ message: 'Ingredient name already exists.' });
        }
        ingredient.name = name.toLowerCase();
      }
      
      if (imageURL !== undefined) ingredient.imageURL = imageURL;
      if (foodCategory) ingredient.foodCategory = foodCategory;
      if (defaultExpireDays !== undefined) ingredient.defaultExpireDays = defaultExpireDays;

      await ingredient.save();
      res.status(200).json({ message: 'Updated successfully', ingredient });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // DELETE - Tương tự Update
  delete: async (req, res) => {
    try {
      const { id: ingredientId } = req.params;
      const { id: userId, role } = req.user;

      const ingredient = await Ingredient.findById(ingredientId);
      if (!ingredient) return res.status(404).json({ message: 'Not found' });

      // Check quyền
      if (role === 'admin') {
          // Admin có thể xóa System Ingredient
          // (Có thể chặn Admin xóa Personal Ingredient của user nếu muốn)
      } else {
          // User chỉ xóa của mình
          if (ingredient.creatorId?.toString() !== userId) {
             return res.status(403).json({ message: 'Forbidden' });
          }
      }
      
      await Ingredient.findByIdAndDelete(ingredientId);
      res.status(200).json({ message: 'Deleted successfully' });
    } catch (err) {
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
      res.status(200).json({ categories: INGREDIENT_CATEGORIES });
    } catch (err) {
      console.error('Get categories error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};

export default ingredientController;