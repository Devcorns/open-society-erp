const Inventory = require('../../models/Inventory.model');
const { AppError, getPagination, buildPaginationMeta, buildSearchQuery } = require('../../utils/helpers');

const create = async (tenantId, data) => {
  return Inventory.create({ ...data, tenantId });
};

const getAll = async (tenantId, query) => {
  const { page, limit, skip } = getPagination(query);
  const { category, isActive, lowStock, search } = query;

  const filter = { tenantId, deletedAt: null };
  if (category) filter.category = category;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) Object.assign(filter, buildSearchQuery(search, ['name', 'description', 'vendor']));

  let items = await Inventory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total = await Inventory.countDocuments(filter);

  if (lowStock === 'true') {
    items = items.filter((item) => item.quantity <= item.minimumStock);
  }

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

const getById = async (tenantId, id) => {
  const item = await Inventory.findOne({ _id: id, tenantId, deletedAt: null });
  if (!item) throw new AppError('Inventory item not found.', 404);
  return item;
};

const update = async (tenantId, id, data) => {
  const item = await Inventory.findOneAndUpdate(
    { _id: id, tenantId, deletedAt: null },
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!item) throw new AppError('Item not found.', 404);
  return item;
};

const addTransaction = async (tenantId, id, transaction, performedBy) => {
  const item = await Inventory.findOne({ _id: id, tenantId, deletedAt: null });
  if (!item) throw new AppError('Item not found.', 404);

  const { type, quantity, remarks } = transaction;
  if (type === 'usage' || type === 'disposal') {
    if (item.quantity < quantity) throw new AppError('Insufficient stock.', 400);
    item.quantity -= quantity;
  } else {
    item.quantity += quantity;
  }

  if (type === 'purchase') item.lastPurchaseDate = new Date();

  item.transactions.push({ type, quantity, remarks, performedBy });
  await item.save();
  return item;
};

const remove = async (tenantId, id) => {
  const item = await Inventory.findOneAndUpdate(
    { _id: id, tenantId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
  if (!item) throw new AppError('Item not found.', 404);
};

module.exports = { create, getAll, getById, update, addTransaction, remove };
