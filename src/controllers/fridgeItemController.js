import fridgeItemService from '../services/fridgeItemService.js';

const fridgeItemController = {
  // 1. Thêm một mục thực phẩm vào tủ lạnh
  add: async (req, res) => {
    try {
      const { fridgeId } = req.params;
      const itemData = req.body;
      
      // Validate input
      if (!itemData.foodId || !itemData.unitId || !itemData.quantity) {
        return res.status(400).json({ message: 'foodId, unitId, and quantity are required' });
      }

      // TODO: Kiểm tra xem user có quyền truy cập vào fridgeId này không

      const newItem = await fridgeItemService.addFridgeItem(fridgeId, itemData);
      res.status(201).json({ message: 'Fridge item added successfully', item: newItem });
    } catch (err) {
      console.error('Add fridge item error:', err);
      res.status(500).json({ message: err.message || 'Internal server error' });
    }
  },

  // 2. Lấy danh sách thực phẩm trong tủ lạnh
  getAll: async (req, res) => {
    try {
      const { fridgeId } = req.params;
      const options = req.query;

      // TODO: Kiểm tra xem user có quyền truy cập vào fridgeId này không

      const result = await fridgeItemService.getFridgeItems(fridgeId, options);
      res.status(200).json(result);
    } catch (err) {
      console.error('Get all fridge items error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // 3. Cập nhật thông tin một mục thực phẩm
  update: async (req, res) => {
    try {
      const { itemId } = req.params;
      const updateData = req.body;

      // TODO: Kiểm tra xem user có quyền chỉnh sửa item này không

      const updatedItem = await fridgeItemService.updateFridgeItem(itemId, updateData);
      res.status(200).json({ message: 'Fridge item updated successfully', item: updatedItem });
    } catch (err) {
      console.error('Update fridge item error:', err);
      if (err.message === 'Item not found') {
        return res.status(404).json({ message: err.message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // 4. Xóa một mục thực phẩm
  remove: async (req, res) => {
    try {
      const { itemId } = req.params;

      // TODO: Kiểm tra xem user có quyền xóa item này không
      
      const result = await fridgeItemService.deleteFridgeItem(itemId);
      res.status(200).json(result);
    } catch (err) {
      console.error('Delete fridge item error:', err);
      if (err.message === 'Item not found') {
        return res.status(404).json({ message: err.message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};

export default fridgeItemController;