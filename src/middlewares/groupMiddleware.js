import Group from '../model/groupReposiroty.js';
import mongoose from 'mongoose';

const groupMiddleware = {
  validateObjectId: (paramName) => {
    return (req, res, next) => {
      const id = req.params[paramName] || req.body[paramName];
      if (!id) {
        return res.status(400).json({ message: `${paramName} is required` });
      }
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: `Invalid ${paramName}` });
      }
      next();
    };
  },

  checkGroupExists: async (req, res, next) => {
    try {
      const groupId = req.params.groupId || req.body.groupId;
      const group = await Group.findById(groupId);

      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      req.group = group;
      next();
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  verifyOwner: (req, res, next) => {
    if (!req.group) {
      return res.status(500).json({ message: 'Group not loaded' });
    }

    if (req.group.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only group owner can perform this action' });
    }

    next();
  },

  verifyOwnerOrAdmin: (req, res, next) => {
    if (!req.group) {
      return res.status(500).json({ message: 'Group not loaded' });
    }

    const isOwner = req.group.ownerId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only group owner or admin can perform this action' });
    }

    next();
  },

  verifyMember: (req, res, next) => {
    if (!req.group) {
      return res.status(500).json({ message: 'Group not loaded' });
    }

    const isMember = req.group.members.some((id) => id.toString() === req.user.id);
    const isOwner = req.group.ownerId.toString() === req.user.id;

    if (!isMember && !isOwner) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    next();
  },

  verifyOwnerOrMember: (req, res, next) => {
    if (!req.group) {
      return res.status(500).json({ message: 'Group not loaded' });
    }

    const isMember = req.group.members.some((id) => id.toString() === req.user.id);
    const isOwner = req.group.ownerId.toString() === req.user.id;

    if (!isMember && !isOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  },

  validateGroupInput: (req, res, next) => {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    if (name.trim().length < 3) {
      return res.status(400).json({ message: 'Group name must be at least 3 characters' });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({ message: 'Group name must not exceed 100 characters' });
    }

    if (description.trim().length > 500) {
      return res.status(400).json({ message: 'Description must not exceed 500 characters' });
    }

    next();
  },

  validateMemberInput: (req, res, next) => {
    const groupId = req.params.groupId || req.body.groupId;
    const userId = req.params.userId || req.body.userId;

    if (!groupId || !userId) {
      return res.status(400).json({ message: 'GroupId and userId are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid groupId or userId' });
    }

    next();
  },
};

export default groupMiddleware;
