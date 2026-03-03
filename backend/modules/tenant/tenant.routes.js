const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceTenant } = require('../../middleware/tenant.middleware');
const { platformAdminOnly, societyAdminOrAbove } = require('../../middleware/role.middleware');
const {
  createTenant, getAllTenants, getTenantById, getMyTenant,
  updateTenant, blockTenant, unblockTenant, deleteTenant,
} = require('./tenant.controller');

// Platform admin routes (no tenant scoping)
router.use(authenticate);

// GET /api/v1/tenants/my — current user's society
router.get('/my', enforceTenant, getMyTenant);

// Admin only routes
router.post('/', platformAdminOnly, createTenant);
router.get('/', platformAdminOnly, getAllTenants);
router.get('/:id', platformAdminOnly, getTenantById);
router.put('/:id', societyAdminOrAbove, enforceTenant, updateTenant);
router.patch('/:id/block', platformAdminOnly, blockTenant);
router.patch('/:id/unblock', platformAdminOnly, unblockTenant);
router.delete('/:id', platformAdminOnly, deleteTenant);

module.exports = router;
