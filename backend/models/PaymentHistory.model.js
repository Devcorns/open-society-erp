const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['subscription', 'maintenance', 'parking', 'other'],
      required: true,
    },
    stripePaymentIntentId: { type: String, sparse: true, default: null },
    stripeInvoiceId: { type: String, sparse: true, default: null },
    stripeChargeId: { type: String, sparse: true, default: null },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'inr' },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded', 'disputed'],
      default: 'pending',
    },
    plan: { type: String, default: null },
    description: { type: String, trim: true },
    receiptUrl: { type: String, default: null },
    metadata: { type: Map, of: String, default: {} },
    refundedAt: { type: Date, default: null },
    refundAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

paymentHistorySchema.index({ tenantId: 1, type: 1 });
paymentHistorySchema.index({ tenantId: 1, status: 1 });
paymentHistorySchema.index({ tenantId: 1, createdAt: -1 });
paymentHistorySchema.index({ stripePaymentIntentId: 1 });

const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);
module.exports = PaymentHistory;
