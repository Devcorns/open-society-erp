const mongoose = require('mongoose');
const { COMPLAINT_STATUS } = require('../config/constants');

const complaintSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      enum: ['plumbing', 'electrical', 'cleaning', 'security', 'noise', 'parking', 'lift', 'water', 'other'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: Object.values(COMPLAINT_STATUS),
      default: COMPLAINT_STATUS.OPEN,
    },
    attachments: [{ type: String }],
    resolution: { type: String, trim: true, default: null },
    resolvedAt: { type: Date, default: null },
    flatNumber: { type: String, trim: true },
    block: { type: String, trim: true, default: null },
    comments: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

complaintSchema.index({ tenantId: 1, status: 1 });
complaintSchema.index({ tenantId: 1, raisedBy: 1 });
complaintSchema.index({ tenantId: 1, category: 1 });
complaintSchema.index({ tenantId: 1, priority: 1 });
complaintSchema.index({ deletedAt: 1 });

// Mark resolved when status changes to resolved
complaintSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;
