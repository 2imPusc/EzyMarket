import express from 'express';
import fridgeItemController from '../controllers/fridgeItemController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import ownershipMiddleware from '../middlewares/ownershipMiddleware.js';

const router = express.Router();

router.use(authMiddleware.verifyToken);

/**
 * @swagger
 * tags:
 *   - name: Fridge Items
 *     description: Manage fridge items per user or per group (each user belongs to at most one group)
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     FridgeItemInput:
 *       type: object
 *       properties:
 *         foodId:
 *           type: string
 *           description: MongoDB ObjectId of the ingredient
 *         unitId:
 *           type: string
 *           description: MongoDB ObjectId of the unit
 *         quantity:
 *           type: number
 *           format: float
 *         purchaseDate:
 *           type: string
 *           format: date-time
 *         expiryDate:
 *           type: string
 *           format: date-time
 *         price:
 *           type: number
 *         status:
 *           type: string
 *           enum: [in-stock, used, expired, discarded]
 *       required:
 *         - foodId
 *         - unitId
 *         - quantity
 *
 *     FridgeItemResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *           nullable: true
 *         groupId:
 *           type: string
 *           nullable: true
 *         foodId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             imageURL:
 *               type: string
 *         unitId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             abbreviation:
 *               type: string
 *         quantity:
 *           type: number
 *         purchaseDate:
 *           type: string
 *           format: date-time
 *         expiryDate:
 *           type: string
 *           format: date-time
 *         price:
 *           type: number
 *         status:
 *           type: string
 *           enum: [in-stock, used, expired, discarded]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         totalPages:
 *           type: integer
 *
 *     FridgeItemListResponse:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FridgeItemResponse'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *
 */

/**
 * POST /api/fridge-items
 * @swagger
 * /api/fridge-items:
 *   post:
 *     tags: [Fridge Items]
 *     summary: Create a fridge item. Owner derived from authenticated user (group if present, otherwise user).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FridgeItemInput'
 *     responses:
 *       201:
 *         description: Fridge item created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 item:
 *                   $ref: '#/components/schemas/FridgeItemResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', fridgeItemController.add);

/**
 * GET /api/fridge-items
 * @swagger
 * /api/fridge-items:
 *   get:
 *     tags: [Fridge Items]
 *     summary: Get fridge items for the authenticated user (group items if user belongs to a group).
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
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: expiryDate_asc
 *         description: Sort field and order as "field_order" (order = asc|desc). Supported fields expiryDate, purchaseDate, createdAt
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in-stock, used, expired, discarded]
 *         description: Filter by item status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Text search (ingredient name) - best-effort, may not be full-text
 *     responses:
 *       200:
 *         description: Paginated list of fridge items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FridgeItemListResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', fridgeItemController.getAll);

/**
 * PATCH /api/fridge-items/{itemId}
 * @swagger
 * /api/fridge-items/{itemId}:
 *   patch:
 *     tags: [Fridge Items]
 *     summary: Update a fridge item. Must be owner (user) or group member.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Fridge item id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               foodId:
 *                 type: string
 *               unitId:
 *                 type: string
 *               quantity:
 *                 type: number
 *               purchaseDate:
 *                 type: string
 *                 format: date-time
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *               price:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [in-stock, used, expired, discarded]
 *     responses:
 *       200:
 *         description: Updated fridge item
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 item:
 *                   $ref: '#/components/schemas/FridgeItemResponse'
 *       400:
 *         description: Bad request (invalid id / payload)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not owner / not group member)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
router.patch(
  '/:itemId',
  ownershipMiddleware.verifyItemOwnership,
  fridgeItemController.update
);

/**
 * DELETE /api/fridge-items/{itemId}
 * @swagger
 * /api/fridge-items/{itemId}:
 *   delete:
 *     tags: [Fridge Items]
 *     summary: Delete a fridge item. Must be owner (user) or group member.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Fridge item id
 *     responses:
 *       200:
 *         description: Deletion success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request (invalid id)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not owner / not group member)
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:itemId',
  ownershipMiddleware.verifyItemOwnership,
  fridgeItemController.remove
);

export default router;