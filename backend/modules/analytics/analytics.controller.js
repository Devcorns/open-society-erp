const service = require('./analytics.service');
const { sendResponse, catchAsync } = require('../../utils/helpers');
const { HTTP_STATUS } = require('../../config/constants');

const getDashboard = catchAsync(async (req, res) => {
  const data = await service.getDashboardStats(req.tenantId);
  sendResponse(res, HTTP_STATUS.OK, true, 'Dashboard stats retrieved.', data);
});

const getMaintenanceAnalytics = catchAsync(async (req, res) => {
  const data = await service.getMaintenanceAnalytics(req.tenantId, req.query.year);
  sendResponse(res, HTTP_STATUS.OK, true, 'Maintenance analytics retrieved.', data);
});

const getComplaintAnalytics = catchAsync(async (req, res) => {
  const data = await service.getComplaintAnalytics(req.tenantId);
  sendResponse(res, HTTP_STATUS.OK, true, 'Complaint analytics retrieved.', data);
});

const getVisitorAnalytics = catchAsync(async (req, res) => {
  const data = await service.getVisitorAnalytics(req.tenantId);
  sendResponse(res, HTTP_STATUS.OK, true, 'Visitor analytics retrieved.', data);
});

const getPlatformAnalytics = catchAsync(async (req, res) => {
  const data = await service.getPlatformAnalytics();
  sendResponse(res, HTTP_STATUS.OK, true, 'Platform analytics retrieved.', data);
});

module.exports = { getDashboard, getMaintenanceAnalytics, getComplaintAnalytics, getVisitorAnalytics, getPlatformAnalytics };
