const User = require('../../models/User.model');
const Maintenance = require('../../models/Maintenance.model');
const Complaint = require('../../models/Complaint.model');
const Visitor = require('../../models/Visitor.model');
const Inventory = require('../../models/Inventory.model');
const Parking = require('../../models/Parking.model');
const Tenant = require('../../models/Tenant.model');
const PaymentHistory = require('../../models/PaymentHistory.model');

const getDashboardStats = async (tenantId) => {
  const [
    totalResidents,
    activeResidents,
    totalComplaints,
    openComplaints,
    pendingMaintenance,
    paidMaintenance,
    overdueMaintenance,
    todayVisitors,
    lowStockItems,
    availableParking,
    occupiedParking,
  ] = await Promise.all([
    User.countDocuments({ tenantId, role: 'USER', deletedAt: null }),
    User.countDocuments({ tenantId, role: 'USER', isActive: true, deletedAt: null }),
    Complaint.countDocuments({ tenantId, deletedAt: null }),
    Complaint.countDocuments({ tenantId, status: { $in: ['open', 'in_progress'] }, deletedAt: null }),
    Maintenance.countDocuments({ tenantId, status: 'pending', deletedAt: null }),
    Maintenance.countDocuments({ tenantId, status: 'paid', deletedAt: null }),
    Maintenance.countDocuments({ tenantId, status: 'overdue', deletedAt: null }),
    Visitor.countDocuments({
      tenantId,
      expectedDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
      deletedAt: null,
    }),
    Inventory.countDocuments({ tenantId, deletedAt: null }).then(async () => {
      const items = await Inventory.find({ tenantId, deletedAt: null });
      return items.filter((i) => i.quantity <= i.minimumStock).length;
    }),
    Parking.countDocuments({ tenantId, status: 'available', deletedAt: null }),
    Parking.countDocuments({ tenantId, status: 'occupied', deletedAt: null }),
  ]);

  return {
    residents: { total: totalResidents, active: activeResidents },
    complaints: { total: totalComplaints, open: openComplaints },
    maintenance: { pending: pendingMaintenance, paid: paidMaintenance, overdue: overdueMaintenance },
    visitors: { today: todayVisitors },
    inventory: { lowStock: lowStockItems },
    parking: { available: availableParking, occupied: occupiedParking },
  };
};

const getMaintenanceAnalytics = async (tenantId, year) => {
  const currentYear = parseInt(year) || new Date().getFullYear();

  const monthlyData = await Maintenance.aggregate([
    { $match: { tenantId, year: currentYear, deletedAt: null } },
    {
      $group: {
        _id: { month: '$month', status: '$status' },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.month': 1 } },
  ]);

  const collectionRate = await Maintenance.aggregate([
    { $match: { tenantId, year: currentYear, deletedAt: null } },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  return { monthlyData, collectionRate };
};

const getComplaintAnalytics = async (tenantId) => {
  const [byCategory, byStatus, byPriority, avgResolutionTime] = await Promise.all([
    Complaint.aggregate([
      { $match: { tenantId, deletedAt: null } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Complaint.aggregate([
      { $match: { tenantId, deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: { tenantId, deletedAt: null } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: { tenantId, status: 'resolved', resolvedAt: { $ne: null }, deletedAt: null } },
      {
        $project: {
          resolutionTimeHours: {
            $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000],
          },
        },
      },
      { $group: { _id: null, avgHours: { $avg: '$resolutionTimeHours' } } },
    ]),
  ]);

  return { byCategory, byStatus, byPriority, avgResolutionHours: avgResolutionTime[0]?.avgHours || 0 };
};

const getVisitorAnalytics = async (tenantId) => {
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const [byPurpose, dailyTrend, byStatus] = await Promise.all([
    Visitor.aggregate([
      { $match: { tenantId, deletedAt: null } },
      { $group: { _id: '$purpose', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Visitor.aggregate([
      { $match: { tenantId, createdAt: { $gte: last30Days }, deletedAt: null } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$expectedDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Visitor.aggregate([
      { $match: { tenantId, deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  return { byPurpose, dailyTrend, byStatus };
};

const getPlatformAnalytics = async () => {
  const [tenantStats, revenueStats, activeSubscriptions] = await Promise.all([
    Tenant.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 },
          blocked: { $sum: { $cond: ['$isBlocked', 1, 0] } },
        },
      },
    ]),
    PaymentHistory.aggregate([
      { $match: { status: 'succeeded', type: 'subscription' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 12 },
    ]),
    Tenant.countDocuments({ 'subscription.status': 'active', deletedAt: null }),
  ]);

  return { tenantStats, revenueStats, activeSubscriptions };
};

module.exports = { getDashboardStats, getMaintenanceAnalytics, getComplaintAnalytics, getVisitorAnalytics, getPlatformAnalytics };
