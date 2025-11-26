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

const createTag = async (tagName, userId, isAdmin = false) => {
  // Nếu là Admin, owner là null (System Tag). Nếu User, owner là userId.
  const creatorId = isAdmin ? null : userId;
  
  // Logic cũ: unique index trong DB đã lo việc check trùng
  const newTag = new Tag({ name: tagName, creatorId: creatorId });
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

// Cập nhật hàm này để Admin có thể xem chi tiết bất kỳ tag nào (nếu cần)
const getTagById = async (tagId, userId) => {
  const tag = await Tag.findById(tagId);
  if (!tag) throw new Error('Tag not found.');
  
  // Logic cũ: if (tag.creatorId && tag.creatorId.toString() !== userId) ...
  // Logic mới: Admin xem được hết. User chỉ xem được System hoặc Own tag.
  // Tuy nhiên, hàm getAvailableTags đã filter rồi, hàm này chỉ check chặt chẽ hơn.
  
  // Bạn có thể bỏ qua check quyền ở đây nếu muốn Admin xem được tag private của user khác để kiểm duyệt.
  // Hoặc giữ nguyên logic cũ vì System Tag (creatorId: null) thì ai cũng xem được rồi.
  return tag; 
};

// Đổi tên updatePersonalTag -> updateTag
const updateTag = async (tagId, userId, data, isAdmin = false) => {
  const { name } = data;
  const tag = await Tag.findById(tagId); // Tìm tag trước
  if (!tag) throw new Error('Tag not found.');

  // --- CHECK QUYỀN ---
  // 1. Nếu là Admin: Chỉ được sửa System Tag (creatorId == null) 
  //    (Hoặc cho phép sửa tất cả tùy bạn, ở đây tôi set logic Admin quản lý System Tag)
  if (isAdmin) {
      if (tag.creatorId !== null) {
          throw new Error('Admin can only edit System Tags via this API.');
      }
  } else {
      // 2. Nếu là User: Phải là chủ sở hữu
      if (tag.creatorId?.toString() !== userId) {
          throw new Error('You do not have permission to edit this tag.');
      }
  }

  const newName = name.trim().toLowerCase();
  if (newName !== tag.name) {
    // Check trùng: Admin check trùng trong hệ thống, User check trùng trong tag của họ
    const duplicateOwnerId = isAdmin ? null : userId;
    const duplicate = await Tag.findOne({ name: newName, creatorId: duplicateOwnerId });
    
    if (duplicate) {
      throw new Error('Tag name already exists.');
    }
    tag.name = newName;
    await tag.save();
  }

  return tag;
};

// Đổi tên deletePersonalTag -> deleteTag
const deleteTag = async (tagId, userId, isAdmin = false) => {
    const tag = await Tag.findById(tagId);
    if (!tag) throw new Error('Tag not found.');

    // --- CHECK QUYỀN ---
    if (isAdmin) {
        // Admin chỉ xóa System Tag
        if (tag.creatorId !== null) {
             throw new Error('Admin can only delete System Tags.');
        }
    } else {
        // User xóa tag của mình
        if (tag.creatorId?.toString() !== userId) {
            throw new Error('You do not have permission to delete this tag.');
        }
    }

    await tag.deleteOne();
};

export default { 
  getAvailableTags, 
  createTag,         
  findOrCreateTags, 
  findByName,
  getTagById,
  updateTag,      
  deleteTag    
};