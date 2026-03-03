const Maintenance = require('../../models/Maintenance.model');
const User = require('../../models/User.model');
const { AppError, getPagination, buildPaginationMeta } = require('../../utils/helpers');
const { v4: uuidv4 } = require('uuid');

const createMaintenanceBill = async (tenantId, data) => {
  const { userId, flatNumber, block, month, year, amount, dueDate, remarks } = data;

  const user = await User.findOne({ _id: userId, tenantId, deletedAt: null });
  if (!user) throw new AppError('Resident not found.', 404);

  const existing = await Maintenance.findOne({ tenantId, userId, month, year, deletedAt: null });
  if (existing) throw new AppError(`Maintenance bill for ${month}/${year} already exists for this resident.`, 409);

  const bill = await Maintenance.create({
    tenantId,
    userId,
    flatNumber: flatNumber || user.flatNumber,
    block: block || user.block,
    month,
    year,
    amount,
    dueDate: new Date(dueDate),
    remarks,
  });

  return bill;
};

const bulkCreateMaintenanceBills = async (tenantId, { month, year, amount, dueDate }) => {
  const residents = await User.find({ tenantId, role: 'USER', isActive: true, deletedAt: null });
  if (!residents.length) throw new AppError('No residents found.', 404);

  const bills = [];
  const errors = [];

  for (const resident of residents) {
    try {
      const existing = await Maintenance.findOne({ tenantId, userId: resident._id, month, year, deletedAt: null });
      if (existing) { errors.push({ userId: resident._id, message: 'Bill already exists' }); continue; }

      bills.push({
        tenantId,
        userId: resident._id,
        flatNumber: resident.flatNumber,
        block: resident.block,
        month,
        year,
        amount,
        dueDate: new Date(dueDate),
      });
    } catch (e) {
      errors.push({ userId: resident._id, message: e.message });
    }
  }

  const created = await Maintenance.insertMany(bills);
  return { created: created.length, errors };
};

const getMaintenance = async (tenantId, query) => {
  const { page, limit, skip } = getPagination(query);
  const { status, month, year, flatNumber, block, userId } = query;

  const filter = { tenantId, deletedAt: null };
  if (status) filter.status = status;
  if (month) filter.month = parseInt(month);
  if (year) filter.year = parseInt(year);
  if (flatNumber) filter.flatNumber = flatNumber;
  if (block) filter.block = block;
  if (userId) filter.userId = userId;

  const [bills, total] = await Promise.all([
    Maintenance.find(filter)
      .populate('userId', 'name email phone flatNumber block')
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(limit),
    Maintenance.countDocuments(filter),
  ]);

  return { bills, meta: buildPaginationMeta(total, page, limit) };
};

const getMaintenanceById = async (tenantId, id) => {
  const bill = await Maintenance.findOne({ _id: id, tenantId, deletedAt: null }).populate('userId', 'name email phone flatNumber block');
  if (!bill) throw new AppError('Bill not found.', 404);
  return bill;
};

const recordPayment = async (tenantId, id, paymentData) => {
  const bill = await Maintenance.findOne({ _id: id, tenantId, deletedAt: null });
  if (!bill) throw new AppError('Bill not found.', 404);
  if (bill.status === 'paid') throw new AppError('Bill is already paid.', 400);

  bill.status = 'paid';
  bill.paidDate = new Date();
  bill.paymentMethod = paymentData.paymentMethod;
  bill.transactionId = paymentData.transactionId;
  bill.remarks = paymentData.remarks || bill.remarks;
  bill.receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  await bill.save();
  return bill;
};

const deleteBill = async (tenantId, id) => {
  const bill = await Maintenance.findOneAndUpdate(
    { _id: id, tenantId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
  if (!bill) throw new AppError('Bill not found.', 404);
};

const getMaintenanceSummary = async (tenantId, year) => {
  const currentYear = parseInt(year) || new Date().getFullYear();
  const summary = await Maintenance.aggregate([
    { $match: { tenantId, year: currentYear, deletedAt: null } },
    {
      $group: {
        _id: { month: '$month', status: '$status' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.month': 1 } },
  ]);
  return summary;
};

module.exports = { createMaintenanceBill, bulkCreateMaintenanceBills, getMaintenance, getMaintenanceById, recordPayment, deleteBill, getMaintenanceSummary };
