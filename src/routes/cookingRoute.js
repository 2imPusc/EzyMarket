import express from 'express';
import cookingController from '../controllers/cookingController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware.verifyToken);

/**
 * @swagger
 * tags:
 *   - name: Cooking
 *     description: Cook recipes by consuming fridge ingredients and store cooked dishes in fridge
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     # ---------- INPUT ----------
 *     CookRequest:
 *       type: object
 *       required: [recipeId]
 *       properties:
 *         recipeId:
 *           type: string
 *           description: ID of the recipe to cook
 *         servings:
 *           type: integer
 *           description: Number of servings to cook. If omitted or 0, uses recipe default
 *           example: 3
 *         force:
 *           type: boolean
 *           description: Allow cook even if required ingredients are insufficient
 *           example: false
 *         cookedExpiryDays:
 *           type: integer
 *           description: Expiry days for the cooked dish (default 3)
 *           example: 3
 *     # ---------- COMMON ----------
 *     MissingIngredient:
 *       type: object
 *       properties:
 *         ingredientId:
 *           type: string
 *         unitId:
 *           type: string
 *           nullable: true
 *         name:
 *           type: string
 *         required:
 *           type: number
 *         available:
 *           type: number
 *         missing:
 *           type: number
 *     IngredientDetail:
 *       type: object
 *       properties:
 *         ingredientId:
 *           type: string
 *         unitId:
 *           type: string
 *           nullable: true
 *         name:
 *           type: string
 *         required:
 *           type: number
 *         available:
 *           type: number
 *         missing:
 *           type: number
 *         optional:
 *           type: boolean
 *         isEnough:
 *           type: boolean
 *     ConsumptionItemDetail:
 *       type: object
 *       properties:
 *         itemId:
 *           type: string
 *         taken:
 *           type: number
 *     ConsumptionEntry:
 *       type: object
 *       properties:
 *         ingredientId:
 *           type: string
 *         unitId:
 *           type: string
 *         name:
 *           type: string
 *         requested:
 *           type: number
 *         consumed:
 *           type: number
 *         remainingToConsume:
 *           type: number
 *         optional:
 *           type: boolean
 *         details:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ConsumptionItemDetail'
 *     CookedFridgeItem:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         itemType:
 *           type: string
 *           enum: [recipe]
 *         recipeId:
 *           type: object
 *           properties:
 *             _id: { type: string }
 *             title: { type: string }
 *             imageUrl: { type: string }
 *             servings: { type: integer }
 *         unitId:
 *           type: string
 *           nullable: true
 *           description: null for recipe servings
 *         quantity:
 *           type: number
 *           description: Number of servings cooked
 *         expiryDate:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [in-stock, used, expired, discarded]
 *         cookedFrom:
 *           type: object
 *           properties:
 *             recipeId: { type: string }
 *             cookedAt:
 *               type: string
 *               format: date-time
 *     # ---------- RESPONSES ----------
 *     CookCheckResponse:
 *       type: object
 *       properties:
 *         recipeId:
 *           type: string
 *         recipeTitle:
 *           type: string
 *         servings:
 *           type: integer
 *         canCook:
 *           type: boolean
 *           description: Enough all required (non-optional) ingredients
 *         canCookAll:
 *           type: boolean
 *           description: Enough all ingredients including optional
 *         missing:
 *           type: object
 *           properties:
 *             required:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MissingIngredient'
 *             optional:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MissingIngredient'
 *         ingredients:
 *           type: array
 *           description: Present only if verbose=true
 *           items:
 *             $ref: '#/components/schemas/IngredientDetail'
 *     CookResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Cooking completed
 *         cookedItem:
 *           $ref: '#/components/schemas/CookedFridgeItem'
 *         consumption:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ConsumptionEntry'
 *         warnings:
 *           type: array
 *           description: Missing required ingredients when force=true
 *           items:
 *             $ref: '#/components/schemas/MissingIngredient'
 */

/**
 * @swagger
 * /api/cooking/check/{recipeId}:
 *   get:
 *     tags: [Cooking]
 *     summary: Check cookability for a recipe
 *     description: |
 *       Calculates required vs available for each ingredient.  
 *       canCook = enough all required (non-optional).  
 *       canCookAll = enough all ingredients including optional.  
 *       Set verbose=true to include per-ingredient details.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: servings
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of servings to check. If omitted or 0, uses recipe default
 *       - in: query
 *         name: verbose
 *         schema:
 *           type: boolean
 *         description: Include per-ingredient details
 *     responses:
 *       200:
 *         description: Cookability result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CookCheckResponse'
 *             examples:
 *               compact_missing:
 *                 summary: Missing optional only
 *                 value:
 *                   recipeId: "694cc6b5fb5e58b4ca8bc46c"
 *                   recipeTitle: "Bò Lúc Lắc user"
 *                   servings: 3
 *                   canCook: true
 *                   canCookAll: false
 *                   missing:
 *                     required: []
 *                     optional:
 *                       - ingredientId: "691d7954efc5f01225583f1a"
 *                         unitId: "691d7c774080e5a2cee6aa34"
 *                         name: "beef"
 *                         required: 300
 *                         available: 291
 *                         missing: 9
 *               verbose_details:
 *                 summary: Include ingredient details
 *                 value:
 *                   recipeId: "694cc6b5fb5e58b4ca8bc46c"
 *                   recipeTitle: "Bò Lúc Lắc user"
 *                   servings: 2
 *                   canCook: false
 *                   canCookAll: true
 *                   missing:
 *                     required: []
 *                     optional: []
 *                   ingredients:
 *                     - ingredientId: "691d7954efc5f01225583f1a"
 *                       unitId: "691d7c774080e5a2cee6aa34"
 *                       name: "beef"
 *                       required: 200
 *                       available: 291
 *                       missing: 0
 *                       optional: true
 *                       isEnough: true
 *       404:
 *         description: Recipe not found
 *       401:
 *         description: Unauthorized
 */
router.get('/check/:recipeId', cookingController.check);

/**
 * @swagger
 * /api/cooking/cook:
 *   post:
 *     tags: [Cooking]
 *     summary: Cook a recipe and create a cooked dish in fridge
 *     description: |
 *       Consumes fridge ingredients using FIFO and updates price proportionally.  
 *       Creates a fridge item with itemType=recipe (servings, no unit).  
 *       If force=false and missing required ingredients → 400 error.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CookRequest'
 *           examples:
 *             normal:
 *               summary: Cook with default expiry 3 days
 *               value:
 *                 recipeId: "694cc6b5fb5e58b4ca8bc46c"
 *                 servings: 2
 *             force_cook:
 *               summary: Force cook even if missing required
 *               value:
 *                 recipeId: "694cc6b5fb5e58b4ca8bc46c"
 *                 servings: 4
 *                 force: true
 *                 cookedExpiryDays: 5
 *     responses:
 *       201:
 *         description: Cooked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CookResponse'
 *             examples:
 *               success:
 *                 value:
 *                   message: "Cooking completed"
 *                   cookedItem:
 *                     _id: "695130484a6de8cade6ca460"
 *                     itemType: "recipe"
 *                     recipeId:
 *                       _id: "694cc6b5fb5e58b4ca8bc46c"
 *                       title: "Bò Lúc Lắc user"
 *                       imageUrl: "https://example.com/bo-luc-lac.jpg"
 *                       servings: 2
 *                     unitId: null
 *                     quantity: 2
 *                     expiryDate: "2026-01-06T00:00:00.000Z"
 *                     status: "in-stock"
 *                     cookedFrom:
 *                       recipeId: "694cc6b5fb5e58b4ca8bc46c"
 *                       cookedAt: "2026-01-03T12:00:00.000Z"
 *                   consumption:
 *                     - ingredientId: "691d7954efc5f01225583f1a"
 *                       unitId: "691d7c774080e5a2cee6aa34"
 *                       name: "beef"
 *                       requested: 200
 *                       consumed: 200
 *                       remainingToConsume: 0
 *                       optional: true
 *                       details:
 *                         - itemId: "695130484a6de8cade6ca45f"
 *                           taken: 200
 *       400:
 *         description: Insufficient ingredients or bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 *                   example: "INSUFFICIENT_INGREDIENTS"
 *             examples:
 *               insufficient_required:
 *                 value:
 *                   message: "Insufficient ingredients: beef (required 300, available 291)"
 *                   error: "INSUFFICIENT_INGREDIENTS"
 *       404:
 *         description: Recipe not found
 *       401:
 *         description: Unauthorized
 */
router.post('/cook', cookingController.cook);

export default router;