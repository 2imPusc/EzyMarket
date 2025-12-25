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
 *   name: Recipes & Recipe-tags 
 *   description: API for managing system-wide and user-created recipes and tags
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
 *           description: "ObjectId of an existing system or personal ingredient. MUST BE a valid and accessible ID if provided."
 *           example: "60c72b2f9b1d8c001f8e4c6a"
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
 *           description: "ObjectId of an existing unit. MUST BE a valid ID if provided."
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
 *     summary: Create a new recipe (Personal or System)
 *     tags: [Recipes & Recipe-tags]
 *     security: [{ bearerAuth: [] }]
 *     description: |
 *       Creates a new recipe.
 *       - **Regular User**: Creates a **personal recipe** (visible to self and search).
 *       - **Admin**: Creates a **system recipe** (official recipe, creatorId is null).
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
 *         description: Bad Request
 *       '401':
 *         description: Unauthorized
 */
router.post('/', recipeController.create);

/**
 * @swagger
 * /api/recipes/my-recipes:
 *   get:
 *     summary: Get all recipes created by the user (personal recipes)
 *     tags: [Recipes & Recipe-tags]
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
 *     tags: [Recipes & Recipe-tags]
 *     description: "Public endpoint for recipe discovery. Searches across all system recipes and all user-created recipes."
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: "Search keyword for title, description, and ingredient names."
 *       - in: query
 *         name: tagId
 *         schema: { type: string }
 *         description: "Filter recipes by a specific Tag ID (ObjectId). Use the Tag Suggestion API to get IDs."
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
 * /api/recipes/system-recipes:
 *   get:
 *     summary: Get all system-wide recipes
 *     tags: [Recipes & Recipe-tags]
 *     description: "Retrieves only the official, admin-created recipes."
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: "Search keyword within system recipes."
 *       - in: query
 *         name: tagId
 *         schema: { type: string }
 *         description: "Filter system recipes by a specific Tag ID (ObjectId)."
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
router.get('/system-recipes', recipeController.getSystem);

/**
 * @swagger
 * /api/recipes/suggestions:
 *   get:
 *     summary: Get recipe title suggestions (for autocomplete)
 *     tags: [Recipes & Recipe-tags]
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
 * /api/recipes/{recipeId}:
 *   get:
 *     summary: Get a single recipe by its ID
 *     tags: [Recipes & Recipe-tags]
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
 *     tags: [Recipes & Recipe-tags]
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
router.put('/:recipeId', recipeController.update);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   delete:
 *     summary: Delete a personal recipe (Owner or Admin only)
 *     tags: [Recipes & Recipe-tags]
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
router.delete('/:recipeId', recipeController.delete);

export default router;