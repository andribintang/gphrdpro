const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const { Purchase, PurchaseItem, Product, Stock, StockMovement, Expense, Order, OrderItem } = require('../../models/erp');

const toNum = v => parseFloat(v) || 0;

// ── Generate PO number ────────────────────────────────────────
const generatePoNo = async (branchId) => {
  const prefix = branchId === 1 ? 'POR' : 'POD';
  const date   = new Date();
  const ymd    = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
  const last   = await Purchase.findOne({ where: { po_no: { [Op.like]: `${prefix}${ymd}%` } }, order: [['id','DESC']] });
  const seq    = last ? parseInt(last.po_no.slice(-4)) + 1 : 1;
  return `${prefix}${ymd}${String(seq).padStart(4,'0')}`;
};

// ════════════════════════════════════════════════════════════════
// PURCHASES
// ════════════════════════════════════════════════════════════════
const getPurchases = async (req, res, next) => {
  try {
    const { branch_id, status, date_from, date_to, page = 1, limit = 20 } = req.query;
    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (status)    where.status    = status;
    if (date_from || date_to) {
      where.order_date = {};
      if (date_from) where.order_date[Op.gte] = date_from;
      if (date_to)   where.order_date[Op.lte] = date_to;
    }
    const offset = (parseInt(page)-1) * parseInt(limit);
    const { count, rows } = await Purchase.findAndCountAll({
      where, order: [['created_at','DESC']], limit: parseInt(limit), offset,
    });
    return res.json({ success: true, data: { purchases: rows, total: count } });
  } catch (err) { next(err); }
};

const getPurchaseDetail = async (req, res, next) => {
  try {
    const po = await Purchase.findByPk(req.params.id, {
      include: [{ model: PurchaseItem, as: 'items' }],
    });
    if (!po) return res.status(404).json({ success: false, message: 'PO tidak ditemukan' });
    return res.json({ success: true, data: { purchase: po } });
  } catch (err) { next(err); }
};

const createPurchase = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { branch_id, supplier_name, supplier_phone, order_date, expected_date, items, shipping_cost, notes } = req.body;
    if (!items?.length) { await t.rollback(); return res.status(400).json({ success: false, message: 'Minimal 1 item' }); }

    let subtotal = 0;
    const itemsData = [];
    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) throw new Error(`Produk ID ${item.product_id} tidak ditemukan`);
      const itemSubtotal = toNum(item.buy_price) * item.qty;
      subtotal += itemSubtotal;
      itemsData.push({
        product_id: item.product_id, product_name: product.name,
        qty_ordered: item.qty, qty_received: 0,
        buy_price: toNum(item.buy_price), subtotal: itemSubtotal,
      });
    }

    const totalAmount = subtotal + toNum(shipping_cost);
    const poNo = await generatePoNo(branch_id);
    const po   = await Purchase.create({
      po_no: poNo, branch_id, supplier_name, supplier_phone,
      order_date: order_date || new Date().toISOString().split('T')[0],
      expected_date: expected_date || null,
      subtotal, shipping_cost: toNum(shipping_cost), total_amount: totalAmount,
      notes, created_by: req.user?.id, status: 'draft',
    }, { transaction: t });

    await PurchaseItem.bulkCreate(itemsData.map(i => ({ ...i, purchase_id: po.id })), { transaction: t });
    await t.commit();
    return res.status(201).json({ success: true, message: `PO ${poNo} dibuat`, data: { purchase: po } });
  } catch (err) { await t.rollback(); next(err); }
};

const receivePurchase = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const po = await Purchase.findByPk(req.params.id, {
      include: [{ model: PurchaseItem, as: 'items' }], transaction: t,
    });
    if (!po) { await t.rollback(); return res.status(404).json({ success: false, message: 'PO tidak ditemukan' }); }
    if (['received','cancelled'].includes(po.status)) {
      await t.rollback(); return res.status(400).json({ success: false, message: `PO sudah ${po.status}` });
    }

    const { received_items } = req.body; // [{ item_id, qty_received }]
    let allReceived = true;

    for (const rec of (received_items || [])) {
      const item = po.items.find(i => i.id === rec.item_id);
      if (!item) continue;

      const newQtyReceived = Math.min(item.qty_ordered, item.qty_received + rec.qty_received);
      if (newQtyReceived < item.qty_ordered) allReceived = false;

      await item.update({ qty_received: newQtyReceived }, { transaction: t });

      // Update stock
      const addQty = rec.qty_received;
      let stock = await Stock.findOne({ where: { product_id: item.product_id, branch_id: po.branch_id }, transaction: t });
      if (!stock) stock = await Stock.create({ product_id: item.product_id, branch_id: po.branch_id, qty: 0 }, { transaction: t });

      const qtyBefore = stock.qty;
      await stock.update({ qty: qtyBefore + addQty }, { transaction: t });
      await StockMovement.create({
        product_id: item.product_id, branch_id: po.branch_id,
        type: 'in', qty: addQty, qty_before: qtyBefore, qty_after: qtyBefore + addQty,
        ref_type: 'purchase', ref_id: po.id, notes: `Terima PO ${po.po_no}`,
        created_by: req.user?.id,
      }, { transaction: t });

      // Update product buy_price
      await Product.update({ buy_price: item.buy_price }, { where: { id: item.product_id }, transaction: t });
    }

    await po.update({
      status: allReceived ? 'received' : 'partial',
      received_date: new Date().toISOString().split('T')[0],
    }, { transaction: t });

    await t.commit();
    return res.json({ success: true, message: `PO ${po.po_no} diterima — stok bertambah`, data: { purchase: po } });
  } catch (err) { await t.rollback(); next(err); }
};

const cancelPurchase = async (req, res, next) => {
  try {
    const po = await Purchase.findByPk(req.params.id);
    if (!po) return res.status(404).json({ success: false, message: 'PO tidak ditemukan' });
    if (po.status === 'received') return res.status(400).json({ success: false, message: 'PO sudah diterima tidak bisa dibatalkan' });
    await po.update({ status: 'cancelled' });
    return res.json({ success: true, message: `PO ${po.po_no} dibatalkan` });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════
// EXPENSES
// ════════════════════════════════════════════════════════════════
const getExpenses = async (req, res, next) => {
  try {
    const { branch_id, category, date_from, date_to, page = 1, limit = 20 } = req.query;
    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (category)  where.category  = category;
    if (date_from || date_to) {
      where.expense_date = {};
      if (date_from) where.expense_date[Op.gte] = date_from;
      if (date_to)   where.expense_date[Op.lte] = date_to;
    }
    const offset = (parseInt(page)-1) * parseInt(limit);
    const { count, rows } = await Expense.findAndCountAll({
      where, order: [['expense_date','DESC'],['created_at','DESC']],
      limit: parseInt(limit), offset,
    });
    const total = await Expense.sum('amount', { where });
    return res.json({ success: true, data: { expenses: rows, count, total_amount: total || 0 } });
  } catch (err) { next(err); }
};

const createExpense = async (req, res, next) => {
  try {
    const expense = await Expense.create({ ...req.body, created_by: req.user?.id });
    return res.status(201).json({ success: true, message: 'Pengeluaran dicatat', data: { expense } });
  } catch (err) { next(err); }
};

const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Pengeluaran tidak ditemukan' });
    await expense.update(req.body);
    return res.json({ success: true, data: { expense } });
  } catch (err) { next(err); }
};

const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Pengeluaran tidak ditemukan' });
    await expense.destroy();
    return res.json({ success: true, message: 'Pengeluaran dihapus' });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════
// LAPORAN LABA RUGI
// ════════════════════════════════════════════════════════════════
const getProfitLoss = async (req, res, next) => {
  try {
    const { branch_id, date_from, date_to } = req.query;

    const orderWhere = { status: { [Op.in]: ['confirmed','processing','shipped','completed'] } };
    const expWhere   = {};

    if (branch_id) { orderWhere.branch_id = branch_id; expWhere.branch_id = branch_id; }
    if (date_from || date_to) {
      const dateRange = {};
      if (date_from) dateRange[Op.gte] = date_from;
      if (date_to)   dateRange[Op.lte] = date_to;
      orderWhere.order_date   = dateRange;
      expWhere.expense_date   = dateRange;
    }

    // Revenue & HPP dari orders
    const orders = await Order.findAll({
      where: orderWhere,
      include: [{ model: OrderItem, as: 'items', attributes: ['qty','sell_price','buy_price','subtotal','profit'] }],
    });

    const revenue    = orders.reduce((s,o) => s + toNum(o.total_amount), 0);
    const hpp        = orders.reduce((s,o) => s + o.items.reduce((si,i) => si + (toNum(i.buy_price) * i.qty), 0), 0);
    const grossProfit = revenue - hpp;

    // Expenses
    const expenses    = await Expense.findAll({ where: expWhere });
    const totalExpense = expenses.reduce((s,e) => s + toNum(e.amount), 0);

    // By category
    const expByCategory = {};
    expenses.forEach(e => {
      if (!expByCategory[e.category]) expByCategory[e.category] = 0;
      expByCategory[e.category] += toNum(e.amount);
    });

    const netProfit = grossProfit - totalExpense;

    return res.json({
      success: true,
      data: {
        period: { date_from, date_to },
        income: {
          revenue,
          hpp,
          gross_profit:  grossProfit,
          gross_margin:  revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(2) : 0,
          total_orders:  orders.length,
        },
        expenses: {
          total: totalExpense,
          by_category: expByCategory,
          items: expenses,
        },
        net_profit:  netProfit,
        net_margin:  revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0,
      },
    });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════
// STOK OPNAME
// ════════════════════════════════════════════════════════════════
const getStockOpname = async (req, res, next) => {
  try {
    const { branch_id } = req.query;
    const where = { is_active: true };
    if (branch_id) where.branch_id = branch_id;

    const products = await Product.findAll({
      where,
      include: [{ model: Stock, as: 'stock' }],
      order: [['name','ASC']],
    });

    return res.json({ success: true, data: { products, total: products.length } });
  } catch (err) { next(err); }
};

const submitStockOpname = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { branch_id, items, notes } = req.body;
    // items: [{ product_id, actual_qty }]
    const adjustments = [];

    for (const item of items) {
      const stock = await Stock.findOne({ where: { product_id: item.product_id, branch_id }, transaction: t });
      if (!stock) continue;

      const diff = item.actual_qty - stock.qty;
      if (diff === 0) continue;

      const qtyBefore = stock.qty;
      await stock.update({ qty: item.actual_qty }, { transaction: t });
      await StockMovement.create({
        product_id: item.product_id, branch_id,
        type: 'adjustment', qty: diff,
        qty_before: qtyBefore, qty_after: item.actual_qty,
        ref_type: 'opname', notes: notes || 'Stok opname',
        created_by: req.user?.id,
      }, { transaction: t });

      adjustments.push({ product_id: item.product_id, diff, qty_before: qtyBefore, qty_after: item.actual_qty });
    }

    await t.commit();
    return res.json({
      success: true,
      message: `Stok opname selesai — ${adjustments.length} produk disesuaikan`,
      data: { adjustments },
    });
  } catch (err) { await t.rollback(); next(err); }
};

module.exports = {
  getPurchases, getPurchaseDetail, createPurchase, receivePurchase, cancelPurchase,
  getExpenses, createExpense, updateExpense, deleteExpense,
  getProfitLoss,
  getStockOpname, submitStockOpname,
};
