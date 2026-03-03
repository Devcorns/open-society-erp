const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceTenant } = require('../../middleware/tenant.middleware');
const { subAdminOrAbove, allAuthenticated } = require('../../middleware/role.middleware');
const { create, getAll, getById, updateStatus, addComment, remove } = require('./complaints.controller');

router.use(authenticate, enforceTenant);

router.get('/', allAuthenticated, getAll);
router.get('/:id', allAuthenticated, getById);
router.post('/', allAuthenticated, create);
router.patch('/:id/status', subAdminOrAbove, updateStatus);
router.post('/:id/comments', allAuthenticated, addComment);
router.delete('/:id', subAdminOrAbove, remove);

module.exports = router;
