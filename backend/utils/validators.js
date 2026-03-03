const { validationResult } = require('express-validator');
const { sendResponse } = require('./helpers');

/**
 * Middleware to check express-validator results
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponse(res, 400, false, 'Validation failed.', null, { errors: errors.array() });
  }
  next();
};

module.exports = { validateRequest };
