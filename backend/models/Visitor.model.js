const mongoose = require('mongoose');
const { VISITOR_STATUS } = require('../config/constants');

const visitorSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Visitor name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
      required: [true, 'Visitor phone is required'],
    },
    purpose: {
      type: String,
      enum: ['personal', 'delivery', 'maintenance', 'official', 'cab', 'other'],
      required: true,
    },
    vehicleNumber: { type: String, trim: true, uppercase: true, default: null },
    photo: { type: String, default: null },
    idProofType: { type: String, enum: ['aadhar', 'pan', 'passport', 'driving_license', 'other', null], default: null },
    idProofNumber: { type: String, trim: true, default: null },
    flatNumber: { type: String, required: true, trim: true },
    block: { type: String, trim: true, default: null },
    status: {
      type: String,
      enum: Object.values(VISITOR_STATUS),
      default: VISITOR_STATUS.PENDING,
    },
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    expectedDate: { type: Date, required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    remarks: { type: String, trim: true, default: null },
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

visitorSchema.index({ tenantId: 1, status: 1 });
visitorSchema.index({ tenantId: 1, hostId: 1 });
visitorSchema.index({ tenantId: 1, expectedDate: 1 });
visitorSchema.index({ tenantId: 1, flatNumber: 1, block: 1 });
visitorSchema.index({ deletedAt: 1 });

const Visitor = mongoose.model('Visitor', visitorSchema);
module.exports = Visitor;
