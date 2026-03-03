const mongoose = require('mongoose');
const { MAINTENANCE_STATUS } = require('../config/constants');

const maintenanceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    flatNumber: { type: String, required: true, trim: true },
    block: { type: String, trim: true, default: null },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2020 },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(MAINTENANCE_STATUS),
      default: MAINTENANCE_STATUS.PENDING,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'card', 'cheque', 'online'],
      default: null,
    },
    transactionId: { type: String, trim: true, default: null },
    remarks: { type: String, trim: true, default: null },
    lateFeesApplied: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    receiptNumber: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

maintenanceSchema.index({ tenantId: 1, userId: 1, month: 1, year: 1 }, { unique: true });
maintenanceSchema.index({ tenantId: 1, status: 1 });
maintenanceSchema.index({ tenantId: 1, dueDate: 1 });
maintenanceSchema.index({ tenantId: 1, flatNumber: 1, block: 1 });
maintenanceSchema.index({ deletedAt: 1 });

// Pre-save: auto-set status to overdue
maintenanceSchema.pre('save', function (next) {
  if (this.status === 'pending' && this.dueDate < new Date()) {
    this.status = 'overdue';
  }
  next();
});

const Maintenance = mongoose.model('Maintenance', maintenanceSchema);
module.exports = Maintenance;
