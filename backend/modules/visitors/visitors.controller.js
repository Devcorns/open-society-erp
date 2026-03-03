const service = require('./visitors.service');
const { sendResponse, catchAsync } = require('../../utils/helpers');
const { HTTP_STATUS } = require('../../config/constants');

const create = catchAsync(async (req, res) => {
  const data = await service.create(req.tenantId, req.user._id, req.body);
  sendResponse(res, HTTP_STATUS.CREATED, true, 'Visitor pre-registered.', data);
});

const getAll = catchAsync(async (req, res) => {
  const { visitors, meta } = await service.getAll(req.tenantId, req.user._id, req.user.role, req.query);
  sendResponse(res, HTTP_STATUS.OK, true, 'Visitors retrieved.', visitors, meta);
});

const getById = catchAsync(async (req, res) => {
  const data = await service.getById(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Visitor retrieved.', data);
});

const approve = catchAsync(async (req, res) => {
  const data = await service.approve(req.tenantId, req.params.id, req.user._id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Visitor approved.', data);
});

const checkIn = catchAsync(async (req, res) => {
  const data = await service.checkIn(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Visitor checked in.', data);
});

const checkOut = catchAsync(async (req, res) => {
  const data = await service.checkOut(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Visitor checked out.', data);
});

const remove = catchAsync(async (req, res) => {
  await service.remove(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Visitor record deleted.');
});

module.exports = { create, getAll, getById, approve, checkIn, checkOut, remove };
