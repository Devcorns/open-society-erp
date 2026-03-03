module.exports = {
  ROLES: {
    PLATFORM_OWNER: 'PLATFORM_OWNER',
    SUPER_ADMIN: 'SUPER_ADMIN',
    SOCIETY_ADMIN: 'SOCIETY_ADMIN',
    SUB_ADMIN: 'SUB_ADMIN',
    USER: 'USER',
  },

  SUBSCRIPTION_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PAST_DUE: 'past_due',
    CANCELED: 'canceled',
    TRIALING: 'trialing',
    GRACE: 'grace',
    BLOCKED: 'blocked',
  },

  PLAN_NAMES: {
    BASIC: 'BASIC',
    PRO: 'PRO',
    ENTERPRISE: 'ENTERPRISE',
  },

  COMPLAINT_STATUS: {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
  },

  MAINTENANCE_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    OVERDUE: 'overdue',
    WAIVED: 'waived',
  },

  VISITOR_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CHECKED_IN: 'checked_in',
    CHECKED_OUT: 'checked_out',
  },

  PARKING_TYPE: {
    TWO_WHEELER: 'two_wheeler',
    FOUR_WHEELER: 'four_wheeler',
    VISITOR: 'visitor',
  },

  PARKING_STATUS: {
    AVAILABLE: 'available',
    OCCUPIED: 'occupied',
    RESERVED: 'reserved',
    MAINTENANCE: 'maintenance',
  },

  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },

  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
  },
};
