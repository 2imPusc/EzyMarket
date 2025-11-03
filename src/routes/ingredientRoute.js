import express from 'express';
import ingredientController from '../controllers/ingredientController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { validateIngredient } from '#src/middlewares/validationMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Ingredients
 *   description: Ingredient management for fridge and recipes
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Ingredient:
 *       type: object
 *       required:
 *         - name
 *         - foodCategory
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated ingredient ID
 *         name:
 *           type: string
 *           description: Ingredient name (unique, lowercase)
 *           example: "tomato"
 *         imageURL:
 *           type: string
 *           format: uri
 *           description: URL of ingredient image
 *           example: "https://uploadthing.com/f/..."
 *         foodCategory:
 *           type: string
 *           enum: [vegetables, fruits, meat, seafood, dairy, grains, spices, beverages, condiments, frozen, canned, bakery, snacks, other]
 *           description: Food category
 *           example: "vegetables"
 *         defaultExpireDays:
 *           type: integer
 *           minimum: 1
 *           description: Default expiration days
 *           example: 7
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/ingredients:
 *   post:
 *     summary: Create a new ingredient (Admin only)
 *     tags: [Ingredients]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - foodCategory
 *             properties:
 *               name: { type: string, example: "tomato" }
 *               imageURL: { type: string, format: uri }
 *               foodCategory: { type: string, enum: [vegetables, fruits, meat, seafood, dairy, grains, spices, beverages, condiments, frozen, canned, bakery, snacks, other] }
 *               defaultExpireDays: { type: integer, minimum: 1, default: 7 }
 *     responses:
 *       201:
 *         description: Ingredient created successfully
 *       400: { description: Invalid input or duplicate name }
 *       401: { description: Unauthorized }
 *       500: { description: Internal server error }
 */
router.post('/', authMiddleware.verifyToken, validateIngredient, authMiddleware.verifyAdmin, ingredientController.create);

/**
 * @swagger
 * /api/ingredients:
 *   get:
 *     summary: Get all ingredients (with pagination and filters)
 *     tags: [Ingredients]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Items per page
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by food category
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name (partial match)
 *     responses:
 *       200:
 *         description: List of ingredients
 *       401: { description: Unauthorized }
 *       500: { description: Internal server error }
 */
router.get('/', authMiddleware.verifyToken, ingredientController.getAll);

/**
 * @swagger
 * /api/ingredients/categories:
 *   get:
 *     summary: Get list of food categories
 *     tags: [Ingredients]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of categories
 *       500: { description: Internal server error }
 */
router.get('/categories', authMiddleware.verifyToken, ingredientController.getCategories);

/**
 * @swagger
 * /api/ingredients/{id}:
 *   get:
 *     summary: Get ingredient by ID
 *     tags: [Ingredients]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Ingredient ID
 *     responses:
 *       200: { description: Ingredient details }
 *       400: { description: Invalid ID }
 *       404: { description: Ingredient not found }
 *       500: { description: Internal server error }
 */
router.get('/:id', authMiddleware.verifyToken, ingredientController.getById);

/**
 * @swagger
 * /api/ingredients/{id}:
 *   put:
 *     summary: Update ingredient (Admin only)
 *     tags: [Ingredients]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               imageURL: { type: string }
 *               foodCategory: { type: string }
 *               defaultExpireDays: { type: integer }
 *     responses:
 *       200: { description: Ingredient updated }
 *       400: { description: Invalid input }
 *       404: { description: Not found }
 *       500: { description: Internal server error }
 */
router.put('/:id', authMiddleware.verifyToken, authMiddleware.verifyAdmin, ingredientController.update);

/**
 * @swagger
 * /api/ingredients/{id}:
 *   delete:
 *     summary: Delete ingredient (Admin only)
 *     tags: [Ingredients]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Ingredient deleted }
 *       404: { description: Not found }
 *       500: { description: Internal server error }
 */
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.verifyAdmin, ingredientController.delete);

export default router;