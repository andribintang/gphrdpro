const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const {
  Product, Stock, StockMovement,
  Order, OrderItem, Return, ReturnItem,
  Purchase, PurchaseItem, Expense,
} = require('../../models/erp');

const toNum = v => parseFloat(v) || 0;

// ── Generate PO Number ────────────────────────────────────────
const generatePoNo = async (branchId) => {
  const prefix = `PO${branchId}`;
  const date   = new Date();
  const ymd    = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
  const last   = await Purchase.findOne({ where: { po_no: { [Op.like]: `${prefix}${ymd}%` } }, order: [['id','DESC']] });
  const seq    = last ? parseInt(last.po_no.slice(-4)) + 1 : 1;
  return `${prefix}${ymd}${String(seq).padStart(4,'0')}`;
};

// ── Purchases ─────────────────────────────────────────────────
const getPurchases = async (req, res, next) => {
  try {
    const { branch_id, status, page=1, limit=50 } = req.query;
    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (status)    where.status    = status;
    const { count, rows } = await Purchase.findAndCountAll({
      where, limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
      include: [{ model: PurchaseItem, as: 'items' }],
      order: [['created_at','DESC']],
    });
    return res.json({ success:true, data:{ purchases: rows, total: count } });
  } catch (err) { next(err); }
};

const getPurchaseDetail = async (req, res, next) => {
  try {
    const po = await Purchase.findByPk(req.params.id, { include: [{ model: PurchaseItem, as: 'items' }] });
    if (!po) return res.status(404).json({ success:false, message:'PO tidak ditemukan' });
    return res.json({ success:true, data:{ purchase: po } });
  } catch (err) { next(err); }
};

const createPurchase = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { branch_id, supplier_name, supplier_phone, order_date, expected_date, notes, items=[] } = req.body;
    if (!items.length) { await t.rollback(); return res.status(400).json({ success:false, message:'Minimal 1 item' }); }

    let subtotal = 0;
    const poItems = [];
    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) throw new Error(`Produk ID ${item.product_id} tidak ditemukan`);
      const sub = toNum(item.buy_price) * parseInt(item.qty_ordered);
      subtotal += sub;
      poItems.push({ product_id: item.product_id, product_name: product.name, qty_ordered: parseInt(item.qty_ordered), qty_received: 0, buy_price: toNum(item.buy_price), subtotal: sub });
    }

    const poNo = await generatePoNo(branch_id);
    const po = await Purchase.create({
      po_no: poNo, branch_id, supplier_name, supplier_phone, order_date: order_date||new Date().toISOString().split('T')[0],
      expected_date: expected_date||null, status: 'ordered', subtotal, total_amount: subtotal, notes, created_by: req.user?.id,
    }, { transaction: t });

    await PurchaseItem.bulkCreate(poItems.map(i=>({...i, purchase_id: po.id})), { transaction: t });
    await t.commit();
    return res.status(201).json({ success:true, message:`PO ${poNo} dibuat`, data:{ purchase: po } });
  } catch (err) { await t.rollback(); next(err); }
};

const receivePurchase = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const po = await Purchase.findByPk(req.params.id, { include:[{ model: PurchaseItem, as:'items' }], transaction: t });
    if (!po) { await t.rollback(); return res.status(404).json({ success:false, message:'PO tidak ditemukan' }); }
    if (po.status === 'received') { await t.rollback(); return res.status(400).json({ success:false, message:'PO sudah diterima' }); }

    for (const item of po.items) {
      let stock = await Stock.findOne({ where:{ product_id: item.product_id, branch_id: po.branch_id }, transaction: t });
      if (!stock) stock = await Stock.create({ product_id: item.product_id, branch_id: po.branch_id, qty: 0 }, { transaction: t });
      const qtyBefore = stock.qty;
      await stock.update({ qty: qtyBefore + item.qty_ordered }, { transaction: t });
      await StockMovement.create({
        product_id: item.product_id, branch_id: po.branch_id,
        type: 'in', qty: item.qty_ordered, qty_before: qtyBefore, qty_after: qtyBefore + item.qty_ordered,
        ref_type: 'purchase', ref_id: po.id, notes: `PO ${po.po_no}`, created_by: req.user?.id,
      }, { transaction: t });
      await item.update({ qty_received: item.qty_ordered }, { transaction: t });
      await Product.update({ buy_price: item.buy_price }, { where: { id: item.product_id }, transaction: t });
    }
    await po.update({ status: 'received', received_date: new Date().toISOString().split('T')[0] }, { transaction: t });
    await t.commit();
    return res.json({ success:true, message:`PO ${po.po_no} diterima — stok bertambah` });
  } catch (err) { await t.rollback(); next(err); }
};

const cancelPurchase = async (req, res, next) => {
  try {
    const po = await Purchase.findByPk(req.params.id);
    if (!po) return res.status(404).json({ success:false, message:'PO tidak ditemukan' });
    await po.update({ status: 'cancelled' });
    return res.json({ success:true, message:'PO dibatalkan' });
  } catch (err) { next(err); }
};

// ── Expenses ──────────────────────────────────────────────────
const getExpenses = async (req, res, next) => {
  try {
    const { branch_id, date_from, date_to, category, limit=200, page=1 } = req.query;
    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (category)  where.category  = category;
    if (date_from || date_to) {
      where.expense_date = {};
      if (date_from) where.expense_date[Op.gte] = date_from;
      if (date_to)   where.expense_date[Op.lte] = date_to;
    }
    const { count, rows } = await Expense.findAndCountAll({
      where, limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit), order:[['expense_date','DESC']],
    });
    return res.json({ success:true, data:{ expenses: rows, total: count } });
  } catch (err) { next(err); }
};

const createExpense = async (req, res, next) => {
  try {
    const exp = await Expense.create({ ...req.body, created_by: req.user?.id });
    return res.status(201).json({ success:true, data:{ expense: exp } });
  } catch (err) { next(err); }
};

const updateExpense = async (req, res, next) => {
  try {
    const exp = await Expense.findByPk(req.params.id);
    if (!exp) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
    await exp.update(req.body);
    return res.json({ success:true, data:{ expense: exp } });
  } catch (err) { next(err); }
};

const deleteExpense = async (req, res, next) => {
  try {
    const exp = await Expense.findByPk(req.params.id);
    if (!exp) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
    await exp.destroy();
    return res.json({ success:true, message:'Dihapus' });
  } catch (err) { next(err); }
};

// ── Stock Opname ──────────────────────────────────────────────
const getStockOpname = async (req, res, next) => {
  try {
    const { branch_id } = req.query;
    const where = { is_active: true };
    if (branch_id) where.branch_id = branch_id;
    const products = await Product.findAll({ where, include:[{ model: Stock, as:'stock', required:false }], order:[['name','ASC']] });
    return res.json({ success:true, data:{ products } });
  } catch (err) { next(err); }
};

const submitStockOpname = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { branch_id, items=[] } = req.body;
    let updated = 0;
    for (const item of items) {
      let stock = await Stock.findOne({ where:{ product_id: item.product_id, branch_id }, transaction: t });
      if (!stock) { stock = await Stock.create({ product_id: item.product_id, branch_id, qty: 0 }, { transaction: t }); }
      const qtyBefore = stock.qty;
      const qtyAfter  = parseInt(item.actual_qty);
      if (qtyBefore !== qtyAfter) {
        await stock.update({ qty: qtyAfter }, { transaction: t });
        await StockMovement.create({
          product_id: item.product_id, branch_id,
          type: 'adjustment', qty: qtyAfter - qtyBefore,
          qty_before: qtyBefore, qty_after: qtyAfter,
          ref_type: 'opname', notes: 'Stock Opname', created_by: req.user?.id,
          created_at: new Date(), updated_at: new Date(),
          created_at: new Date(), updated_at: new Date(),
        }, { transaction: t });
        updated++;
      }
    }
    await t.commit();
    return res.json({ success:true, message:`${updated} produk diupdate`, data:{ updated } });
  } catch (err) { await t.rollback(); next(err); }
};

// ── Profit & Loss ─────────────────────────────────────────────
const getProfitLoss = async (req, res, next) => {
  try {
    const { branch_id, date_from, date_to } = req.query;
    const now  = new Date();
    const from = date_from || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const to   = date_to   || now.toISOString().split('T')[0];

    const orderWhere = {
      status:     { [Op.in]: ['confirmed','processing','shipped','completed','returned'] },
      order_date: { [Op.between]: [from, to] },
    };
    if (branch_id) orderWhere.branch_id = branch_id;

    // Revenue
    const orders = await Order.findAll({ where: orderWhere, attributes:['total_amount','subtotal','discount_amount','shipping_cost','admin_fee'], raw:true });
    const revenue    = orders.reduce((s,o) => s + toNum(o.total_amount), 0);
    const shipping   = orders.reduce((s,o) => s + toNum(o.shipping_cost), 0);
    const adminFee   = orders.reduce((s,o) => s + toNum(o.admin_fee), 0);

    // COGS
    const orderIds = await Order.findAll({ where: orderWhere, attributes:['id'], raw:true }).then(r=>r.map(o=>o.id));
    let cogs = 0;
    if (orderIds.length) {
      const orderItems = await OrderItem.findAll({ where: { order_id: { [Op.in]: orderIds } }, attributes:['qty','buy_price'], raw:true });
      cogs = orderItems.reduce((s,i) => s + (toNum(i.buy_price) * parseInt(i.qty)), 0);
    }

    // Returns
    const retWhere = { status:'confirmed', created_at: { [Op.between]: [new Date(from), new Date(to+'T23:59:59')] } };
    if (branch_id) retWhere.branch_id = branch_id;
    const returns = await Return.findAll({ where: retWhere, include:[{ model: ReturnItem, as:'items', attributes:['subtotal'] }] });
    const returnsTotal = returns.reduce((s,r) => s + (r.items||[]).reduce((si,i) => si+toNum(i.subtotal), 0), 0);

    // Expenses
    const expWhere = { expense_date: { [Op.between]: [from, to] } };
    if (branch_id) expWhere.branch_id = branch_id;
    const expenses    = await Expense.findAll({ where: expWhere, attributes:['amount'], raw:true });
    const expensesTotal = expenses.reduce((s,e) => s + toNum(e.amount), 0);

    const netRevenue = revenue - returnsTotal;
    const netProfit  = netRevenue - cogs - shipping - adminFee - expensesTotal;
    const margin     = netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(1) + '%' : '0%';

    return res.json({
      success: true,
      data: {
        revenue, returns: returnsTotal, net_revenue: netRevenue,
        cogs, shipping, admin_fee: adminFee, expenses: expensesTotal,
        net_profit: netProfit, margin,
        period: { from, to },
      },
    });
  } catch (err) { next(err); }
};

module.exports = {
  getPurchases, getPurchaseDetail, createPurchase, receivePurchase, cancelPurchase,
  getExpenses, createExpense, updateExpense, deleteExpense,
  getStockOpname, submitStockOpname,
  getProfitLoss,
};
