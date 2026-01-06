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

      // Validate defaultExpireDays (optional but must be >= 1 if provided)
      const ded = Number(defaultExpireDays);
      if (defaultExpireDays !== undefined) {
        if (Number.isNaN(ded) || ded < 1) {
          return res.status(400).json({ message: 'defaultExpireDays must be a positive integer (>= 1).' });
        }
      }

      const ingredientData = {
        name: name.toLowerCase(),
        imageURL: imageURL || null,
        foodCategory,
        creatorId: creatorId,
      };
      if (defaultExpireDays !== undefined) ingredientData.defaultExpireDays = ded;

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
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
      const search = (req.query.search || '').trim();
      const category = (req.query.category || '').trim();
      const scope = (req.query.scope || 'available'); // system | mine | available | all
      const isAdmin = req.user?.role === 'admin';
      const userId = req.user.id;

      // If no search -> simple find (keeps previous behavior)
      if (!search) {
        const filter = {};
        if (scope === 'system') filter.creatorId = null;
        else if (scope === 'mine') filter.creatorId = userId;
        else if (scope === 'all' && isAdmin) {
          // no creator filter
        } else {
          filter.creatorId = { $in: [null, userId] };
        }
        if (category) filter.foodCategory = category;

        const total = await Ingredient.countDocuments(filter);
        const ingredients = await Ingredient.find(filter)
          .sort({ name: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();

        return res.status(200).json({ ingredients, pagination: { page, limit, total } });
      }

      // With search: contains + startsWith priority using aggregation
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const esc = escapeRegex(search);
      const containsPattern = esc;
      const startsPattern = '^' + esc;

      const orMatch = [{ name: { $regex: containsPattern, $options: 'i' } }];

      // build scope/category filters for aggregation
      const baseFilters = [];
      if (scope === 'system') baseFilters.push({ creatorId: null });
      else if (scope === 'mine') baseFilters.push({ creatorId: userId });
      else if (scope === 'all' && isAdmin) {
        // no filter
      } else baseFilters.push({ creatorId: { $in: [null, userId] } });

      if (category) baseFilters.push({ foodCategory: category });

      let matchStage;
      if (baseFilters.length > 0) {
        matchStage = { $match: { $and: [{ $or: orMatch }, ...baseFilters] } };
      } else {
        matchStage = { $match: { $or: orMatch } };
      }

      const addFieldsStage = {
        $addFields: {
          starts: {
            $cond: [
              { $regexMatch: { input: '$name', regex: startsPattern, options: 'i' } },
              1,
              0,
            ],
          },
        },
      };

      const pipelineResults = [
        matchStage,
        addFieldsStage,
        { $sort: { starts: -1, name: 1 } },
        { $project: { __v: 0 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ];

      const pipelineCount = [matchStage, { $count: 'count' }];

      const agg = await Ingredient.aggregate([
        {
          $facet: {
            results: pipelineResults,
            totalCount: pipelineCount,
          },
        },
      ]);

      const results = (agg[0] && agg[0].results) || [];
      const total = (agg[0] && agg[0].totalCount && agg[0].totalCount[0] && agg[0].totalCount[0].count) || 0;

      res.status(200).json({
        ingredients: results,
        pagination: { page, limit, total },
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
      const { q = '', limit = 10, scope = 'available' } = req.query;
      const { id: userId } = req.user;

      const text = String(q || '').trim();
      const maxLimit = Math.min(parseInt(limit, 10) || 10, 50);

      if (!text) {
        // fallback: simple find
        const query = {};
        if (scope === 'system') query.creatorId = null;
        else query.creatorId = { $in: [null, userId] };

        const ingredients = await Ingredient.find(query)
          .select('_id name creatorId')
          .sort({ name: 1 })
          .limit(maxLimit)
          .lean();

        return res.status(200).json({ ingredients });
      }

      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const esc = escapeRegex(text);
      const containsPattern = esc;
      const startsPattern = '^' + esc;

      const orMatch = [{ name: { $regex: containsPattern, $options: 'i' } }];

      const baseFilters = [];
      if (scope === 'system') baseFilters.push({ creatorId: null });
      else baseFilters.push({ creatorId: { $in: [null, userId] } });

      let matchStage;
      if (baseFilters.length > 0) matchStage = { $match: { $and: [{ $or: orMatch }, ...baseFilters] } };
      else matchStage = { $match: { $or: orMatch } };

      const pipeline = [
        matchStage,
        {
          $addFields: {
            starts: {
              $cond: [
                { $regexMatch: { input: '$name', regex: startsPattern, options: 'i' } },
                1,
                0,
              ],
            },
          },
        },
        { $sort: { starts: -1, name: 1 } },
        { $project: { _id: 1, name: 1, creatorId: 1 } },
        { $limit: maxLimit },
      ];

      const ingredients = await Ingredient.aggregate(pipeline);
      res.status(200).json({ ingredients });
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