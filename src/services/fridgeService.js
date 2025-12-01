import Fridge from '../model/fridgeRepository.js';
import FridgeItem from '../model/fridgeItemRepository.js';
import * as recipeService from './recipeService.js';

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
   * Lấy tất cả tủ lạnh thuộc về một người dùng (bao gồm tủ cá nhân và tủ nhóm).
   * @param {string} userId - ID của người dùng.
   * @param {Array<string>} groupIds - Danh sách ID nhóm của người dùng.
   * @returns {Promise<Array<Document>>} - Mảng các tài liệu Fridge.
   */
  getUserFridges: async (userId, groupIds = []) => {
    const query = {
      $or: [
        { owner: userId, groupId: null }, // Tủ cá nhân
        { groupId: { $in: groupIds } }    // Tủ nhóm
      ]
    };
    const fridges = await Fridge.find(query).sort({ createdAt: -1 });
    return fridges;
  },

  /**
   * Lấy tủ lạnh của một nhóm cụ thể.
   * @param {string} groupId - ID của nhóm.
   * @returns {Promise<Document>} - Tài liệu Fridge.
   */
  getGroupFridge: async (groupId) => {
    return await Fridge.findOne({ groupId });
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

  /**
   * Gợi ý công thức nấu ăn dựa trên các nguyên liệu có sẵn trong một tủ lạnh cụ thể.
   * @param {string} fridgeId - ID của tủ lạnh.
   * @param {object} options - Tùy chọn { threshold, limit }.
   * @returns {Promise<Array>} - Mảng các công thức đã được làm giàu thông tin.
   */
  suggestRecipesForFridge: async (fridgeId, options) => {
    // 1. Lấy tất cả các nguyên liệu đang có trong tủ lạnh
    const availableItems = await FridgeItem.find({ fridgeId, status: 'in-stock' })
      .populate('foodId', 'name') // Chỉ lấy trường 'name' từ Ingredient
      .lean();

    // 2. Tạo một Set các tên nguyên liệu (đã chuẩn hóa) để tra cứu nhanh
    const availableIngredientNames = availableItems.map(item => item.foodId?.name);
    const availableSet = new Set(availableIngredientNames.map(name => (name || '').toLowerCase().trim()));

    // 3. Gọi service gợi ý của recipe với danh sách tên nguyên liệu
    const suggestions = await recipeService.suggestRecipes(availableIngredientNames, options);

    // 4. Làm giàu dữ liệu trả về: thêm thông tin thiếu/đủ
    const enhancedSuggestions = suggestions.map(recipe => {
      const missingIngredients = recipe.ingredients
        .filter(ing => 
          !ing.optional && // Chỉ xét nguyên liệu bắt buộc
          !availableSet.has((ing.name || '').toLowerCase().trim()) // Kiểm tra xem có trong tủ lạnh không
        )
        .map(ing => ({ name: ing.name, quantity: ing.quantity, unit: ing.unitText }));
      
      const missingCount = missingIngredients.length;

      return {
        ...recipe, // Giữ lại các trường gốc như _id, title, score, ...
        missingCount,
        isReadyToCook: missingCount === 0,
        missingIngredients,
      };
    });

    return enhancedSuggestions;
  }
};

export default fridgeService;