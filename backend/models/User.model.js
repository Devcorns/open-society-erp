const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },
    flatNumber: { type: String, trim: true, default: null },
    block: { type: String, trim: true, default: null },
    profileImage: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    refreshTokens: [
      {
        token: { type: String, required: true },
        createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 }, // 7 days TTL
        userAgent: { type: String, default: null },
        ip: { type: String, default: null },
      },
    ],
    lastLogin: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    metadata: { type: Map, of: String, default: {} },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for multi-tenant queries
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, isActive: 1 });
userSchema.index({ tenantId: 1, flatNumber: 1, block: 1 });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ deletedAt: 1 });

// Pre-save: hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
  next();
});

// Method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method: remove a refresh token
userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter((rt) => rt.token !== token);
  return this.save();
};

// Method: soft delete
userSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Virtual: full flat identifier
userSchema.virtual('flatId').get(function () {
  if (this.block && this.flatNumber) return `${this.block}-${this.flatNumber}`;
  return this.flatNumber;
});

const User = mongoose.model('User', userSchema);
module.exports = User;
