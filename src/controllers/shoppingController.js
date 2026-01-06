import shoppingService from '../services/shoppingService.js';

const shoppingController = {
  createShoppingList: async (req, res) => {
    try {
      const userId = req.user.id;
      const { groupId, ...rest } = req.body;

      const finalGroupId =
        !groupId || groupId === 'null' || groupId === 'undefined' ? null : groupId;

      if (finalGroupId && req.group) {
        const isMember = req.group.members.some((id) => id.toString() === userId);
        const isOwner = req.group.ownerId.toString() === userId;
        if (!isMember && !isOwner) {
          return res.status(403).json({ message: 'You are not a member of this group' });
        }
      }

      const newShoppingList = await shoppingService.createShoppingList(userId, {
        ...rest,
        groupId: finalGroupId,
      });
      res.status(201).json(newShoppingList);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  },

  getShoppingLists: async (req, res) => {
    try {
      const userId = req.user.id;
      // Sử dụng groupId từ middleware (group chính của user)
      const groupId = req.user.groupId || null;

      const lists = await shoppingService.getShoppingLists(groupId, userId);
      res.status(200).json(lists);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getShoppingListById: async (req, res) => {
    try {
      const list = await shoppingService.getShoppingListById(req.shoppingList._id);
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  checkoutShoppingList: async (req, res) => {
    try {
      const { items } = req.body;
      const list = await shoppingService.checkoutShoppingList(req.shoppingList._id, items);
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateShoppingList: async (req, res) => {
    try {
      const { title, description, status } = req.body;
      const list = await shoppingService.updateShoppingList(req.shoppingList._id, {
        title,
        description,
        status,
      });
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  deleteShoppingList: async (req, res) => {
    try {
      await shoppingService.deleteShoppingList(req.shoppingList._id);
      res.status(200).json({ message: 'Shopping list deleted' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  addItem: async (req, res) => {
    try {
      const list = await shoppingService.addItem(req.shoppingList._id, req.body);
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateItem: async (req, res) => {
    try {
      const { itemId } = req.params;
      const list = await shoppingService.updateItem(req.shoppingList._id, itemId, req.body);
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
      const { itemId } = req.params;
      const list = await shoppingService.removeItem(req.shoppingList._id, itemId);
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

export default shoppingController;
