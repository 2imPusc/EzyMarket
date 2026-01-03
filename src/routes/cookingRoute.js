import express from 'express';
import cookingController from '../controllers/cookingController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware.verifyToken);

/**
 * @swagger
 * tags:
 *   - name: Cooking
 *     description: Cook recipes by consuming fridge ingredients and store cooked dishes in fridge
 */

/**
 * @swagger
 * /api/cooking/check/{recipeId}:
 *   get:
 *     tags: [Cooking]
 *     summary: Check cookability for a recipe
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: servings
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cookability result
 */
router.get('/check/:recipeId', cookingController.check);

/**
 * @swagger
 * /api/cooking/cook:
 *   post:
 *     tags: [Cooking]
 *     summary: Cook a recipe and create a cooked dish fridge item
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipeId]
 *             properties:
 *               recipeId:
 *                 type: string
 *               servings:
 *                 type: integer
 *               force:
 *                 type: boolean
 *                 description: Allow cooking even if required ingredients are insufficient
 *               cookedExpiryDays:
 *                 type: integer
 *                 description: Expiry days for cooked dish (default 3)
 *     responses:
 *       201:
 *         description: Cooked successfully
 *       400:
 *         description: Insufficient ingredients or bad request
 *       404:
 *         description: Recipe not found
 */
router.post('/cook', cookingController.cook);

export default router;