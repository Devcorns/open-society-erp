const authService = require('./auth.service');
const { sendResponse, catchAsync } = require('../../utils/helpers');
const { HTTP_STATUS } = require('../../config/constants');

const register = catchAsync(async (req, res) => {
  const { name, email, password, phone, role, tenantId, flatNumber, block } = req.body;
  const { user } = await authService.register({ name, email, password, phone, role, tenantId, flatNumber, block });
  sendResponse(res, HTTP_STATUS.CREATED, true, 'Registration successful.', {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const userAgent = req.headers['user-agent'];
  const ip = req.ip || req.connection.remoteAddress;

  const { accessToken, refreshToken, user } = await authService.login({ email, password, userAgent, ip });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendResponse(res, HTTP_STATUS.OK, true, 'Login successful.', { accessToken, refreshToken, user });
});

const refresh = catchAsync(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  const tokens = await authService.refreshTokens(refreshToken);
  sendResponse(res, HTTP_STATUS.OK, true, 'Tokens refreshed successfully.', tokens);
});

const logout = catchAsync(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  await authService.logout(req.user._id, refreshToken);
  res.clearCookie('refreshToken');
  sendResponse(res, HTTP_STATUS.OK, true, 'Logged out successfully.');
});

const getProfile = catchAsync(async (req, res) => {
  const user = await authService.getProfile(req.user._id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Profile retrieved.', user);
});

const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user._id, currentPassword, newPassword);
  sendResponse(res, HTTP_STATUS.OK, true, 'Password changed successfully.');
});

module.exports = { register, login, refresh, logout, getProfile, changePassword };
