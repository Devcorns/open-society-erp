const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceTenant } = require('../../middleware/tenant.middleware');
const { subAdminOrAbove, allAuthenticated } = require('../../middleware/role.middleware');
const { create, bulkCreate, getAll, getById, recordPayment, remove, getSummary } = require('./maintenance.controller');

router.use(authenticate, enforceTenant);

router.get('/summary', subAdminOrAbove, getSummary);
router.get('/', allAuthenticated, getAll);
router.get('/:id', allAuthenticated, getById);
router.post('/', subAdminOrAbove, create);
router.post('/bulk', subAdminOrAbove, bulkCreate);
router.patch('/:id/pay', subAdminOrAbove, recordPayment);
router.delete('/:id', subAdminOrAbove, remove);

module.exports = router;
