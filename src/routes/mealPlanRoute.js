import express from 'express';
import mealPlanController from '../controllers/mealPlanController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware.verifyToken);

// ===============================================
//           SWAGGER DEFINITIONS
// ===============================================

/**
 * @swagger
 * tags:
 *   name: MealPlans
 *   description: API for managing daily meal planning with cooking workflow
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MealItemStatus:
 *       type: string
 *       enum: [planned, cooked, eaten, consumed, skipped]
 *       description: |
 *         - planned: Item đã được thêm vào plan, chưa xử lý
 *         - cooked: Recipe đã được nấu (tạo cooked dish trong fridge)
 *         - eaten: User đã đánh dấu là đã ăn
 *         - consumed: Auto-consumed khi reconcile cuối ngày
 *         - skipped: Không đủ nguyên liệu khi reconcile
 *
 *     MealItemInput:
 *       type: object
 *       required: [date, mealType, itemType]
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           example: "2025-01-05"
 *         mealType:
 *           type: string
 *           enum: [breakfast, lunch, dinner, snacks]
 *         itemType:
 *           type: string
 *           enum: [recipe, ingredient]
 *         recipeId:
 *           type: string
 *           description: Required if itemType='recipe'
 *         ingredientId:
 *           type: string
 *           description: Required if itemType='ingredient'
 *         unitId:
 *           type: string
 *           description: Required if itemType='ingredient'
 *         quantity:
 *           type: number
 *           default: 1
 *         note:
 *           type: string
 *
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
 *         status:
 *           $ref: '#/components/schemas/MealItemStatus'
 *         isEaten:
 *           type: boolean
 *         cookedAt:
 *           type: string
 *           format: date-time
 *         eatenAt:
 *           type: string
 *           format: date-time
 *         cookedFridgeItemId:
 *           type: string
 *           description: Reference to cooked dish in fridge
 *         recipeId:
 *           type: object
 *           properties:
 *             _id: { type: string }
 *             title: { type: string }
 *             imageUrl: { type: string }
 *         ingredientId:
 *           type: object
 *           properties:
 *             _id: { type: string }
 *             name: { type: string }
 *         unitId:
 *           type: object
 *           properties:
 *             _id: { type: string }
 *             name: { type: string }
 *
 *     CookItemRequest:
 *       type: object
 *       properties:
 *         force:
 *           type: boolean
 *           default: false
 *           description: Cook even if ingredients are insufficient
 *         cookedExpiryDays:
 *           type: integer
 *           default: 3
 *           description: Days until cooked dish expires
 *
 *     CookItemResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Recipe cooked successfully"
 *         item:
 *           $ref: '#/components/schemas/MealItemResponse'
 *         cookingDetails:
 *           type: object
 *           properties:
 *             cookedItem:
 *               type: object
 *               description: The cooked dish added to fridge
 *             consumption:
 *               type: array
 *               description: Details of ingredients consumed
 *
 *     AvailabilityResponse:
 *       type: object
 *       properties:
 *         planId:
 *           type: string
 *         date:
 *           type: string
 *           format: date
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
 *                     availability:
 *                       type: object
 *                       properties:
 *                         available: { type: number }
 *                         required: { type: number }
 *                         isEnough: { type: boolean }
 *                         missing: { type: number }
 *         summary:
 *           type: object
 *           properties:
 *             totalItems: { type: integer }
 *             availableItems: { type: integer }
 *             missingItems:
 *               type: array
 *               items:
 *                 type: object
 */

// ===============================================
//               ROUTES
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
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: List of meal plans
 */
router.get('/', mealPlanController.getPlan);

/**
 * @swagger
 * /api/meal-plans/items:
 *   post:
 *     summary: Add item to meal plan (does NOT consume inventory)
 *     description: |
 *       Adds a recipe or ingredient to a meal plan with status 'planned'.
 *       Inventory is NOT consumed at this point - only when cooking or marking as eaten.
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MealItemInput'
 *     responses:
 *       201:
 *         description: Item added to plan
 */
router.post('/items', mealPlanController.addItem);

/**
 * @swagger
 * /api/meal-plans/items/bulk:
 *   post:
 *     summary: Add multiple items to meal plan (does NOT consume inventory)
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, mealType, items]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               mealType:
 *                 type: string
 *                 enum: [breakfast, lunch, dinner, snacks]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemType: { type: string, enum: [recipe, ingredient] }
 *                     recipeId: { type: string }
 *                     ingredientId: { type: string }
 *                     unitId: { type: string }
 *                     quantity: { type: number }
 *     responses:
 *       201:
 *         description: Items added to plan
 */
router.post('/items/bulk', mealPlanController.addItemsBulk);

/**
 * @swagger
 * /api/meal-plans/items/{itemId}:
 *   patch:
 *     summary: Update a meal item (quantity, note, unit)
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
 *             type: object
 *             properties:
 *               quantity: { type: number }
 *               note: { type: string }
 *               unitId: { type: string }
 *     responses:
 *       200:
 *         description: Item updated
 */
router.patch('/items/:itemId', mealPlanController.updateItem);

/**
 * @swagger
 * /api/meal-plans/items/{itemId}:
 *   delete:
 *     summary: Remove item from meal plan
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
 *         description: Item removed
 */
router.delete('/items/:itemId', mealPlanController.removeItem);

/**
 * @swagger
 * /api/meal-plans/items/{itemId}/cook:
 *   post:
 *     summary: Cook a planned recipe
 *     description: |
 *       Cooks a recipe that was added to the meal plan.
 *       - Consumes ingredients from fridge (FIFO)
 *       - Creates a cooked dish in fridge
 *       - Updates item status to 'cooked'
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *         description: The meal item ID (not recipe ID)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CookItemRequest'
 *     responses:
 *       200:
 *         description: Recipe cooked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CookItemResponse'
 *       400:
 *         description: |
 *           - INVALID_ITEM_TYPE: Item is not a recipe
 *           - ALREADY_PROCESSED: Item already cooked/eaten
 *           - INSUFFICIENT_INGREDIENTS: Not enough ingredients (use force=true to override)
 *       404:
 *         description: Meal item not found
 */
router.post('/items/:itemId/cook', mealPlanController.cookItem);

/**
 * @swagger
 * /api/meal-plans/items/{itemId}/eat:
 *   post:
 *     summary: Mark item as eaten
 *     description: |
 *       Marks a meal item as eaten and consumes from inventory:
 *       - For ingredients: consumes directly from fridge (FIFO)
 *       - For cooked recipes: reduces quantity from cooked fridge item
 *       - For planned recipes: returns error (must cook first)
 *       
 *       If ingredient is not in fridge, returns 400 error unless forceEat=true.
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
 *             type: object
 *             properties:
 *               forceEat:
 *                 type: boolean
 *                 default: false
 *                 description: Mark as eaten even if not enough in fridge
 *     responses:
 *       200:
 *         description: Item marked as eaten
 *       400:
 *         description: |
 *           - INSUFFICIENT_IN_FRIDGE: Not enough ingredient in fridge
 *           - MUST_COOK_FIRST: Recipe must be cooked before eating
 *           - ALREADY_PROCESSED: Item already eaten/consumed
 *       404:
 *         description: Meal item not found
 */
router.post('/items/:itemId/eat', mealPlanController.eatItem);

/**
 * @swagger
 * /api/meal-plans/{planId}/availability:
 *   get:
 *     summary: Check ingredient availability for a meal plan
 *     description: |
 *       Returns availability status for each item in the plan.
 *       Useful for showing which items can be cooked and what's missing.
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Availability check result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AvailabilityResponse'
 */
router.get('/:planId/availability', mealPlanController.checkAvailability);

/**
 * @swagger
 * /api/meal-plans/recipes/search:
 *   get:
 *     summary: Search recipes for meal planning
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Search results with availability info
 */
router.get('/recipes/search', mealPlanController.searchRecipes);

/**
 * @swagger
 * /api/meal-plans/recipes/recommendations:
 *   get:
 *     summary: Get recipe recommendations based on fridge contents
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Recommended recipes sorted by availability
 */
router.get('/recipes/recommendations', mealPlanController.getRecommendations);

/**
 * @swagger
 * /api/meal-plans/{date}/complete:
 *   post:
 *     summary: Complete a day's meal plan
 *     description: |
 *       Mark all remaining 'planned' items as completed.
 *       - action='skip': Mark all as skipped (no inventory change)
 *       - action='consume': Try to consume ingredients, skip if not enough
 *     tags: [MealPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *         example: "2025-01-04"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [skip, consume]
 *                 default: skip
 *                 description: |
 *                   - skip: Bỏ qua tất cả, không trừ fridge
 *                   - consume: Cố trừ fridge, không đủ thì skip
 *     responses:
 *       200:
 *         description: Day completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [COMPLETED, ALREADY_COMPLETED]
 *                 summary:
 *                   type: object
 *                   properties:
 *                     consumed: { type: integer }
 *                     skipped: { type: integer }
 *                     alreadyProcessed: { type: integer }
 */
router.post('/:date/complete', mealPlanController.completeDay);

export default router;