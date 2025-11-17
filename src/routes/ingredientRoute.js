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
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     Ingredient:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "64f1a2b3c4d5e6f7890a1234"
 *         name:
 *           type: string
 *           example: "tomato"
 *         imageURL:
 *           type: string
 *           format: uri
 *           example: "https://cdn.example.com/ingredients/tomato.jpg"
 *         foodCategory:
 *           type: string
 *           example: "vegetables"
 *         defaultExpireDays:
 *           type: integer
 *           example: 5
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     IngredientListResponse:
 *       type: object
 *       properties:
 *         ingredients:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Ingredient'
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
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *
 */

/**
 * @swagger
 * /api/ingredients:
 *   post:
 *     summary: Create a new ingredient (Admin only), defaultExpireDays is optional override for default expire days (if omitted, server uses mapping)
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
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
 *               name:
 *                 type: string
 *                 example: "tomato"
 *                 description: Unique ingredient name (case-insensitive stored lowercased)
 *               imageURL:
 *                 type: string
 *                 format: uri
 *                 example: "https://cdn.example.com/ingredients/tomato.jpg"
 *               foodCategory:
 *                 type: string
 *                 example: "vegetables"
 *                 description: One of predefined categories
 *               defaultExpireDays:
 *                 type: integer
 *                 example: 5
 *                 description: Optional override for default expire days (if omitted, server uses mapping)
 *     responses:
 *       '201':
 *         description: Ingredient created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ingredient'
 *       '400':
 *         description: Validation error or duplicate name
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.post(
  '/',
  authMiddleware.verifyToken,
  validateIngredient,
  authMiddleware.verifyAdmin,
  ingredientController.create
);

/**
 * @swagger
 * /api/ingredients:
 *   get:
 *     summary: Get all ingredients (pagination, filter, search)
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by foodCategory
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Partial case-insensitive match against name
 *     responses:
 *       '200':
 *         description: List of ingredients with pagination
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IngredientListResponse'
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.get('/', authMiddleware.verifyToken, ingredientController.getAll);

/**
 * @swagger
 * /api/ingredients/categories:
 *   get:
 *     summary: Get list of supported food categories
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Array of category keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: "vegetables"
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.get('/categories', authMiddleware.verifyToken, ingredientController.getCategories);

/**
 * @swagger
 * /api/ingredients/{id}:
 *   get:
 *     summary: Get ingredient by ID
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ingredient ObjectId
 *     responses:
 *       '200':
 *         description: Ingredient details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ingredient'
 *       '400':
 *         description: Invalid ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Ingredient not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.get('/:id', authMiddleware.verifyToken, ingredientController.getById);

/**
 * @swagger
 * /api/ingredients/{id}:
 *   put:
 *     summary: Update ingredient (Admin only), defaultExpireDays is optional override for default expire days (if omitted, server uses mapping)
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ingredient ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "tomato"
 *               imageURL:
 *                 type: string
 *                 format: uri
 *               foodCategory:
 *                 type: string
 *               defaultExpireDays:
 *                 type: integer
 *     responses:
 *       '200':
 *         description: Ingredient updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ingredient'
 *       '400':
 *         description: Validation error or duplicate name
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Ingredient not found
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.put(
  '/:id',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  ingredientController.update
);

/**
 * @swagger
 * /api/ingredients/{id}:
 *   delete:
 *     summary: Delete ingredient (Admin only)
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ingredient ObjectId
 *     responses:
 *       '200':
 *         description: Ingredient deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ingredient deleted successfully"
 *       '404':
 *         description: Ingredient not found
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.delete(
  '/:id',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  ingredientController.delete
);

export default router;
