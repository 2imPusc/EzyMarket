import express from 'express';
import authController from '../controllers/authController.js';
import authMiddleware from '#middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     description: Login endpoint specifically for admin users. Only users with admin role can access.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@ezymarket.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Admin login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     role:
 *                       type: string
 *                       example: admin
 *                     email:
 *                       type: string
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       403:
 *         description: Access denied - Not an admin or email not verified
 *       400:
 *         description: Invalid credentials
 */
router.post('/login', authController.adminLogin);

router.get('/users', authMiddleware.verifyAdmin, authController.getList)
export default router;
