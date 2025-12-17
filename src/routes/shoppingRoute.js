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
 *           type: string
 *           description: The id of the ingredient (optional)
 *         name:
 *           type: string
 *           description: Name of the item
 *         quantity:
 *           type: number
 *           description: Quantity of the item
 *         unit:
 *           type: string
 *           description: Unit of measurement
 *         isPurchased:
 *           type: boolean
 *           description: Whether the item is purchased
 *         price:
 *           type: number
 *           description: Giá tiền thực tế mua
 *         servingQuantity:
 *           type: number
 *           description: Số khẩu phần
 *         expiryDate:
 *           type: string
 *           format: date
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
 *           description: The id of the group
 *         creatorId:
 *           type: string
 *           description: The id of the creator
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
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unit:
 *                       type: string
 *                     ingredientId:
 *                       type: string
 *     responses:
 *       201:
 *         description: The shopping list was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShoppingList'
 *       400:
 *         description: Bad request
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
 *         description: The list of shopping lists
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
 *         description: The shopping list description
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
 *     description: Cập nhật thông tin các nguyên liệu đã mua (giá, số lượng, hạn sử dụng), đổi status sang completed và tự động thêm vào fridge-items. Chỉ cần gọi API này 1 lần duy nhất.
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
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                       description: ID của item trong shopping list
 *                     price:
 *                       type: number
 *                       description: Giá tiền thực tế mua
 *                     servingQuantity:
 *                       type: number
 *                       description: Số khẩu phần (nếu không theo bữa ăn)
 *                     expiryDate:
 *                       type: string
 *                       format: date
 *                       description: Ngày hết hạn
 *     responses:
 *       200:
 *         description: Checkout thành công, shopping list đã completed và items đã được thêm vào tủ lạnh
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShoppingList'
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
 *         description: The shopping list was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShoppingList'
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
 *               quantity:
 *                 type: number
 *               unit:
 *                 type: string
 *               ingredientId:
 *                 type: string
 *     responses:
 *       200:
 *         description: The item was added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShoppingList'
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
 *               quantity:
 *                 type: number
 *               unit:
 *                 type: string
 *               isPurchased:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: The item was updated
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
 *         description: The item was removed
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
