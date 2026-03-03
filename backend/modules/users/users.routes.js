const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceTenant, checkFlatLimit } = require('../../middleware/tenant.middleware');
const { societyAdminOrAbove, subAdminOrAbove, allAuthenticated } = require('../../middleware/role.middleware');
const User = require('../../models/User.model');
const { getUsers, getUserById, createUser, updateUser, toggleUserStatus, deleteUser, getUserStats } = require('./users.controller');

router.use(authenticate, enforceTenant);

router.get('/stats', subAdminOrAbove, getUserStats);
router.get('/', subAdminOrAbove, getUsers);
router.get('/:id', subAdminOrAbove, getUserById);
router.post('/', societyAdminOrAbove, checkFlatLimit(User), createUser);
router.put('/:id', subAdminOrAbove, updateUser);
router.patch('/:id/toggle-status', societyAdminOrAbove, toggleUserStatus);
router.delete('/:id', societyAdminOrAbove, deleteUser);

module.exports = router;
