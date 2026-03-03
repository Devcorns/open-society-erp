const mongoose = require('mongoose');
const { SUBSCRIPTION_STATUS, PLAN_NAMES } = require('../config/constants');

const subscriptionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    plan: {
      type: String,
      enum: Object.values(PLAN_NAMES),
      required: true,
      default: PLAN_NAMES.BASIC,
    },
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.INACTIVE,
    },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    stripePriceId: { type: String, default: null },
    flatLimit: { type: Number, required: true, default: 50 },
    amount: { type: Number, default: 0 }, // in cents
    currency: { type: String, default: 'usd' },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    gracePeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date, default: null },
    trialStart: { type: Date, default: null },
    trialEnd: { type: Date, default: null },
    metadata: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

subscriptionSchema.index({ tenantId: 1, status: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 }, { sparse: true }); // unique enforced by Stripe, sparse allows nulls
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
