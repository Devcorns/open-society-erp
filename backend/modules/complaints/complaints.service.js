const Complaint = require('../../models/Complaint.model');
const { AppError, getPagination, buildPaginationMeta, buildSearchQuery } = require('../../utils/helpers');

const create = async (tenantId, userId, data) => {
  const complaint = await Complaint.create({ ...data, tenantId, raisedBy: userId });
  return complaint;
};

const getAll = async (tenantId, userId, role, query) => {
  const { page, limit, skip } = getPagination(query);
  const { status, category, priority, search, assignedTo } = query;

  const filter = { tenantId, deletedAt: null };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = assignedTo;

  // Regular users see only their own complaints
  if (role === 'USER') filter.raisedBy = userId;

  if (search) Object.assign(filter, buildSearchQuery(search, ['title', 'description']));

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate('raisedBy', 'name email flatNumber block')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Complaint.countDocuments(filter),
  ]);

  return { complaints, meta: buildPaginationMeta(total, page, limit) };
};

const getById = async (tenantId, id, userId, role) => {
  const filter = { _id: id, tenantId, deletedAt: null };
  if (role === 'USER') filter.raisedBy = userId;

  const complaint = await Complaint.findOne(filter)
    .populate('raisedBy', 'name email flatNumber block')
    .populate('assignedTo', 'name email')
    .populate('comments.userId', 'name role');
  if (!complaint) throw new AppError('Complaint not found.', 404);
  return complaint;
};

const updateStatus = async (tenantId, id, status, assignedTo, resolution) => {
  const updates = { status };
  if (assignedTo) updates.assignedTo = assignedTo;
  if (resolution) updates.resolution = resolution;

  const complaint = await Complaint.findOneAndUpdate(
    { _id: id, tenantId, deletedAt: null },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!complaint) throw new AppError('Complaint not found.', 404);
  return complaint;
};

const addComment = async (tenantId, id, userId, comment) => {
  const complaint = await Complaint.findOne({ _id: id, tenantId, deletedAt: null });
  if (!complaint) throw new AppError('Complaint not found.', 404);

  complaint.comments.push({ userId, comment });
  await complaint.save();
  return complaint;
};

const remove = async (tenantId, id) => {
  const complaint = await Complaint.findOneAndUpdate(
    { _id: id, tenantId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
  if (!complaint) throw new AppError('Complaint not found.', 404);
};

module.exports = { create, getAll, getById, updateStatus, addComment, remove };
