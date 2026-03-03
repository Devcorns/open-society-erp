const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    category: {
      type: String,
      enum: ['electrical', 'plumbing', 'cleaning', 'security', 'office', 'garden', 'gym', 'other'],
      required: true,
    },
    description: { type: String, trim: true, maxlength: [1000, 'Description cannot exceed 1000 characters'] },
    unit: { type: String, enum: ['pieces', 'kg', 'liters', 'meters', 'boxes', 'rolls', 'sets'], default: 'pieces' },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    minimumStock: { type: Number, default: 5, min: 0 },
    purchasePrice: { type: Number, default: 0, min: 0 },
    vendor: { type: String, trim: true, default: null },
    location: { type: String, trim: true, default: null },
    lastPurchaseDate: { type: Date, default: null },
    warrantyExpiry: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    transactions: [
      {
        type: { type: String, enum: ['purchase', 'usage', 'adjustment', 'disposal'], required: true },
        quantity: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        remarks: { type: String, trim: true },
      },
    ],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

inventorySchema.index({ tenantId: 1, category: 1 });
inventorySchema.index({ tenantId: 1, isActive: 1 });
inventorySchema.index({ tenantId: 1, quantity: 1 });
inventorySchema.index({ deletedAt: 1 });

// Virtual: isLowStock
inventorySchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.minimumStock;
});

const Inventory = mongoose.model('Inventory', inventorySchema);
module.exports = Inventory;
