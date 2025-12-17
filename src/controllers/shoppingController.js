import shoppingService from '../services/shoppingService.js';

const shoppingController = {
  createShoppingList: async (req, res) => {
    try {
      const userId = req.user.id;
      const newShoppingList = await shoppingService.createShoppingList(userId, req.body);
      res.status(201).json(newShoppingList);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  },

  getShoppingLists: async (req, res) => {
    try {
      const { groupId } = req.params;
      const lists = await shoppingService.getShoppingLists(groupId);
      res.status(200).json(lists);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getShoppingListById: async (req, res) => {
    try {
      const { id } = req.params;
      const list = await shoppingService.getShoppingListById(id);
      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  checkoutShoppingList: async (req, res) => {
    try {
      const { id } = req.params;
      const { items } = req.body;
      const list = await shoppingService.checkoutShoppingList(id, items);

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
      const list = await shoppingService.updateShoppingList(id, { title, description, status });

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
      const list = await shoppingService.deleteShoppingList(id);
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
      const list = await shoppingService.addItem(id, req.body);

      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateItem: async (req, res) => {
    try {
      const { id, itemId } = req.params;
      const list = await shoppingService.updateItem(id, itemId, req.body);

      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }
      res.status(200).json(list);
    } catch (error) {
      if (error.message === 'Item not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  },

  removeItem: async (req, res) => {
    try {
      const { id, itemId } = req.params;
      const list = await shoppingService.removeItem(id, itemId);

      if (!list) {
        return res.status(404).json({ message: 'Shopping list not found' });
      }
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

export default shoppingController;
