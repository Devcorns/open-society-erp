const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { AppError, catchAsync } = require('../utils/helpers');

/**
 * Protect routes – verify access token
 */
const authenticate = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Access token expired. Please refresh your token.', 401));
    }
    return next(new AppError('Invalid token. Please log in again.', 401));
  }

  const user = await User.findOne({
    _id: decoded.userId,
    isActive: true,
    deletedAt: null,
  }).select('+refreshTokens');

  if (!user) {
    return next(new AppError('User no longer exists or is inactive.', 401));
  }

  req.user = user;
  next();
});

module.exports = { authenticate };
