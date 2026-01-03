import express from 'express';
import fridgeItemController from '../controllers/fridgeItemController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware.verifyToken);

// ===============================================
//           SWAGGER DEFINITIONS
// ===============================================

/**
 * @swagger
 * tags:
 *   name: FridgeItems
 *   description: API for managing fridge items (ingredients and cooked recipes)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # --- INPUT SCHEMAS ---
 *
 *     FridgeItemInput:
 *       type: object
 *       required:
 *         - unitId
 *         - quantity
 *       properties:
 *         itemType:
 *           type: string
 *           enum: [ingredient, recipe]
 *           default: ingredient
 *           description: "Loại item: nguyên liệu hoặc món đã nấu."
 *         foodId:
 *           type: string
 *           description: "ID của Ingredient (bắt buộc nếu itemType = 'ingredient')."
 *           example: "60c72b2f9b1d8c001f8e4c6a"
 *         recipeId:
 *           type: string
 *           description: "ID của Recipe (bắt buộc nếu itemType = 'recipe')."
 *           example: "60c72b2f9b1d8c001f8e4c6b"
 *         unitId:
 *           type: string
 *           description: "ID của đơn vị tính."
 *           example: "60c72b2f9b1d8c001f8e4c6c"
 *         quantity:
 *           type: number
 *           description: "Số lượng."
 *           example: 500
 *         purchaseDate:
 *           type: string
 *           format: date
 *           description: "Ngày mua/thêm vào. Mặc định = hôm nay."
 *           example: "2026-01-03"
 *         expiryDate:
 *           type: string
 *           format: date
 *           description: "Ngày hết hạn. Nếu không truyền, tự tính từ ingredient.defaultExpireDays."
 *           example: "2026-01-10"
 *         price:
 *           type: number
 *           description: "Giá tiền (VND)."
 *           example: 50000
 *
 *     FridgeItemUpdateInput:
 *       type: object
 *       properties:
 *         quantity:
 *           type: number
 *           description: "Số lượng mới."
 *           example: 300
 *         expiryDate:
 *           type: string
 *           format: date
 *           description: "Ngày hết hạn mới."
 *         status:
 *           type: string
 *           enum: [in-stock, consumed, expired, discarded]
 *           description: "Trạng thái mới."
 *         price:
 *           type: number
 *           description: "Giá tiền mới."
 *
 *     # --- RESPONSE SCHEMAS ---
 *
 *     FridgeItemResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "60c72b2f9b1d8c001f8e4c6d"
 *         itemType:
 *           type: string
 *           enum: [ingredient, recipe]
 *           example: "ingredient"
 *         foodId:
 *           type: object
 *           nullable: true
 *           description: "Populated ingredient info (nếu itemType = 'ingredient')."
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *               example: "Thịt bò"
 *             imageURL:
 *               type: string
 *               example: "https://example.com/beef.jpg"
 *         recipeId:
 *           type: object
 *           nullable: true
 *           description: "Populated recipe info (nếu itemType = 'recipe')."
 *           properties:
 *             _id:
 *               type: string
 *             title:
 *               type: string
 *               example: "Bò Lúc Lắc"
 *             imageUrl:
 *               type: string
 *               example: "https://example.com/bo-luc-lac.jpg"
 *         unitId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *               example: "gram"
 *             abbreviation:
 *               type: string
 *               example: "g"
 *         quantity:
 *           type: number
 *           example: 500
 *         purchaseDate:
 *           type: string
 *           format: date-time
 *         expiryDate:
 *           type: string
 *           format: date-time
 *         price:
 *           type: number
 *           example: 50000
 *         status:
 *           type: string
 *           enum: [in-stock, consumed, expired, discarded]
 *           example: "in-stock"
 *         cookedFrom:
 *           type: object
 *           nullable: true
 *           description: "Thông tin nguồn gốc nếu là món đã nấu."
 *           properties:
 *             recipeId:
 *               type: string
 *             cookedAt:
 *               type: string
 *               format: date-time
 *         userId:
 *           type: string
 *           nullable: true
 *         groupId:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     FridgeItemListResponse:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FridgeItemResponse'
 *         pagination:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               example: 50
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 20
 *             totalPages:
 *               type: integer
 *               example: 3
 */

// ===============================================
//               ROUTES DEFINITIONS
// ===============================================

/**
 * @swagger
 * /api/fridge-items:
 *   get:
 *     summary: Lấy danh sách items trong tủ lạnh
 *     tags: [FridgeItems]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Lấy danh sách thực phẩm và món đã nấu trong tủ lạnh của user.
 *       
 *       **Ownership logic:**
 *       - Nếu user thuộc group → trả về items của group đó.
 *       - Nếu user không có group → trả về items cá nhân.
 *       
 *       **Lưu ý:** Chỉ trả về items có `quantity > 0`.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: "Trang hiện tại."
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: "Số items mỗi trang."
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: expiryDate_asc
 *           enum: [expiryDate_asc, expiryDate_desc, purchaseDate_asc, purchaseDate_desc, quantity_asc, quantity_desc]
 *         description: "Sắp xếp theo trường và thứ tự."
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in-stock, consumed, expired, discarded]
 *         description: "Lọc theo trạng thái. Mặc định chỉ lấy 'in-stock'."
 *       - in: query
 *         name: itemType
 *         schema:
 *           type: string
 *           enum: [ingredient, recipe]
 *         description: "Lọc theo loại item."
 *         examples:
 *           all:
 *             summary: Lấy tất cả
 *             value: null
 *           ingredients_only:
 *             summary: Chỉ nguyên liệu
 *             value: ingredient
 *           recipes_only:
 *             summary: Chỉ món đã nấu
 *             value: recipe
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: "Tìm kiếm theo tên nguyên liệu/món ăn."
 *     responses:
 *       200:
 *         description: Danh sách items trong tủ lạnh.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FridgeItemListResponse'
 *             examples:
 *               mixed_items:
 *                 summary: Cả nguyên liệu và món đã nấu
 *                 value:
 *                   items:
 *                     - _id: "60c72b2f9b1d8c001f8e4c6d"
 *                       itemType: "ingredient"
 *                       foodId:
 *                         _id: "60c72b2f9b1d8c001f8e4c6a"
 *                         name: "Thịt bò"
 *                         imageURL: "https://example.com/beef.jpg"
 *                       recipeId: null
 *                       unitId:
 *                         _id: "60c72b2f9b1d8c001f8e4c6c"
 *                         name: "gram"
 *                         abbreviation: "g"
 *                       quantity: 500
 *                       expiryDate: "2026-01-10T00:00:00.000Z"
 *                       status: "in-stock"
 *                     - _id: "60c72b2f9b1d8c001f8e4c6e"
 *                       itemType: "recipe"
 *                       foodId: null
 *                       recipeId:
 *                         _id: "60c72b2f9b1d8c001f8e4c6b"
 *                         title: "Bò Lúc Lắc"
 *                         imageUrl: "https://example.com/bo-luc-lac.jpg"
 *                       unitId:
 *                         _id: "60c72b2f9b1d8c001f8e4c6f"
 *                         name: "phần"
 *                         abbreviation: "phần"
 *                       quantity: 2
 *                       expiryDate: "2026-01-06T00:00:00.000Z"
 *                       status: "in-stock"
 *                       cookedFrom:
 *                         recipeId: "60c72b2f9b1d8c001f8e4c6b"
 *                         cookedAt: "2026-01-03T12:00:00.000Z"
 *                   pagination:
 *                     total: 2
 *                     page: 1
 *                     limit: 20
 *                     totalPages: 1
 *       401:
 *         description: Unauthorized - Chưa đăng nhập.
 */
router.get('/', fridgeItemController.getAll);

/**
 * @swagger
 * /api/fridge-items:
 *   post:
 *     summary: Thêm item vào tủ lạnh
 *     tags: [FridgeItems]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Thêm nguyên liệu hoặc món đã nấu vào tủ lạnh.
 *       
 *       **Validation:**
 *       - `itemType = 'ingredient'` → bắt buộc có `foodId`.
 *       - `itemType = 'recipe'` → bắt buộc có `recipeId`.
 *       
 *       **Auto-calculate:**
 *       - Nếu không truyền `expiryDate`, tự tính từ `ingredient.defaultExpireDays`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FridgeItemInput'
 *           examples:
 *             add_ingredient:
 *               summary: Thêm nguyên liệu
 *               value:
 *                 itemType: "ingredient"
 *                 foodId: "60c72b2f9b1d8c001f8e4c6a"
 *                 unitId: "60c72b2f9b1d8c001f8e4c6c"
 *                 quantity: 500
 *                 expiryDate: "2026-01-10"
 *                 price: 50000
 *             add_cooked_recipe:
 *               summary: Thêm món đã nấu
 *               value:
 *                 itemType: "recipe"
 *                 recipeId: "60c72b2f9b1d8c001f8e4c6b"
 *                 unitId: "60c72b2f9b1d8c001f8e4c6f"
 *                 quantity: 2
 *                 expiryDate: "2026-01-06"
 *     responses:
 *       201:
 *         description: Thêm thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Fridge item added successfully"
 *                 item:
 *                   $ref: '#/components/schemas/FridgeItemResponse'
 *       400:
 *         description: Bad Request - Thiếu trường bắt buộc.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               missing_foodId:
 *                 summary: Thiếu foodId cho ingredient
 *                 value:
 *                   message: "foodId is required for ingredient type"
 *               missing_recipeId:
 *                 summary: Thiếu recipeId cho recipe
 *                 value:
 *                   message: "recipeId is required for recipe type"
 *       401:
 *         description: Unauthorized.
 */
router.post('/', fridgeItemController.add);

/**
 * @swagger
 * /api/fridge-items/{itemId}:
 *   patch:
 *     summary: Cập nhật item trong tủ lạnh
 *     tags: [FridgeItems]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Cập nhật thông tin của một item (quantity, expiryDate, status, price).
 *       
 *       **Permission:** Chỉ owner (user cá nhân hoặc thành viên group) mới được cập nhật.
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của item cần cập nhật."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FridgeItemUpdateInput'
 *           examples:
 *             update_quantity:
 *               summary: Cập nhật số lượng
 *               value:
 *                 quantity: 300
 *             mark_consumed:
 *               summary: Đánh dấu đã tiêu thụ
 *               value:
 *                 status: "consumed"
 *                 quantity: 0
 *             mark_expired:
 *               summary: Đánh dấu hết hạn
 *               value:
 *                 status: "expired"
 *     responses:
 *       200:
 *         description: Cập nhật thành công.
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
 *       403:
 *         description: Forbidden - Không có quyền cập nhật item này.
 *       404:
 *         description: Item không tồn tại.
 *       401:
 *         description: Unauthorized.
 */
router.patch('/:itemId', fridgeItemController.update);

/**
 * @swagger
 * /api/fridge-items/{itemId}:
 *   delete:
 *     summary: Xóa item khỏi tủ lạnh
 *     tags: [FridgeItems]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Xóa hoàn toàn một item khỏi tủ lạnh.
 *       
 *       **Lưu ý:** Nếu muốn giữ lịch sử để thống kê, nên dùng PATCH để đổi status thành 'consumed' hoặc 'discarded' thay vì xóa.
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của item cần xóa."
 *     responses:
 *       200:
 *         description: Xóa thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Fridge item deleted successfully"
 *       403:
 *         description: Forbidden - Không có quyền xóa item này.
 *       404:
 *         description: Item không tồn tại.
 *       401:
 *         description: Unauthorized.
 */
router.delete('/:itemId', fridgeItemController.remove);

export default router;