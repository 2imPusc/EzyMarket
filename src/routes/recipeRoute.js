import express from 'express';
import recipeController from '../controllers/recipeController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     IngredientInput:
 *       type: object
 *       required: [name]
 *       properties:
 *         ingredientId:
 *           type: string
 *           description: MongoDB ObjectId của nguyên liệu gốc (nếu có). Server sẽ ưu tiên lấy tên chuẩn từ ID này.
 *           example: "60d5ecb8b5c9e67890123456"
 *         name:
 *           type: string
 *           description: Tên hiển thị của nguyên liệu (được dùng nếu không có ingredientId hoặc để snapshot).
 *           example: "Thịt bò thăn"
 *         quantity:
 *           type: number
 *           description: Số lượng.
 *           example: 200
 *         unitId:
 *           type: string
 *           description: MongoDB ObjectId của đơn vị tính (nếu có).
 *           example: "60d5ecb8b5c9e67890123457"
 *         unit:
 *           type: string
 *           description: Tên đơn vị tính (nhập tay nếu không chọn từ danh sách).
 *           example: "gram"
 *         note:
 *           type: string
 *           description: Ghi chú thêm cho nguyên liệu.
 *           example: "Thái mỏng"
 *         optional:
 *           type: boolean
 *           default: false
 *           description: Đánh dấu nguyên liệu này có thể bỏ qua.
 * 
 *     RecipeInput:
 *       type: object
 *       required: [title, ingredients]
 *       properties:
 *         title:
 *           type: string
 *           description: Tên món ăn.
 *           example: "Phở Bò Tái Nạm"
 *         description:
 *           type: string
 *           description: Mô tả ngắn gọn về món ăn.
 *           example: "Món phở truyền thống với nước dùng đậm đà."
 *         imageUrl:
 *           type: string
 *           format: uri
 *           description: Đường dẫn ảnh món ăn.
 *         prepTime:
 *           type: integer
 *           minimum: 0
 *           description: Thời gian sơ chế (phút).
 *           example: 15
 *         cookTime:
 *           type: integer
 *           minimum: 0
 *           description: Thời gian nấu (phút).
 *           example: 45  
 *         servings:
 *           type: integer
 *           minimum: 1
 *           description: Khẩu phần ăn (số người).
 *           example: 2
 *         directions:
 *           type: array
 *           description: Các bước thực hiện.
 *           items:
 *             type: string
 *           example: ["Rửa sạch xương bò", "Ninh xương trong 8 tiếng", "Trần phở và thịt"]
 *         tag:
 *           type: string
 *           enum: [main, appetizer, dessert, drink, salad, soup, side, snack, other]
 *           default: other
 *           description: Phân loại món ăn.
 *           example: "main"
 *         ingredients:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/IngredientInput'
 *
 *     RecipeResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         creatorId:
 *           type: string
 *           description: ID của người tạo.
 *         ingredients:
 *           type: array
 *           items:
 *             allOf:
 *               - $ref: '#/components/schemas/IngredientInput'
 *               - type: object
 *                 properties:
 *                   unitAbbreviation:
 *                     type: string
 *       createdAt:
 *         type: string
 *         format: date-time
 *       updatedAt:
 *         type: string
 *         format: date-time
 */

/**
 * @swagger
 * /api/recipes:
 *   post:
 *     summary: Create a new recipe
 *     description: >
 *       Tạo công thức nấu ăn mới. 
 *       Hệ thống hỗ trợ cơ chế "Snapshot":
 *       - Nếu cung cấp `ingredientId`, server sẽ tự động lấy tên chuẩn (Canonical Name) từ DB.
 *       - Nếu cung cấp `unitId`, server sẽ tự động lấy tên viết tắt (Abbreviation) từ DB.
 *       - Nếu không có ID, hệ thống sẽ sử dụng `name` và `unit` do người dùng nhập vào.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecipeInput'
 *     responses:
 *       201:
 *         description: Recipe created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Created successfully"
 *                 recipe:
 *                   $ref: '#/components/schemas/RecipeResponse'
 *       400:
 *         description: Validation error (Missing title, ingredients or invalid data)
 *       401:
 *         description: Unauthorized (Invalid or missing token)
 *       500:
 *         description: Internal server error
 */
router.post('/', authMiddleware.verifyToken, recipeController.create);

/**
 * @swagger
 * /api/recipes/my-recipes:
 *   get:
 *     summary: Get recipes created by current user
 *     description: >
 *       Lấy danh sách các công thức do chính người dùng đang đăng nhập tạo ra.
 *       Kết quả hỗ trợ tìm kiếm (trong phạm vi bài của mình) và phân trang.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Tìm kiếm trong danh sách bài của tôi (theo tiêu đề).
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Trang hiện tại.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Số lượng bài mỗi trang.
 *     responses:
 *       200:
 *         description: List of user's recipes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recipes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RecipeResponse'
 *                 total:
 *                   type: integer
 *                   example: 5
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 20
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *       401:
 *         description: Unauthorized (Token missing or invalid)
 *       500:
 *         description: Internal server error
 */
router.get('/my-recipes', authMiddleware.verifyToken, recipeController.getMyRecipes);

/**
 * @swagger
 * /api/recipes/search:
 *   get:
 *     summary: Search and list recipes
 *     description: >
 *       Tìm kiếm công thức nấu ăn với bộ lọc và phân trang.
 *       Có thể tìm theo từ khóa (q) hoặc lọc theo thẻ (tag).
 *       Kết quả được sắp xếp theo độ liên quan (nếu tìm kiếm) hoặc mới nhất.
 *     tags: [Recipes]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm (tìm trong tên món, mô tả và tên nguyên liệu).
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *           enum: [main, appetizer, dessert, drink, salad, soup, side, snack, other]
 *         description: Lọc theo loại món ăn.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Số trang.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Số lượng kết quả mỗi trang.
 *     responses:
 *       200:
 *         description: List of recipes with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recipes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RecipeResponse'
 *                 total:
 *                   type: integer
 *                   example: 150
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 20
 *                 totalPages:
 *                   type: integer
 *                   example: 8
 *       500:
 *         description: Internal server error
 */
router.get('/search', recipeController.search);

/**
 * @swagger
 * /api/recipes/shopping-list/from-recipe:
 *   post:
 *     summary: Generate shopping list
 *     description: >
 *       So sánh nguyên liệu của một công thức (Recipe) với những gì user đang có (Available).
 *       Trả về danh sách các món còn thiếu (Missing) cần phải đi mua.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipeId]
 *             properties:
 *               recipeId:
 *                 type: string
 *                 example: "691d88c2dca4ab9a583ef239"
 *               availableIngredients:
 *                 type: array
 *                 description: Danh sách tên các nguyên liệu user đã có ở nhà.
 *                 items:
 *                   type: string
 *                 example: ["muối", "đường", "trứng"]
 *     responses:
 *       200:
 *         description: Shopping list generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recipeId:
 *                   type: string
 *                 title:
 *                   type: string
 *                   description: Tên món ăn
 *                 missing:
 *                   type: array
 *                   description: Danh sách nguyên liệu còn thiếu cần mua.
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                       unit:
 *                         type: string
 *                       note:
 *                         type: string
 *                       optional:
 *                         type: boolean
 *       400:
 *         description: Bad request (Missing ID)
 *       500:
 *         description: Internal server error
 */
router.post('/shopping-list/from-recipe', authMiddleware.verifyToken, recipeController.shoppingListFromRecipe);

/**
 * @swagger
 * /api/recipes/master-data/ingredients:
 *   get:
 *     summary: Autocomplete ingredient names
 *     description: >
 *       Gợi ý tên nguyên liệu dựa trên từ khóa nhập vào 
 *       Dùng cho chức năng "Typeahead/Autocomplete" khi user nhập liệu để đảm bảo chuẩn hóa dữ liệu.
 *     tags: [Recipes]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Giới hạn số lượng gợi ý trả về.
 *     responses:
 *       200:
 *         description: List of suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["thịt bò", "thịt heo", "thịt gà"]
 *       500:
 *         description: Internal server error
 */
router.get('/master-data/ingredients', recipeController.masterDataIngredients);

/**
 * @swagger
 * /api/recipes/tags:
 *   get:
 *     summary: Get list of recipe categories (tags)
 *     description: Trả về danh sách các thẻ phân loại món ăn. Dùng để hiển thị bộ lọc ở Frontend.
 *     tags: [Recipes]
 *     responses:
 *       200:
 *         description: List of tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["main", "appetizer", "dessert"]
 */
router.get('/tags', recipeController.getTags);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   get:
 *     summary: Get recipe details
 *     description: Lấy thông tin chi tiết của một công thức, bao gồm thông tin người tạo (creator) đã được populate.
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId của công thức.
 *     responses:
 *       200:
 *         description: Recipe detail object
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RecipeResponse'
 *                 - type: object
 *                   properties:
 *                     creatorId:
 *                       type: object
 *                       properties:
 *                         _id: {type: string}
 *                         userName: {type: string}
 *                         avatar: {type: string}
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Internal server error
 */
router.get('/:recipeId', recipeController.getById);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   put:
 *     summary: Update a recipe
 *     description: >
 *       Chỉ người tạo (Owner) hoặc Admin mới có quyền thực hiện.
 *       Lưu ý: Danh sách `ingredients` sẽ bị thay thế hoàn toàn bằng danh sách mới gửi lên.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecipeInput'
 *     responses:
 *       200:
 *         description: Updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: {type: string}
 *                 recipe:
 *                   $ref: '#/components/schemas/RecipeResponse'
 *       403:
 *         description: Permission denied (Not owner or admin)
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Internal server error
 */
router.put('/:recipeId', authMiddleware.verifyToken, recipeController.update);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   delete:
 *     summary: Delete a recipe
 *     description: Xóa vĩnh viễn công thức. Chỉ người tạo hoặc Admin có quyền này.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recipe deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recipe deleted"
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Recipe not found
 */
router.delete('/:recipeId', authMiddleware.verifyToken, recipeController.delete);

export default router;