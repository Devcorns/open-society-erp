const tenantService = require('./tenant.service');
const { sendResponse, catchAsync } = require('../../utils/helpers');
const { HTTP_STATUS } = require('../../config/constants');

const createTenant = catchAsync(async (req, res) => {
  const tenant = await tenantService.createTenant(req.body, req.user._id);
  sendResponse(res, HTTP_STATUS.CREATED, true, 'Society created successfully.', tenant);
});

const getAllTenants = catchAsync(async (req, res) => {
  const { tenants, meta } = await tenantService.getAllTenants(req.query);
  sendResponse(res, HTTP_STATUS.OK, true, 'Societies retrieved.', tenants, meta);
});

const getTenantById = catchAsync(async (req, res) => {
  const tenantId = req.params.id || req.tenantId;
  const tenant = await tenantService.getTenantById(tenantId);
  sendResponse(res, HTTP_STATUS.OK, true, 'Society retrieved.', tenant);
});

const getMyTenant = catchAsync(async (req, res) => {
  const tenant = await tenantService.getTenantById(req.tenantId);
  const stats = await tenantService.getTenantStats(req.tenantId);
  sendResponse(res, HTTP_STATUS.OK, true, 'Society retrieved.', { ...tenant.toObject(), stats });
});

const updateTenant = catchAsync(async (req, res) => {
  const tenantId = req.params.id || req.tenantId;
  const tenant = await tenantService.updateTenant(tenantId, req.body);
  sendResponse(res, HTTP_STATUS.OK, true, 'Society updated.', tenant);
});

const blockTenant = catchAsync(async (req, res) => {
  const tenant = await tenantService.blockTenant(req.params.id, req.body.reason);
  sendResponse(res, HTTP_STATUS.OK, true, 'Society blocked.', tenant);
});

const unblockTenant = catchAsync(async (req, res) => {
  const tenant = await tenantService.unblockTenant(req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Society unblocked.', tenant);
});

const deleteTenant = catchAsync(async (req, res) => {
  await tenantService.deleteTenant(req.params.id);
  sendResponse(res, HTTP_STATUS.OK, true, 'Society deleted.');
});

module.exports = { createTenant, getAllTenants, getTenantById, getMyTenant, updateTenant, blockTenant, unblockTenant, deleteTenant };
