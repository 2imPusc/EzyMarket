import express from 'express';
import shoppingController from '../controllers/shoppingController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import groupMiddleware from '../middlewares/groupMiddleware.js';

const router = express.Router();

router.use(authMiddleware.verifyToken);

/**
 * @swagger
 * tags:
 *   name: ShoppingLists
 *   description: The shopping list managing API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ShoppingItem:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the item
 *         ingredientId:
 *           type: object
 *           nullable: true
 *           description: Ingredient information (populated with name and imageURL when available)
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             imageURL:
 *               type: string
 *               nullable: true
 *         name:
 *           type: string
 *           description: Name of the item
 *         quantity:
 *           type: number
 *           description: Quantity of the item
 *         unitId:
 *           type: object
 *           nullable: true
 *           description: Unit information (populated with name and abbreviation when available)
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             abbreviation:
 *               type: string
 *         unit:
 *           type: string
 *           description: Unit of measurement (display name). System will auto-find unitId if only unit is provided.
 *         isPurchased:
 *           type: boolean
 *           description: Whether the item is purchased
 *         price:
 *           type: number
 *           nullable: true
 *           description: Giá tiền thực tế mua
 *         servingQuantity:
 *           type: number
 *           nullable: true
 *           description: Số khẩu phần
 *         expiryDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Ngày hết hạn
 *     ShoppingList:
 *       type: object
 *       required:
 *         - groupId
 *         - title
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the shopping list
 *         groupId:
 *           type: string
 *           nullable: true
 *           description: The id of the group (null if personal list)
 *         creatorId:
 *           type: object
 *           description: Creator information (populated with userName and avatar)
 *           properties:
 *             _id:
 *               type: string
 *             userName:
 *               type: string
 *             avatar:
 *               type: string
 *               nullable: true
 *         title:
 *           type: string
 *           description: The title of the shopping list
 *         description:
 *           type: string
 *           description: The description of the shopping list
 *         status:
 *           type: string
 *           enum: [active, completed, archived]
 *           description: The status of the shopping list
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ShoppingItem'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/shopping-lists:
 *   post:
 *     summary: Create a new shopping list
 *     description: |
 *       Tạo shopping list mới. Có thể tạo từ meal plans hoặc items trực tiếp.
 *
 *       **Normalize tự động:**
 *       - Nếu items có `unitId` nhưng không có `unit`, hệ thống sẽ tự động lấy tên unit từ database.
 *       - Nếu items có `unit` (string) nhưng không có `unitId`, hệ thống sẽ tự động tìm `unitId` tương ứng.
 *       - Khi tạo từ meal plans, hệ thống sẽ tự động tính toán và normalize tất cả items.
 *     tags: [ShoppingLists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - title
 *             properties:
 *               groupId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               mealPlans:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                     mealTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *               items:
 *                 type: array
 *                 description: Danh sách items tùy chọn. Nếu không có mealPlans, items này sẽ được sử dụng. Hệ thống sẽ tự động normalize unitId và unit.
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       required: true
 *                       description: Tên của item
 *                     quantity:
 *                       type: number
 *                       description: Số lượng
 *                     unitId:
 *                       type: string
 *                       description: ID của đơn vị (ObjectId). Nếu có unitId, hệ thống sẽ tự động lấy tên unit. Nếu không có, có thể dùng unit (string).
 *                     unit:
 *                       type: string
 *                       description: Tên đơn vị (string). Nếu chỉ có unit, hệ thống sẽ tự động tìm unitId tương ứng. Có thể truyền unitId hoặc unit hoặc cả hai.
 *                     ingredientId:
 *                       type: string
 *                       description: ID của ingredient (ObjectId). Cần thiết nếu muốn chuyển item vào tủ lạnh sau khi checkout.
 *     responses:
 *       201:
 *         description: The shopping list was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShoppingList'
 *       400:
 *         description: Bad request (missing required fields or invalid data)
 *       404:
 *         description: Group not found
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  groupMiddleware.checkGroupExists,
  groupMiddleware.verifyMember,
  shoppingController.createShoppingList
);

/**
 * @swagger
 * /api/shopping-lists/group/{groupId}:
 *   get:
 *     summary: Get all shopping lists for a group
 *     tags: [ShoppingLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: The group id
 *     responses:
 *       200:
 *         description: The list of shopping lists with populated creator information
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShoppingList'
 *       404:
 *         description: Group not found
 *       500:
 *         description: Server error
 */
router.get(
  '/group/:groupId',
  groupMiddleware.checkGroupExists,
  groupMiddleware.verifyMember,
  shoppingController.getShoppingLists
);

/**
 * @swagger
 * /api/shopping-lists/{id}:
 *   get:
 *     summary: Get a shopping list by id
 *     tags: [ShoppingLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The shopping list id
 *     responses:
 *       200:
 *         description: The shopping list with populated data. Items will include populated ingredientId (name, imageURL) and unitId (name, abbreviation).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShoppingList'
 *       404:
 *         description: Shopping list not found
 *       500:
 *         description: Server error
 */
router.get('/:id', shoppingController.getShoppingListById);

/**
 * @swagger
 * /api/shopping-lists/{id}/checkout:
 *   post:
 *     summary: Hoàn thành shopping list - Cập nhật thông tin đã mua và chuyển vào tủ lạnh
 *     description: |
 *       Cập nhật thông tin các nguyên liệu đã mua (giá, số lượng, hạn sử dụng), đổi status sang completed và tự động thêm vào fridge-items.
 *       Chỉ cần gọi API này 1 lần duy nhất.
 *
 *       **Lưu ý:**
 *       - Hệ thống sẽ **tự động đánh dấu `isPurchased = true`** cho tất cả items trong request body (items đã mua).
 *       - **CHỈ những items trong request body (đã mua) mới được chuyển vào tủ lạnh**, không phải tất cả items có `isPurchased = true`.
 *       - Chỉ những items có `ingredientId` và `unitId` mới được chuyển vào tủ lạnh.
 *       - Các items thiếu `ingredientId` hoặc `unitId` sẽ bị bỏ qua khi chuyển vào tủ lạnh.
 *       - Các items không có trong request body (không mua được) sẽ **KHÔNG** được chuyển vào tủ lạnh.
 *       - User không cần đánh dấu `isPurchased = true` trước, hệ thống sẽ tự động đánh dấu khi checkout.
 *     tags: [ShoppingLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The shopping list id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 description: Danh sách các item đã mua cần cập nhật thông tin
 *                 items:
 *                   type: array
 *                   description: Danh sách các item đã mua cần cập nhật thông tin. Hệ thống sẽ tự động đánh dấu isPurchased = true cho các items này.
 *                   items:
 *                     type: object
 *                     required:
 *                       - itemId
 *                     properties:
 *                       itemId:
 *                         type: string
 *                         description: ID của item trong shopping list
 *                       price:
 *                         type: number
 *                         description: Giá tiền thực tế mua
 *                       servingQuantity:
 *                         type: number
 *                         description: Số khẩu phần (nếu không theo bữa ăn)
 *                       expiryDate:
 *                         type: string
 *                         format: date
 *                         description: Ngày hết hạn
 *     responses:
 *       200:
 *         description: Checkout thành công, shopping list đã completed và items đã được thêm vào tủ lạnh. Response bao gồm populated data (creatorId, items.ingredientId, items.unitId).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShoppingList'
 *       400:
 *         description: Bad request (invalid itemId or missing required fields)
 *       404:
 *         description: Shopping list not found
 *       500:
 *         description: Server error
 */
router.post('/:id/checkout', shoppingController.checkoutShoppingList);

/**
 * @swagger
 * /api/shopping-lists/{id}:
 *   put:
 *     summary: Update a shopping list
 *     tags: [ShoppingLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The shopping list id
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
 *               status:
 *                 type: string
 *                 enum: [active, completed, archived]
 *     responses:
 *       200:
 *         description: The shopping list was updated. Response bao gồm populated data (creatorId, items.ingredientId, items.unitId).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShoppingList'
 *       400:
 *         description: Bad request (invalid status value or invalid data)
 *       404:
 *         description: Shopping list not found
 *       500:
 *         description: Server error
 */
router.put('/:id', shoppingController.updateShoppingList);

/**
 * @swagger
 * /api/shopping-lists/{id}:
 *   delete:
 *     summary: Delete a shopping list
 *     tags: [ShoppingLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The shopping list id
 *     responses:
 *       200:
 *         description: The shopping list was deleted
 *       404:
 *         description: Shopping list not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', shoppingController.deleteShoppingList);

/**
 * @swagger
 * /api/shopping-lists/{id}/items:
 *   post:
 *     summary: Add an item to the shopping list
 *     tags: [ShoppingLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The shopping list id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên của item
 *               quantity:
 *                 type: number
 *                 description: Số lượng
 *               unitId:
 *                 type: string
 *                 description: ID của đơn vị (ObjectId). Nếu có unitId, hệ thống sẽ tự động lấy tên unit. Nếu không có, có thể dùng unit (string).
 *               unit:
 *                 type: string
 *                 description: Tên đơn vị (string). Nếu chỉ có unit, hệ thống sẽ tự động tìm unitId tương ứng. Có thể truyền unitId hoặc unit hoặc cả hai.
 *               ingredientId:
 *                 type: string
 *                 description: ID của ingredient (ObjectId). Cần thiết nếu muốn chuyển item vào tủ lạnh sau khi checkout.
 *     responses:
 *       200:
 *         description: The item was added. Hệ thống sẽ tự động normalize unitId và unit. Response bao gồm populated data (creatorId, items.ingredientId, items.unitId).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShoppingList'
 *       400:
 *         description: Bad request (missing name or invalid data)
 *       404:
 *         description: Shopping list not found
 *       500:
 *         description: Server error
 */
router.post('/:id/items', shoppingController.addItem);

/**
 * @swagger
 * /api/shopping-lists/{id}/items/{itemId}:
 *   put:
 *     summary: Update an item in the shopping list
 *     tags: [ShoppingLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The shopping list id
 *       - in: path
 *         name: itemId
 *         schema:
 *           type: string
 *         required: true
 *         description: The item id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên của item
 *               quantity:
 *                 type: number
 *                 description: Số lượng
 *               unitId:
 *                 type: string
 *                 description: ID của đơn vị (ObjectId). Nếu cập nhật unitId, hệ thống sẽ tự động cập nhật tên unit tương ứng.
 *               unit:
 *                 type: string
 *                 description: Tên đơn vị (string). Nếu chỉ cập nhật unit, hệ thống sẽ tự động tìm và cập nhật unitId tương ứng.
 *               isPurchased:
 *                 type: boolean
 *                 description: Đánh dấu item đã được mua
 *     responses:
 *       200:
 *         description: The item was updated. Hệ thống sẽ tự động normalize unitId và unit khi cập nhật. Response bao gồm populated data (creatorId, items.ingredientId, items.unitId).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShoppingList'
 *       404:
 *         description: Shopping list or item not found
 *       500:
 *         description: Server error
 */
router.put('/:id/items/:itemId', shoppingController.updateItem);

/**
 * @swagger
 * /api/shopping-lists/{id}/items/{itemId}:
 *   delete:
 *     summary: Remove an item from the shopping list
 *     tags: [ShoppingLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The shopping list id
 *       - in: path
 *         name: itemId
 *         schema:
 *           type: string
 *         required: true
 *         description: The item id
 *     responses:
 *       200:
 *         description: The item was removed. Response bao gồm populated data (creatorId, items.ingredientId, items.unitId).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShoppingList'
 *       404:
 *         description: Shopping list not found
 *       500:
 *         description: Server error
 */
router.delete('/:id/items/:itemId', shoppingController.removeItem);

export default router;
