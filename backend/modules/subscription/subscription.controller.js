const subscriptionService = require('./subscription.service');
const { sendResponse, catchAsync } = require('../../utils/helpers');
const { HTTP_STATUS } = require('../../config/constants');

const getMySubscription = catchAsync(async (req, res) => {
  const data = await subscriptionService.getSubscription(req.tenantId);
  sendResponse(res, HTTP_STATUS.OK, true, 'Subscription retrieved.', data);
});

const createCheckout = catchAsync(async (req, res) => {
  const { plan, successUrl, cancelUrl } = req.body;
  const session = await subscriptionService.createCheckout(
    req.tenantId,
    plan,
    successUrl || `${process.env.FRONTEND_URL}/subscription/success`,
    cancelUrl || `${process.env.FRONTEND_URL}/subscription/cancel`
  );
  sendResponse(res, HTTP_STATUS.OK, true, 'Checkout session created.', { sessionId: session.id, url: session.url });
});

const cancelSubscription = catchAsync(async (req, res) => {
  await subscriptionService.cancelSub(req.tenantId);
  sendResponse(res, HTTP_STATUS.OK, true, 'Subscription will be canceled at period end.');
});

const getPaymentHistory = catchAsync(async (req, res) => {
  const { history, meta } = await subscriptionService.getPaymentHistory(req.tenantId, req.query);
  sendResponse(res, HTTP_STATUS.OK, true, 'Payment history retrieved.', history, meta);
});

const getAllSubscriptions = catchAsync(async (req, res) => {
  const { subscriptions, meta } = await subscriptionService.getAllSubscriptions(req.query);
  sendResponse(res, HTTP_STATUS.OK, true, 'Subscriptions retrieved.', subscriptions, meta);
});

const getPlatformRevenue = catchAsync(async (req, res) => {
  const data = await subscriptionService.getPlatformRevenue();
  sendResponse(res, HTTP_STATUS.OK, true, 'Revenue data retrieved.', data);
});

module.exports = { getMySubscription, createCheckout, cancelSubscription, getPaymentHistory, getAllSubscriptions, getPlatformRevenue };
