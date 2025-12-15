import express from 'express';
import groupController from '../controllers/groupController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import groupMiddleware from '../middlewares/groupMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Group management endpoints
 */

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
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
 *                 example: My Group
 *               description:
 *                 type: string
 *                 example: This is a group description
 *     responses:
 *       201:
 *         description: Group created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Group created successfully
 *                 group:
 *                   $ref: '#/components/schemas/Group'
 *       400:
 *         description: Bad request - validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  authMiddleware.verifyToken,
  groupMiddleware.validateGroupInput,
  groupController.create
);

/**
 * @swagger
 * /api/groups/mine:
 *   get:
 *     summary: Get all groups where user is a member or owner
 *     tags: [Groups]
 *     responses:
 *       200:
 *         description: List of user's groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Group'
 *       500:
 *         description: Internal server error
 */
router.get('/mine', authMiddleware.verifyToken, groupController.getMyGroups);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   get:
 *     summary: Get group details
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Group details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       400:
 *         description: Invalid group ID
 *       403:
 *         description: Not a member of this group
 *       404:
 *         description: Group not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:groupId',
  authMiddleware.verifyToken,
  groupMiddleware.validateObjectId('groupId'),
  groupMiddleware.checkGroupExists,
  groupMiddleware.verifyMember,
  groupController.getDetails
);

/**
 * @swagger
 * /api/groups/{groupId}/members:
 *   post:
 *     summary: Add a member to group (owner only)
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to add to the group
 *                 example: 507f1f77bcf86cd799439012
 *     responses:
 *       200:
 *         description: Member added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member added successfully
 *       400:
 *         description: Bad request - validation error
 *       403:
 *         description: Only group owner can add members
 *       404:
 *         description: Group or user not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:groupId/members',
  authMiddleware.verifyToken,
  groupMiddleware.validateMemberInput,
  groupMiddleware.checkGroupExists,
  groupMiddleware.verifyOwner,
  groupController.addMember
);

/**
 * @swagger
 * /api/groups/{groupId}/members/{userId}:
 *   delete:
 *     summary: Remove a member from group (owner only)
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *         example: 507f1f77bcf86cd799439011
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to remove
 *         example: 507f1f77bcf86cd799439012
 *     responses:
 *       200:
 *         description: Member removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member removed successfully
 *       400:
 *         description: Bad request - validation error
 *       403:
 *         description: Only group owner can remove members
 *       404:
 *         description: Group or user not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:groupId/members/:userId',
  authMiddleware.verifyToken,
  groupMiddleware.validateMemberInput,
  groupMiddleware.checkGroupExists,
  groupMiddleware.verifyOwner,
  groupController.removeMember
);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   delete:
 *     summary: Delete a group (owner or admin only)
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Group deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Group deleted successfully
 *       400:
 *         description: Invalid group ID
 *       403:
 *         description: Only group owner or admin can delete group
 *       404:
 *         description: Group not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:groupId',
  authMiddleware.verifyToken,
  groupMiddleware.validateObjectId('groupId'),
  groupMiddleware.checkGroupExists,
  groupMiddleware.verifyOwnerOrAdmin,
  groupController.delete
);

export default router;
