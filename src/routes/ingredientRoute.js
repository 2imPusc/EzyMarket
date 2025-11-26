import express from 'express';
import ingredientController from '../controllers/ingredientController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { validateIngredient } from '#src/middlewares/validationMiddleware.js';

const router = express.Router();

// Tất cả các route dưới đây đều yêu cầu người dùng phải đăng nhập
router.use(authMiddleware.verifyToken);

// ===============================================
//           SWAGGER DEFINITIONS
// ===============================================

/**
 * @swagger
 * tags:
 *   name: Ingredients
 *   description: API for managing system-wide and user-specific ingredients
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
 *     Ingredient:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "64f1a2b3c4d5e6f7890a1234"
 *         creatorId:
 *           type: string
 *           nullable: true
 *           description: "Null for system ingredients, ObjectId for user-created ingredients."
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           example: "thịt bò"
 *         imageURL:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/beef.png"
 *         foodCategory:
 *           type: string
 *           example: "meat"
 *         defaultExpireDays:
 *           type: integer
 *           example: 3
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     IngredientInput:
 *       type: object
 *       required: 
 *         - name
 *         - foodCategory
 *       properties:
 *         name:
 *           type: string
 *           description: "Name of the ingredient."
 *           example: "Tương ớt nhà làm"
 *         foodCategory:
 *           type: string
 *           description: "Category of the food."
 *           example: "condiments"
 *         imageURL:
 *           type: string
 *           description: "(Optional) URL of the ingredient image."
 *         defaultExpireDays:
 *           type: integer
 *           description: "(Optional) Default expiration days."
 *         creatorId:
 *           type: object
 *           nullable: true
 *           description: "(Admin Only) Send `null` to create a system-wide ingredient. Omit for user-specific."
 *           example: null
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
 *           example: "Ingredient not found"
 *     IngredientSuccessResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Ingredient created successfully"
 *         ingredient:
 *           $ref: '#/components/schemas/Ingredient'
 *     MessageResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Ingredient deleted successfully"
 *     SuggestionResponse:
 *       type: array
 *       items:
 *         type: object
 *         properties:
 *           _id:
 *             type: string
 *             example: "64f1a2b3c4d5e6f7890a1234"
 *           name:
 *             type: string
 *             example: "Thịt bò"
 *           creatorId:
 *             type: string
 *             nullable: true
 *             example: "507f1f77bcf86cd799439011"
 */

// ===============================================
//               ROUTES DEFINITIONS
// ===============================================

router.use(authMiddleware.verifyToken);

/**
 * @swagger
 * /api/ingredients:
 *   post:
 *     summary: Create a new ingredient (personal or system)
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       - Regular users can create their own personal ingredients.
 *       - Admins can create personal ingredients, OR create a system-wide ingredient by providing `"creatorId": null` in the request body.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IngredientInput'
 *     responses:
 *       '201':
 *         description: Ingredient created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IngredientSuccessResponse' 
 *       '400':
 *         description: Bad Request (e.g., missing required fields)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse' 
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse' 
 *       '409':
 *         description: Conflict (An ingredient with this name already exists)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse' 
 */
router.post('/', validateIngredient, ingredientController.create);

/**
 * @swagger
 * /api/ingredients:
 *   get:
 *     summary: Get available ingredients (System + User's own)
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     description: "Retrieves a list of all system-wide ingredients PLUS all personal ingredients created by the logged-in user."
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number for pagination
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
 *         description: Search by ingredient name (case-insensitive, partial match).
 *     responses:
 *       '200':
 *         description: A paginated list of available ingredients
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IngredientListResponse'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', ingredientController.getAll);

/**
 * @swagger
 * /api/ingredients/suggestions:
 *   get:
 *     summary: Get ingredient name suggestions (for autocomplete)
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     description: "Optimized for speed. Returns a limited list of ingredients (system + user's own) whose names START WITH the search query. Ideal for UI autocomplete functionality."
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: "The search query prefix (e.g., 'th')."
 *     responses:
 *       '200':
 *         description: A list of ingredient suggestions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuggestionResponse'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/suggestions', ingredientController.getSuggestions);

/**
 * @swagger
 * /api/ingredients/categories:
 *   get:
 *     summary: Get all available food categories
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of food category strings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/categories', ingredientController.getCategories);

/**
 * @swagger
 * /api/ingredients/{id}:
 *   get:
 *     summary: Get a single ingredient by ID
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     description: "A user can only retrieve an ingredient if it is a system ingredient OR if they are the creator of it."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The ingredient's ObjectId
 *     responses:
 *       '200':
 *         description: The requested ingredient
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ingredient'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse' 
 *       '403':
 *         description: Forbidden (Trying to access another user's personal ingredient)
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
 */
router.get('/:id', ingredientController.getById);

/**
 * @swagger
 * /api/ingredients/{id}:
 *   put:
 *     summary: Update an ingredient (Owner or Admin only)
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     description: "A user can only update an ingredient if they are its creator, or if they are an admin."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The ingredient's ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IngredientInput'
 *     responses:
 *      '200':
 *        description: Ingredient updated successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/IngredientSuccessResponse'
 *      '401':
 *        description: Unauthorized
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ErrorResponse'
 *      '403':
 *        description: Forbidden
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ErrorResponse'
 *      '404':
 *        description: Ingredient not found
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ErrorResponse'
 *      '409':
 *        description: Conflict (Name already exists)
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ErrorResponse' 
 */
router.put('/:id', ingredientController.update);

/**
 * @swagger
 * /api/ingredients/{id}:
 *   delete:
 *     summary: Delete an ingredient (Owner or Admin only)
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     description: "A user can only delete an ingredient if they are its creator, or if they are an admin."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The ingredient's ObjectId
 *     responses:
 *      '200':
 *        description: Ingredient deleted successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/MessageResponse' # <-- Sử dụng schema mới
 *      '401':
 *        description: Unauthorized
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ErrorResponse' # <-- Thêm schema lỗi
 *      '403':
 *        description: Forbidden
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ErrorResponse' # <-- Thêm schema lỗi
 *      '404':
 *        description: Ingredient not found
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ErrorResponse' # <-- Thêm schema lỗi
 */
router.delete('/:id', ingredientController.delete);

export default router;
