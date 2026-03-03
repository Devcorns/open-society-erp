const mongoose = require('mongoose');
const { PARKING_TYPE, PARKING_STATUS } = require('../config/constants');

const parkingSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    slotNumber: {
      type: String,
      required: [true, 'Slot number is required'],
      trim: true,
      uppercase: true,
    },
    parkingType: {
      type: String,
      enum: Object.values(PARKING_TYPE),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PARKING_STATUS),
      default: PARKING_STATUS.AVAILABLE,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    flatNumber: { type: String, trim: true, default: null },
    block: { type: String, trim: true, default: null },
    vehicleNumber: { type: String, trim: true, uppercase: true, default: null },
    vehicleModel: { type: String, trim: true, default: null },
    monthlyCharge: { type: Number, default: 0, min: 0 },
    assignedAt: { type: Date, default: null },
    notes: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

parkingSchema.index({ tenantId: 1, slotNumber: 1 }, { unique: true });
parkingSchema.index({ tenantId: 1, status: 1 });
parkingSchema.index({ tenantId: 1, parkingType: 1 });
parkingSchema.index({ tenantId: 1, assignedTo: 1 });
parkingSchema.index({ deletedAt: 1 });

const Parking = mongoose.model('Parking', parkingSchema);
module.exports = Parking;
