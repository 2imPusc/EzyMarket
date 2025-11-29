import express from 'express';
import mealPlanController from '../controllers/mealPlanController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Bắt buộc đăng nhập cho tất cả các route này
router.use(authMiddleware.verifyToken);

// ===============================================
//           SWAGGER DEFINITIONS
// ===============================================

/**
 * @swagger
 * tags:
 *   name: MealPlans
 *   description: API for managing daily meal planning
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # --- INPUT SCHEMAS ---
 *
 *     # 1. Chi tiết món ăn cơ bản (Dùng làm gốc cho Single Add và Bulk Add)
 *     MealItemDetail:
 *       type: object
 *       required:
 *         - itemType
 *         - quantity
 *       properties:
 *         itemType:
 *           type: string
 *           enum: [recipe, ingredient]
 *           description: "'recipe' cho công thức, 'ingredient' cho nguyên liệu lẻ."
 *         quantity:
 *           type: number
 *           default: 1
 *           description: "Số lượng (suất ăn hoặc số đơn vị)."
 *         recipeId:
 *           type: string
 *           description: "Bắt buộc nếu itemType='recipe'."
 *         ingredientId:
 *           type: string
 *           description: "Bắt buộc nếu itemType='ingredient'."
 *         unitId:
 *           type: string
 *           description: "Bắt buộc nếu itemType='ingredient'. ID đơn vị tính."
 *
 *     # 2. Input cho API thêm 1 món (POST /items)
 *     MealItemInput:
 *       allOf:
 *         - $ref: '#/components/schemas/MealItemDetail'
 *         - type: object
 *           required: [date, mealType]
 *           properties:
 *             date:
 *               type: string
 *               format: date
 *               example: "2025-10-23"
 *             mealType:
 *               type: string
 *               enum: [breakfast, lunch, dinner, snack]
 *
 *     # 3. Input cho API thêm nhiều món (Bulk Add)
 *     MealItemBulkInput:
 *       type: object
 *       required: [date, mealType, items]
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           example: "2025-10-23"
 *         mealType:
 *           type: string
 *           enum: [breakfast, lunch, dinner, snack]
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MealItemDetail'
 *
 *     # 4. Input cho API cập nhật món (Update)
 *     MealItemUpdateInput:
 *       type: object
 *       properties:
 *         quantity:
 *           type: number
 *         isEaten:
 *           type: boolean
 *         note:
 *           type: string
 *         unitId:
 *           type: string
 *           description: "Thay đổi đơn vị tính (chỉ áp dụng cho itemType='ingredient')."
 *
 *     # --- RESPONSE SCHEMAS ---
 *
 *     # 5. Cấu trúc hiển thị một món ăn (Populated Data)
 *     MealItemResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         itemType:
 *           type: string
 *           enum: [recipe, ingredient]
 *         quantity:
 *           type: number
 *         isEaten:
 *           type: boolean
 *         note:
 *           type: string
 *         recipeId:
 *           type: object
 *           description: "Populated Recipe object"
 *           properties:
 *             _id:
 *               type: string
 *             title:
 *               type: string
 *             imageUrl:
 *               type: string
 *             prepTime:
 *               type: number
 *             cookTime:
 *               type: number
 *         ingredientId:
 *           type: object
 *           description: "Populated Ingredient object"
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             imageURL:
 *               type: string
 *         unitId:
 *           type: object
 *           description: "Populated Unit object"
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             abbreviation:
 *               type: string
 *
 *     # 6. Cấu trúc Response cho 1 Ngày (Meal Plan)
 *     MealPlanResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         summary:
 *           type: object
 *           properties:
 *             totalCalories:
 *               type: number
 *         meals:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               mealType:
 *                 type: string
 *                 enum: [breakfast, lunch, dinner, snack]
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/MealItemResponse'
 *
 *     # 7. Cấu trúc kết quả tìm kiếm Recipe với Inventory Check
 *     RecipeWithInventory:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         imageUrl:
 *           type: string
 *         missingIngredientsCount:
 *           type: integer
 *           description: "Số lượng nguyên liệu bị thiếu."
 *         canCook:
 *           type: boolean
 *           description: "True nếu tủ lạnh có đủ tất cả nguyên liệu."
 *         ingredients:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               quantity:
 *                 type: number
 *                 description: "Số lượng yêu cầu."
 *               availableQuantity:
 *                 type: number
 *                 description: "Số lượng thực tế đang có trong tủ lạnh (matching unit)."
 *               isEnough:
 *                 type: boolean
 */

// ===============================================
//               ROUTES DEFINITIONS
// ===============================================

/**
 * @swagger
 * /api/meal-plans:
 *   get:
 *     summary: Get meal plans by date range
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *         description: "Format: YYYY-MM-DD"
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 *         description: "Format: YYYY-MM-DD"
 *     responses:
 *       200:
 *         description: List of meal plans for the requested range.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MealPlanResponse'
 */
router.get('/', mealPlanController.getPlan);

/**
 * @swagger
 * /api/meal-plans/items:
 *   post:
 *     summary: Add an item to a meal
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Add a Recipe OR an Ingredient to a specific meal (Breakfast, Lunch, etc.).
 *       - If `itemType` is **recipe**: `recipeId` is required. `quantity` is servings.
 *       - If `itemType` is **ingredient**: `ingredientId` and `unitId` are required. `quantity` is the amount.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MealItemInput'
 *     responses:
 *       201:
 *         description: Item added successfully.
 */
router.post('/items', mealPlanController.addItem);

/**
 * @swagger
 * /api/meal-plans/items/bulk:
 *   post:
 *     summary: Bulk add items to a meal
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     description: "Optimized for 'Add from Fridge'. Allows adding multiple items at once."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MealItemBulkInput'
 *     responses:
 *       201:
 *         description: Items added successfully.
 */
router.post('/items/bulk', mealPlanController.addItemsBulk);

/**
 * @swagger
 * /api/meal-plans/recipes/search:
 *   get:
 *     summary: Search recipes with inventory availability
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     description: "Search for recipes and check if the user has enough ingredients in their fridge."
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Keyword to search
 *       - in: query
 *         name: fridgeIds
 *         schema: { type: string }
 *         description: "Optional. Comma-separated list of fridge IDs to check inventory (e.g., 'id1,id2'). If omitted, checks all user fridges."
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of recipes with availability status.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RecipeWithInventory'
 */
router.get('/recipes/search', mealPlanController.searchRecipes);

/**
 * @swagger
 * /api/meal-plans/recipes/recommendations:
 *   get:
 *     summary: Get recipe recommendations based on fridge
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     description: "Suggest recipes that match ingredients currently in the user's fridge."
 *     parameters:
 *       - in: query
 *         name: fridgeIds
 *         schema: { type: string }
 *         description: "Optional. Comma-separated list of fridge IDs. If omitted, checks all user fridges."
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of recommended recipes.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RecipeWithInventory'
 */
router.get('/recipes/recommendations', mealPlanController.getRecommendations);

/**
 * @swagger
 * /api/meal-plans/items/{itemId}:
 *   patch:
 *     summary: Update a meal item (Quantity, Check status, Unit)
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Update details of a specific meal item.
 *       - **unitId**: Can ONLY be updated if the item is an **ingredient**.
 *       - Attempting to update `unitId` for a **recipe** will fail.
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MealItemUpdateInput'
 *     responses:
 *       200:
 *         description: Item updated successfully.
 *       400:
 *         description: Bad Request - Cannot update unitId for a recipe item.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cannot update unitId for a recipe item"
 *       404:
 *         description: Item not found.
 */
router.patch('/items/:itemId', mealPlanController.updateItem);

/**
 * @swagger
 * /api/meal-plans/items/{itemId}:
 *   delete:
 *     summary: Remove an item from a meal
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item removed successfully.
 *       404:
 *         description: Item not found.
 */
router.delete('/items/:itemId', mealPlanController.removeItem);

export default router;