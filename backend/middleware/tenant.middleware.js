const Tenant = require('../models/Tenant.model');
const { AppError, catchAsync } = require('../utils/helpers');
const { ROLES } = require('../config/constants');

/**
 * Enforce tenant isolation — must be called after authenticate
 * Sets req.tenantId from:
 *   1. req.user.tenantId (for SOCIETY_ADMIN, SUB_ADMIN, USER)
 *   2. X-Tenant-ID header (for SUPER_ADMIN/PLATFORM_OWNER querying specific tenant)
 */
const enforceTenant = catchAsync(async (req, res, next) => {
  const { role, tenantId: userTenantId } = req.user;

  // PLATFORM_OWNER & SUPER_ADMIN can see all tenants
  if (role === ROLES.PLATFORM_OWNER || role === ROLES.SUPER_ADMIN) {
    const headerTenantId = req.headers['x-tenant-id'];
    if (headerTenantId) {
      // Scoping request to specific tenant
      const tenant = await Tenant.findOne({ _id: headerTenantId, deletedAt: null });
      if (!tenant) return next(new AppError('Tenant not found.', 404));
      req.tenantId = tenant._id;
      req.tenant = tenant;
    } else {
      // No scoping — admin-level queries (pass null to get all data)
      req.tenantId = null;
      req.tenant = null;
    }
    return next();
  }

  // Everyone else must belong to a tenant
  if (!userTenantId) {
    return next(new AppError('No tenant associated with this account.', 403));
  }

  const tenant = await Tenant.findOne({ _id: userTenantId, deletedAt: null });
  if (!tenant) return next(new AppError('Society not found or has been removed.', 404));

  if (tenant.isBlocked) {
    return next(
      new AppError(
        `Your society account is blocked. Reason: ${tenant.blockedReason || 'Contact support.'}`,
        403
      )
    );
  }

  // Enforce subscription: check if society is allowed to operate
  const isSubscriptionActive = await checkSubscriptionAccess(tenant);
  if (!isSubscriptionActive) {
    return next(
      new AppError(
        'Subscription expired or inactive. Please renew to continue.',
        402
      )
    );
  }

  req.tenantId = tenant._id;
  req.tenant = tenant;
  next();
});

/**
 * Check if tenant subscription grants access (includes grace period)
 */
const checkSubscriptionAccess = async (tenant) => {
  const { status, gracePeriodEnd, currentPeriodEnd } = tenant.subscription;

  if (status === 'active' || status === 'trialing') return true;

  if (status === 'grace' && gracePeriodEnd && new Date() < new Date(gracePeriodEnd)) return true;

  // Soft check: if period end is in the future (webhook might be delayed)
  if (currentPeriodEnd && new Date() < new Date(currentPeriodEnd)) return true;

  return false;
};

/**
 * Check flat limit for plan — use before creating new residents
 */
const checkFlatLimit = (Model) =>
  catchAsync(async (req, res, next) => {
    if (!req.tenantId) return next();

    const tenant = req.tenant;
    const { flatLimit } = tenant.subscription;

    if (flatLimit === Infinity || flatLimit === -1) return next(); // Enterprise plan

    const count = await Model.countDocuments({ tenantId: req.tenantId, deletedAt: null });
    if (count >= flatLimit) {
      return next(
        new AppError(
          `Your ${tenant.subscription.plan} plan allows up to ${flatLimit} residents. Please upgrade your plan.`,
          403
        )
      );
    }

    next();
  });

module.exports = { enforceTenant, checkFlatLimit, checkSubscriptionAccess };
