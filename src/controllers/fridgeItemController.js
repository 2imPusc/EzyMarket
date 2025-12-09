import fridgeItemService from '../services/fridgeItemService.js';

const fridgeItemController = {
  // 1. Thêm một mục thực phẩm (owner được xác định từ req.user)
  add: async (req, res) => {
    try {
      const itemData = req.body;
      const user = req.user; // phải được gắn bởi authMiddleware

      // Validate input
      if (!itemData.foodId || !itemData.unitId || !itemData.quantity) {
        return res.status(400).json({ message: 'foodId, unitId, and quantity are required' });
      }

      // Xác định owner: nếu user có group thì gán groupId, còn không gán userId
      const groupId = user?.groupId ?? user?.group_id ?? null;
      const userId = groupId ? null : (user?.id ?? user?._id);

      const payload = { ...itemData, userId, groupId };

      // Lưu: NOTE: service addFridgeItem phải chấp nhận payload với userId/groupId
      const newItem = await fridgeItemService.addFridgeItem(payload);
      res.status(201).json({ message: 'Fridge item added successfully', item: newItem });
    } catch (err) {
      console.error('Add fridge item error:', err);
      res.status(500).json({ message: err.message || 'Internal server error' });
    }
  },

  // 2. Lấy danh sách thực phẩm cho user (nếu user có group => trả về items của group)
  getAll: async (req, res) => {
    try {
      const options = req.query;
      const user = req.user;
      const groupId = user?.groupId ?? user?.group_id ?? null;
      const userId = groupId ? null : (user?.id ?? user?._id);

      // NOTE: service getFridgeItems(owner, options) => owner = { userId, groupId }
      const result = await fridgeItemService.getFridgeItems({ userId, groupId }, options);
      res.status(200).json(result);
    } catch (err) {
      console.error('Get all fridge items error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // 3. Cập nhật một mục - chuyển ownership check xuống service (service nên nhận req.user để verify)
  update: async (req, res) => {
    try {
      const { itemId } = req.params;
      const updateData = req.body;
      const user = req.user;

      // NOTE: updateFridgeItem(itemId, updateData, user) cần kiểm tra quyền (userId OR groupId)
      const updatedItem = await fridgeItemService.updateFridgeItem(itemId, updateData, user);
      res.status(200).json({ message: 'Fridge item updated successfully', item: updatedItem });
    } catch (err) {
      console.error('Update fridge item error:', err);
      if (err.message === 'Item not found') {
        return res.status(404).json({ message: err.message });
      }
      if (err.message === 'Forbidden') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // 4. Xóa một mục - chuyển ownership check xuống service
  remove: async (req, res) => {
    try {
      const { itemId } = req.params;
      const user = req.user;

      // NOTE: deleteFridgeItem(itemId, user) cần verify quyền
      const result = await fridgeItemService.deleteFridgeItem(itemId, user);
      res.status(200).json(result);
    } catch (err) {
      console.error('Delete fridge item error:', err);
      if (err.message === 'Item not found') {
        return res.status(404).json({ message: err.message });
      }
      if (err.message === 'Forbidden') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};

export default fridgeItemController;