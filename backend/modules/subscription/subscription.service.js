const Subscription = require('../../models/Subscription.model');
const PaymentHistory = require('../../models/PaymentHistory.model');
const Tenant = require('../../models/Tenant.model');
const { createCheckoutSession, cancelSubscription } = require('../../services/stripe.service');
const { AppError, getPagination, buildPaginationMeta } = require('../../utils/helpers');
const { PLANS } = require('../../config/stripe');

const getSubscription = async (tenantId) => {
  const subscription = await Subscription.findOne({ tenantId }).sort({ createdAt: -1 });
  if (!subscription) throw new AppError('No subscription found.', 404);
  return subscription;
};

const createCheckout = async (tenantId, planName, successUrl, cancelUrl) => {
  const plan = PLANS[planName?.toUpperCase()];
  if (!plan) throw new AppError('Invalid plan. Choose BASIC, PRO, or ENTERPRISE.', 400);
  return createCheckoutSession(tenantId, planName.toUpperCase(), successUrl, cancelUrl);
};

const cancelSub = async (tenantId) => {
  return cancelSubscription(tenantId);
};

const getPaymentHistory = async (tenantId, query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = { tenantId };
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;

  const [history, total] = await Promise.all([
    PaymentHistory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    PaymentHistory.countDocuments(filter),
  ]);

  return { history, meta: buildPaginationMeta(total, page, limit) };
};

const getAllSubscriptions = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.plan) filter.plan = query.plan;

  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .populate('tenantId', 'name contactEmail slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Subscription.countDocuments(filter),
  ]);

  return { subscriptions, meta: buildPaginationMeta(total, page, limit) };
};

const getPlatformRevenue = async () => {
  const result = await PaymentHistory.aggregate([
    { $match: { status: 'succeeded', type: 'subscription' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
      },
    },
  ]);

  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  const mrr = await PaymentHistory.aggregate([
    {
      $match: {
        status: 'succeeded',
        type: 'subscription',
        createdAt: { $gte: currentMonthStart },
      },
    },
    { $group: { _id: null, mrr: { $sum: '$amount' } } },
  ]);

  const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
  const planDistribution = await Subscription.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$plan', count: { $sum: 1 } } },
  ]);

  return {
    totalRevenue: result[0]?.totalRevenue || 0,
    transactionCount: result[0]?.transactionCount || 0,
    mrr: mrr[0]?.mrr || 0,
    activeSubscriptions,
    planDistribution,
  };
};

module.exports = { getSubscription, createCheckout, cancelSub, getPaymentHistory, getAllSubscriptions, getPlatformRevenue };
