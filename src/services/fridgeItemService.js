import FridgeItem from '../model/fridgeItemRepository.js';
import Ingredient from '../model/ingredientRepository.js';
import mongoose from 'mongoose';

const fridgeItemService = {
  /**
   * Thêm một item mới. Tham số: data chứa các trường (foodId, unitId, quantity, purchaseDate, expiryDate, price, ...),
   * và phải có userId hoặc groupId (controller đã gán).
   */
  addFridgeItem: async (data) => {
    // Validate owner
    const userId = data.userId ?? null;
    const groupId = data.groupId ?? null;
    if (!userId && !groupId) {
      throw new Error('Either userId or groupId is required');
    }

    // Validate required fields
    if (!data.foodId || !data.unitId || typeof data.quantity === 'undefined') {
      throw new Error('foodId, unitId, and quantity are required');
    }

    // Nếu không có expiryDate, tự động tính toán từ ingredient.defaultExpireDays
    if (!data.expiryDate) {
      const ingredient = await Ingredient.findById(data.foodId);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }
      const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();
      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(purchaseDate.getDate() + (ingredient.defaultExpireDays || 0));
      data.expiryDate = expiryDate;
    }

    // Thay đổi: dùng "new mongoose.Types.ObjectId(...)" thay vì gọi như hàm
    const newItem = new FridgeItem({
      ...data,
      userId: userId ? new mongoose.Types.ObjectId(userId) : null,
      groupId: groupId ? new mongoose.Types.ObjectId(groupId) : null,
    });
    await newItem.save();
    return newItem.toObject();
  },

  /**
   * Lấy danh sách items theo owner = { userId, groupId } và các options (pagination, sort, status, search).
   */
  getFridgeItems: async (owner = {}, options = {}) => {
    const { page = 1, limit = 20, sortBy = 'expiryDate_asc', status, search } = options;
    const groupId = owner.groupId ?? null;
    const userId = groupId ? null : (owner.userId ?? null);

    const query = {
      quantity: { $gt: 0 },
    };

    if (groupId) query.groupId = new mongoose.Types.ObjectId(groupId);
    else if (userId) query.userId = new mongoose.Types.ObjectId(userId);
    else throw new Error('Owner (userId or groupId) is required');

    if (status) query.status = status;

    // Apply ingredient name search
    if (search && String(search).trim().length > 0) {
      const regex = new RegExp(String(search).trim(), 'i');
      const ingredientIds = await Ingredient.find({ name: regex })
        .select('_id')
        .lean()
        .then((rows) => rows.map((r) => r._id));

      if (ingredientIds.length === 0) {
        return {
          items: [],
          pagination: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 },
        };
      }
      query.foodId = { $in: ingredientIds };
    }

    const sortOption = {};
    const [sortField, sortOrder] = String(sortBy).split('_');
    sortOption[sortField || 'expiryDate'] = sortOrder === 'desc' ? -1 : 1;

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      FridgeItem.find(query)
        .populate('foodId', 'name imageURL')
        .populate('unitId', 'name abbreviation')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      FridgeItem.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  },

  /**
   * Cập nhật item. Kiểm tra quyền: nếu item.userId tồn tại phải khớp user; nếu item.groupId tồn tại phải khớp user.groupId.
   * user param: req.user (controller phải truyền).
   */
  updateFridgeItem: async (itemId, updateData, user) => {
    const item = await FridgeItem.findById(itemId);
    if (!item) throw new Error('Item not found');

    // Normalize user id and group id
    const uid = user && (user.id || user._id) ? String(user.id ?? user._id) : null;
    const uGroup =
      user && (user.groupId || user.group_id) ? String(user.groupId ?? user.group_id) : null;

    const ownerUserId = item.userId ? String(item.userId) : null;
    const ownerGroupId = item.groupId ? String(item.groupId) : null;

    const isOwner =
      (ownerUserId && uid && ownerUserId === uid) ||
      (ownerGroupId && uGroup && ownerGroupId === uGroup);

    if (!isOwner) throw new Error('Forbidden');

    // If updating expiry/purchase dates, keep previous logic if needed
    if (!updateData.expiryDate && (updateData.purchaseDate || updateData.foodId)) {
      // If foodId changed or purchaseDate provided, optionally recalc expiry using ingredient default days
      const foodIdToUse = updateData.foodId ?? item.foodId;
      const ingredient = await Ingredient.findById(foodIdToUse);
      if (ingredient && updateData.purchaseDate) {
        const purchaseDate = new Date(updateData.purchaseDate);
        const expiryDate = new Date(purchaseDate);
        expiryDate.setDate(purchaseDate.getDate() + (ingredient.defaultExpireDays || 0));
        updateData.expiryDate = expiryDate;
      }
    }

    // Tự động tính lại giá tiền khi số lượng thay đổi
    // Chỉ tính lại khi: có cập nhật quantity, quantity giảm, và item có price > 0
    // Lưu ý: Nếu người dùng cập nhật price cùng lúc, ưu tiên giá do người dùng nhậpgit
    if (
      updateData.quantity !== undefined &&
      typeof updateData.quantity === 'number' &&
      updateData.price === undefined // Chỉ tự động tính nếu người dùng không cập nhật price
    ) {
      const oldQuantity = item.quantity || 0;
      const newQuantity = updateData.quantity;
      const oldPrice = item.price || 0;

      // Nếu số lượng về 0, giá tiền cũng về 0
      if (newQuantity === 0) {
        updateData.price = 0;
      }
      // Nếu số lượng giảm và có giá tiền ban đầu, tính lại giá theo tỷ lệ
      else if (newQuantity < oldQuantity && oldQuantity > 0 && oldPrice > 0) {
        // Tính giá đơn vị: giá cũ / số lượng cũ
        const unitPrice = oldPrice / oldQuantity;
        // Tính giá mới: giá đơn vị * số lượng mới
        const newPrice = unitPrice * newQuantity;
        updateData.price = Math.round(newPrice * 100) / 100; // Làm tròn 2 chữ số thập phân
      }
      // Nếu số lượng tăng, giữ nguyên giá cũ (người dùng có thể tự cập nhật price nếu muốn)
    }

    const updated = await FridgeItem.findByIdAndUpdate(itemId, updateData, { new: true }).lean();
    return updated;
  },

  /**
   * Xóa item với kiểm tra quyền tương tự update.
   */
  deleteFridgeItem: async (itemId, user) => {
    const item = await FridgeItem.findById(itemId);
    if (!item) throw new Error('Item not found');

    const uid = user && (user.id || user._id) ? String(user.id ?? user._id) : null;
    const uGroup =
      user && (user.groupId || user.group_id) ? String(user.groupId ?? user.group_id) : null;

    const ownerUserId = item.userId ? String(item.userId) : null;
    const ownerGroupId = item.groupId ? String(item.groupId) : null;

    const isOwner =
      (ownerUserId && uid && ownerUserId === uid) ||
      (ownerGroupId && uGroup && ownerGroupId === uGroup);

    if (!isOwner) throw new Error('Forbidden');

    await FridgeItem.findByIdAndDelete(itemId);
    return { message: 'Fridge item deleted successfully' };
  },
};

export default fridgeItemService;
