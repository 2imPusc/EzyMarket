import express from 'express';
import unitController from '../controllers/unitController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Units
 *   description: Measurement unit management
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
 * /api/units/create:
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
 *               abbreviation:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [weight, volume, count, length, area, other]
 *     responses:
 *       '201':
 *         description: Unit created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Unit'
 *       '400':
 *         description: Validation error or duplicate name
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.post(
  '/create',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  unitController.create
);

/**
 * @swagger
 * /api/units/get:
 *   get:
 *     summary: Get units with pagination
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
 *           default: 20
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
router.get('/get', authMiddleware.verifyToken, unitController.getAll);

/**
 * @swagger
 * /api/units/edit/{id}:
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
 *               abbreviation:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [weight, volume, count, length, area, other]
 *     responses:
 *       '200':
 *         description: Unit updated successfully
 *       '400':
 *         description: Validation error or duplicate name
 *       '404':
 *         description: Unit not found
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.put(
  '/edit/:id',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  unitController.update
);

/**
 * @swagger
 * /api/units/delete/{id}:
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
 *       '404':
 *         description: Unit not found
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.delete(
  '/delete/:id',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  unitController.delete
);

/**
 * @swagger
 * /api/units/delete-many:
 *   delete:
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
 *     responses:
 *       '200':
 *         description: Units deleted successfully
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.delete(
  '/delete-many',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  unitController.deleteMany
);

export default router;
