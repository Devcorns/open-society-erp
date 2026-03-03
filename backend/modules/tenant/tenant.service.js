const Tenant = require('../../models/Tenant.model');
const User = require('../../models/User.model');
const { AppError, getPagination, buildPaginationMeta, buildSearchQuery } = require('../../utils/helpers');
const { ROLES, PLAN_NAMES } = require('../../config/constants');
const { PLANS } = require('../../config/stripe');

const createTenant = async (data, createdBy) => {
  const { name, contactEmail, contactPhone, address, totalFlats, totalBlocks, registrationNumber } = data;

  const existing = await Tenant.findOne({ contactEmail: contactEmail.toLowerCase() });
  if (existing) throw new AppError('A society with this email already exists.', 409);

  const tenant = await Tenant.create({
    name,
    contactEmail: contactEmail.toLowerCase(),
    contactPhone,
    address,
    totalFlats: totalFlats || 0,
    totalBlocks: totalBlocks || 1,
    registrationNumber,
    subscription: {
      plan: PLAN_NAMES.BASIC,
      status: 'inactive',
      flatLimit: PLANS.BASIC.flatLimit,
    },
  });

  return tenant;
};

const getAllTenants = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const { search, isActive, isBlocked, plan } = query;

  const filter = { deletedAt: null };
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (isBlocked !== undefined) filter.isBlocked = isBlocked === 'true';
  if (plan) filter['subscription.plan'] = plan;

  if (search) {
    const searchQuery = buildSearchQuery(search, ['name', 'contactEmail', 'slug']);
    Object.assign(filter, searchQuery);
  }

  const [tenants, total] = await Promise.all([
    Tenant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Tenant.countDocuments(filter),
  ]);

  return { tenants, meta: buildPaginationMeta(total, page, limit) };
};

const getTenantById = async (tenantId) => {
  const tenant = await Tenant.findOne({ _id: tenantId, deletedAt: null });
  if (!tenant) throw new AppError('Society not found.', 404);
  return tenant;
};

const updateTenant = async (tenantId, updates) => {
  const allowedUpdates = ['name', 'contactPhone', 'address', 'totalFlats', 'totalBlocks', 'logo', 'settings', 'registrationNumber'];
  const filteredUpdates = {};
  allowedUpdates.forEach((key) => {
    if (updates[key] !== undefined) filteredUpdates[key] = updates[key];
  });

  const tenant = await Tenant.findOneAndUpdate(
    { _id: tenantId, deletedAt: null },
    { $set: filteredUpdates },
    { new: true, runValidators: true }
  );
  if (!tenant) throw new AppError('Society not found.', 404);
  return tenant;
};

const blockTenant = async (tenantId, reason) => {
  const tenant = await Tenant.findOneAndUpdate(
    { _id: tenantId, deletedAt: null },
    { $set: { isBlocked: true, blockedReason: reason, blockedAt: new Date() } },
    { new: true }
  );
  if (!tenant) throw new AppError('Society not found.', 404);
  return tenant;
};

const unblockTenant = async (tenantId) => {
  const tenant = await Tenant.findOneAndUpdate(
    { _id: tenantId, deletedAt: null },
    { $set: { isBlocked: false, blockedReason: null, blockedAt: null } },
    { new: true }
  );
  if (!tenant) throw new AppError('Society not found.', 404);
  return tenant;
};

const deleteTenant = async (tenantId) => {
  const tenant = await Tenant.findOne({ _id: tenantId, deletedAt: null });
  if (!tenant) throw new AppError('Society not found.', 404);
  await tenant.softDelete();
};

const getTenantStats = async (tenantId) => {
  const User = require('../../models/User.model');
  const Maintenance = require('../../models/Maintenance.model');
  const Complaint = require('../../models/Complaint.model');

  const [totalResidents, pendingMaintenance, openComplaints] = await Promise.all([
    User.countDocuments({ tenantId, role: ROLES.USER, isActive: true, deletedAt: null }),
    Maintenance.countDocuments({ tenantId, status: { $in: ['pending', 'overdue'] }, deletedAt: null }),
    Complaint.countDocuments({ tenantId, status: { $in: ['open', 'in_progress'] }, deletedAt: null }),
  ]);

  return { totalResidents, pendingMaintenance, openComplaints };
};

module.exports = { createTenant, getAllTenants, getTenantById, updateTenant, blockTenant, unblockTenant, deleteTenant, getTenantStats };
