const usersService = require('./users.service');
const { sendResponse, catchAsync } = require('../../utils/helpers');
const { HTTP_STATUS } = require('../../config/constants');

const getUsers = catchAsync(async (req, res) => {
  const { users, meta } = await usersService.getUsers(req.tenantId, req.query);
  sendResponse(res, HTTP_STATUS.OK, true, 'Users retrieved.', users, meta);
});

const getUserById = catchAsync(async (req, res) => {
  const user = await usersService.getUserById(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'User retrieved.', user);
});

const createUser = catchAsync(async (req, res) => {
  const user = await usersService.createUser(req.tenantId, req.body);
  sendResponse(res, HTTP_STATUS.CREATED, true, 'User created.', user);
});

const updateUser = catchAsync(async (req, res) => {
  const user = await usersService.updateUser(req.tenantId, req.params.id, req.body);
  sendResponse(res, HTTP_STATUS.OK, true, 'User updated.', user);
});

const toggleUserStatus = catchAsync(async (req, res) => {
  const result = await usersService.toggleUserStatus(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, `User ${result.isActive ? 'activated' : 'deactivated'}.`, result);
});

const deleteUser = catchAsync(async (req, res) => {
  await usersService.deleteUser(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'User deleted.');
});

const getUserStats = catchAsync(async (req, res) => {
  const stats = await usersService.getUserStats(req.tenantId);
  sendResponse(res, HTTP_STATUS.OK, true, 'User stats retrieved.', stats);
});

module.exports = { getUsers, getUserById, createUser, updateUser, toggleUserStatus, deleteUser, getUserStats };
