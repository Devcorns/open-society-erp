const service = require('./inventory.service');
const { sendResponse, catchAsync } = require('../../utils/helpers');
const { HTTP_STATUS } = require('../../config/constants');

const create = catchAsync(async (req, res) => {
  const data = await service.create(req.tenantId, req.body);
  sendResponse(res, HTTP_STATUS.CREATED, true, 'Inventory item created.', data);
});

const getAll = catchAsync(async (req, res) => {
  const { items, meta } = await service.getAll(req.tenantId, req.query);
  sendResponse(res, HTTP_STATUS.OK, true, 'Inventory retrieved.', items, meta);
});

const getById = catchAsync(async (req, res) => {
  const data = await service.getById(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Item retrieved.', data);
});

const update = catchAsync(async (req, res) => {
  const data = await service.update(req.tenantId, req.params.id, req.body);
  sendResponse(res, HTTP_STATUS.OK, true, 'Item updated.', data);
});

const addTransaction = catchAsync(async (req, res) => {
  const data = await service.addTransaction(req.tenantId, req.params.id, req.body, req.user._id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Transaction recorded.', data);
});

const remove = catchAsync(async (req, res) => {
  await service.remove(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Item deleted.');
});

module.exports = { create, getAll, getById, update, addTransaction, remove };
