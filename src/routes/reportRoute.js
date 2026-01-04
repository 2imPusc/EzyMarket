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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalSpending:
 *                       type: number
 *                       description: Tổng chi tiêu
 *                     averageSpending:
 *                       type: number
 *                       description: Chi tiêu trung bình
 *                     itemCount:
 *                       type: number
 *                       description: Tổng số items đã mua
 *                     periodsCount:
 *                       type: number
 *                       description: Số chu kỳ thời gian
 *                     changePercentage:
 *                       type: number
 *                       description: Phần trăm thay đổi so với chu kỳ trước
 *                 spendingTimeSeries:
 *                   type: array
 *                   description: Chi tiêu theo thời gian
 *                   items:
 *                     type: object
 *                     properties:
 *                       period:
 *                         type: string
 *                       amount:
 *                         type: number
 *                 spendingByCategories:
 *                   type: array
 *                   description: Chi tiêu theo danh mục
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       percentage:
 *                         type: number
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalDays:
 *                       type: number
 *                       description: Tổng số ngày có meal plan
 *                     totalMeals:
 *                       type: number
 *                       description: Tổng số bữa ăn
 *                     eatenMeals:
 *                       type: number
 *                       description: Số bữa đã ăn
 *                     skippedDays:
 *                       type: number
 *                       description: Số ngày bỏ qua
 *                     completionRate:
 *                       type: number
 *                       description: Tỷ lệ hoàn thành (%)
 *                 mealTypeStats:
 *                   type: array
 *                   description: Thống kê theo loại bữa ăn
 *                   items:
 *                     type: object
 *                     properties:
 *                       mealType:
 *                         type: string
 *                         enum: [breakfast, lunch, dinner, snack]
 *                       total:
 *                         type: number
 *                       eaten:
 *                         type: number
 *                       completionRate:
 *                         type: number
 *                 topRecipes:
 *                   type: array
 *                   description: Top recipes được dùng nhiều nhất
 *                   items:
 *                     type: object
 *                     properties:
 *                       recipe:
 *                         type: string
 *                       count:
 *                         type: number
 *                 topIngredients:
 *                   type: array
 *                   description: Top ingredients được dùng nhiều nhất
 *                   items:
 *                     type: object
 *                     properties:
 *                       ingredient:
 *                         type: string
 *                       count:
 *                         type: number
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalRecipes:
 *                       type: number
 *                       description: Tổng số recipes
 *                     usedRecipes:
 *                       type: number
 *                       description: Số recipes đã sử dụng
 *                     unusedRecipes:
 *                       type: number
 *                       description: Số recipes chưa sử dụng
 *                 topRecipes:
 *                   type: array
 *                   description: Top recipes được dùng nhiều nhất
 *                   items:
 *                     type: object
 *                     properties:
 *                       recipeId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       count:
 *                         type: number
 *                       tags:
 *                         type: array
 *                         description: Array of tag objects associated with the recipe
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             name:
 *                               type: string
 *                 unusedRecipes:
 *                   type: array
 *                   description: Recipes chưa bao giờ dùng
 *                   items:
 *                     type: object
 *                     properties:
 *                       recipeId:
 *                         type: string
 *                       title:
 *                         type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 expiringSoon:
 *                   type: array
 *                   description: Danh sách thực phẩm sắp hết hạn
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       food:
 *                         type: object
 *                         description: Ingredient object (populated with name and foodCategory)
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           foodCategory:
 *                             type: string
 *                       quantity:
 *                         type: number
 *                       unit:
 *                         type: object
 *                         description: Unit object (populated with name and abbreviation)
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           abbreviation:
 *                             type: string
 *                       expiryDate:
 *                         type: string
 *                         format: date-time
 *                       daysUntilExpiry:
 *                         type: number
 *                       price:
 *                         type: number
 *                 expired:
 *                   type: array
 *                   description: Danh sách thực phẩm đã hết hạn
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       food:
 *                         type: object
 *                         description: Ingredient object (populated with name and foodCategory)
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           foodCategory:
 *                             type: string
 *                       quantity:
 *                         type: number
 *                       unit:
 *                         type: object
 *                         description: Unit object (populated with name and abbreviation)
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           abbreviation:
 *                             type: string
 *                       expiryDate:
 *                         type: string
 *                         format: date-time
 *                       daysExpired:
 *                         type: number
 *                       price:
 *                         type: number
 *                       status:
 *                         type: string
 *                         enum: [in-stock, expired]
 *                 wasteStats:
 *                   type: object
 *                   properties:
 *                     wastedItems:
 *                       type: number
 *                     wasteValue:
 *                       type: number
 *                     wastePercentage:
 *                       type: number
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalWastedItems:
 *                       type: number
 *                       description: Tổng số items bị lãng phí
 *                     totalWasteValue:
 *                       type: number
 *                       description: Tổng giá trị bị lãng phí
 *                 topWastedFoods:
 *                   type: array
 *                   description: Top 10 thực phẩm bị lãng phí nhiều nhất
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: number
 *                       totalValue:
 *                         type: number
 *                       category:
 *                         type: string
 *                 wasteByReason:
 *                   type: object
 *                   properties:
 *                     expired:
 *                       type: number
 *                       description: Số items hết hạn
 *                     discarded:
 *                       type: number
 *                       description: Số items bị vứt bỏ
 *                 wasteTrend:
 *                   type: array
 *                   description: Xu hướng lãng phí theo tháng
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                         format: YYYY-MM
 *                       count:
 *                         type: number
 *                       value:
 *                         type: number
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get('/fridge/waste-analysis', reportController.wasteAnalysis);

export default router;
