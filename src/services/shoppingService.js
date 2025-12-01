import ShoppingList from '../model/shoppingRepository.js';
import MealPlan from '../model/mealPlanRepository.js';
import Recipe from '../model/recipeRepository.js';
import Ingredient from '../model/ingredientRepository.js';
import Unit from '../model/unitRepository.js';
import fridgeService from './fridgeService.js';
import fridgeItemService from './fridgeItemService.js';

const shoppingService = {
  createShoppingList: async (
    userId,
    { groupId, title, description, items = [], mealPlans = [] }
  ) => {
    let finalItems = [...items];

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
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const plan = await MealPlan.findOne({
          userId,
          date: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        });

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

              let unitName = '';
              if (mealItem.unitId) {
                const u = await Unit.findById(mealItem.unitId);
                if (u) unitName = u.name;
              }

              const key = mealItem.ingredientId
                ? `${mealItem.ingredientId}_${mealItem.unitId}`
                : `${name}_${unitName}`;

              addToMap(key, {
                ingredientId: mealItem.ingredientId,
                name: name,
                quantity: mealItem.quantity,
                unit: unitName,
                isPurchased: false,
              });
            } else if (mealItem.itemType === 'recipe') {
              const recipe = await Recipe.findById(mealItem.recipeId);
              if (!recipe) continue;

              const servingsRatio = mealItem.quantity / (recipe.servings || 1);

              for (const rItem of recipe.ingredients) {
                const quantity = rItem.quantity * servingsRatio;

                const key = rItem.ingredientId
                  ? `${rItem.ingredientId}_${rItem.unitText}`
                  : `${rItem.name}_${rItem.unitText}`;

                addToMap(key, {
                  ingredientId: rItem.ingredientId,
                  name: rItem.name,
                  quantity: quantity,
                  unit: rItem.unitText,
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

    return await newShoppingList.save();
  },

  getShoppingLists: async (groupId) => {
    return await ShoppingList.find({ groupId })
      .populate('creatorId', 'userName avatar')
      .sort({ createdAt: -1 });
  },

  getShoppingListById: async (id) => {
    return await ShoppingList.findById(id)
      .populate('creatorId', 'userName avatar')
      .populate('items.ingredientId', 'name imageURL');
  },

  updateShoppingList: async (id, updateData) => {
    const list = await ShoppingList.findByIdAndUpdate(id, updateData, { new: true });

    if (list && list.status === 'completed' && updateData.status === 'completed') {
      try {
        let fridge = await fridgeService.getGroupFridge(list.groupId);

        // If no fridge exists for this group, create one
        if (!fridge) {
          fridge = await fridgeService.createFridge(list.creatorId, {
            name: `${list.title} Fridge`,
            groupId: list.groupId,
          });
        }

        // 2. Iterate through purchased items
        for (const item of list.items) {
          if (item.isPurchased) {
            let unitId = null;
            if (item.unit) {
              const unitObj = await Unit.findOne({
                $or: [{ name: item.unit }, { abbreviation: item.unit }],
              });
              if (unitObj) unitId = unitObj._id;
            }

            if (item.ingredientId && unitId) {
              await fridgeItemService.addFridgeItem(fridge._id, {
                foodId: item.ingredientId,
                unitId: unitId,
                quantity: item.quantity,
                purchaseDate: new Date(),
              });
            }
          }
        }
      } catch (error) {
        console.error('Error moving items to fridge:', error);
      }
    }

    return list;
  },

  deleteShoppingList: async (id) => {
    return await ShoppingList.findByIdAndDelete(id);
  },

  addItem: async (id, itemData) => {
    const list = await ShoppingList.findById(id);
    if (!list) return null;

    list.items.push(itemData);
    return await list.save();
  },

  updateItem: async (id, itemId, updateData) => {
    const list = await ShoppingList.findById(id);
    if (!list) return null;

    const item = list.items.id(itemId);
    if (!item) throw new Error('Item not found');

    if (updateData.name !== undefined) item.name = updateData.name;
    if (updateData.quantity !== undefined) item.quantity = updateData.quantity;
    if (updateData.unit !== undefined) item.unit = updateData.unit;
    if (updateData.isPurchased !== undefined) item.isPurchased = updateData.isPurchased;

    return await list.save();
  },

  removeItem: async (id, itemId) => {
    const list = await ShoppingList.findById(id);
    if (!list) return null;

    list.items.pull(itemId);
    return await list.save();
  },
};

export default shoppingService;
