import ShoppingList from '../model/shoppingRepository.js';
import Group from '../model/groupRepository.js';

const shoppingListMiddleware = {
  /**
   * Middleware kiểm tra quyền truy cập shopping list:
   * - Nếu list.groupId tồn tại => chỉ members của group mới được phép
   * - Nếu list.groupId là null => chỉ creator mới được phép
   * PHẢI được dùng SAU authMiddleware.verifyToken
   */
  verifyShoppingListAccess: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      if (!id) {
        return res.status(400).json({ message: 'Shopping list ID is required' });
      }

      const list = await ShoppingList.findById(id);

      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }

      // Nếu là personal list (groupId = null), chỉ creator mới được truy cập
      if (!list.groupId) {
        if (list.creatorId.toString() !== userId) {
          return res.status(403).json({
            message: 'You do not have permission to access this shopping list',
          });
        }
        req.shoppingList = list;
        return next();
      }

      // Nếu là group list, kiểm tra user có phải member hoặc owner của group không
      const group = await Group.findById(list.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      const isMember = group.members.some((id) => id.toString() === userId);
      const isOwner = group.ownerId.toString() === userId;

      if (!isMember && !isOwner) {
        return res.status(403).json({
          message: 'You are not a member of this group',
        });
      }

      req.shoppingList = list;
      req.group = group;
      next();
    } catch (err) {
      // Mongoose CastError for invalid ObjectId
      if (err && err.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid shopping list ID format' });
      }
      console.error('Shopping list access check error:', err);
      res.status(500).json({ message: 'Internal server error during authorization check' });
    }
  },

  /**
   * Middleware kiểm tra quyền sửa/xóa shopping list:
   * - Chỉ creator mới được sửa/xóa (dù là personal hay group list)
   */
  verifyShoppingListOwnership: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      if (!id) {
        return res.status(400).json({ message: 'Shopping list ID is required' });
      }

      const list = await ShoppingList.findById(id);

      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }

      // Chỉ creator mới được sửa/xóa
      if (list.creatorId.toString() !== userId) {
        return res.status(403).json({
          message: 'Only the creator can modify this shopping list',
        });
      }

      req.shoppingList = list;
      next();
    } catch (err) {
      if (err && err.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid shopping list ID format' });
      }
      console.error('Shopping list ownership check error:', err);
      res.status(500).json({ message: 'Internal server error during authorization check' });
    }
  },
};

export default shoppingListMiddleware;
