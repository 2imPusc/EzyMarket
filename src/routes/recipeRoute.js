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
 *     summary: Get recipes created by current user (paginated)
 *     description: Returns recipes created by the authenticated user with full recipe objects and pagination meta.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Optional text search term (title/description)
 *     responses:
 *       '200':
 *         description: List of user's recipes with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recipes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "691da2b904271b878bbff923"
 *                       creatorId:
 *                         type: string
 *                         example: "68ffa15e02a11df1187f9458"
 *                       title:
 *                         type: string
 *                         example: "Trứng bò rau updated"
 *                       description:
 *                         type: string
 *                         example: "Mỳ tôm omachi"
 *                       imageUrl:
 *                         type: string
 *                         format: uri
 *                         example: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSErs2ZhQy37nv863VSqyHjVuITKbHPkLqAA&s"
 *                       prepTime:
 *                         type: integer
 *                         example: 10
 *                       cookTime:
 *                         type: integer
 *                         example: 30
 *                       servings:
 *                         type: integer
 *                         example: 1
 *                       directions:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["trần bò","trần rau","pha mỳ"]
 *                       ingredients:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             ingredientId:
 *                               type: string
 *                               example: "691d7954efc5f01225583f1a"
 *                             name:
 *                               type: string
 *                               example: "beef"
 *                             quantity:
 *                               type: number
 *                               example: 100
 *                             unit:
 *                               type: string
 *                               example: "gram"
 *                             unitId:
 *                               type: string
 *                               example: "691d7c774080e5a2cee6aa34"
 *                             unitAbbreviation:
 *                               type: string
 *                               example: "g"
 *                             note:
 *                               type: string
 *                               nullable: true
 *                               example: null
 *                             optional:
 *                               type: boolean
 *                               example: true
 *                             _id:
 *                               type: string
 *                               example: "691da2f804271b878bbff938"
 *                       tag:
 *                         type: string
 *                         example: "mytom"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-11-19T10:58:01.189Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-11-19T10:59:04.334Z"
 *                       __v:
 *                         type: integer
 *                         example: 1
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 2
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.get('/my-recipes', authMiddleware.verifyToken, recipeController.getMyRecipes);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   get:
 *     summary: Get recipe details by id
 *     description: Retrieve full recipe details including populated creator object, ingredients snapshot, directions, timings and tag.
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Recipe ObjectId
 *     responses:
 *       '200':
 *         description: Recipe details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "691da2b904271b878bbff923"
 *                 creatorId:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "68ffa15e02a11df1187f9458"
 *                     email:
 *                       type: string
 *                       example: "chiendo1042004@gmail.com"
 *                     avatar:
 *                       type: string
 *                       example: "https://www.dgpublishing.com/wp-content/uploads/cache/2018/02/temp-avatar/1922871591.jpg"
 *                     userName:
 *                       type: string
 *                       example: "jien"
 *                 title:
 *                   type: string
 *                   example: "Trứng bò rau updated"
 *                 description:
 *                   type: string
 *                   example: "Mỳ tôm omachi"
 *                 imageUrl:
 *                   type: string
 *                   format: uri
 *                 prepTime:
 *                   type: integer
 *                   example: 10
 *                 cookTime:
 *                   type: integer
 *                   example: 30
 *                 servings:
 *                   type: integer
 *                   example: 1
 *                 directions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 ingredients:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ingredientId:
 *                         type: string
 *                         example: "691d7954efc5f01225583f1a"
 *                       name:
 *                         type: string
 *                         example: "beef"
 *                       quantity:
 *                         type: number
 *                         example: 100
 *                       unit:
 *                         type: string
 *                         example: "gram"
 *                       unitId:
 *                         type: string
 *                         example: "691d7c774080e5a2cee6aa34"
 *                       unitAbbreviation:
 *                         type: string
 *                         example: "g"
 *                       note:
 *                         type: string
 *                         nullable: true
 *                         example: null
 *                       optional:
 *                         type: boolean
 *                         example: true
 *                       _id:
 *                         type: string
 *                         example: "691da2f804271b878bbff938"
 *                 tag:
 *                   type: string
 *                   example: "mytom"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                 __v:
 *                   type: integer
 *       '400':
 *         description: Invalid recipe ID
 *       '404':
 *         description: Recipe not found
 *       '500':
 *         description: Internal server error
 */
router.get('/:recipeId', recipeController.getById);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   put:
 *     summary: Update recipe (owner or admin)
 *     description: >
 *       Update a recipe. Only the creator or an admin can update.
 *       To update ingredients, provide full ingredients array (replace). Each ingredient item may include
 *       either ingredientId (preferred) or name; and either unitId (preferred) or unit (string).
 *       Server will resolve IDs and store both reference IDs and snapshots (name/unitAbbreviation).
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Recipe ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               prepTime:
 *                 type: integer
 *               cookTime:
 *                 type: integer
 *               servings:
 *                 type: integer
 *               directions:
 *                 type: array
 *                 items:
 *                   type: string
 *               tag:
 *                 type: string
 *               ingredients:
 *                 type: array
 *                 description: Replace full ingredients list when provided.
 *                 items:
 *                   type: object
 *                   properties:
 *                     ingredientId:
 *                       type: string
 *                       description: ObjectId referencing Ingredient (server will fetch canonical name)
 *                     name:
 *                       type: string
 *                       description: Fallback name if ingredientId not provided
 *                     quantity:
 *                       type: number
 *                     unitId:
 *                       type: string
 *                       description: ObjectId referencing Unit (server will fetch name/abbreviation)
 *                     unit:
 *                       type: string
 *                       description: Human-readable unit if unitId not provided
 *                     note:
 *                       type: string
 *                     optional:
 *                       type: boolean
 *     responses:
 *       '200':
 *         description: Recipe updated successfully
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
 *         description: Validation error (invalid IDs or payload)
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden (not owner or admin)
 *       '404':
 *         description: Recipe not found
 *       '500':
 *         description: Internal server error
 */
router.put('/:recipeId', authMiddleware.verifyToken, recipeController.update);

/**
 * @swagger
 * /api/recipes/{recipeId}:
 *   delete:
 *     summary: Delete recipe (owner or admin)
 *     description: >
 *       Permanently delete a recipe. Only the creator of the recipe or a user with admin role can delete.
 *       Controller will validate recipeId and ownership/role.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Recipe ObjectId to delete
 *     responses:
 *       '200':
 *         description: Recipe deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recipe deleted"
 *       '400':
 *         description: Invalid recipeId
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden (not owner or admin)
 *       '404':
 *         description: Recipe not found
 *       '500':
 *         description: Internal server error
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
 *       200:
 *         description: List of recipes with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recipes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Recipe'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       500:
 *         description: Internal server error
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
 *       200:
 *         description: Suggestions list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       recipe:
 *                         $ref: '#/components/schemas/Recipe'
 *                       score:
 *                         type: number
 *                       matchCount:
 *                         type: integer
 *                       totalReq:
 *                         type: integer
 *       400:
 *         description: Bad request (e.g., availableIngredients must be array)
 *       500:
 *         description: Internal server error
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
 *               recipeId:
 *                 type: string
 *               availableIngredients:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Shopping list result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recipeId:
 *                   type: string
 *                 title:
 *                   type: string
 *                 missing:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                         nullable: true
 *                       unit:
 *                         type: string
 *                         nullable: true
 *                       note:
 *                         type: string
 *                         nullable: true
 *                       optional:
 *                         type: boolean
 *       400:
 *         description: Bad request (missing recipeId)
 *       500:
 *         description: Internal server error
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
 *       200:
 *         description: Array of suggestion names
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Internal server error
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