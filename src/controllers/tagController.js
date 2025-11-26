import mongoose from 'mongoose';
import tagService from '../services/tagService.js';

const getAll = async (req, res) => {
  try {
    const tags = await tagService.getAvailableTags(req.user.id);
    res.status(200).json({ tags });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Tag name is required.' });

    const newTag = await tagService.createPersonalTag(name, req.user.id);
    res.status(201).json({ message: 'Personal tag created successfully.', tag: newTag });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You already have a tag with this name.' });
    }
    res.status(500).json({ message: error.message });
  }
};

const getByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { id: userId } = req.user;
    let tag;

    // Kiểm tra xem 'identifier' có phải là một ObjectId hợp lệ hay không
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      // Nếu đúng, coi nó là ID và tìm bằng ID
      tag = await tagService.getTagById(identifier, userId);
    } else {
      // Nếu không, coi nó là name và tìm bằng name
      tag = await tagService.findByName(identifier, userId);
    }

    // Nếu sau cả hai lần tìm vẫn không thấy, trả về 404
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found.' });
    }
    
    res.status(200).json(tag);
  } catch (error) {
    // Lỗi permission vẫn có thể xảy ra từ getTagById
    const status = error.message.startsWith('Forbidden') ? 403 : 500;
    res.status(status).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Tag name is required.' });

    const updatedTag = await tagService.updatePersonalTag(req.params.id, req.user.id, { name });
    res.status(200).json({ message: 'Tag updated successfully.', tag: updatedTag });
  } catch (error) {
    let status = 404;
    if (error.message.includes('already have a tag')) status = 409;
    res.status(status).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    await tagService.deletePersonalTag(req.params.id, req.user.id);
    res.status(200).json({ message: 'Tag deleted successfully.' });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export default { 
  getAll, 
  create,
  getById: getByIdentifier,
  update, 
  delete: remove 
};