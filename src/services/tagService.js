import Tag from '../model/tagRepository.js';

/**
 * Lấy danh sách các tag mà người dùng được phép xem.
 * Bao gồm tag hệ thống (creatorId: null) và tag cá nhân của họ.
 * @param {string} userId - ID của người dùng đang đăng nhập.
 * @returns {Promise<Array>} - Danh sách các tag document.
 */
const getAvailableTags = async (userId) => {
  return Tag.find({ creatorId: { $in: [userId, null] } }).sort({ name: 1 });
};

/**
 * Tạo một tag cá nhân mới cho người dùng.
 * @param {string} tagName - Tên của tag.
 * @param {string} userId - ID của người dùng tạo tag.
 * @returns {Promise<Document>} - Tag document vừa được tạo.
 */
const createPersonalTag = async (tagName, userId) => {
  // Logic kiểm tra trùng lặp đã có ở unique index của model
  const newTag = new Tag({ name: tagName, creatorId: userId });
  await newTag.save();
  return newTag;
};

/**
 * Tìm các tag đã tồn tại (hệ thống hoặc cá nhân) hoặc tạo tag cá nhân mới nếu chưa có.
 * Trả về một mảng các ObjectId của tag.
 * Đây là hàm cốt lõi sẽ được recipeService sử dụng.
 * @param {Array<string>} tagNames - Mảng tên các tag.
 * @param {string} userId - ID của người dùng.
 * @returns {Promise<Array<ObjectId>>} - Mảng các ID của tag.
 */
const findOrCreateTags = async (tagNames = [], userId) => {
  const tagIds = [];
  const uniqueTagNames = [...new Set(tagNames.map(name => name.trim().toLowerCase()))];

  for (const name of uniqueTagNames) {
    // Ưu tiên tìm tag của hệ thống hoặc tag cá nhân đã có
    let tag = await Tag.findOne({ name, creatorId: { $in: [userId, null] } });

    // Nếu không tìm thấy, tạo tag mới với tư cách là tag cá nhân
    if (!tag) {
      tag = new Tag({ name, creatorId: userId });
      await tag.save();
    }
    tagIds.push(tag._id);
  }
  return tagIds;
};

/**
 * Tìm một tag document dựa trên tên của nó.
 * Ưu tiên tìm tag hệ thống trước, sau đó đến tag cá nhân.
 * @param {string} tagName - Tên tag cần tìm.
 * @param {string} [userId] - (Tùy chọn) ID người dùng để tìm tag cá nhân.
 * @returns {Promise<Document|null>} - Tag document hoặc null nếu không tìm thấy.
 */
const findByName = async (tagName, userId = null) => {
  const name = tagName.toLowerCase();

  // Ưu tiên tìm tag hệ thống
  let tag = await Tag.findOne({ name, creatorId: null });
  if (tag) return tag;

  // Nếu không có tag hệ thống, và có cung cấp userId, tìm tag cá nhân
  if (userId) {
    tag = await Tag.findOne({ name, creatorId: userId });
  }
  
  return tag;
};

/**
 * Lấy một tag cụ thể bằng ID, có kiểm tra quyền truy cập.
 * @param {string} tagId - ID của tag.
 * @param {string} userId - ID của người dùng.
 * @returns {Promise<Document>} - Tag document.
 */
const getTagById = async (tagId, userId) => {
  const tag = await Tag.findById(tagId);
  if (!tag) {
    throw new Error('Tag not found.');
  }
  // Cho phép truy cập nếu là tag hệ thống (creatorId is null) hoặc là tag của chính người dùng
  if (tag.creatorId && tag.creatorId.toString() !== userId) {
    throw new Error('Forbidden: You do not have permission to view this tag.');
  }
  return tag;
};

/**
 * Cập nhật tên của một tag cá nhân.
 * @param {string} tagId - ID của tag cần cập nhật.
 * @param {string} userId - ID của người dùng sở hữu.
 * @param {object} data - Dữ liệu mới (chứa name).
 * @returns {Promise<Document>} - Tag document sau khi cập nhật.
 */
const updatePersonalTag = async (tagId, userId, data) => {
  const { name } = data;
  
  // Tìm tag và đảm bảo nó thuộc sở hữu của người dùng
  const tag = await Tag.findOne({ _id: tagId, creatorId: userId });
  if (!tag) {
    throw new Error('Tag not found or you do not have permission to edit it.');
  }

  // Nếu tên mới khác tên cũ, kiểm tra xem tên mới có bị trùng không
  const newName = name.trim().toLowerCase();
  if (newName !== tag.name) {
    const duplicate = await Tag.findOne({ name: newName, creatorId: userId });
    if (duplicate) {
      throw new Error('You already have a tag with this name.');
    }
    tag.name = newName;
    await tag.save();
  }

  return tag;
};

/**
 * Xóa một tag cá nhân.
 * @param {string} tagId - ID của tag cần xóa.
 * @param {string} userId - ID của người dùng yêu cầu xóa.
 */
const deletePersonalTag = async (tagId, userId) => {
    const tag = await Tag.findOne({ _id: tagId, creatorId: userId });
    if (!tag) {
        throw new Error('Tag not found or you do not have permission to delete it.');
    }
    // TODO: Cân nhắc logic xóa tag này khỏi tất cả các công thức đang dùng nó
    await tag.deleteOne();
};


export default { 
  getAvailableTags, 
  createPersonalTag, 
  findOrCreateTags, 
  findByName,
  getTagById,
  updatePersonalTag, 
  deletePersonalTag 
};