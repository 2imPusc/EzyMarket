import FridgeItem from '../model/fridgeItemRepository.js';
import Ingredient from '../model/ingredientRepository.js'; // Import model Ingredient
import mongoose from 'mongoose';

const fridgeItemService = {
  /**
   * Thêm một item mới vào tủ lạnh. Tự động tính ngày hết hạn nếu không được cung cấp.
   */
  addFridgeItem: async (fridgeId, itemData) => {
    // Nếu không có expiryDate, tự động tính toán
    if (!itemData.expiryDate) {
      const ingredient = await Ingredient.findById(itemData.foodId);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }
      const purchaseDate = itemData.purchaseDate ? new Date(itemData.purchaseDate) : new Date();
      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(purchaseDate.getDate() + ingredient.defaultExpireDays);
      itemData.expiryDate = expiryDate;
    }

    const newItem = new FridgeItem({
      ...itemData,
      fridgeId,
    });
    await newItem.save();
    return newItem;
  },

  /**
   * Lấy danh sách các item trong tủ lạnh với các tùy chọn lọc và phân trang.
   */
  getFridgeItems: async (fridgeId, options = {}) => {
    const { page = 1, limit = 20, sortBy = 'expiryDate_asc', status, search } = options;

    const query = { fridgeId };
    if (status) query.status = status;

    // Cấu hình tìm kiếm (nếu cần)
    // Để search hoạt động, cần populate và lọc trên kết quả populate.
    // Đây là một ví dụ đơn giản, thực tế có thể cần aggregation pipeline.
    
    // Sắp xếp
    const sortOption = {};
    const [sortField, sortOrder] = sortBy.split('_');
    sortOption[sortField] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const items = await FridgeItem.find(query)
      .populate('foodId', 'name imageURL') // Lấy thông tin name, imageURL từ Ingredient
      .populate('unitId', 'name abbreviation') // Lấy thông tin name, abbreviation từ Unit
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // .lean() để trả về plain JS object, nhanh hơn

    const total = await FridgeItem.countDocuments(query);

    return {
      items,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Cập nhật một item trong tủ lạnh.
   */
  updateFridgeItem: async (itemId, updateData) => {
    const item = await FridgeItem.findByIdAndUpdate(itemId, updateData, { new: true });
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  },

  /**
   * Xóa một item khỏi tủ lạnh.
   */
  deleteFridgeItem: async (itemId) => {
    const item = await FridgeItem.findByIdAndDelete(itemId);
    if (!item) {
      throw new Error('Item not found');
    }
    return { message: 'Fridge item deleted successfully' };
  },
};

export default fridgeItemService;