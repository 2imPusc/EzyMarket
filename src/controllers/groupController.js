import {
  createGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  getGroupDetails,
  getUserGroups,
  deleteGroup,
} from '../services/groupService.js';
import Group from '../model/groupRepository.js';

const groupController = {
  create: async (req, res) => {
    try {
      const { name, description } = req.body;
      const ownerId = req.user.id;

      const result = await createGroup(name, description, ownerId);
      return res.status(result.status).json(result.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  addMember: async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userId } = req.body;
      const requesterId = req.user.id;

      const result = await addMemberToGroup(groupId, userId, requesterId);
      return res.status(result.status).json(result.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  removeMember: async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      const requesterId = req.user.id;

      const result = await removeMemberFromGroup(groupId, userId, requesterId);
      return res.status(result.status).json(result.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  getDetails: async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      const result = await getGroupDetails(groupId, userId);
      return res.status(result.status).json(result.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  getMyGroups: async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await getUserGroups(userId);
      return res.status(result.status).json(result.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      const result = await deleteGroup(groupId, userId);
      return res.status(result.status).json(result.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // ============= ADMIN GROUP MANAGEMENT =============

  // GET ALL GROUPS (Admin only)
  getAllGroups: async (req, res) => {
    try {
      const { page = 1, pageSize = 10, search = '' } = req.query;

      const query = {};

      // Search by group name
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }

      // Calculate pagination
      const pageNum = parseInt(page);
      const limit = parseInt(pageSize);
      const skip = (pageNum - 1) * limit;

      // Get total count
      const total = await Group.countDocuments(query);

      // Get groups with pagination
      const groups = await Group.find(query)
        .populate('ownerId', 'userName email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Format response
      const formattedGroups = groups.map((group) => ({
        id: group._id,
        name: group.name,
        description: group.description,
        owner: group.ownerId,
        memberCount: group.members?.length || 0,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      }));

      res.status(200).json({
        data: formattedGroups,
        total,
        page: pageNum,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      console.error('Get groups list error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET GROUP BY ID WITH MEMBERS (Admin only)
  getGroupByIdAdmin: async (req, res) => {
    try {
      const groupId = req.params.id;

      if (!groupId) {
        return res.status(400).json({ message: 'Group ID is required' });
      }

      const group = await Group.findById(groupId)
        .populate('ownerId', 'userName email avatar phone')
        .populate('members', 'userName email avatar phone')
        .lean();

      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      res.status(200).json({
        data: {
          id: group._id,
          name: group.name,
          description: group.description,
          owner: group.ownerId,
          members: group.members,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        },
      });
    } catch (err) {
      console.error('Get group by ID error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // UPDATE GROUP (Admin only)
  updateGroupByAdmin: async (req, res) => {
    try {
      const groupId = req.params.id;
      const { name, description } = req.body;

      if (!groupId) {
        return res.status(400).json({ message: 'Group ID is required' });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      // Update fields
      const updates = {};
      if (name !== undefined) {
        if (name.trim().length < 3) {
          return res.status(400).json({ message: 'Group name must be at least 3 characters' });
        }
        updates.name = name.trim();
      }
      if (description !== undefined) {
        if (description.trim().length > 500) {
          return res.status(400).json({ message: 'Description must not exceed 500 characters' });
        }
        updates.description = description.trim();
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      updates.updatedAt = Date.now();

      Object.assign(group, updates);
      await group.save();

      const updatedGroup = await Group.findById(groupId)
        .populate('ownerId', 'userName email avatar')
        .populate('members', 'userName email avatar')
        .lean();

      res.status(200).json({
        data: {
          id: updatedGroup._id,
          name: updatedGroup.name,
          description: updatedGroup.description,
          owner: updatedGroup.ownerId,
          members: updatedGroup.members,
          createdAt: updatedGroup.createdAt,
          updatedAt: updatedGroup.updatedAt,
        },
      });
    } catch (err) {
      console.error('Update group by admin error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // ADD MEMBER TO GROUP (Admin only)
  addMemberToGroupByAdmin: async (req, res) => {
    try {
      const groupId = req.params.id;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user already belongs to a group
      if (user.groupId !== null && user.groupId !== undefined) {
        return res.status(400).json({ message: 'User already belongs to a group' });
      }

      // Check if user is already a member
      if (group.members.some((id) => id.toString() === userId)) {
        return res.status(400).json({ message: 'User is already a member of this group' });
      }

      group.members.push(userId);
      group.updatedAt = Date.now();
      await group.save();

      user.groupId = groupId;
      await user.save();

      const updatedGroup = await Group.findById(groupId)
        .populate('members', 'userName email avatar phone')
        .lean();

      res.status(200).json({
        message: 'Member added successfully',
        data: {
          id: updatedGroup._id,
          members: updatedGroup.members,
        },
      });
    } catch (err) {
      console.error('Add member to group error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // REMOVE MEMBER FROM GROUP (Admin only)
  removeMemberFromGroupByAdmin: async (req, res) => {
    try {
      const groupId = req.params.id;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      // Cannot remove the owner
      if (userId === group.ownerId.toString()) {
        return res.status(400).json({ message: 'Cannot remove the owner from the group' });
      }

      // Check if user is a member
      if (!group.members.some((id) => id.toString() === userId)) {
        return res.status(400).json({ message: 'User is not a member of this group' });
      }

      group.members = group.members.filter((id) => id.toString() !== userId);
      group.updatedAt = Date.now();
      await group.save();

      const user = await User.findById(userId);
      if (user) {
        user.groupId = null;
        await user.save();
      }

      const updatedGroup = await Group.findById(groupId)
        .populate('members', 'userName email avatar phone')
        .lean();

      res.status(200).json({
        message: 'Member removed successfully',
        data: {
          id: updatedGroup._id,
          members: updatedGroup.members,
        },
      });
    } catch (err) {
      console.error('Remove member from group error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // DELETE GROUP (Admin only)
  deleteGroupByAdmin: async (req, res) => {
    try {
      const groupId = req.params.id;

      if (!groupId) {
        return res.status(400).json({ message: 'Group ID is required' });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      // Remove groupId from all users in this group
      await User.updateMany({ groupId: groupId }, { $set: { groupId: null } });

      // Delete the group
      await Group.findByIdAndDelete(groupId);

      res.status(200).json({ message: 'Group deleted successfully' });
    } catch (err) {
      console.error('Delete group by admin error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};

export default groupController;
