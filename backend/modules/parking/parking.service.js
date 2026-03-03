const Parking = require('../../models/Parking.model');
const User = require('../../models/User.model');
const { AppError, getPagination, buildPaginationMeta } = require('../../utils/helpers');

const create = async (tenantId, data) => {
  const existing = await Parking.findOne({ tenantId, slotNumber: data.slotNumber.toUpperCase(), deletedAt: null });
  if (existing) throw new AppError(`Slot ${data.slotNumber} already exists.`, 409);
  return Parking.create({ ...data, tenantId, slotNumber: data.slotNumber.toUpperCase() });
};

const getAll = async (tenantId, query) => {
  const { page, limit, skip } = getPagination(query);
  const { status, parkingType, assignedTo } = query;

  const filter = { tenantId, deletedAt: null };
  if (status) filter.status = status;
  if (parkingType) filter.parkingType = parkingType;
  if (assignedTo) filter.assignedTo = assignedTo;

  const [slots, total] = await Promise.all([
    Parking.find(filter)
      .populate('assignedTo', 'name email flatNumber block')
      .sort({ slotNumber: 1 })
      .skip(skip)
      .limit(limit),
    Parking.countDocuments(filter),
  ]);

  return { slots, meta: buildPaginationMeta(total, page, limit) };
};

const getById = async (tenantId, id) => {
  const slot = await Parking.findOne({ _id: id, tenantId, deletedAt: null }).populate('assignedTo', 'name email flatNumber');
  if (!slot) throw new AppError('Parking slot not found.', 404);
  return slot;
};

const assignSlot = async (tenantId, id, userId, vehicleNumber, vehicleModel) => {
  const user = await User.findOne({ _id: userId, tenantId, deletedAt: null });
  if (!user) throw new AppError('Resident not found.', 404);

  const slot = await Parking.findOneAndUpdate(
    { _id: id, tenantId, status: 'available', deletedAt: null },
    {
      $set: {
        status: 'occupied',
        assignedTo: userId,
        flatNumber: user.flatNumber,
        block: user.block,
        vehicleNumber,
        vehicleModel,
        assignedAt: new Date(),
      },
    },
    { new: true }
  );
  if (!slot) throw new AppError('Slot not found or already occupied.', 400);
  return slot;
};

const releaseSlot = async (tenantId, id) => {
  const slot = await Parking.findOneAndUpdate(
    { _id: id, tenantId, deletedAt: null },
    {
      $set: {
        status: 'available',
        assignedTo: null,
        flatNumber: null,
        block: null,
        vehicleNumber: null,
        vehicleModel: null,
        assignedAt: null,
      },
    },
    { new: true }
  );
  if (!slot) throw new AppError('Slot not found.', 404);
  return slot;
};

const update = async (tenantId, id, data) => {
  const allowedFields = ['monthlyCharge', 'notes', 'status', 'isActive'];
  const filtered = {};
  allowedFields.forEach((f) => { if (data[f] !== undefined) filtered[f] = data[f]; });

  const slot = await Parking.findOneAndUpdate(
    { _id: id, tenantId, deletedAt: null },
    { $set: filtered },
    { new: true }
  );
  if (!slot) throw new AppError('Slot not found.', 404);
  return slot;
};

const remove = async (tenantId, id) => {
  const slot = await Parking.findOneAndUpdate(
    { _id: id, tenantId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
  if (!slot) throw new AppError('Slot not found.', 404);
};

const getStats = async (tenantId) => {
  const stats = await Parking.aggregate([
    { $match: { tenantId, deletedAt: null } },
    {
      $group: {
        _id: { parkingType: '$parkingType', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);
  return stats;
};

module.exports = { create, getAll, getById, assignSlot, releaseSlot, update, remove, getStats };
