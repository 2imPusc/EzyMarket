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
 *     MealItemInput:
 *       type: object
 *       required:
 *         - date
 *         - mealType
 *         - itemType
 *         - quantity
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           example: "2023-10-25"
 *         mealType:
 *           type: string
 *           enum: [breakfast, lunch, dinner, snack]
 *         itemType:
 *           type: string
 *           enum: [recipe, ingredient]
 *           description: "Specify if you are adding a full Recipe or a single Ingredient."
 *         quantity:
 *           type: number
 *           default: 1
 *           description: "Number of servings (for Recipe) or amount (for Ingredient)."
 *         recipeId:
 *           type: string
 *           description: "Required if itemType is 'recipe'."
 *         ingredientId:
 *           type: string
 *           description: "Required if itemType is 'ingredient'."
 *         unitId:
 *           type: string
 *           description: "Required if itemType is 'ingredient'. The unit for the quantity (e.g., grams, pieces)."
 *
 *     MealItemUpdateInput:
 *       type: object
 *       properties:
 *         quantity:
 *           type: number
 *         isEaten:
 *           type: boolean
 *         note:
 *           type: string
 *
 *     MealPlanResponse:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         meals:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               mealType:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     itemType:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     isEaten:
 *                       type: boolean
 *                     recipeId:
 *                       type: object
 *                       description: "Populated Recipe object (if itemType=recipe)"
 *                     ingredientId:
 *                       type: object
 *                       description: "Populated Ingredient object (if itemType=ingredient)"
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
 * /api/meal-plans/recipes/search:
 *   get:
 *     summary: Search recipes with inventory availability
 *     tags: [MealPlans]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Keyword to search
 *       - in: query
 *         name: fridgeIds
 *         schema: { type: string }
 *         description: "Optional. Comma-separated list of fridge IDs to check inventory (e.g., 'id1,id2'). If omitted, checks all user fridges."
 *     responses:
 *       200:
 *         description: List of recipes with availability status.
 */
router.get('/recipes/search', mealPlanController.searchRecipes);

/**
 * @swagger
 * /api/meal-plans/recipes/recommendations:
 *   get:
 *     summary: Get recipe recommendations based on fridge
 *     tags: [MealPlans]
 *     parameters:
 *       - in: query
 *         name: fridgeIds
 *         schema: { type: string }
 *         description: "Optional. Comma-separated list of fridge IDs. If omitted, checks all user fridges."
 *     responses:
 *       200:
 *         description: List of recommended recipes.
 */
router.get('/recipes/recommendations', mealPlanController.getRecommendations);

/**
 * @swagger
 * /api/meal-plans/items/{itemId}:
 *   patch:
 *     summary: Update a meal item (Quantity, Check status)
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
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
 */
router.delete('/items/:itemId', mealPlanController.removeItem);

export default router;