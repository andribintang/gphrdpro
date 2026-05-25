const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const {
  Return, ReturnItem, Order, OrderItem,
  Product, Stock, StockMovement,
} = require('../../models/erp');

const toNum = v => parseFloat(v) || 0;

const generateReturnNo = async (branchId) => {
  const prefix = `RTR${branchId}`;
  const date   = new Date();
  const ymd    = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
  const last   = await Return.findOne({ where: { return_no: { [Op.like]: `${prefix}${ymd}%` } }, order: [['id','DESC']] });
  const seq    = last ? parseInt(last.return_no.slice(-4)) + 1 : 1;
  return `${prefix}${ymd}${String(seq).padStart(4,'0')}`;
};

const getReturns = async (req, res, next) => {
  try {
    const { branch_id, status, date_from, date_to, page = 1, limit = 20 } = req.query;
    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (status)    where.status    = status;
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to)   where.created_at[Op.lte] = new Date(date_to + 'T23:59:59');
    }
    const offset = (parseInt(page)-1) * parseInt(limit);
    const { count, rows } = await Return.findAndCountAll({
      where,
      include: [{ model: Order, as: 'order', attributes: ['order_no','channel','customer_name','sub_channel_name'] }],
      order: [['created_at','DESC']],
      limit: parseInt(limit), offset,
    });
    return res.json({ success: true, data: { returns: rows, total: count } });
  } catch (err) { next(err); }
};

const getReturnDetail = async (req, res, next) => {
  try {
    const ret = await Return.findByPk(req.params.id, {
      include: [
        { model: ReturnItem, as: 'items' },
        { model: Order, as: 'order', attributes: ['order_no','channel','customer_name','customer_phone','sub_channel_name','total_amount'] },
      ],
    });
    if (!ret) return res.status(404).json({ success: false, message: 'Retur tidak ditemukan' });
    return res.json({ success: true, data: { return: ret } });
  } catch (err) { next(err); }
};

const createReturn = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { order_id, reason, resolution, restock = true, notes, items } = req.body;
    if (!items?.length) { await t.rollback(); return res.status(400).json({ success: false, message: 'Minimal 1 item retur' }); }
    const order = await Order.findByPk(order_id, { include: [{ model: OrderItem, as: 'items' }], transaction: t });
    if (!order) { await t.rollback(); return res.status(404).json({ success: false, message: 'Order tidak ditemukan' }); }
    let totalReturn = 0;
    const returnItems = [];
    for (const item of items) {
      const orderItem = order.items.find(oi => oi.id === item.order_item_id);
      if (!orderItem) throw new Error(`Item order ID ${item.order_item_id} tidak ditemukan`);
      if (item.qty_return > orderItem.qty) throw new Error(`Qty retur melebihi qty order`);
      const subtotal = toNum(orderItem.sell_price) * item.qty_return;
      totalReturn += subtotal;
      returnItems.push({ order_item_id: item.order_item_id, product_id: orderItem.product_id,
        product_name: orderItem.product_name, qty_return: item.qty_return,
        sell_price: toNum(orderItem.sell_price), subtotal });
    }
    const returnNo = await generateReturnNo(order.branch_id);
    const ret = await Return.create({
      return_no: returnNo, order_id, branch_id: order.branch_id, status: 'pending',
      reason: reason || 'lainnya', resolution: resolution || 'refund',
      restock: restock !== false, total_return: totalReturn, notes, created_by: req.user?.id,
    }, { transaction: t });
    await ReturnItem.bulkCreate(returnItems.map(i => ({ ...i, return_id: ret.id })), { transaction: t });
    await t.commit();
    return res.status(201).json({ success: true, message: `Retur ${returnNo} berhasil dibuat`, data: { return: ret } });
  } catch (err) { await t.rollback(); next(err); }
};

const confirmReturn = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const ret = await Return.findByPk(req.params.id, { include: [{ model: ReturnItem, as: 'items' }], transaction: t });
    if (!ret) { await t.rollback(); return res.status(404).json({ success: false, message: 'Retur tidak ditemukan' }); }
    if (ret.status !== 'pending') { await t.rollback(); return res.status(400).json({ success: false, message: `Retur sudah ${ret.status}` }); }
    if (ret.restock) {
      for (const item of ret.items) {
        let stock = await Stock.findOne({ where: { product_id: item.product_id, branch_id: ret.branch_id }, transaction: t });
        if (!stock) stock = await Stock.create({ product_id: item.product_id, branch_id: ret.branch_id, qty: 0 }, { transaction: t });
        const qtyBefore = stock.qty;
        await stock.update({ qty: qtyBefore + item.qty_return }, { transaction: t });
        await StockMovement.create({
          product_id: item.product_id, branch_id: ret.branch_id,
          type: 'in', qty: item.qty_return, qty_before: qtyBefore, qty_after: qtyBefore + item.qty_return,
          ref_type: 'return', ref_id: ret.id, notes: `Retur ${ret.return_no}`, created_by: req.user?.id,
          created_at: new Date(), updated_at: new Date()}, { transaction: t });
      }
    }
    const totalOrderItems = await OrderItem.sum('qty', { where: { order_id: ret.order_id }, transaction: t });
    const totalReturnItems = ret.items.reduce((s, i) => s + i.qty_return, 0);
    if (totalReturnItems >= totalOrderItems) {
      await Order.update({ status: 'returned' }, { where: { id: ret.order_id }, transaction: t });
    }
    await ret.update({ status: 'confirmed', confirmed_at: new Date() }, { transaction: t });
    await t.commit();
    return res.json({ success: true, message: `Retur ${ret.return_no} dikonfirmasi${ret.restock ? ' — stok bertambah' : ''}`, data: { return: ret } });
  } catch (err) { await t.rollback(); next(err); }
};

const rejectReturn = async (req, res, next) => {
  try {
    const ret = await Return.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ success: false, message: 'Retur tidak ditemukan' });
    if (ret.status !== 'pending') return res.status(400).json({ success: false, message: `Retur sudah ${ret.status}` });
    await ret.update({ status: 'rejected', notes: req.body.notes || ret.notes });
    return res.json({ success: true, message: `Retur ${ret.return_no} ditolak` });
  } catch (err) { next(err); }
};

module.exports = { getReturns, getReturnDetail, createReturn, confirmReturn, rejectReturn };
