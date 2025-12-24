import express from 'express';
import authController from '../controllers/authController.js';
import authMiddleware from '#middlewares/authMiddleware.js';
import groupController from '#src/controllers/groupController.js';

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

// ============= USER MANAGEMENT =============
// GET all users with pagination and filters
router.get('/users', authMiddleware.verifyAdmin, authController.getList);

// GET user by ID
router.get('/users/:id', authMiddleware.verifyAdmin, authController.getUserById);

// CREATE user by admin
router.post('/users', authMiddleware.verifyAdmin, authController.createUserByAdmin);

// UPDATE user by admin
router.put('/users/:id', authMiddleware.verifyAdmin, authController.updateUserByAdmin);

// ============= GROUP MANAGEMENT =============
// GET all groups with pagination
router.get('/groups', authMiddleware.verifyAdmin, groupController.getAllGroups);

// GET group by ID with members
router.get('/groups/:id', authMiddleware.verifyAdmin, groupController.getGroupByIdAdmin);

// UPDATE group
router.put('/groups/:id', authMiddleware.verifyAdmin, groupController.updateGroupByAdmin);

// DELETE group
router.delete('/groups/:id', authMiddleware.verifyAdmin, groupController.deleteGroupByAdmin);

// ADD member to group
router.post(
  '/groups/:id/members',
  authMiddleware.verifyAdmin,
  groupController.addMemberToGroupByAdmin
);

// REMOVE member from group
router.delete(
  '/groups/:id/members',
  authMiddleware.verifyAdmin,
  groupController.removeMemberFromGroupByAdmin
);

export default router;
