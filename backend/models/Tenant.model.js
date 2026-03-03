const mongoose = require('mongoose');
const { SUBSCRIPTION_STATUS, PLAN_NAMES } = require('../config/constants');

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Society name is required'],
      trim: true,
      minlength: [3, 'Society name must be at least 3 characters'],
      maxlength: [100, 'Society name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      country: { type: String, default: 'India' },
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    contactPhone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'],
    },
    logo: { type: String, default: null },
    totalFlats: { type: Number, default: 0, min: 0 },
    totalBlocks: { type: Number, default: 1, min: 1 },
    registrationNumber: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    blockedReason: { type: String, default: null },
    blockedAt: { type: Date, default: null },
    subscription: {
      plan: { type: String, enum: Object.values(PLAN_NAMES), default: PLAN_NAMES.BASIC },
      status: { type: String, enum: Object.values(SUBSCRIPTION_STATUS), default: SUBSCRIPTION_STATUS.INACTIVE },
      stripeCustomerId: { type: String, default: null },
      stripeSubscriptionId: { type: String, default: null },
      currentPeriodStart: { type: Date, default: null },
      currentPeriodEnd: { type: Date, default: null },
      gracePeriodEnd: { type: Date, default: null },
      flatLimit: { type: Number, default: 50 },
    },
    settings: {
      maintenanceDueDay: { type: Number, default: 5, min: 1, max: 28 },
      currency: { type: String, default: 'INR' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      allowVisitorSelfCheckIn: { type: Boolean, default: false },
    },
    metadata: { type: Map, of: String, default: {} },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ isActive: 1, isBlocked: 1 });
tenantSchema.index({ 'subscription.status': 1 });
tenantSchema.index({ contactEmail: 1 });
tenantSchema.index({ deletedAt: 1 });

// Pre-save: generate slug from name
tenantSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Virtual: isSubscriptionActive
tenantSchema.virtual('isSubscriptionActive').get(function () {
  const { status, gracePeriodEnd } = this.subscription;
  if (status === 'active' || status === 'trialing') return true;
  if (status === 'grace' && gracePeriodEnd && new Date() < new Date(gracePeriodEnd)) return true;
  return false;
});

// Soft delete
tenantSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

const Tenant = mongoose.model('Tenant', tenantSchema);
module.exports = Tenant;
