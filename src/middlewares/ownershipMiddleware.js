import FridgeItem from '../model/fridgeItemRepository.js';

const ownershipMiddleware = {
  // verifyFridgeOwnership: fridges removed -> return 410 to indicate deprecated endpoint
  verifyFridgeOwnership: async (req, res, next) => {
    return res.status(410).json({
      message: 'Fridges have been removed. Use fridge-item endpoints (/api/fridge-items) or group endpoints. This route is deprecated.'
    });
  },

  /**
   * Middleware kiểm tra quyền với item:
   * - Nếu item.userId tồn tại => chỉ owner user mới được phép
   * - Nếu item.groupId tồn tại => chỉ members của group (user.groupId) mới được phép
   * PHẢI được dùng SAU authMiddleware.verifyToken để req.user có id và (optionally) groupId
   */
  verifyItemOwnership: async (req, res, next) => {
    try {
      const { itemId } = req.params;
      const user = req.user;
      const uid = user && (user.id || user._id) ? String(user.id ?? user._id) : null;
      const uGroup = user && (user.groupId || user.group_id) ? String(user.groupId ?? user.group_id) : null;

      if (!itemId) return res.status(400).json({ message: 'Item ID is required in parameters.' });

      const item = await FridgeItem.findById(itemId);

      if (!item) {
        return res.status(404).json({ message: 'Fridge item not found.' });
      }

      const ownerUserId = item.userId ? String(item.userId) : null;
      const ownerGroupId = item.groupId ? String(item.groupId) : null;

      const isOwner =
        (ownerUserId && uid && ownerUserId === uid) ||
        (ownerGroupId && uGroup && ownerGroupId === uGroup);

      if (!isOwner) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to modify this item.' });
      }

      next();
    } catch (err) {
      // Mongoose CastError for invalid ObjectId
      if (err && err.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid Item ID format.' });
      }
      res.status(500).json({ message: 'Internal server error during authorization check.' });
    }
  }
};

export default ownershipMiddleware;