import express from 'express';
import cookingController from '../controllers/cookingController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Tất cả routes cần authentication
router.use(authMiddleware.verifyToken);

// ===============================================
//           SWAGGER DEFINITIONS
// ===============================================

/**
 * @swagger
 * tags:
 *   name: Cooking
 *   description: API for cooking recipes - Convert ingredients to cooked dishes
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # --- INPUT SCHEMAS ---
 *
 *     CookInput:
 *       type: object
 *       required:
 *         - recipeId
 *       properties:
 *         recipeId:
 *           type: string
 *           description: "ID của recipe muốn nấu."
 *           example: "60c72b2f9b1d8c001f8e4c6a"
 *         servings:
 *           type: integer
 *           description: "Số phần ăn muốn nấu. Mặc định = servings của recipe."
 *           example: 2
 *
 *     # --- RESPONSE SCHEMAS ---
 *
 *     IngredientAvailability:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: "Tên nguyên liệu."
 *           example: "Thịt bò"
 *         required:
 *           type: number
 *           description: "Số lượng cần thiết."
 *           example: 200
 *         available:
 *           type: number
 *           description: "Số lượng hiện có trong tủ lạnh."
 *           example: 150
 *         isEnough:
 *           type: boolean
 *           description: "True nếu đủ nguyên liệu."
 *           example: false
 *         optional:
 *           type: boolean
 *           description: "True nếu nguyên liệu này có thể bỏ qua."
 *           example: false
 *
 *     MissingIngredient:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Hành tây"
 *         required:
 *           type: number
 *           example: 100
 *         missing:
 *           type: number
 *           description: "Số lượng còn thiếu."
 *           example: 50
 *
 *     CookedFridgeItem:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         itemType:
 *           type: string
 *           enum: [recipe]
 *           example: "recipe"
 *         recipeId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             title:
 *               type: string
 *               example: "Bò Lúc Lắc"
 *             imageUrl:
 *               type: string
 *         unitId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *               example: "phần"
 *             abbreviation:
 *               type: string
 *               example: "phần"
 *         quantity:
 *           type: number
 *           description: "Số phần ăn đã nấu."
 *           example: 2
 *         expiryDate:
 *           type: string
 *           format: date-time
 *           description: "Ngày hết hạn (mặc định 3 ngày sau khi nấu)."
 *         status:
 *           type: string
 *           enum: [in-stock, consumed, expired, discarded]
 *           example: "in-stock"
 *         cookedFrom:
 *           type: object
 *           properties:
 *             recipeId:
 *               type: string
 *             cookedAt:
 *               type: string
 *               format: date-time
 *
 *     CookResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Cooking completed successfully"
 *         cookedItem:
 *           $ref: '#/components/schemas/CookedFridgeItem'
 *         consumedIngredients:
 *           type: integer
 *           description: "Số lượng nguyên liệu đã được trừ từ tủ lạnh."
 *           example: 5
 *         warnings:
 *           type: array
 *           description: "Danh sách nguyên liệu bị thiếu (nếu có). Món vẫn được nấu nhưng thiếu nguyên liệu."
 *           items:
 *             $ref: '#/components/schemas/MissingIngredient'
 *
 *     CookabilityResponse:
 *       type: object
 *       properties:
 *         recipeId:
 *           type: string
 *         recipeTitle:
 *           type: string
 *           example: "Bò Lúc Lắc"
 *         servings:
 *           type: integer
 *           description: "Số phần ăn được kiểm tra."
 *           example: 2
 *         canCook:
 *           type: boolean
 *           description: "True nếu có đủ TẤT CẢ nguyên liệu bắt buộc."
 *           example: true
 *         ingredients:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/IngredientAvailability'
 */

// ===============================================
//               ROUTES DEFINITIONS
// ===============================================

/**
 * @swagger
 * /api/cooking/cook:
 *   post:
 *     summary: Nấu món ăn - Chuyển nguyên liệu thành món đã nấu
 *     tags: [Cooking]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Thực hiện "nấu" một recipe:
 *       1. **Trừ nguyên liệu** từ tủ lạnh theo FIFO (hết hạn sớm dùng trước).
 *       2. **Tạo FridgeItem mới** với `itemType: 'recipe'` - đại diện cho món đã nấu.
 *       
 *       **Lưu ý:**
 *       - Nếu thiếu nguyên liệu, món vẫn được nấu nhưng có `warnings` trong response.
 *       - Món đã nấu mặc định hết hạn sau **3 ngày**.
 *       - Đơn vị tính của món đã nấu là **"phần"** (serving).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CookInput'
 *           examples:
 *             basic:
 *               summary: Nấu với servings mặc định
 *               value:
 *                 recipeId: "60c72b2f9b1d8c001f8e4c6a"
 *             custom_servings:
 *               summary: Nấu 4 phần
 *               value:
 *                 recipeId: "60c72b2f9b1d8c001f8e4c6a"
 *                 servings: 4
 *     responses:
 *       201:
 *         description: Nấu thành công. Món ăn đã được thêm vào tủ lạnh.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CookResponse'
 *       400:
 *         description: Bad Request - Thiếu recipeId.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "recipeId is required"
 *       404:
 *         description: Recipe không tồn tại.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recipe not found"
 *       401:
 *         description: Unauthorized - Chưa đăng nhập.
 */
router.post('/cook', cookingController.cook);

/**
 * @swagger
 * /api/cooking/check/{recipeId}:
 *   get:
 *     summary: Kiểm tra có đủ nguyên liệu để nấu không
 *     tags: [Cooking]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Kiểm tra xem tủ lạnh có đủ nguyên liệu để nấu recipe hay không.
 *       
 *       Trả về:
 *       - `canCook: true` nếu đủ **tất cả nguyên liệu bắt buộc**.
 *       - Chi tiết từng nguyên liệu: cần bao nhiêu, có bao nhiêu, đủ chưa.
 *       - Nguyên liệu `optional: true` không ảnh hưởng đến `canCook`.
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của recipe cần kiểm tra."
 *         example: "60c72b2f9b1d8c001f8e4c6a"
 *       - in: query
 *         name: servings
 *         schema:
 *           type: integer
 *           default: null
 *         description: "Số phần ăn muốn nấu. Nếu không truyền, dùng servings mặc định của recipe."
 *         example: 2
 *     responses:
 *       200:
 *         description: Kết quả kiểm tra nguyên liệu.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CookabilityResponse'
 *             examples:
 *               can_cook:
 *                 summary: Đủ nguyên liệu
 *                 value:
 *                   recipeId: "60c72b2f9b1d8c001f8e4c6a"
 *                   recipeTitle: "Bò Lúc Lắc"
 *                   servings: 2
 *                   canCook: true
 *                   ingredients:
 *                     - name: "Thịt bò"
 *                       required: 200
 *                       available: 500
 *                       isEnough: true
 *                       optional: false
 *                     - name: "Hành tây"
 *                       required: 100
 *                       available: 150
 *                       isEnough: true
 *                       optional: false
 *               cannot_cook:
 *                 summary: Thiếu nguyên liệu
 *                 value:
 *                   recipeId: "60c72b2f9b1d8c001f8e4c6a"
 *                   recipeTitle: "Bò Lúc Lắc"
 *                   servings: 2
 *                   canCook: false
 *                   ingredients:
 *                     - name: "Thịt bò"
 *                       required: 200
 *                       available: 100
 *                       isEnough: false
 *                       optional: false
 *                     - name: "Tiêu"
 *                       required: 5
 *                       available: 0
 *                       isEnough: false
 *                       optional: true
 *       404:
 *         description: Recipe không tồn tại.
 *       401:
 *         description: Unauthorized.
 */
router.get('/check/:recipeId', cookingController.checkCookability);

export default router;