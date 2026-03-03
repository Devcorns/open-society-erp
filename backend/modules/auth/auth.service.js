const jwt = require('jsonwebtoken');
const User = require('../../models/User.model');
const Tenant = require('../../models/Tenant.model');
const { AppError } = require('../../utils/helpers');

const generateAccessToken = (userId, role, tenantId) => {
  return jwt.sign(
    { userId, role, tenantId: tenantId?.toString() || null },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });
};

const register = async ({ name, email, password, phone, role, tenantId, flatNumber, block }) => {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new AppError('Email already registered.', 409);

  // Validate tenantId if provided
  if (tenantId) {
    const tenant = await Tenant.findOne({ _id: tenantId, isActive: true, deletedAt: null });
    if (!tenant) throw new AppError('Society not found.', 404);
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    phone,
    role: role || 'USER',
    tenantId: tenantId || null,
    flatNumber: flatNumber || null,
    block: block || null,
  });

  return { user };
};

const login = async ({ email, password, userAgent, ip }) => {
  const user = await User.findOne({
    email: email.toLowerCase(),
    isActive: true,
    deletedAt: null,
  }).select('+password +refreshTokens');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  const accessToken = generateAccessToken(user._id, user.role, user.tenantId);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token
  user.refreshTokens.push({ token: refreshToken, userAgent, ip });
  // Keep only last 5 refresh tokens
  if (user.refreshTokens.length > 5) {
    user.refreshTokens = user.refreshTokens.slice(-5);
  }
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshTokens;

  return { accessToken, refreshToken, user: userObj };
};

const refreshTokens = async (refreshToken) => {
  if (!refreshToken) throw new AppError('Refresh token required.', 401);

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401);
  }

  const user = await User.findOne({
    _id: decoded.userId,
    isActive: true,
    deletedAt: null,
  }).select('+refreshTokens');

  if (!user) throw new AppError('User not found.', 401);

  const tokenExists = user.refreshTokens.some((rt) => rt.token === refreshToken);
  if (!tokenExists) throw new AppError('Refresh token revoked or not found.', 401);

  const newAccessToken = generateAccessToken(user._id, user.role, user.tenantId);
  const newRefreshToken = generateRefreshToken(user._id);

  // Replace old refresh token
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
  user.refreshTokens.push({ token: newRefreshToken });
  await user.save({ validateBeforeSave: false });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const logout = async (userId, refreshToken) => {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;

  if (refreshToken) {
    user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
  } else {
    user.refreshTokens = []; // logout all devices
  }
  await user.save({ validateBeforeSave: false });
};

const getProfile = async (userId) => {
  const user = await User.findById(userId).populate('tenantId', 'name slug address subscription.plan');
  if (!user) throw new AppError('User not found.', 404);
  return user;
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new AppError('User not found.', 404);

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new AppError('Current password is incorrect.', 400);

  user.password = newPassword;
  await user.save();
};

module.exports = { register, login, refreshTokens, logout, getProfile, changePassword };
