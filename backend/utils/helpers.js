const { PAGINATION } = require('../config/constants');

/**
 * Send standardized API response
 */
const sendResponse = (res, statusCode, success, message, data = null, meta = null) => {
  const response = { success, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

/**
 * Parse pagination params from query
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build pagination meta info
 */
const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1,
});

/**
 * Build search/filter query
 */
const buildSearchQuery = (search, fields) => {
  if (!search || !fields.length) return {};
  const regex = new RegExp(search, 'i');
  return { $or: fields.map((field) => ({ [field]: regex })) };
};

/**
 * Create AppError class
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error handler wrapper
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Add days to date
 */
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Check if date is past
 */
const isPastDate = (date) => new Date(date) < new Date();

/**
 * Generate random 6-digit OTP
 */
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

module.exports = {
  sendResponse,
  getPagination,
  buildPaginationMeta,
  buildSearchQuery,
  AppError,
  catchAsync,
  addDays,
  isPastDate,
  generateOTP,
};
