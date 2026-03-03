const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceTenant } = require('../../middleware/tenant.middleware');
const { subAdminOrAbove, allAuthenticated } = require('../../middleware/role.middleware');
const { create, getAll, getById, approve, checkIn, checkOut, remove } = require('./visitors.controller');

router.use(authenticate, enforceTenant);

router.get('/', allAuthenticated, getAll);
router.get('/:id', allAuthenticated, getById);
router.post('/', allAuthenticated, create);
router.patch('/:id/approve', subAdminOrAbove, approve);
router.patch('/:id/checkin', subAdminOrAbove, checkIn);
router.patch('/:id/checkout', subAdminOrAbove, checkOut);
router.delete('/:id', subAdminOrAbove, remove);

module.exports = router;
