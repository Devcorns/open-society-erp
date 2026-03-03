const Visitor = require('../../models/Visitor.model');
const { AppError, getPagination, buildPaginationMeta, buildSearchQuery, generateOTP, addDays } = require('../../utils/helpers');

const create = async (tenantId, hostId, data) => {
  const otp = generateOTP();
  const otpExpiry = addDays(new Date(), 1);
  const visitor = await Visitor.create({ ...data, tenantId, hostId, otp, otpExpiry });
  return visitor;
};

const getAll = async (tenantId, userId, role, query) => {
  const { page, limit, skip } = getPagination(query);
  const { status, purpose, search, expectedDate } = query;

  const filter = { tenantId, deletedAt: null };
  if (status) filter.status = status;
  if (purpose) filter.purpose = purpose;
  if (role === 'USER') filter.hostId = userId;
  if (expectedDate) {
    const d = new Date(expectedDate);
    filter.expectedDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
  }
  if (search) Object.assign(filter, buildSearchQuery(search, ['name', 'phone', 'vehicleNumber']));

  const [visitors, total] = await Promise.all([
    Visitor.find(filter)
      .populate('hostId', 'name flatNumber block phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Visitor.countDocuments(filter),
  ]);

  return { visitors, meta: buildPaginationMeta(total, page, limit) };
};

const getById = async (tenantId, id) => {
  const visitor = await Visitor.findOne({ _id: id, tenantId, deletedAt: null })
    .populate('hostId', 'name flatNumber block phone')
    .populate('approvedBy', 'name role');
  if (!visitor) throw new AppError('Visitor record not found.', 404);
  return visitor;
};

const approve = async (tenantId, id, approverId) => {
  const visitor = await Visitor.findOneAndUpdate(
    { _id: id, tenantId, deletedAt: null },
    { $set: { status: 'approved', approvedBy: approverId } },
    { new: true }
  );
  if (!visitor) throw new AppError('Visitor not found.', 404);
  return visitor;
};

const checkIn = async (tenantId, id) => {
  const visitor = await Visitor.findOneAndUpdate(
    { _id: id, tenantId, status: { $in: ['pending', 'approved'] }, deletedAt: null },
    { $set: { status: 'checked_in', checkInTime: new Date() } },
    { new: true }
  );
  if (!visitor) throw new AppError('Visitor not found or invalid status.', 404);
  return visitor;
};

const checkOut = async (tenantId, id) => {
  const visitor = await Visitor.findOneAndUpdate(
    { _id: id, tenantId, status: 'checked_in', deletedAt: null },
    { $set: { status: 'checked_out', checkOutTime: new Date() } },
    { new: true }
  );
  if (!visitor) throw new AppError('Visitor not found or not checked in.', 404);
  return visitor;
};

const remove = async (tenantId, id) => {
  const visitor = await Visitor.findOneAndUpdate(
    { _id: id, tenantId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
  if (!visitor) throw new AppError('Visitor not found.', 404);
};

module.exports = { create, getAll, getById, approve, checkIn, checkOut, remove };
