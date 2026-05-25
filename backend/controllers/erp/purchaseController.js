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

// ── GET Suppliers (distinct from existing POs) ────────────────
const getSuppliers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) where.supplier_name = { [Op.like]: `%${search}%` };
    const suppliers = await Purchase.findAll({
      where: { supplier_name: { [Op.ne]: null }, ...where },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('supplier_name')), 'supplier_name'], 'supplier_phone', 'supplier_email', 'supplier_address'],
      group: ['supplier_name', 'supplier_phone', 'supplier_email', 'supplier_address'],
      order: [['supplier_name', 'ASC']],
      limit: 20,
    });
    return res.json({ success: true, data: { suppliers } });
  } catch (err) { next(err); }
};

// ── GET Purchases ─────────────────────────────────────────────
const getPurchases = async (req, res, next) => {
  try {
    const { branch_id, status, date_from, date_to, page=1, limit=50 } = req.query;
    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (status)    where.status    = status;
    if (date_from || date_to) {
      where.order_date = {};
      if (date_from) where.order_date[Op.gte] = date_from;
      if (date_to)   where.order_date[Op.lte] = date_to;
    }
    const { count, rows } = await Purchase.findAndCountAll({
      where, limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
      include: [{ model: PurchaseItem, as: 'items' }],
      order: [['created_at','DESC']],
    });
    return res.json({ success:true, data:{ purchases: rows, total: count } });
  } catch (err) { next(err); }
};

// ── GET Purchase Detail ───────────────────────────────────────
const getPurchaseDetail = async (req, res, next) => {
  try {
    const po = await Purchase.findByPk(req.params.id, {
      include: [{ model: PurchaseItem, as: 'items' }],
    });
    if (!po) return res.status(404).json({ success:false, message:'PO tidak ditemukan' });
    return res.json({ success:true, data:{ purchase: po } });
  } catch (err) { next(err); }
};

// ── CREATE Purchase ───────────────────────────────────────────
const createPurchase = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      branch_id, supplier_name, supplier_phone, supplier_email, supplier_address,
      order_date, expected_date, shipping_cost=0, notes, items=[],
    } = req.body;
    if (!items.length) { await t.rollback(); return res.status(400).json({ success:false, message:'Minimal 1 item' }); }

    let subtotal = 0;
    const poItems = [];
    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) throw new Error(`Produk ID ${item.product_id} tidak ditemukan`);
      const sub = toNum(item.buy_price) * parseInt(item.qty_ordered||1);
      subtotal += sub;
      poItems.push({
        product_id: item.product_id, product_name: product.name,
        qty_ordered: parseInt(item.qty_ordered||1), qty_received: 0,
        buy_price: toNum(item.buy_price), subtotal: sub,
      });
    }

    const totalAmount = subtotal + toNum(shipping_cost);
    const poNo = await generatePoNo(branch_id);
    const po = await Purchase.create({
      po_no: poNo, branch_id, supplier_name, supplier_phone: supplier_phone||null,
      // supplier_email and supplier_address will be added after DB migration
      order_date: order_date||new Date().toISOString().split('T')[0],
      expected_date: expected_date||null, status: 'ordered',
      subtotal, shipping_cost: toNum(shipping_cost), total_amount: totalAmount,
      notes, created_by: req.user?.id,
    }, { transaction: t });

    await PurchaseItem.bulkCreate(poItems.map(i=>({...i, purchase_id: po.id})), { transaction: t });
    await t.commit();

    const created = await Purchase.findByPk(po.id, { include:[{ model: PurchaseItem, as:'items' }] });
    return res.status(201).json({ success:true, message:`PO ${poNo} dibuat`, data:{ purchase: created } });
  } catch (err) { await t.rollback(); next(err); }
};

// ── UPDATE Purchase (only if not received) ────────────────────
const updatePurchase = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const po = await Purchase.findByPk(req.params.id, { include:[{ model: PurchaseItem, as:'items' }], transaction: t });
    if (!po) { await t.rollback(); return res.status(404).json({ success:false, message:'PO tidak ditemukan' }); }
    if (['received','cancelled'].includes(po.status)) {
      await t.rollback(); return res.status(400).json({ success:false, message:`PO sudah ${po.status}, tidak bisa diedit` });
    }

    const {
      supplier_name, supplier_phone, supplier_email, supplier_address,
      order_date, expected_date, shipping_cost, notes, items,
    } = req.body;

    // Update header
    await po.update({
      supplier_name: supplier_name||po.supplier_name,
      supplier_phone: supplier_phone||po.supplier_phone,
      supplier_email: supplier_email||po.supplier_email,
      supplier_address: supplier_address||po.supplier_address,
      order_date: order_date||po.order_date,
      expected_date: expected_date||po.expected_date,
      shipping_cost: shipping_cost!=null ? toNum(shipping_cost) : po.shipping_cost,
      notes: notes!=null ? notes : po.notes,
    }, { transaction: t });

    // Update items if provided
    if (items?.length) {
      await PurchaseItem.destroy({ where: { purchase_id: po.id }, transaction: t });
      let subtotal = 0;
      const poItems = [];
      for (const item of items) {
        const product = await Product.findByPk(item.product_id, { transaction: t });
        if (!product) throw new Error(`Produk ID ${item.product_id} tidak ditemukan`);
        const sub = toNum(item.buy_price) * parseInt(item.qty_ordered||1);
        subtotal += sub;
        poItems.push({ purchase_id: po.id, product_id: item.product_id, product_name: product.name, qty_ordered: parseInt(item.qty_ordered||1), qty_received: 0, buy_price: toNum(item.buy_price), subtotal: sub });
      }
      await PurchaseItem.bulkCreate(poItems, { transaction: t });
      const sc = shipping_cost!=null ? toNum(shipping_cost) : toNum(po.shipping_cost);
      await po.update({ subtotal, total_amount: subtotal + sc }, { transaction: t });
    }

    await t.commit();
    const updated = await Purchase.findByPk(po.id, { include:[{ model: PurchaseItem, as:'items' }] });
    return res.json({ success:true, message:'PO diperbarui', data:{ purchase: updated } });
  } catch (err) { await t.rollback(); next(err); }
};

// ── RECEIVE Purchase (partial supported) ─────────────────────
const receivePurchase = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const po = await Purchase.findByPk(req.params.id, { include:[{ model: PurchaseItem, as:'items' }], transaction: t });
    if (!po) { await t.rollback(); return res.status(404).json({ success:false, message:'PO tidak ditemukan' }); }
    if (po.status === 'received') { await t.rollback(); return res.status(400).json({ success:false, message:'PO sudah fully diterima' }); }
    if (po.status === 'cancelled') { await t.rollback(); return res.status(400).json({ success:false, message:'PO dibatalkan' }); }

    // req.body.items = [{ purchase_item_id, qty_received }] or empty = receive all
    const receivedItems = req.body.items; // array of { purchase_item_id, qty_received }
    const receivedDate = req.body.received_date || new Date().toISOString().split('T')[0];

    let allFullyReceived = true;
    let anyReceived = false;

    for (const item of po.items) {
      // Find qty to receive for this item
      let qtyToReceive;
      if (receivedItems?.length) {
        const ri = receivedItems.find(r => r.purchase_item_id == item.id);
        if (!ri || !ri.qty_received) { if ((item.qty_received || 0) < item.qty_ordered) allFullyReceived = false; continue; }
        qtyToReceive = Math.min(parseInt(ri.qty_received), item.qty_ordered - (item.qty_received||0));
      } else {
        // Receive all remaining
        qtyToReceive = item.qty_ordered - (item.qty_received||0);
      }

      if (qtyToReceive <= 0) { if ((item.qty_received||0) < item.qty_ordered) allFullyReceived = false; continue; }

      let stock = await Stock.findOne({ where:{ product_id: item.product_id, branch_id: po.branch_id }, transaction: t });
      if (!stock) stock = await Stock.create({ product_id: item.product_id, branch_id: po.branch_id, qty: 0 }, { transaction: t });
      const qtyBefore = stock.qty;
      await stock.update({ qty: qtyBefore + qtyToReceive }, { transaction: t });
      await StockMovement.create({
        product_id: item.product_id, branch_id: po.branch_id,
        type: 'in', qty: qtyToReceive, qty_before: qtyBefore, qty_after: qtyBefore + qtyToReceive,
        ref_type: 'purchase', ref_id: po.id, notes: `PO ${po.po_no} — penerimaan ${receivedDate}`,
        created_by: req.user?.id, created_at: new Date(), updated_at: new Date(),
      }, { transaction: t });

      const newQtyReceived = (item.qty_received||0) + qtyToReceive;
      await item.update({ qty_received: newQtyReceived }, { transaction: t });
      if (newQtyReceived < item.qty_ordered) allFullyReceived = false;
      anyReceived = true;

      // Update product buy price
      await Product.update({ buy_price: item.buy_price }, { where: { id: item.product_id }, transaction: t });
    }

    if (!anyReceived) { await t.rollback(); return res.status(400).json({ success:false, message:'Tidak ada item yang diterima' }); }

    const newStatus = allFullyReceived ? 'received' : 'partial';
    await po.update({ status: newStatus, received_date: receivedDate }, { transaction: t });
    await t.commit();
    return res.json({ success:true, message:`PO ${po.po_no} ${allFullyReceived ? 'fully diterima' : 'partial diterima'} — stok bertambah` });
  } catch (err) { await t.rollback(); next(err); }
};

// ── CANCEL Purchase ───────────────────────────────────────────
const cancelPurchase = async (req, res, next) => {
  try {
    const po = await Purchase.findByPk(req.params.id);
    if (!po) return res.status(404).json({ success:false, message:'PO tidak ditemukan' });
    if (po.status === 'received') return res.status(400).json({ success:false, message:'PO sudah diterima, tidak bisa dibatalkan' });
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
  try { const exp = await Expense.create({ ...req.body, created_by: req.user?.id }); return res.status(201).json({ success:true, data:{ expense: exp } }); }
  catch (err) { next(err); }
};
const updateExpense = async (req, res, next) => {
  try { const exp = await Expense.findByPk(req.params.id); if (!exp) return res.status(404).json({ success:false, message:'Tidak ditemukan' }); await exp.update(req.body); return res.json({ success:true, data:{ expense: exp } }); }
  catch (err) { next(err); }
};
const deleteExpense = async (req, res, next) => {
  try { const exp = await Expense.findByPk(req.params.id); if (!exp) return res.status(404).json({ success:false, message:'Tidak ditemukan' }); await exp.destroy(); return res.json({ success:true, message:'Dihapus' }); }
  catch (err) { next(err); }
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
      if (!stock) stock = await Stock.create({ product_id: item.product_id, branch_id, qty: 0 }, { transaction: t });
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
    const orderWhere = { status: { [Op.in]: ['confirmed','processing','shipped','completed','returned'] }, order_date: { [Op.between]: [from, to] } };
    if (branch_id) orderWhere.branch_id = branch_id;
    const orders = await Order.findAll({ where: orderWhere, attributes:['id','total_amount','subtotal','discount_amount','shipping_cost','admin_fee'], raw:true });
    const revenue  = orders.reduce((s,o) => s + toNum(o.total_amount), 0);
    const shipping = orders.reduce((s,o) => s + toNum(o.shipping_cost), 0);
    const adminFee = orders.reduce((s,o) => s + toNum(o.admin_fee), 0);
    const orderIds = orders.map(o=>o.id);
    let cogs = 0;
    if (orderIds.length) {
      const items = await OrderItem.findAll({ where: { order_id: { [Op.in]: orderIds } }, attributes:['qty','buy_price'], raw:true });
      cogs = items.reduce((s,i) => s + (toNum(i.buy_price) * parseInt(i.qty)), 0);
    }
    const retWhere = { status:'confirmed', created_at: { [Op.between]: [new Date(from), new Date(to+'T23:59:59')] } };
    if (branch_id) retWhere.branch_id = branch_id;
    const returns = await Return.findAll({ where: retWhere, include:[{ model: ReturnItem, as:'items', attributes:['subtotal'] }] });
    const returnsTotal = returns.reduce((s,r) => s + (r.items||[]).reduce((si,i) => si+toNum(i.subtotal), 0), 0);
    const expWhere = { expense_date: { [Op.between]: [from, to] } };
    if (branch_id) expWhere.branch_id = branch_id;
    const expenses = await Expense.findAll({ where: expWhere, attributes:['amount'], raw:true });
    const expensesTotal = expenses.reduce((s,e) => s + toNum(e.amount), 0);
    const netRevenue = revenue - returnsTotal;
    const netProfit  = netRevenue - cogs - shipping - adminFee - expensesTotal;
    const margin     = netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(1) + '%' : '0%';
    return res.json({ success:true, data: { revenue, returns: returnsTotal, net_revenue: netRevenue, cogs, shipping, admin_fee: adminFee, expenses: expensesTotal, net_profit: netProfit, margin, period: { from, to } } });
  } catch (err) { next(err); }
};

module.exports = {
  getSuppliers,
  getPurchases, getPurchaseDetail, createPurchase, updatePurchase, receivePurchase, cancelPurchase,
  getExpenses, createExpense, updateExpense, deleteExpense,
  getStockOpname, submitStockOpname,
  getProfitLoss,
};
