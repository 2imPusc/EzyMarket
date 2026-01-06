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
 *         itemType:
 *           type: string
 *           enum: [ingredient, recipe]
 *           default: ingredient
 *           description: Type of item (ingredient or recipe). If ingredient, foodId and unitId are required. If recipe, recipeId is required.
 *         foodId:
 *           type: string
 *           nullable: true
 *           description: MongoDB ObjectId of the ingredient (required if itemType is 'ingredient')
 *         recipeId:
 *           type: string
 *           nullable: true
 *           description: MongoDB ObjectId of the recipe (required if itemType is 'recipe')
 *         unitId:
 *           type: string
 *           nullable: true
 *           description: MongoDB ObjectId of the unit (required if itemType is 'ingredient', optional for recipe)
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
 *         cookedFrom:
 *           type: object
 *           nullable: true
 *           description: Trace cooked dish origin (for recipe items)
 *           properties:
 *             recipeId:
 *               type: string
 *               nullable: true
 *             cookedAt:
 *               type: string
 *               format: date-time
 *               nullable: true
 *       required:
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
 *         itemType:
 *           type: string
 *           enum: [ingredient, recipe]
 *           description: Type of item (ingredient or recipe)
 *         foodId:
 *           type: object
 *           nullable: true
 *           description: Ingredient information (populated when itemType is 'ingredient')
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             imageURL:
 *               type: string
 *               nullable: true
 *         recipeId:
 *           type: object
 *           nullable: true
 *           description: Recipe information (populated when itemType is 'recipe')
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *         unitId:
 *           type: object
 *           nullable: true
 *           description: Unit information (populated when available)
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
 *         addedAt:
 *           type: string
 *           format: date-time
 *           description: Date when item was added to fridge
 *         cookedFrom:
 *           type: object
 *           nullable: true
 *           description: Trace cooked dish origin (for recipe items)
 *           properties:
 *             recipeId:
 *               type: string
 *               nullable: true
 *             cookedAt:
 *               type: string
 *               format: date-time
 *               nullable: true
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
 *     description: |
 *       Tạo fridge item mới. Hỗ trợ 2 loại:
 *       - **Ingredient items** (itemType: 'ingredient'): Cần `foodId` và `unitId`. Nếu không có `expiryDate`, hệ thống sẽ tự động tính từ `ingredient.defaultExpireDays`.
 *       - **Recipe items** (itemType: 'recipe'): Cần `recipeId`. `unitId` là optional (cho servings).
 *
 *       Owner được xác định tự động:
 *       - Nếu user có `groupId`: item thuộc về group
 *       - Nếu user không có `groupId`: item thuộc về user cá nhân
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
 *     description: |
 *       Lấy danh sách fridge items với phân trang và lọc.
 *
 *       **Owner được xác định tự động:**
 *       - Nếu user có `groupId`: lấy items của group
 *       - Nếu user không có `groupId`: lấy items cá nhân của user
 *
 *       **Lưu ý:**
 *       - Chỉ trả về items có `quantity > 0`
 *       - Response bao gồm populated data (foodId, recipeId, unitId với đầy đủ thông tin)
 *       - Search chỉ áp dụng cho ingredient name (không áp dụng cho recipe items)
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
 *         description: Text search (ingredient name only, not for recipe items) - best-effort, may not be full-text
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
 *     description: |
 *       Cập nhật fridge item. Quyền truy cập được kiểm tra bởi middleware (ownershipMiddleware).
 *
 *       **Tính năng tự động:**
 *       - Nếu cập nhật `quantity` giảm và không cung cấp `price`, hệ thống sẽ tự động tính lại giá theo tỷ lệ (giá đơn vị * số lượng mới).
 *       - Nếu `quantity` về 0, `price` cũng tự động về 0.
 *       - Nếu cập nhật `foodId` hoặc `purchaseDate` mà không có `expiryDate`, hệ thống sẽ tự động tính `expiryDate` từ `ingredient.defaultExpireDays` (chỉ cho ingredient items).
 *
 *       **Lưu ý:**
 *       - Response bao gồm populated data (foodId, recipeId, unitId với đầy đủ thông tin)
 *       - Có thể thay đổi `itemType` nhưng phải cung cấp ID tương ứng (foodId cho ingredient, recipeId cho recipe)
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
 *               itemType:
 *                 type: string
 *                 enum: [ingredient, recipe]
 *                 description: Type of item. If changing, must provide corresponding ID (foodId for ingredient, recipeId for recipe).
 *               foodId:
 *                 type: string
 *                 nullable: true
 *                 description: Required if itemType is 'ingredient'
 *               recipeId:
 *                 type: string
 *                 nullable: true
 *                 description: Required if itemType is 'recipe'
 *               unitId:
 *                 type: string
 *                 nullable: true
 *                 description: Required if itemType is 'ingredient', optional for recipe
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
 *                 description: If quantity decreases, price will be automatically recalculated proportionally (unless price is explicitly provided).
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
router.patch('/:itemId', ownershipMiddleware.verifyItemOwnership, fridgeItemController.update);

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
router.delete('/:itemId', ownershipMiddleware.verifyItemOwnership, fridgeItemController.remove);

export default router;
