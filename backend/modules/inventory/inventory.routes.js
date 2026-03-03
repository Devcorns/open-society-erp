const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceTenant } = require('../../middleware/tenant.middleware');
const { subAdminOrAbove } = require('../../middleware/role.middleware');
const { create, getAll, getById, update, addTransaction, remove } = require('./inventory.controller');

router.use(authenticate, enforceTenant, subAdminOrAbove);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.post('/:id/transactions', addTransaction);
router.delete('/:id', remove);

module.exports = router;
