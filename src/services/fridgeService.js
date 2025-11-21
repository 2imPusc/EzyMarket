import Fridge from '../model/fridgeRepository.js';
import FridgeItem from '../model/fridgeItemRepository.js';

const fridgeService = {
  /**
   * Tạo một tủ lạnh mới cho người dùng.
   * @param {string} userId - ID của người dùng sở hữu.
   * @param {object} fridgeData - Dữ liệu của tủ lạnh (ví dụ: { name: 'Tủ lạnh bếp' }).
   * @returns {Promise<Document>} - Tài liệu Fridge vừa được tạo.
   */
  createFridge: async (userId, fridgeData) => {
    const newFridge = new Fridge({
      ...fridgeData,
      owner: userId,
    });
    await newFridge.save();
    return newFridge;
  },

  /**
   * Lấy tất cả tủ lạnh thuộc về một người dùng.
   * @param {string} userId - ID của người dùng.
   * @returns {Promise<Array<Document>>} - Mảng các tài liệu Fridge.
   */
  getUserFridges: async (userId) => {
    const fridges = await Fridge.find({ owner: userId }).sort({ createdAt: -1 });
    return fridges;
  },

  /**
   * Cập nhật tên của một tủ lạnh.
   * @param {string} fridgeId - ID của tủ lạnh cần cập nhật.
   * @param {object} updateData - Dữ liệu cần cập nhật (ví dụ: { name: 'Tên mới' }).
   * @returns {Promise<Document>} - Tài liệu Fridge sau khi đã cập nhật.
   */
  updateFridgeName: async (fridgeId, updateData) => {
    const updatedFridge = await Fridge.findByIdAndUpdate(
      fridgeId,
      { name: updateData.name },
      { new: true, runValidators: true } // new: true để trả về document sau khi update
    );
    return updatedFridge;
  },

  /**
   * Xóa một tủ lạnh và tất cả các item bên trong nó.
   * Đây là một hành động nguy hiểm và không thể hoàn tác.
   * @param {string} fridgeId - ID của tủ lạnh cần xóa.
   */
  deleteFridgeAndItems: async (fridgeId) => {
    // Bước 1: Xóa tất cả các FridgeItem có cùng fridgeId.
    // Đây là bước quan trọng để tránh dữ liệu mồ côi (orphaned data).
    await FridgeItem.deleteMany({ fridgeId: fridgeId });

    // Bước 2: Xóa chính tủ lạnh đó.
    await Fridge.findByIdAndDelete(fridgeId);
    
    // Lưu ý: Trong ứng dụng thực tế phức tạp hơn, bạn có thể cân nhắc
    // sử dụng Transactions để đảm bảo cả hai thao tác này cùng thành công hoặc cùng thất bại.
  },
};

export default fridgeService;