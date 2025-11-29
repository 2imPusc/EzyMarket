import ShoppingList from '../model/shoppingRepository.js';
import MealPlan from '../model/mealPlanRepository.js';
import Recipe from '../model/recipeRepository.js';
import Ingredient from '../model/ingredientRepository.js';
import Unit from '../model/unitRepository.js';

const shoppingController = {
  createShoppingList: async (req, res) => {
    try {
      const { groupId, title, description, items = [], mealPlans = [] } = req.body;
      const userId = req.user.id;

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

      await newShoppingList.save();
      res.status(201).json(newShoppingList);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  },

  getShoppingLists: async (req, res) => {
    try {
      const { groupId } = req.params;
      const query = { groupId };

      const lists = await ShoppingList.find(query)
        .populate('creatorId', 'userName avatar')
        .sort({ createdAt: -1 });

      res.status(200).json(lists);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getShoppingListById: async (req, res) => {
    try {
      const { id } = req.params;
      const list = await ShoppingList.findById(id)
        .populate('creatorId', 'userName avatar')
        .populate('items.ingredientId', 'name imageURL');

      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateShoppingList: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, status } = req.body;

      const list = await ShoppingList.findByIdAndUpdate(
        id,
        { title, description, status },
        { new: true }
      );

      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  deleteShoppingList: async (req, res) => {
    try {
      const { id } = req.params;
      const list = await ShoppingList.findByIdAndDelete(id);
      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }
      res.status(200).json({ message: 'Shopping list deleted' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  addItem: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, quantity, unit, ingredientId } = req.body;

      const list = await ShoppingList.findById(id);
      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }

      list.items.push({ name, quantity, unit, ingredientId });
      await list.save();
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateItem: async (req, res) => {
    try {
      const { id, itemId } = req.params;
      const { name, quantity, unit, isPurchased } = req.body;

      const list = await ShoppingList.findById(id);
      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }

      const item = list.items.id(itemId);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      if (name !== undefined) item.name = name;
      if (quantity !== undefined) item.quantity = quantity;
      if (unit !== undefined) item.unit = unit;
      if (isPurchased !== undefined) item.isPurchased = isPurchased;

      await list.save();
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  removeItem: async (req, res) => {
    try {
      const { id, itemId } = req.params;
      const list = await ShoppingList.findById(id);
      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }

      list.items.pull(itemId);
      await list.save();
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

export default shoppingController;
