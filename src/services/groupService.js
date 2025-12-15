import Group from '../model/groupRepository.js';
import User from '../model/userRepository.js';

export const createGroup = async (name, description, ownerId) => {
  const owner = await User.findById(ownerId);
  if (!owner) return { status: 404, data: { message: 'Owner not found' } };

  if (owner.groupId) {
    return { status: 400, data: { message: 'Owner already belongs to a group' } };
  }

  const newGroup = new Group({
    name: name.trim(),
    description: description.trim(),
    ownerId,
    members: [ownerId],
  });

  await newGroup.save();

  // SET single groupId on owner
  owner.groupId = newGroup._id;
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
};

export const addMemberToGroup = async (groupId, userId, requesterId) => {
  const group = await Group.findById(groupId);
  if (!group) return { status: 404, data: { message: GROUP_ERRORS.GROUP_NOT_FOUND } };

  const user = await User.findById(userId);
  if (!user) return { status: 404, data: { message: 'User not found' } };

  // Kiểm tra user đã có group chưa (cách tốt hơn)
  if (user.groupId !== null && user.groupId !== undefined) {
    return { status: 400, data: { message: 'User already belongs to a group' } };
  }

  if (group.members.some((id) => id.toString() === userId)) {
    return { status: 400, data: { message: 'User is already a member' } };
  }

  group.members.push(userId);
  group.updatedAt = Date.now();
  await group.save();

  user.groupId = groupId;
  await user.save();

  return {
    status: 200,
    data: {
      message: 'Member added successfully',
      group: { id: group._id, name: group.name, members: group.members },
    },
  };
};

export const removeMemberFromGroup = async (groupId, userId, requesterId) => {
  const group = await Group.findById(groupId);
  if (!group) return { status: 404, data: { message: 'Group not found' } };

  if (userId === group.ownerId.toString()) {
    return { status: 400, data: { message: 'Cannot remove the owner from the group' } };
  }

  if (!group.members.some((id) => id.toString() === userId)) {
    return { status: 400, data: { message: 'User is not a member of the group' } };
  }

  group.members = group.members.filter((id) => id.toString() !== userId);
  group.updatedAt = Date.now();
  await group.save();

  const user = await User.findById(userId);
  if (user) {
    user.groupId = null;
    await user.save();
  }

  return {
    status: 200,
    data: {
      message: 'Member removed successfully',
      group: { id: group._id, name: group.name, members: group.members },
    },
  };
};

export const deleteGroup = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  if (!group) return { status: 404, data: { message: 'Group not found' } };

  await User.updateMany({ groupId: groupId }, { $set: { groupId: null } });
  await Group.findByIdAndDelete(groupId);

  return { status: 200, data: { message: 'Group deleted successfully' } };
};

export const getGroupDetails = async (groupId, userId) => {
  try {
    const group = await Group.findById(groupId)
      .populate('ownerId', 'userName email avatar')
      .populate('members', 'userName email avatar');

    if (!group) {
      return { status: 404, data: { message: 'Group not found' } };
    }

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
