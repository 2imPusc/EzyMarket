import Group from '../model/groupReposiroty.js';
import User from '../model/userRepository.js';

export const createGroup = async (name, description, ownerId) => {
  try {
    const owner = await User.findById(ownerId);
    if (!owner) {
      return {
        status: 404,
        data: { message: 'Owner not found' },
      };
    }

    const newGroup = new Group({
      name: name.trim(),
      description: description.trim(),
      ownerId,
      members: [ownerId],
    });

    await newGroup.save();

    if (!owner.groupIds) {
      owner.groupIds = [];
    }
    owner.groupIds.push(newGroup._id);
    await owner.save();

    return {
      status: 201,
      data: {
        message: 'Group created successfully',
        group: {
          id: newGroup._id,
          name: newGroup.name,
          description: newGroup.description,
          ownerId: newGroup.ownerId,
          members: newGroup.members,
          createdAt: newGroup.createdAt,
        },
      },
    };
  } catch (err) {
    throw new Error(err.message);
  }
};

export const addMemberToGroup = async (groupId, userId, requesterId) => {
  try {
    const group = await Group.findById(groupId);

    const user = await User.findById(userId);
    if (!user) {
      return {
        status: 404,
        data: { message: 'User not found' },
      };
    }

    if (group.members.some((id) => id.toString() === userId)) {
      return {
        status: 400,
        data: { message: 'User is already a member' },
      };
    }

    // Thêm thành viên
    group.members.push(userId);
    group.updatedAt = Date.now();
    await group.save();

    // Thêm groupId vào user
    if (!user.groupIds) {
      user.groupIds = [];
    }
    if (!user.groupIds.some((id) => id.toString() === groupId)) {
      user.groupIds.push(groupId);
      await user.save();
    }

    return {
      status: 200,
      data: {
        message: 'Member added successfully',
        group: {
          id: group._id,
          name: group.name,
          members: group.members,
        },
      },
    };
  } catch (err) {
    throw new Error(err.message);
  }
};

export const removeMemberFromGroup = async (groupId, userId, requesterId) => {
  try {
    const group = await Group.findById(groupId);

    if (userId === group.ownerId.toString()) {
      return {
        status: 400,
        data: { message: 'Cannot remove group owner' },
      };
    }

    if (!group.members.some((id) => id.toString() === userId)) {
      return {
        status: 400,
        data: { message: 'User is not a member' },
      };
    }

    group.members = group.members.filter((id) => id.toString() !== userId);
    group.updatedAt = Date.now();
    await group.save();

    const user = await User.findById(userId);
    if (user && user.groupIds) {
      user.groupIds = user.groupIds.filter((id) => id.toString() !== groupId);
      await user.save();
    }

    return {
      status: 200,
      data: {
        message: 'Member removed successfully',
        group: {
          id: group._id,
          name: group.name,
          members: group.members,
        },
      },
    };
  } catch (err) {
    throw new Error(err.message);
  }
};

export const getGroupDetails = async (groupId, userId) => {
  try {
    const group = await Group.findById(groupId)
      .populate('ownerId', 'userName email avatar')
      .populate('members', 'userName email avatar');

    return {
      status: 200,
      data: {
        group: {
          id: group._id,
          name: group.name,
          description: group.description,
          owner: group.ownerId,
          members: group.members,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        },
      },
    };
  } catch (err) {
    throw new Error(err.message);
  }
};

export const getUserGroups = async (userId) => {
  try {
    const groups = await Group.find({ members: userId })
      .populate('ownerId', 'userName email avatar')
      .select('name description ownerId members createdAt');

    return {
      status: 200,
      data: {
        groups: groups.map((group) => ({
          id: group._id,
          name: group.name,
          description: group.description,
          owner: group.ownerId,
          memberCount: group.members.length,
          createdAt: group.createdAt,
        })),
      },
    };
  } catch (err) {
    throw new Error(err.message);
  }
};

export const deleteGroup = async (groupId, userId) => {
  try {
    await User.updateMany({ groupIds: groupId }, { $pull: { groupIds: groupId } });

    await Group.findByIdAndDelete(groupId);

    return {
      status: 200,
      data: { message: 'Group deleted successfully' },
    };
  } catch (err) {
    throw new Error(err.message);
  }
};
