import Fridge from '../model/fridgeRepository.js';
import FridgeItem from '../model/fridgeItemRepository.js';

const ownershipMiddleware = {
  /**
   * Middleware để xác minh rằng người dùng đã đăng nhập là chủ sở hữu của tủ lạnh.
   * PHẢI được sử dụng SAU middleware verifyToken.
   */
  verifyFridgeOwnership: async (req, res, next) => {
    try {
      const fridgeId = req.params.fridgeId;
      const userId = req.user.id; // Lấy từ req.user do verifyToken cung cấp

      if (!fridgeId) {
        return res.status(400).json({ message: 'Fridge ID is required in parameters.' });
      }

      const fridge = await Fridge.findById(fridgeId);

      if (!fridge) {
        return res.status(404).json({ message: 'Fridge not found.' });
      }

      if (fridge.owner.toString() !== userId) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to access this fridge.' });
      }

      next();
    } catch (err) {
      // Xử lý lỗi nếu fridgeId không phải là một ObjectId hợp lệ
      if (err.kind === 'ObjectId') {
         return res.status(400).json({ message: 'Invalid Fridge ID format.' });
      }
      res.status(500).json({ message: 'Internal server error during authorization check.' });
    }
  },

  /**
   * THÊM MIDDLEWARE MỚI NÀY
   * Middleware để xác minh người dùng là chủ sở hữu của một ITEM.
   * Dùng cho các route có :itemId trong URL.
   */
  verifyItemOwnership: async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const userId = req.user.id;

        const item = await FridgeItem.findById(itemId);

        if (!item) {
            return res.status(404).json({ message: 'Fridge item not found.' });
        }
        
        // Từ item, tìm ra tủ lạnh chứa nó
        const fridge = await Fridge.findById(item.fridgeId);

        if (!fridge) {
             return res.status(404).json({ message: 'The fridge containing this item no longer exists.' });
        }

        // Kiểm tra quyền sở hữu của tủ lạnh đó
        if (fridge.owner.toString() !== userId) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to modify this item.' });
        }

        next();
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Item ID format.' });
        }
        res.status(500).json({ message: 'Internal server error during authorization check.' });
    }
  }
};

export default ownershipMiddleware;