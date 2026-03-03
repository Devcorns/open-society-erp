const User = require('../../models/User.model');
const { AppError, getPagination, buildPaginationMeta, buildSearchQuery } = require('../../utils/helpers');
const { ROLES } = require('../../config/constants');

const getUsers = async (tenantId, query) => {
  const { page, limit, skip } = getPagination(query);
  const { search, role, isActive, block, flatNumber } = query;

  const filter = { tenantId, deletedAt: null };
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (block) filter.block = block;
  if (flatNumber) filter.flatNumber = flatNumber;

  if (search) {
    const searchQ = buildSearchQuery(search, ['name', 'email', 'phone', 'flatNumber']);
    Object.assign(filter, searchQ);
  }

  const [users, total] = await Promise.all([
    User.find(filter).select('-password -refreshTokens').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { users, meta: buildPaginationMeta(total, page, limit) };
};

const getUserById = async (tenantId, userId) => {
  const user = await User.findOne({ _id: userId, tenantId, deletedAt: null }).select('-password -refreshTokens');
  if (!user) throw new AppError('User not found.', 404);
  return user;
};

const createUser = async (tenantId, data) => {
  const existingUser = await User.findOne({ email: data.email.toLowerCase() });
  if (existingUser) throw new AppError('Email already registered.', 409);

  const user = await User.create({ ...data, tenantId, email: data.email.toLowerCase() });
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshTokens;
  return userObj;
};

const updateUser = async (tenantId, userId, updates) => {
  const allowedFields = ['name', 'phone', 'flatNumber', 'block', 'profileImage', 'metadata'];
  const filtered = {};
  allowedFields.forEach((f) => { if (updates[f] !== undefined) filtered[f] = updates[f]; });

  const user = await User.findOneAndUpdate(
    { _id: userId, tenantId, deletedAt: null },
    { $set: filtered },
    { new: true, runValidators: true }
  ).select('-password -refreshTokens');

  if (!user) throw new AppError('User not found.', 404);
  return user;
};

const toggleUserStatus = async (tenantId, userId) => {
  const user = await User.findOne({ _id: userId, tenantId, deletedAt: null });
  if (!user) throw new AppError('User not found.', 404);
  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });
  return { isActive: user.isActive };
};

const deleteUser = async (tenantId, userId) => {
  const user = await User.findOne({ _id: userId, tenantId, deletedAt: null });
  if (!user) throw new AppError('User not found.', 404);
  await user.softDelete();
};

const getUserStats = async (tenantId) => {
  const stats = await User.aggregate([
    { $match: { tenantId, deletedAt: null } },
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);
  return stats;
};

module.exports = { getUsers, getUserById, createUser, updateUser, toggleUserStatus, deleteUser, getUserStats };
