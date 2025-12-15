import express from 'express';
import unitController from '../controllers/unitController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import unitMiddleware from '../middlewares/unitMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Units
 *   description: Measurement unit management
 */

/**
 * @swagger
 * /api/units/batch-delete:
 *   post:
 *     summary: Delete multiple units by IDs (Admin only)
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["64f1a2b3c4d5e6f7890a1234", "64f1a2b3c4d5e6f7890a5678"]
 *     responses:
 *       '200':
 *         description: Units deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: integer
 *       '400':
 *         description: Validation error or units are being used
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 usage:
 *                   type: object
 *                   properties:
 *                     recipes:
 *                       type: integer
 *                     fridgeItems:
 *                       type: integer
 *                     mealPlans:
 *                       type: integer
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - Admin only
 *       '500':
 *         description: Internal server error
 */
router.post(
  '/batch-delete',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  unitMiddleware.validateIdsArray,
  unitMiddleware.checkUnitsUsage,
  unitController.deleteMany
);

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Unit:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "64f1a2b3c4d5e6f7890a1234"
 *         name:
 *           type: string
 *           example: "gram"
 *         abbreviation:
 *           type: string
 *           example: "g"
 *         type:
 *           type: string
 *           enum: [weight, volume, count, length, area, other]
 *           example: "weight"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UnitListResponse:
 *       type: object
 *       properties:
 *         units:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Unit'
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
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 */

/**
 * @swagger
 * /api/units:
 *   post:
 *     summary: Create a new unit (Admin only)
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, abbreviation, type]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "gram"
 *               abbreviation:
 *                 type: string
 *                 example: "g"
 *               type:
 *                 type: string
 *                 enum: [weight, volume, count, length, area, other]
 *                 example: "weight"
 *     responses:
 *       '201':
 *         description: Unit created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 unit:
 *                   $ref: '#/components/schemas/Unit'
 *       '400':
 *         description: Validation error or duplicate name
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - Admin only
 *       '500':
 *         description: Internal server error
 */
router.post(
  '/',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  unitMiddleware.validateUnitInput,
  unitController.create
);

/**
 * @swagger
 * /api/units:
 *   get:
 *     summary: Get all units with pagination
 *     tags: [Units]
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
 *           default: 10
 *         description: Items per page (max 100)
 *     responses:
 *       '200':
 *         description: List of units with pagination
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnitListResponse'
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.get('/', authMiddleware.verifyToken, unitController.getAll);

/**
 * @swagger
 * /api/units/search:
 *   get:
 *     summary: Search units with filters
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (name or abbreviation)
 *         example: "gram"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [weight, volume, count, length, area, other]
 *         description: Filter by unit type
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
 *         description: Items per page (max 100)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name, -name, type, -type, createdAt, -createdAt]
 *           default: name
 *         description: Sort field (prefix with - for descending)
 *     responses:
 *       '200':
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 units:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Unit'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                 filters:
 *                   type: object
 *                   properties:
 *                     q:
 *                       type: string
 *                     type:
 *                       type: string
 *                     sort:
 *                       type: string
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.get('/search', authMiddleware.verifyToken, unitController.search);

/**
 * @swagger
 * /api/units/stats:
 *   get:
 *     summary: Get unit statistics
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Unit statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 50
 *                 byType:
 *                   type: object
 *                   properties:
 *                     weight:
 *                       type: integer
 *                       example: 10
 *                     volume:
 *                       type: integer
 *                       example: 8
 *                     count:
 *                       type: integer
 *                       example: 5
 *                     length:
 *                       type: integer
 *                       example: 3
 *                     area:
 *                       type: integer
 *                       example: 2
 *                     other:
 *                       type: integer
 *                       example: 22
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.get('/stats', authMiddleware.verifyToken, unitController.getStats);

/**
 * @swagger
 * /api/units/type/{type}:
 *   get:
 *     summary: Get all units of a specific type
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [weight, volume, count, length, area, other]
 *         description: Unit type
 *     responses:
 *       '200':
 *         description: List of units of specified type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 units:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Unit'
 *       '400':
 *         description: Invalid type
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.get('/type/:type', authMiddleware.verifyToken, unitController.getByType);

/**
 * @swagger
 * /api/units/{id}:
 *   get:
 *     summary: Get a single unit by ID
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unit ObjectId
 *     responses:
 *       '200':
 *         description: Unit details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unit:
 *                   $ref: '#/components/schemas/Unit'
 *       '400':
 *         description: Invalid ID format
 *       '404':
 *         description: Unit not found
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.get(
  '/:id',
  authMiddleware.verifyToken,
  unitMiddleware.validateObjectId,
  unitController.getById
);

/**
 * @swagger
 * /api/units/{id}:
 *   put:
 *     summary: Update a unit (Admin only)
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unit ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "kilogram"
 *               abbreviation:
 *                 type: string
 *                 example: "kg"
 *               type:
 *                 type: string
 *                 enum: [weight, volume, count, length, area, other]
 *                 example: "weight"
 *     responses:
 *       '200':
 *         description: Unit updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 unit:
 *                   $ref: '#/components/schemas/Unit'
 *       '400':
 *         description: Validation error or duplicate name
 *       '404':
 *         description: Unit not found
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - Admin only
 *       '500':
 *         description: Internal server error
 */
router.put(
  '/:id',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  unitMiddleware.validateObjectId,
  unitMiddleware.validateUpdateInput,
  unitController.update
);

/**
 * @swagger
 * /api/units/{id}:
 *   delete:
 *     summary: Delete a unit (Admin only)
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unit ObjectId
 *     responses:
 *       '200':
 *         description: Unit deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 unit:
 *                   $ref: '#/components/schemas/Unit'
 *       '400':
 *         description: Invalid ID or unit is being used
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 usage:
 *                   type: object
 *                   properties:
 *                     recipes:
 *                       type: integer
 *                     fridgeItems:
 *                       type: integer
 *                     mealPlans:
 *                       type: integer
 *       '404':
 *         description: Unit not found
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - Admin only
 *       '500':
 *         description: Internal server error
 */
router.delete(
  '/:id',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  unitMiddleware.validateObjectId,
  unitMiddleware.checkUnitUsage,
  unitController.delete
);

export default router;
