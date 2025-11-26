import express from 'express';
import recipeController from '../controllers/recipeController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware.verifyToken);

// ===============================================
//           SWAGGER DEFINITIONS
// ===============================================

/**
 * @swagger
 * tags:
 *   name: Recipes
 *   description: API for managing system-wide and user-created recipes
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # Schemas for Input (Request Body)
 *     RecipeIngredientInput:
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
 *       required:
 *         - title
 *         - ingredients
 *       properties:
 *         title:
 *           type: string
 *           example: "Bò Lúc Lắc"
 *         description:
 *           type: string
 *           example: "Món bò xào mềm ngon đậm đà, ăn cùng cơm trắng."
 *         imageUrl:
 *           type: string
 *         prepTime:
 *           type: integer
 *           description: "Preparation time in minutes."
 *           example: 15
 *         cookTime:
 *           type: integer
 *           description: "Cooking time in minutes."
 *           example: 10
 *         servings:
 *           type: integer
 *           description: "Number of servings."
 *           example: 2
 *         directions:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Bước 1: Thái thịt bò...", "Bước 2: Ướp gia vị..."]
 *         ingredients:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RecipeIngredientInput'
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: "An array of tag names. Personal tags will be created on-the-fly if they don't exist."
 *           example: ["món chính", "thịt bò", "món đãi tiệc"]
 *
 *     TagResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         creatorId:
 *           type: string
 *           nullable: true
 *
 *     RecipeIngredientResponse:
 *       type: object
 *       properties:
 *         ingredientId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *         quantity:
 *           type: number
 *         unitText:
 *           type: string
 *         unitId:
 *           type: string
 *           description: MongoDB ObjectId của đơn vị tính (nếu có).
 *           example: "60d5ecb8b5c9e67890123457"
 *         note:
 *           type: string
 *         optional:
 *           type: boolean
 *
 *     RecipeResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         creatorId:
 *           type: object
 *           nullable: true
 *           description: "Null for system recipes. Populated user object for personal recipes."
 *           properties:
 *             _id:
 *               type: string
 *             userName:
 *               type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TagResponse'
 *         # ... các trường khác như ingredients, directions, etc.
 *
 *     RecipeListResponse:
 *       type: object
 *       properties:
 *         recipes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RecipeResponse'
 *         pagination:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             totalPages:
 *               type: integer
 */

// ===============================================
//               ROUTES DEFINITIONS
// ===============================================

router.use(authMiddleware.verifyToken);

/**
 * @swagger
 * /api/recipes:
 *   post:
 *     summary: Create a new personal recipe
 *     tags: [Recipes]
 *     security: [{ bearerAuth: [] }]
 *     description: "Creates a new recipe under the logged-in user's account. If a tag name provided does not exist as a system tag or a personal tag for the user, a new personal tag will be created."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecipeInput'
 *     responses:
 *       '201':
 *         description: Recipe created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecipeResponse'
 *       '400':
 *         description: Bad Request or Validation Error
 *       '401':
 *         description: Unauthorized
 */
router.post('/', recipeController.create);

/**
 * @swagger
 * /api/recipes/my-recipes:
 *   get:
 *     summary: Get all recipes created by the user (personal recipes)
 *     tags: [Recipes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: "Search keyword within the user's recipes."
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       '200':
 *         description: A paginated list of the user's personal recipes.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecipeListResponse'
 *       '401':
 *         description: Unauthorized
 */
router.get('/my-recipes', recipeController.getMyRecipes);

/**
 * @swagger
 * /api/recipes/search:
 *   get:
 *     summary: Search all recipes (system and user-created)
 *     tags: [Recipes]
 *     description: "Public endpoint for recipe discovery. Searches across all system recipes and all user-created recipes."
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: "Search keyword for title, description, and ingredient names."
 *       - in: query
 *         name: tag
 *         schema: { type: string }
 *         description: "Filter recipes by a specific tag name."
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       '200':
 *         description: A paginated list of found recipes.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecipeListResponse'
 */
router.get('/search', recipeController.search);

/**
 * @swagger
 * /api/recipes/system:
 *   get:
 *     summary: Get all system-wide recipes
 *     tags: [Recipes]
 *     description: "Retrieves only the official, admin-created recipes."
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: "Search keyword within system recipes."
 *       - in: query
 *         name: tag
 *         schema: { type: string }
 *         description: "Filter system recipes by a specific tag name."
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       '200':
 *         description: A paginated list of system recipes.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecipeListResponse'
 */
router.get('/system', recipeController.getSystem);

/**
 * @swagger
 * /api/recipes/suggestions:
 *   get:
 *     summary: Get recipe title suggestions (for autocomplete)
 *     tags: [Recipes]
 *     description: "Optimized for speed. Returns a limited list of recipes whose titles START WITH the search query."
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: "The search query prefix (e.g., 'bò')."
 *     responses:
 *       '200':
 *         description: A list of recipe title suggestions.
 */
router.get('/suggestions', recipeController.getSuggestions);

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
 * /api/recipes/{recipeId}:
 *   get:
 *     summary: Get a single recipe by its ID
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '200':
 *         description: The requested recipe object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecipeResponse'
 *       '404':
 *         description: Recipe not found.
 */
router.get('/:recipeId', recipeController.getById);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   put:
 *     summary: Update a personal recipe (Owner or Admin only)
 *     tags: [Recipes]
 *     security: [{ bearerAuth: [] }]
 *     description: "A user can only update a recipe if they are its creator, or if they are an admin."
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecipeInput'
 *     responses:
 *       '200':
 *         description: Recipe updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecipeResponse'
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden
 *       '404':
 *         description: Recipe not found
 */
router.put('/:recipeId', authMiddleware.verifyToken, recipeController.update);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   delete:
 *     summary: Delete a personal recipe (Owner or Admin only)
 *     tags: [Recipes]
 *     security: [{ bearerAuth: [] }]
 *     description: "A user can only delete a recipe if they are its creator, or if they are an admin."
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '200':
 *         description: Recipe deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recipe deleted"
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden
 *       '404':
 *         description: Recipe not found
 */
router.delete('/:recipeId', authMiddleware.verifyToken, recipeController.delete);

export default router;