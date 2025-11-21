import express from 'express';
import fridgeItemController from '../controllers/fridgeItemController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// ===============================================
//           SWAGGER DEFINITIONS
// ===============================================

/**
 * @swagger
 * tags:
 *   name: Fridge Items
 *   description: API for managing items in a user's fridge
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
 *     FridgeItemInput:
 *       type: object
 *       properties:
 *         foodId:
 *           type: string
 *           description: "The MongoDB ObjectId of the ingredient."
 *           example: "60c72b2f9b1d8c001f8e4c6a"
 *         unitId:
 *           type: string
 *           description: "The MongoDB ObjectId of the unit."
 *           example: "60c72b3a9b1d8c001f8e4c6b"
 *         quantity:
 *           type: number
 *           format: float
 *           description: "The quantity of the food item."
 *           example: 2.5
 *         purchaseDate:
 *           type: string
 *           format: date-time
 *           description: "The date the item was purchased (Optional)."
 *           example: "2025-11-20T10:00:00.000Z"
 *         expiryDate:
 *           type: string
 *           format: date-time
 *           description: "The expiration date of the item. If not provided, it will be auto-calculated."
 *           example: "2025-11-30T23:59:59.000Z"
 *         price:
 *           type: number
 *           format: float
 *           description: "The price of the item (Optional)."
 *           example: 50000
 *         status:
 *           type: string
 *           description: "The current status of the item."
 *           enum: [in-stock, used, expired, discarded]
 *           example: "in-stock"
 *       required:
 *         - foodId
 *         - unitId
 *         - quantity
 *     FridgeItemResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "60d21b4667d0d8992e610c8b"
 *         fridgeId:
 *           type: string
 *           example: "5f8d0d55b54764421b7156dc"
 *         foodId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: "60c72b2f9b1d8c001f8e4c6a"
 *             name:
 *               type: string
 *               example: "thịt bò"
 *             imageURL:
 *               type: string
 *               example: "http://example.com/images/beef.jpg"
 *         unitId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: "60c72b3a9b1d8c001f8e4c6b"
 *             name:
 *               type: string
 *               example: "kilogram"
 *             abbreviation:
 *               type: string
 *               example: "kg"
 *         quantity:
 *           type: number
 *           example: 1.5
 *         purchaseDate:
 *           type: string
 *           format: date-time
 *           example: "2025-11-20T10:00:00.000Z"
 *         expiryDate:
 *           type: string
 *           format: date-time
 *           example: "2025-11-25T23:59:59.000Z"
 *         price:
 *           type: number
 *           example: 50000
 *         status:
 *           type: string
 *           enum: [in-stock, used, expired, discarded]
 *           example: "in-stock"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Item not found"
 */

// ===============================================
//               ROUTES DEFINITIONS
// ===============================================

router.use(authMiddleware.verifyToken);

// Middleware (ví dụ) để kiểm tra quyền sở hữu tủ lạnh
const verifyFridgeOwnership = (req, res, next) => {
    // Logic kiểm tra xem req.user.id có quyền truy cập vào req.params.fridgeId không
    console.log(`User ${req.user.id} is accessing fridge ${req.params.fridgeId}`);
    next(); // Tạm thời cho qua
};

/**
 * @swagger
 * /api/fridges/{fridgeId}/items:
 *   post:
 *     summary: Add a new item to a fridge
 *     tags: [Fridge Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fridgeId
 *         required: true
 *         description: The ID of the fridge to add the item to.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       description: Data for the new fridge item.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FridgeItemInput'
 *     responses:
 *       '201':
 *         description: Item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Fridge item added successfully
 *                 item:
 *                   $ref: '#/components/schemas/FridgeItemResponse'
 *       '400':
 *         description: Bad Request - Missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized - JWT token is missing or invalid
 *       '403':
 *         description: Forbidden - User does not have permission to access this fridge
 */
router.post('/:fridgeId/items', verifyFridgeOwnership, fridgeItemController.add);

/**
 * @swagger
 * /api/fridges/{fridgeId}/items:
 *   get:
 *     summary: Get all items from a fridge
 *     tags: [Fridge Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fridgeId
 *         required: true
 *         description: The ID of the fridge to retrieve items from.
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in-stock, used, expired, discarded]
 *         description: Filter items by status.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: "expiryDate_asc"
 *         description: Sort items. Format `field_asc` or `field_desc`.
 *     responses:
 *       '200':
 *         description: A list of fridge items with pagination.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FridgeItemResponse'
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
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden
 */
router.get('/:fridgeId/items', verifyFridgeOwnership, fridgeItemController.getAll);

/**
 * @swagger
 * /api/fridges/items/{itemId}:
 *   patch:
 *     summary: Update a fridge item
 *     tags: [Fridge Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         description: The unique ID of the item to update.
 *         schema:
 *           type: string
 *     requestBody:
 *       description: The fields to update. All fields are optional.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FridgeItemInput' # Reusing schema, but fields are not required
 *     responses:
 *       '200':
 *         description: Item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Fridge item updated successfully"
 *                 item:
 *                   $ref: '#/components/schemas/FridgeItemResponse'
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/items/:itemId', fridgeItemController.update);

/**
 * @swagger
 * /api/fridges/items/{itemId}:
 *   delete:
 *     summary: Delete a fridge item
 *     tags: [Fridge Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         description: The unique ID of the item to delete.
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Fridge item deleted successfully"
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/items/:itemId', fridgeItemController.remove);

export default router;