const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceTenant } = require('../../middleware/tenant.middleware');
const { subAdminOrAbove, societyAdminOrAbove } = require('../../middleware/role.middleware');
const { create, getAll, getById, assignSlot, releaseSlot, update, remove, getStats } = require('./parking.controller');

router.use(authenticate, enforceTenant);

router.get('/stats', subAdminOrAbove, getStats);
router.get('/', subAdminOrAbove, getAll);
router.get('/:id', subAdminOrAbove, getById);
router.post('/', societyAdminOrAbove, create);
router.patch('/:id/assign', subAdminOrAbove, assignSlot);
router.patch('/:id/release', subAdminOrAbove, releaseSlot);
router.put('/:id', subAdminOrAbove, update);
router.delete('/:id', societyAdminOrAbove, remove);

module.exports = router;
