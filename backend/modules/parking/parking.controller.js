const service = require('./parking.service');
const { sendResponse, catchAsync } = require('../../utils/helpers');
const { HTTP_STATUS } = require('../../config/constants');

const create = catchAsync(async (req, res) => {
  const data = await service.create(req.tenantId, req.body);
  sendResponse(res, HTTP_STATUS.CREATED, true, 'Parking slot created.', data);
});

const getAll = catchAsync(async (req, res) => {
  const { slots, meta } = await service.getAll(req.tenantId, req.query);
  sendResponse(res, HTTP_STATUS.OK, true, 'Parking slots retrieved.', slots, meta);
});

const getById = catchAsync(async (req, res) => {
  const data = await service.getById(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Slot retrieved.', data);
});

const assignSlot = catchAsync(async (req, res) => {
  const { userId, vehicleNumber, vehicleModel } = req.body;
  const data = await service.assignSlot(req.tenantId, req.params.id, userId, vehicleNumber, vehicleModel);
  sendResponse(res, HTTP_STATUS.OK, true, 'Slot assigned.', data);
});

const releaseSlot = catchAsync(async (req, res) => {
  const data = await service.releaseSlot(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Slot released.', data);
});

const update = catchAsync(async (req, res) => {
  const data = await service.update(req.tenantId, req.params.id, req.body);
  sendResponse(res, HTTP_STATUS.OK, true, 'Slot updated.', data);
});

const remove = catchAsync(async (req, res) => {
  await service.remove(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Slot deleted.');
});

const getStats = catchAsync(async (req, res) => {
  const data = await service.getStats(req.tenantId);
  sendResponse(res, HTTP_STATUS.OK, true, 'Parking stats retrieved.', data);
});

module.exports = { create, getAll, getById, assignSlot, releaseSlot, update, remove, getStats };
