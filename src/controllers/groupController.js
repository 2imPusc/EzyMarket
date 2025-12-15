import {
  createGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  getGroupDetails,
  getUserGroups,
  deleteGroup,
} from '../services/groupService.js';

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
};

export default groupController;
