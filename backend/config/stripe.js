const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[STRIPE] Warning: STRIPE_SECRET_KEY is not set. Stripe features will be disabled.');
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

const PLANS = {
  BASIC: {
    name: 'Basic',
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    flatLimit: 50,
    price: 999, // $9.99/month in cents
    features: ['Up to 50 flats', 'Maintenance billing', 'Complaint management', 'Visitor logs'],
  },
  PRO: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    flatLimit: 200,
    price: 2999, // $29.99/month
    features: ['Up to 200 flats', 'All Basic features', 'Inventory management', 'Parking management', 'Analytics dashboard'],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    flatLimit: Infinity,
    price: 9999, // $99.99/month
    features: ['Unlimited flats', 'All Pro features', 'Priority support', 'Custom integrations', 'SLA guaranteed'],
  },
};

const GRACE_PERIOD_DAYS = 7;

module.exports = { stripe, PLANS, GRACE_PERIOD_DAYS };
