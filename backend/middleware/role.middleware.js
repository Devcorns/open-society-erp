const { AppError } = require('../utils/helpers');
const { ROLES } = require('../config/constants');

/**
 * Restrict access to specific roles
 * Usage: authorize(ROLES.SOCIETY_ADMIN, ROLES.SUB_ADMIN)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Allow platform-level admins only
 */
const platformAdminOnly = authorize(ROLES.PLATFORM_OWNER, ROLES.SUPER_ADMIN);

/**
 * Allow society-level admins and above
 */
const societyAdminOrAbove = authorize(
  ROLES.PLATFORM_OWNER,
  ROLES.SUPER_ADMIN,
  ROLES.SOCIETY_ADMIN
);

/**
 * Allow sub-admin and above
 */
const subAdminOrAbove = authorize(
  ROLES.PLATFORM_OWNER,
  ROLES.SUPER_ADMIN,
  ROLES.SOCIETY_ADMIN,
  ROLES.SUB_ADMIN
);

/**
 * Allow all authenticated users
 */
const allAuthenticated = authorize(
  ROLES.PLATFORM_OWNER,
  ROLES.SUPER_ADMIN,
  ROLES.SOCIETY_ADMIN,
  ROLES.SUB_ADMIN,
  ROLES.USER
);

/**
 * Allow user to access only their own resource OR admins
 */
const ownerOrAdmin = (getUserIdFromReq) => (req, res, next) => {
  const { role, _id } = req.user;
  const admins = [ROLES.PLATFORM_OWNER, ROLES.SUPER_ADMIN, ROLES.SOCIETY_ADMIN, ROLES.SUB_ADMIN];

  if (admins.includes(role)) return next();

  const resourceUserId = getUserIdFromReq(req);
  if (_id.toString() === resourceUserId?.toString()) return next();

  return next(new AppError('You are not authorized to access this resource.', 403));
};

module.exports = {
  authorize,
  platformAdminOnly,
  societyAdminOrAbove,
  subAdminOrAbove,
  allAuthenticated,
  ownerOrAdmin,
};
