const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, getProfile, changePassword } = require('./auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../../utils/validators');

// POST /api/v1/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase and number'),
    body('phone').optional().isMobilePhone('en-IN').withMessage('Valid Indian phone number required'),
    body('tenantId').optional().isMongoId().withMessage('Invalid society ID'),
  ],
  validateRequest,
  register
);

// POST /api/v1/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  login
);

// POST /api/v1/auth/refresh
router.post('/refresh', refresh);

// POST /api/v1/auth/logout
router.post('/logout', authenticate, logout);

// GET /api/v1/auth/profile
router.get('/profile', authenticate, getProfile);

// PATCH /api/v1/auth/change-password
router.patch(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase and number'),
  ],
  validateRequest,
  changePassword
);

module.exports = router;
