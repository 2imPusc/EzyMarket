import express from 'express';
import recipeController from '../controllers/recipeController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Recipes
 *   description: Recipe CRUD and discovery
 */

/**
 * @swagger
 * /api/recipes:
 *   post:
 *     summary: Create a new recipe (authenticated)
 *     description: >
 *       Create recipe. For each ingredient you can provide either ingredientId (preferred) or name.
 *       You can also provide unitId (preferred) or unit (string). Server will resolve IDs to canonical
 *       records and store both the reference ID and a snapshot (name/unitAbbreviation) for stability.
 *     tags: [Recipes]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, ingredients]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Trứng bò rau"
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               prepTime:
 *                 type: integer
 *                 example: 10
 *               cookTime:
 *                 type: integer
 *                 example: 30
 *               servings:
 *                 type: integer
 *                 example: 2
 *               directions:
 *                 type: array
 *                 items:
 *                   type: string
 *               ingredients:
 *                 type: array
 *                 description: >
 *                   Array of ingredient objects. Each item must include either ingredientId (ObjectId) or name.
 *                   Optionally include unitId (ObjectId) or unit (string), quantity and optional flag.
 *                 items:
 *                   type: object
 *                   properties:
 *                     ingredientId:
 *                       type: string
 *                       description: ObjectId referencing Ingredient (server will fetch canonical name)
 *                     name:
 *                       type: string
 *                       description: Fallback display name if ingredientId not provided (server will normalize)
 *                     quantity:
 *                       type: number
 *                     unitId:
 *                       type: string
 *                       description: ObjectId referencing Unit (server will fetch name/abbreviation)
 *                     unit:
 *                       type: string
 *                       description: Human-readable unit; allowed if unitId is not provided
 *                     optional:
 *                       type: boolean
 *               tag:
 *                 type: string
 *                 example: "main"
 *     responses:
 *       '201':
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 recipe:
 *                   $ref: '#/components/schemas/Recipe'
 *       '400':
 *         description: Validation error (missing title/ingredients or invalid IDs)
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.post('/', authMiddleware.verifyToken, recipeController.create);

/**
 * @swagger
 * /api/recipes/my-recipes:
 *   get:
 *     summary: Get recipes created by current user
 *     tags: [Recipes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
router.get('/my-recipes', authMiddleware.verifyToken, recipeController.getMyRecipes);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   get:
 *     summary: Get recipe details by id
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get('/:recipeId', recipeController.getById);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   put:
 *     summary: Update recipe (owner or admin)
 *     tags: [Recipes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *     responses:
 *       200: { description: Updated }
 */
router.put('/:recipeId', authMiddleware.verifyToken, recipeController.update);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   delete:
 *     summary: Delete recipe (owner or admin)
 *     tags: [Recipes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/:recipeId', authMiddleware.verifyToken, recipeController.delete);

/**
 * @swagger
 * /api/recipes/search:
 *   get:
 *     summary: Search public recipes by keyword
 *     tags: [Recipes]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: search term
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
router.get('/search', recipeController.search);

/**
 * @swagger
 * /api/recipes/suggestions:
 *   post:
 *     summary: Suggest recipes based on available ingredients
 *     tags: [Recipes]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               availableIngredients:
 *                 type: array
 *                 items: { type: string }
 *               threshold:
 *                 type: number
 *               limit:
 *                 type: integer
 *     responses:
 *       200: { description: OK }
 */
router.post('/suggestions', authMiddleware.verifyToken, recipeController.suggestions);

/**
 * @swagger
 * /api/shopping-list/from-recipe:
 *   post:
 *     summary: Build shopping list from a recipe and user's available items
 *     tags: [Recipes]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipeId]
 *             properties:
 *               recipeId: { type: string }
 *               availableIngredients:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.post('/shopping-list/from-recipe', authMiddleware.verifyToken, recipeController.shoppingListFromRecipe);

/**
 * @swagger
 * /api/master-data/ingredients:
 *   get:
 *     summary: Master data - ingredient name suggestions (autocomplete)
 *     tags: [Recipes]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: prefix or partial name
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: OK }
 */
router.get('/master-data/ingredients', recipeController.masterDataIngredients);

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: List available recipe tags
 *     tags: [Recipes]
 *     responses:
 *       200:
 *         description: Array of tags
 */
router.get('/tags', (req, res) => {
  const tags = ['main', 'appetizer', 'dessert', 'drink', 'salad', 'soup', 'side', 'snack', 'other'];
  res.status(200).json({ tags });
});

/**
 * GET /api/recipes?tag={tagName}
 */
router.get('/', (req, res, next) => {
  // if tag query present, forward to search by tag logic
  if (req.query.tag) {
    // reuse getAll/search pattern: simple filter by tag
    const { tag, page = 1, limit = 20 } = req.query;
    const skip = (Math.max(parseInt(page, 10), 1) - 1) * parseInt(limit, 10);
    const filter = { tag };
    Promise.all([
      require('../model/recipeRepository.js').default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
      require('../model/recipeRepository.js').default.countDocuments(filter),
    ])
      .then(([recipes, total]) => res.status(200).json({ recipes, pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / limit) } }))
      .catch((err) => next(err));
    return;
  }
  // otherwise return 400 or delegate to search endpoint
  res.status(400).json({ message: 'Use /api/recipes/search or provide ?tag=...' });
});

export default router;