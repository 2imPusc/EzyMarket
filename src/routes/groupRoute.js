import express from 'express';
import groupController from '../controllers/groupController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import groupMiddleware from '../middlewares/groupMiddleware.js';

const router = express.Router();

router.post(
  '/create',
  authMiddleware.verifyToken,
  groupMiddleware.validateGroupInput,
  groupController.create
);

router.get('/my-groups', authMiddleware.verifyToken, groupController.getMyGroups);

router.get(
  '/:groupId',
  authMiddleware.verifyToken,
  groupMiddleware.validateObjectId('groupId'),
  groupMiddleware.checkGroupExists,
  groupMiddleware.verifyMember,
  groupController.getDetails
);

router.post(
  '/add-member',
  authMiddleware.verifyToken,
  groupMiddleware.validateMemberInput,
  groupMiddleware.checkGroupExists,
  groupMiddleware.verifyOwner,
  groupController.addMember
);

router.delete(
  '/remove-member',
  authMiddleware.verifyToken,
  groupMiddleware.validateMemberInput,
  groupMiddleware.checkGroupExists,
  groupMiddleware.verifyOwner,
  groupController.removeMember
);

router.delete(
  '/:groupId',
  authMiddleware.verifyToken,
  groupMiddleware.validateObjectId('groupId'),
  groupMiddleware.checkGroupExists,
  groupMiddleware.verifyOwnerOrAdmin,
  groupController.delete
);

export default router;
