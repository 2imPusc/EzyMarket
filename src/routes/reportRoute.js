import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { reportController } from '../controllers/reportController.js';

const router = express.Router();

router.use(authMiddleware.verifyToken);

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Analytics and reporting API for insights
 */

/**
 * @swagger
 * /api/reports/overview:
 *   get:
 *     summary: Get dashboard overview report
 *     description: Báo cáo tổng quan - Tổng số items trong fridge (by status), số công thức đã lưu, meal plans, shopping lists, tổng chi tiêu
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fridgeStats:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: number
 *                     inStock:
 *                       type: number
 *                     expired:
 *                       type: number
 *                     expiringSoon:
 *                       type: number
 *                     totalValue:
 *                       type: number
 *                 recipeStats:
 *                   type: object
 *                   properties:
 *                     totalRecipes:
 *                       type: number
 *                     personalRecipes:
 *                       type: number
 *                     systemRecipes:
 *                       type: number
 *                 mealPlanStats:
 *                   type: object
 *                   properties:
 *                     thisWeek:
 *                       type: number
 *                     thisMonth:
 *                       type: number
 *                     completionRate:
 *                       type: number
 *                 shoppingStats:
 *                   type: object
 *                   properties:
 *                     activeLists:
 *                       type: number
 *                     completedLists:
 *                       type: number
 *                     totalSpending:
 *                       type: number
 */
router.get('/overview', reportController.overview);

/**
 * @swagger
 * /api/reports/shopping:
 *   get:
 *     summary: Get shopping spending report
 *     description: Báo cáo thống kê tiền đã tiêu - Tổng chi tiêu theo thời gian, chi tiêu theo danh mục, so sánh với tháng trước
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Group spending by time period
 *     responses:
 *       200:
 *         description: Spending analysis data
 */
router.get('/shopping', reportController.spendingReport);

/**
 * @swagger
 * /api/reports/meals:
 *   get:
 *     summary: Get meal planning report
 *     description: Báo cáo Meal Planning - Tỷ lệ thực hiện meal plan, phân bố theo mealType, recipes được dùng nhiều nhất
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *     responses:
 *       200:
 *         description: Meal planning summary data
 */
router.get('/meals', reportController.mealPlanReport);

/**
 * @swagger
 * /api/reports/recipe-usage:
 *   get:
 *     summary: Get recipe usage statistics
 *     description: Báo cáo Recipe Usage - Top recipes được dùng nhiều nhất, recipes chưa bao giờ dùng, tần suất sử dụng theo tags
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Number of top recipes to return
 *     responses:
 *       200:
 *         description: Recipe usage statistics
 */
router.get('/recipe-usage', reportController.recipeUsageStats);

/**
 * @swagger
 * /api/reports/fridge/expiry-tracking:
 *   get:
 *     summary: Get expiry tracking report
 *     description: Danh sách thực phẩm sắp hết hạn, đã hết hạn, thống kê thực phẩm bị hỏng/vứt bỏ
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month]
 *     responses:
 *       200:
 *         description: Expiry tracking data
 */
router.get('/fridge/expiry-tracking', reportController.expiryTracking);

/**
 * @swagger
 * /api/reports/fridge/waste-analysis:
 *   get:
 *     summary: Get food waste analysis
 *     description: Tổng giá trị thực phẩm bị hỏng/vứt, top 10 thực phẩm bị lãng phí nhiều nhất
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Food waste analysis data
 */
router.get('/fridge/waste-analysis', reportController.wasteAnalysis);

export default router;
