const service = require('./complaints.service');
const { sendResponse, catchAsync } = require('../../utils/helpers');
const { HTTP_STATUS } = require('../../config/constants');

const create = catchAsync(async (req, res) => {
  const data = await service.create(req.tenantId, req.user._id, req.body);
  sendResponse(res, HTTP_STATUS.CREATED, true, 'Complaint raised.', data);
});

const getAll = catchAsync(async (req, res) => {
  const { complaints, meta } = await service.getAll(req.tenantId, req.user._id, req.user.role, req.query);
  sendResponse(res, HTTP_STATUS.OK, true, 'Complaints retrieved.', complaints, meta);
});

const getById = catchAsync(async (req, res) => {
  const data = await service.getById(req.tenantId, req.params.id, req.user._id, req.user.role);
  sendResponse(res, HTTP_STATUS.OK, true, 'Complaint retrieved.', data);
});

const updateStatus = catchAsync(async (req, res) => {
  const { status, assignedTo, resolution } = req.body;
  const data = await service.updateStatus(req.tenantId, req.params.id, status, assignedTo, resolution);
  sendResponse(res, HTTP_STATUS.OK, true, 'Complaint updated.', data);
});

const addComment = catchAsync(async (req, res) => {
  const data = await service.addComment(req.tenantId, req.params.id, req.user._id, req.body.comment);
  sendResponse(res, HTTP_STATUS.OK, true, 'Comment added.', data);
});

const remove = catchAsync(async (req, res) => {
  await service.remove(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Complaint deleted.');
});

module.exports = { create, getAll, getById, updateStatus, addComment, remove };
