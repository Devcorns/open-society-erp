const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceTenant } = require('../../middleware/tenant.middleware');
const { platformAdminOnly, subAdminOrAbove } = require('../../middleware/role.middleware');
const { getDashboard, getMaintenanceAnalytics, getComplaintAnalytics, getVisitorAnalytics, getPlatformAnalytics } = require('./analytics.controller');

router.use(authenticate);

// Platform-level analytics (no tenant scoping)
router.get('/platform', platformAdminOnly, getPlatformAnalytics);

// Tenant-scoped analytics
router.use(enforceTenant);
router.get('/dashboard', subAdminOrAbove, getDashboard);
router.get('/maintenance', subAdminOrAbove, getMaintenanceAnalytics);
router.get('/complaints', subAdminOrAbove, getComplaintAnalytics);
router.get('/visitors', subAdminOrAbove, getVisitorAnalytics);

module.exports = router;
