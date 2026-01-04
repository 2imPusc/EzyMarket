import ShoppingList from '../model/shoppingRepository.js';
import MealPlan from '../model/mealPlanRepository.js';
import Recipe from '../model/recipeRepository.js';
import Ingredient from '../model/ingredientRepository.js';
import Unit from '../model/unitRepository.js';
import fridgeItemService from './fridgeItemService.js';

const shoppingService = {
  createShoppingList: async (
    userId,
    { groupId, title, description, items = [], mealPlans = [] }
  ) => {
    // Helper function để tìm Unit từ unitText (tên đơn vị)
    const findUnitByText = async (unitText) => {
      if (!unitText || !unitText.trim()) return null;
      const normalizedText = unitText.trim().toLowerCase();
      return await Unit.findOne({
        $or: [
          { name: normalizedText },
          { abbreviation: { $regex: new RegExp(`^${normalizedText}$`, 'i') } },
        ],
      });
    };

    // Helper function để normalize items: đảm bảo có cả unitId và unit
    const normalizeItem = async (item) => {
      const normalized = { ...item };

      // Nếu có unitId nhưng chưa có unit, lấy tên từ Unit
      if (normalized.unitId && !normalized.unit) {
        const u = await Unit.findById(normalized.unitId);
        if (u) normalized.unit = u.name;
      }
      // Nếu có unit (string) nhưng chưa có unitId, tìm unitId
      else if (normalized.unit && !normalized.unitId) {
        const foundUnit = await findUnitByText(normalized.unit);
        if (foundUnit) {
          normalized.unitId = foundUnit._id;
          normalized.unit = foundUnit.name; // Chuẩn hóa về tên trong DB
        }
      }

      return normalized;
    };

    // Normalize các items được truyền trực tiếp
    let finalItems = [];
    for (const item of items) {
      finalItems.push(await normalizeItem(item));
    }

    if (mealPlans && mealPlans.length > 0) {
      const ingredientMap = new Map();

      const addToMap = (key, item) => {
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key);
          existing.quantity += item.quantity;
        } else {
          ingredientMap.set(key, item);
        }
      };

      for (const planRequest of mealPlans) {
        const date = new Date(planRequest.date);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // ✅ SỬA: Query MealPlan theo groupId nếu có, nếu không thì theo userId
        const mealPlanQuery = groupId
          ? { groupId, date: { $gte: startOfDay, $lte: endOfDay } }
          : { userId, groupId: null, date: { $gte: startOfDay, $lte: endOfDay } };

        const plan = await MealPlan.findOne(mealPlanQuery);

        if (!plan) continue;

        const typesToProcess = planRequest.mealTypes || ['breakfast', 'lunch', 'dinner', 'snack'];

        for (const section of plan.meals) {
          if (!typesToProcess.includes(section.mealType)) continue;

          for (const mealItem of section.items) {
            if (mealItem.itemType === 'ingredient') {
              let name = 'Unknown Ingredient';
              if (mealItem.ingredientId) {
                const ing = await Ingredient.findById(mealItem.ingredientId);
                if (ing) name = ing.name;
              }

              let unitId = mealItem.unitId || null;
              let unitName = '';
              if (unitId) {
                const u = await Unit.findById(unitId);
                if (u) unitName = u.name;
              }

              const key = mealItem.ingredientId
                ? `${mealItem.ingredientId}_${unitId || 'no-unit'}`
                : `${name}_${unitName}`;

              addToMap(key, {
                ingredientId: mealItem.ingredientId || null,
                name: name,
                quantity: mealItem.quantity,
                unitId: unitId,
                unit: unitName,
                isPurchased: false,
              });
            } else if (mealItem.itemType === 'recipe') {
              const recipe = await Recipe.findById(mealItem.recipeId);
              if (!recipe) continue;

              const servingsRatio = mealItem.quantity / (recipe.servings || 1);

              for (const rItem of recipe.ingredients) {
                const quantity = rItem.quantity * servingsRatio;

                // Tìm unitId từ unitText hoặc dùng unitId có sẵn
                let unitId = rItem.unitId || null;
                let unitText = rItem.unitText || '';

                // Nếu không có unitId, thử tìm từ unitText
                if (!unitId && unitText) {
                  const foundUnit = await findUnitByText(unitText);
                  if (foundUnit) {
                    unitId = foundUnit._id;
                    unitText = foundUnit.name; // Chuẩn hóa về tên trong DB
                  }
                }

                const key = rItem.ingredientId
                  ? `${rItem.ingredientId}_${unitId || 'no-unit'}`
                  : `${rItem.name}_${unitText}`;

                addToMap(key, {
                  ingredientId: rItem.ingredientId || null,
                  name: rItem.name,
                  quantity: quantity,
                  unitId: unitId,
                  unit: unitText,
                  isPurchased: false,
                });
              }
            }
          }
        }
      }
      finalItems = [...finalItems, ...Array.from(ingredientMap.values())];
    }

    const newShoppingList = new ShoppingList({
      groupId,
      creatorId: userId,
      title,
      description,
      items: finalItems,
    });

    const savedList = await newShoppingList.save();

    // Populate để trả về đầy đủ thông tin
    return await ShoppingList.findById(savedList._id)
      .populate('creatorId', 'userName avatar')
      .populate('items.ingredientId', 'name imageURL')
      .populate('items.unitId', 'name abbreviation');
  },

  getShoppingLists: async (groupId, userId = null) => {
    // Nếu có groupId, lấy danh sách của group
    if (groupId) {
      return await ShoppingList.find({ groupId })
        .populate('creatorId', 'userName avatar')
        .sort({ createdAt: -1 });
    }

    // Nếu không có groupId, lấy danh sách cá nhân (theo creatorId)
    if (userId) {
      return await ShoppingList.find({
        creatorId: userId,
        groupId: null,
      })
        .populate('creatorId', 'userName avatar')
        .sort({ createdAt: -1 });
    }

    // Nếu không có cả hai, trả về mảng rỗng
    return [];
  },

  getShoppingListById: async (id) => {
    return await ShoppingList.findById(id)
      .populate('creatorId', 'userName avatar')
      .populate('items.ingredientId', 'name imageURL')
      .populate('items.unitId', 'name abbreviation');
  },

  checkoutShoppingList: async (id, checkoutItems) => {
    const list = await ShoppingList.findById(id);
    if (!list) return null;

    // Cập nhật thông tin và đánh dấu isPurchased = true cho các items trong checkoutItems
    for (const checkoutItem of checkoutItems) {
      const item = list.items.id(checkoutItem.itemId);
      if (item) {
        // Tự động đánh dấu isPurchased = true
        item.isPurchased = true;
        // Cập nhật thông tin mua hàng
        if (checkoutItem.price !== undefined) item.price = checkoutItem.price || 0;
        if (checkoutItem.servingQuantity !== undefined)
          item.servingQuantity = checkoutItem.servingQuantity || null;
        if (checkoutItem.expiryDate !== undefined)
          item.expiryDate = checkoutItem.expiryDate ? new Date(checkoutItem.expiryDate) : null;
      }
    }

    list.status = 'completed';
    await list.save();

    try {
      const ownerGroupId = list.groupId ?? null;
      const ownerUserId = ownerGroupId ? null : list.creatorId;

      // CHỈ chuyển những items đã checkout (có trong checkoutItems) vào tủ lạnh
      for (const checkoutItem of checkoutItems) {
        const item = list.items.id(checkoutItem.itemId);
        if (item && item.ingredientId && item.unitId) {
          const payload = {
            foodId: item.ingredientId,
            unitId: item.unitId,
            quantity: item.quantity,
            purchaseDate: new Date(),
            expiryDate: item.expiryDate || null,
            price: item.price || 0,
            groupId: ownerGroupId,
            userId: ownerUserId,
          };
          await fridgeItemService.addFridgeItem(payload);
        }
      }
    } catch (error) {
      console.error('Error moving items to fridge-items:', error);
      throw error;
    }

    // Populate để trả về đầy đủ thông tin
    return await ShoppingList.findById(id)
      .populate('creatorId', 'userName avatar')
      .populate('items.ingredientId', 'name imageURL')
      .populate('items.unitId', 'name abbreviation');
  },

  updateShoppingList: async (id, updateData) => {
    const list = await ShoppingList.findById(id);
    if (!list) return null;

    // Cập nhật thông tin cơ bản (title, description, status)
    Object.assign(list, updateData);
    await list.save();

    // Populate để trả về đầy đủ thông tin
    return await ShoppingList.findById(id)
      .populate('creatorId', 'userName avatar')
      .populate('items.ingredientId', 'name imageURL')
      .populate('items.unitId', 'name abbreviation');
  },

  deleteShoppingList: async (id) => {
    return await ShoppingList.findByIdAndDelete(id);
  },

  addItem: async (id, itemData) => {
    const list = await ShoppingList.findById(id);
    if (!list) return null;

    // Helper function để tìm Unit từ unitText (tên đơn vị)
    const findUnitByText = async (unitText) => {
      if (!unitText || !unitText.trim()) return null;
      const normalizedText = unitText.trim().toLowerCase();
      return await Unit.findOne({
        $or: [
          { name: normalizedText },
          { abbreviation: { $regex: new RegExp(`^${normalizedText}$`, 'i') } },
        ],
      });
    };

    // Normalize item trước khi thêm
    const normalized = { ...itemData };

    // Nếu có unitId nhưng chưa có unit, lấy tên từ Unit
    if (normalized.unitId && !normalized.unit) {
      const u = await Unit.findById(normalized.unitId);
      if (u) normalized.unit = u.name;
    }
    // Nếu có unit (string) nhưng chưa có unitId, tìm unitId
    else if (normalized.unit && !normalized.unitId) {
      const foundUnit = await findUnitByText(normalized.unit);
      if (foundUnit) {
        normalized.unitId = foundUnit._id;
        normalized.unit = foundUnit.name; // Chuẩn hóa về tên trong DB
      }
    }

    // Đảm bảo isPurchased mặc định là false
    if (normalized.isPurchased === undefined) {
      normalized.isPurchased = false;
    }

    list.items.push(normalized);
    await list.save();

    // Populate để trả về đầy đủ thông tin
    return await ShoppingList.findById(id)
      .populate('creatorId', 'userName avatar')
      .populate('items.ingredientId', 'name imageURL')
      .populate('items.unitId', 'name abbreviation');
  },

  updateItem: async (id, itemId, updateData) => {
    const list = await ShoppingList.findById(id);
    if (!list) return null;

    const item = list.items.id(itemId);
    if (!item) throw new Error('Item not found');

    if (updateData.name !== undefined) item.name = updateData.name;
    if (updateData.quantity !== undefined) item.quantity = updateData.quantity;
    if (updateData.isPurchased !== undefined) item.isPurchased = updateData.isPurchased;

    // Cập nhật unitId và unit một cách nhất quán
    if (updateData.unitId !== undefined) {
      item.unitId = updateData.unitId;
      // Nếu có unitId, tự động cập nhật unit name
      if (updateData.unitId) {
        const u = await Unit.findById(updateData.unitId);
        if (u) item.unit = u.name;
      } else {
        item.unit = updateData.unit || '';
      }
    } else if (updateData.unit !== undefined) {
      // Nếu chỉ cập nhật unit (string), thử tìm unitId tương ứng
      item.unit = updateData.unit;
      if (updateData.unit && updateData.unit.trim()) {
        const normalizedText = updateData.unit.trim().toLowerCase();
        const foundUnit = await Unit.findOne({
          $or: [
            { name: normalizedText },
            { abbreviation: { $regex: new RegExp(`^${normalizedText}$`, 'i') } },
          ],
        });
        if (foundUnit) {
          item.unitId = foundUnit._id;
          item.unit = foundUnit.name; // Chuẩn hóa về tên trong DB
        }
      }
    }

    await list.save();

    // Populate để trả về đầy đủ thông tin
    return await ShoppingList.findById(id)
      .populate('creatorId', 'userName avatar')
      .populate('items.ingredientId', 'name imageURL')
      .populate('items.unitId', 'name abbreviation');
  },

  removeItem: async (id, itemId) => {
    const list = await ShoppingList.findById(id);
    if (!list) return null;

    list.items.pull(itemId);
    await list.save();

    // Populate để trả về đầy đủ thông tin
    return await ShoppingList.findById(id)
      .populate('creatorId', 'userName avatar')
      .populate('items.ingredientId', 'name imageURL')
      .populate('items.unitId', 'name abbreviation');
  },
};

export default shoppingService;
