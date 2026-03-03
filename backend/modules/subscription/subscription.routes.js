const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceTenant } = require('../../middleware/tenant.middleware');
const { platformAdminOnly, societyAdminOrAbove } = require('../../middleware/role.middleware');
const {
  getMySubscription, createCheckout, cancelSubscription,
  getPaymentHistory, getAllSubscriptions, getPlatformRevenue,
} = require('./subscription.controller');

router.use(authenticate);

// Admin-level platform routes
router.get('/all', platformAdminOnly, getAllSubscriptions);
router.get('/revenue', platformAdminOnly, getPlatformRevenue);

// Tenant-scoped routes
router.get('/my', enforceTenant, getMySubscription);
router.post('/checkout', enforceTenant, societyAdminOrAbove, createCheckout);
router.post('/cancel', enforceTenant, societyAdminOrAbove, cancelSubscription);
router.get('/payments', enforceTenant, societyAdminOrAbove, getPaymentHistory);

module.exports = router;
