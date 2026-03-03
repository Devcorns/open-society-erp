const { stripe, PLANS, GRACE_PERIOD_DAYS } = require('../config/stripe');
const Tenant = require('../models/Tenant.model');
const Subscription = require('../models/Subscription.model');
const PaymentHistory = require('../models/PaymentHistory.model');
const { addDays } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Create or retrieve Stripe customer for a tenant
 */
const getOrCreateStripeCustomer = async (tenant) => {
  if (!stripe) return null;
  if (tenant.subscription.stripeCustomerId) return tenant.subscription.stripeCustomerId;

  const customer = await stripe.customers.create({
    name: tenant.name,
    email: tenant.contactEmail,
    metadata: { tenantId: tenant._id.toString() },
  });

  await Tenant.findByIdAndUpdate(tenant._id, {
    'subscription.stripeCustomerId': customer.id,
  });

  return customer.id;
};

/**
 * Create a Stripe checkout session
 */
const createCheckoutSession = async (tenantId, planName, successUrl, cancelUrl) => {
  if (!stripe) throw new Error('Stripe is not configured.');

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new Error('Tenant not found.');

  const plan = PLANS[planName.toUpperCase()];
  if (!plan) throw new Error('Invalid plan.');

  const customerId = await getOrCreateStripeCustomer(tenant);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { tenantId: tenantId.toString(), plan: planName.toUpperCase() },
    subscription_data: {
      metadata: { tenantId: tenantId.toString(), plan: planName.toUpperCase() },
    },
  });

  return session;
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (tenantId) => {
  if (!stripe) throw new Error('Stripe is not configured.');

  const tenant = await Tenant.findById(tenantId);
  if (!tenant?.subscription?.stripeSubscriptionId) throw new Error('No active subscription found.');

  const subscription = await stripe.subscriptions.update(
    tenant.subscription.stripeSubscriptionId,
    { cancel_at_period_end: true }
  );

  await Subscription.findOneAndUpdate(
    { tenantId, stripeSubscriptionId: tenant.subscription.stripeSubscriptionId },
    { cancelAtPeriodEnd: true }
  );

  return subscription;
};

/**
 * Stripe Webhook Handler
 */
const stripeWebhookHandler = async (req, res) => {
  if (!stripe) {
    return res.status(200).json({ received: true });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error(`[STRIPE WEBHOOK] Signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  logger.info(`[STRIPE WEBHOOK] Event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        logger.info(`[STRIPE WEBHOOK] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    logger.error(`[STRIPE WEBHOOK] Handler error: ${err.message}`);
  }

  res.status(200).json({ received: true });
};

const handleCheckoutCompleted = async (session) => {
  const { tenantId, plan } = session.metadata;
  if (!tenantId) return;

  const planConfig = PLANS[plan] || PLANS.BASIC;
  const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);

  const periodStart = new Date(stripeSubscription.current_period_start * 1000);
  const periodEnd = new Date(stripeSubscription.current_period_end * 1000);

  await Tenant.findByIdAndUpdate(tenantId, {
    'subscription.plan': plan,
    'subscription.status': 'active',
    'subscription.stripeSubscriptionId': session.subscription,
    'subscription.currentPeriodStart': periodStart,
    'subscription.currentPeriodEnd': periodEnd,
    'subscription.flatLimit': planConfig.flatLimit === Infinity ? 999999 : planConfig.flatLimit,
    'subscription.gracePeriodEnd': null,
    isBlocked: false,
  });

  await Subscription.findOneAndUpdate(
    { tenantId },
    {
      tenantId,
      plan,
      status: 'active',
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      stripePriceId: stripeSubscription.items.data[0]?.price.id,
      flatLimit: planConfig.flatLimit === Infinity ? 999999 : planConfig.flatLimit,
      amount: planConfig.price,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
    { upsert: true, new: true }
  );

  logger.info(`[STRIPE] Checkout completed for tenant: ${tenantId}, plan: ${plan}`);
};

const handlePaymentSucceeded = async (invoice) => {
  if (!invoice.subscription) return;

  const subscriptionDoc = await Subscription.findOne({ stripeSubscriptionId: invoice.subscription });
  if (!subscriptionDoc) return;

  await PaymentHistory.create({
    tenantId: subscriptionDoc.tenantId,
    type: 'subscription',
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    plan: subscriptionDoc.plan,
    description: `Subscription payment for ${subscriptionDoc.plan} plan`,
    receiptUrl: invoice.hosted_invoice_url,
  });

  await Tenant.findByIdAndUpdate(subscriptionDoc.tenantId, {
    'subscription.status': 'active',
    'subscription.gracePeriodEnd': null,
    isBlocked: false,
  });
};

const handlePaymentFailed = async (invoice) => {
  if (!invoice.subscription) return;

  const subscriptionDoc = await Subscription.findOne({ stripeSubscriptionId: invoice.subscription });
  if (!subscriptionDoc) return;

  const gracePeriodEnd = addDays(new Date(), GRACE_PERIOD_DAYS);

  await Tenant.findByIdAndUpdate(subscriptionDoc.tenantId, {
    'subscription.status': 'grace',
    'subscription.gracePeriodEnd': gracePeriodEnd,
  });

  await Subscription.findByIdAndUpdate(subscriptionDoc._id, {
    status: 'past_due',
    gracePeriodEnd,
  });

  logger.warn(`[STRIPE] Payment failed for tenant: ${subscriptionDoc.tenantId}. Grace period until: ${gracePeriodEnd}`);
};

const handleSubscriptionUpdated = async (subscription) => {
  const subscriptionDoc = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
  if (!subscriptionDoc) return;

  const periodStart = new Date(subscription.current_period_start * 1000);
  const periodEnd = new Date(subscription.current_period_end * 1000);
  const status = subscription.status === 'active' ? 'active' : subscription.status;

  await Subscription.findByIdAndUpdate(subscriptionDoc._id, {
    status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  await Tenant.findByIdAndUpdate(subscriptionDoc.tenantId, {
    'subscription.status': status,
    'subscription.currentPeriodStart': periodStart,
    'subscription.currentPeriodEnd': periodEnd,
  });
};

const handleSubscriptionDeleted = async (subscription) => {
  const subscriptionDoc = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
  if (!subscriptionDoc) return;

  const gracePeriodEnd = addDays(new Date(), GRACE_PERIOD_DAYS);

  await Subscription.findByIdAndUpdate(subscriptionDoc._id, {
    status: 'canceled',
    canceledAt: new Date(),
  });

  await Tenant.findByIdAndUpdate(subscriptionDoc.tenantId, {
    'subscription.status': 'grace',
    'subscription.gracePeriodEnd': gracePeriodEnd,
  });

  // Schedule block after grace period (in production use a cron job)
  setTimeout(async () => {
    const tenant = await Tenant.findById(subscriptionDoc.tenantId);
    if (tenant && tenant.subscription.status === 'grace') {
      await Tenant.findByIdAndUpdate(subscriptionDoc.tenantId, {
        'subscription.status': 'blocked',
        isBlocked: true,
        blockedReason: 'Subscription expired.',
      });
      logger.warn(`[CRON] Tenant ${subscriptionDoc.tenantId} blocked due to expired subscription.`);
    }
  }, GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
};

module.exports = {
  createCheckoutSession,
  cancelSubscription,
  stripeWebhookHandler,
  getOrCreateStripeCustomer,
};
