import fridgeService from '../services/fridgeService.js';

const fridgeController = {
  /**
   * POST /api/fridges
   * Tạo một tủ lạnh mới.
   */
  create: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy từ authMiddleware.verifyToken
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Fridge name is required.' });
      }

      const newFridge = await fridgeService.createFridge(userId, { name });
      res.status(201).json({ message: 'Fridge created successfully.', fridge: newFridge });
    } catch (err) {
      res.status(500).json({ message: 'Error creating fridge.', error: err.message });
    }
  },

  /**
   * GET /api/fridges
   * Lấy danh sách tủ lạnh của người dùng đã đăng nhập.
   */
  getAll: async (req, res) => {
    try {
      const userId = req.user.id;
      const fridges = await fridgeService.getUserFridges(userId);
      res.status(200).json({ fridges });
    } catch (err) {
      res.status(500).json({ message: 'Error fetching fridges.', error: err.message });
    }
  },

  /**
   * PATCH /api/fridges/:fridgeId
   * Cập nhật tên của một tủ lạnh.
   */
  update: async (req, res) => {
    try {
      const { fridgeId } = req.params;
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'New name is required.' });
      }

      const updatedFridge = await fridgeService.updateFridgeName(fridgeId, { name });
      res.status(200).json({ message: 'Fridge updated successfully.', fridge: updatedFridge });
    } catch (err) {
      res.status(500).json({ message: 'Error updating fridge.', error: err.message });
    }
  },

  /**
   * DELETE /api/fridges/:fridgeId
   * Xóa một tủ lạnh và tất cả các item bên trong.
   */
  remove: async (req, res) => {
    try {
      const { fridgeId } = req.params;
      await fridgeService.deleteFridgeAndItems(fridgeId);
      res.status(200).json({ message: 'Fridge and all its items have been deleted successfully.' });
    } catch (err) {
      res.status(500).json({ message: 'Error deleting fridge.', error: err.message });
    }
  },
};

export default fridgeController;