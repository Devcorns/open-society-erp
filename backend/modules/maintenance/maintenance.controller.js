const maintenanceService = require('./maintenance.service');
const { sendResponse, catchAsync } = require('../../utils/helpers');
const { HTTP_STATUS } = require('../../config/constants');

const create = catchAsync(async (req, res) => {
  const bill = await maintenanceService.createMaintenanceBill(req.tenantId, req.body);
  sendResponse(res, HTTP_STATUS.CREATED, true, 'Maintenance bill created.', bill);
});

const bulkCreate = catchAsync(async (req, res) => {
  const result = await maintenanceService.bulkCreateMaintenanceBills(req.tenantId, req.body);
  sendResponse(res, HTTP_STATUS.CREATED, true, `Bulk bills created. ${result.created} created, ${result.errors.length} errors.`, result);
});

const getAll = catchAsync(async (req, res) => {
  const { bills, meta } = await maintenanceService.getMaintenance(req.tenantId, req.query);
  sendResponse(res, HTTP_STATUS.OK, true, 'Maintenance bills retrieved.', bills, meta);
});

const getById = catchAsync(async (req, res) => {
  const bill = await maintenanceService.getMaintenanceById(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Bill retrieved.', bill);
});

const recordPayment = catchAsync(async (req, res) => {
  const bill = await maintenanceService.recordPayment(req.tenantId, req.params.id, req.body);
  sendResponse(res, HTTP_STATUS.OK, true, 'Payment recorded.', bill);
});

const remove = catchAsync(async (req, res) => {
  await maintenanceService.deleteBill(req.tenantId, req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Bill deleted.');
});

const getSummary = catchAsync(async (req, res) => {
  const data = await maintenanceService.getMaintenanceSummary(req.tenantId, req.query.year);
  sendResponse(res, HTTP_STATUS.OK, true, 'Maintenance summary retrieved.', data);
});

module.exports = { create, bulkCreate, getAll, getById, recordPayment, remove, getSummary };
