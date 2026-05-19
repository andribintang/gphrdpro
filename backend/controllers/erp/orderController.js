const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const {
  Category, Product, Stock, StockMovement,
  Customer, Order, OrderItem, Payment, Shipment,
} = require('../../models/erp');

const toNum = v => parseFloat(v) || 0;

// ── Generate order number ────────────────────────────────────
const generateOrderNo = async (branchId) => {
  const prefix  = branchId === 1 ? 'GPC' : 'GPD'; // GPC = GP Racing, GPD = GP Distro
  const date    = new Date();
  const ymd     = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
  const last    = await Order.findOne({ where: { order_no: { [Op.like]: `${prefix}${ymd}%` } }, order: [['id','DESC']] });
  const seq     = last ? parseInt(last.order_no.slice(-4)) + 1 : 1;
  return `${prefix}${ymd}${String(seq).padStart(4,'0')}`;
};

// ════════════════════════════════════════════════════════════════
// GET ORDERS
// ════════════════════════════════════════════════════════════════
const getOrders = async (req, res, next) => {
  try {
    const { branch_id, status, channel, date_from, date_to, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (status)    where.status    = status;
    if (channel)   where.channel   = channel;
    if (date_from || date_to) {
      where.order_date = {};
      if (date_from) where.order_date[Op.gte] = date_from;
      if (date_to)   where.order_date[Op.lte] = date_to;
    }
    if (search) {
      where[Op.or] = [
        { order_no:       { [Op.like]: `%${search}%` } },
        { customer_name:  { [Op.like]: `%${search}%` } },
        { customer_phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page)-1) * parseInt(limit);
    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { model: Customer, as: 'customer', attributes: ['id','name','phone'], required: false },
        { model: Payment,  as: 'payments', attributes: ['id','method','amount','status'] },
        { model: Shipment, as: 'shipment', attributes: ['id','courier','tracking_no','status'] },
      ],
      order: [['created_at','DESC']],
      limit: parseInt(limit), offset,
    });

    return res.json({ success: true, data: { orders: rows, total: count, page: parseInt(page) } });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════
// GET ORDER DETAIL
// ════════════════════════════════════════════════════════════════
const getOrderDetail = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: Customer,  as: 'customer' },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id','name','sku','image_url'] }] },
        { model: Payment,   as: 'payments' },
        { model: Shipment,  as: 'shipment' },
      ],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    return res.json({ success: true, data: { order } });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════
// CREATE ORDER
// ════════════════════════════════════════════════════════════════
const createOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      branch_id, customer_id, channel, marketplace_name,
      salesperson_id, salesperson_user_id,
      customer_name, customer_phone, customer_address, customer_city,
      items, // [{ product_id, qty, sell_price, discount_pct }]
      discount_amount = 0,
      shipping_cost = 0,
      notes,
      order_date,
      payment_method, // optional: langsung bayar saat buat order
    } = req.body;

    if (!items?.length) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Order harus memiliki minimal 1 produk' });
    }

    // Validate & calculate items
    let subtotal = 0;
    const itemsData = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) throw new Error(`Produk ID ${item.product_id} tidak ditemukan`);

      // Check stock
      const stock = await Stock.findOne({ where: { product_id: item.product_id, branch_id }, transaction: t });
      const availableQty = stock ? stock.qty - stock.qty_reserved : 0;
      if (availableQty < item.qty) {
        throw new Error(`Stok ${product.name} tidak cukup (tersedia: ${availableQty}, butuh: ${item.qty})`);
      }

      const sellPrice     = toNum(item.sell_price || product.sell_price);
      const discountPct   = toNum(item.discount_pct);
      const discountAmt   = sellPrice * item.qty * discountPct / 100;
      const itemSubtotal  = (sellPrice * item.qty) - discountAmt;
      const itemProfit    = itemSubtotal - (product.buy_price * item.qty);

      subtotal += itemSubtotal;
      itemsData.push({
        product_id:   item.product_id,
        product_name: product.name,
        product_sku:  product.sku,
        qty:          item.qty,
        buy_price:    product.buy_price,
        sell_price:   sellPrice,
        discount_pct: discountPct,
        subtotal:     itemSubtotal,
        profit:       itemProfit,
      });

      // Reserve stock
      await stock.update({ qty_reserved: stock.qty_reserved + item.qty }, { transaction: t });
    }

    const totalAmount = subtotal - toNum(discount_amount) + toNum(shipping_cost);

    // Create order
    const orderNo = await generateOrderNo(branch_id);
    const order   = await Order.create({
      order_no: orderNo,
      branch_id, customer_id, channel,
      marketplace_name: marketplace_name || null,
      salesperson_id: salesperson_id || null,
      salesperson_user_id: salesperson_user_id || null,
      customer_name:    customer_name    || null,
      customer_phone:   customer_phone   || null,
      customer_address: customer_address || null,
      customer_city:    customer_city    || null,
      subtotal,
      discount_amount:  toNum(discount_amount),
      shipping_cost:    toNum(shipping_cost),
      total_amount:     totalAmount,
      status: 'draft',
      order_date: order_date || new Date().toISOString().split('T')[0],
      notes,
      created_by: req.user?.id,
    }, { transaction: t });

    // Create order items
    await OrderItem.bulkCreate(itemsData.map(item => ({ ...item, order_id: order.id })), { transaction: t });

    // Create payment if provided
    if (payment_method) {
      await Payment.create({
        order_id: order.id,
        method:   payment_method,
        amount:   totalAmount,
        status:   'pending',
      }, { transaction: t });
    }

    await t.commit();

    const created = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: Payment,   as: 'payments' },
      ],
    });

    return res.status(201).json({
      success: true,
      message: `Order ${orderNo} berhasil dibuat`,
      data: { order: created },
    });
  } catch (err) { await t.rollback(); next(err); }
};

// ════════════════════════════════════════════════════════════════
// CONFIRM ORDER — kurangi stok + sync ke insentif
// ════════════════════════════════════════════════════════════════
const confirmOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction: t,
    });

    if (!order) { await t.rollback(); return res.status(404).json({ success: false, message: 'Order tidak ditemukan' }); }
    if (order.status !== 'draft') { await t.rollback(); return res.status(400).json({ success: false, message: `Order sudah ${order.status}` }); }

    // Deduct stock for each item
    for (const item of order.items) {
      const stock = await Stock.findOne({ where: { product_id: item.product_id, branch_id: order.branch_id }, transaction: t });
      if (!stock || stock.qty < item.qty) {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Stok ${item.product_name} tidak cukup` });
      }

      const qtyBefore = stock.qty;
      const qtyAfter  = qtyBefore - item.qty;
      const reserved  = Math.max(0, stock.qty_reserved - item.qty);

      await stock.update({ qty: qtyAfter, qty_reserved: reserved }, { transaction: t });
      await StockMovement.create({
        product_id: item.product_id, branch_id: order.branch_id,
        type: 'out', qty: -item.qty, qty_before: qtyBefore, qty_after: qtyAfter,
        ref_type: 'order', ref_id: order.id, notes: `Order ${order.order_no}`,
        created_by: req.user?.id,
      }, { transaction: t });
    }

    await order.update({ status: 'confirmed', confirmed_at: new Date() }, { transaction: t });
    await t.commit();

    // ── Auto-sync ke Sistem Insentif ─────────────────────────
    try {
      await syncOrderToIncentive(order);
    } catch (syncErr) {
      console.warn('⚠️ Incentive sync failed (non-critical):', syncErr.message);
    }

    return res.json({ success: true, message: `Order ${order.order_no} dikonfirmasi & stok berkurang`, data: { order } });
  } catch (err) { await t.rollback(); next(err); }
};

// ── Auto-sync confirmed order ke sistem insentif ─────────────
const syncOrderToIncentive = async (order) => {
  if (order.is_synced_incentive) return; // sudah di-sync
  if (!order.salesperson_id && !order.salesperson_user_id) return; // tidak ada salesperson

  const { WaSale, MarketplaceSale, MarketplaceShare, IncentivePeriod, SalesChannel } = require('../../models/incentive');

  // Find active period
  const now = new Date();
  const period = await IncentivePeriod.findOne({
    where: {
      status: { [Op.in]: ['draft','calculated'] },
      start_date: { [Op.lte]: order.order_date },
      end_date:   { [Op.gte]: order.order_date },
    },
  });
  if (!period) return; // tidak ada periode aktif

  const employeeId = order.salesperson_id;
  const amount     = parseFloat(order.total_amount);

  if (order.channel === 'wa') {
    // WA Sales
    const channel = await SalesChannel.findOne({ where: { code: 'WA' } });
    const pct     = parseFloat(channel?.percentage || 3);
    await WaSale.create({
      period_id:        period.id,
      employee_id:      employeeId,
      branch_id:        order.branch_id, // inc_branches mapped by same branch_id
      sale_amount:      amount,
      channel_pct:      pct,
      incentive_amount: amount * pct / 100,
      date:             order.order_date,
      customer_name:    order.customer_name || '',
      notes:            `Auto dari Order ${order.order_no}`,
    });
  } else if (order.channel === 'marketplace') {
    // Marketplace — buat sale + share untuk salesperson
    const channel = await SalesChannel.findOne({ where: { code: 'MARKETPLACE' } });
    const pct     = parseFloat(channel?.percentage || 0.5);
    const mpSale  = await MarketplaceSale.create({
      period_id:     period.id,
      branch_id:     order.branch_id,
      platform:      order.marketplace_name || 'marketplace',
      total_amount:  amount,
      date:          order.order_date,
      notes:         `Auto dari Order ${order.order_no}`,
    });
    await MarketplaceShare.create({
      marketplace_sale_id: mpSale.id,
      employee_id:         employeeId,
      performance_amount:  amount,
      incentive_amount:    amount * pct / 100,
    });
  }

  // Mark as synced
  await Order.update({ is_synced_incentive: true, synced_at: new Date() }, { where: { id: order.id } });
};

// ════════════════════════════════════════════════════════════════
// COMPLETE / CANCEL ORDER
// ════════════════════════════════════════════════════════════════
const completeOrder = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    if (!['confirmed','processing','shipped'].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Tidak bisa complete dari status ${order.status}` });
    }
    await order.update({ status: 'completed', completed_at: new Date() });
    return res.json({ success: true, message: `Order ${order.order_no} selesai`, data: { order } });
  } catch (err) { next(err); }
};

const cancelOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction: t,
    });
    if (!order) { await t.rollback(); return res.status(404).json({ success: false, message: 'Order tidak ditemukan' }); }
    if (['completed','cancelled'].includes(order.status)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Order sudah ${order.status}` });
    }

    // Restore stock if was confirmed
    if (order.status === 'confirmed' || order.status === 'processing') {
      for (const item of order.items) {
        const stock = await Stock.findOne({ where: { product_id: item.product_id, branch_id: order.branch_id }, transaction: t });
        if (stock) {
          const qtyBefore = stock.qty;
          await stock.update({ qty: qtyBefore + item.qty }, { transaction: t });
          await StockMovement.create({
            product_id: item.product_id, branch_id: order.branch_id,
            type: 'return', qty: item.qty, qty_before: qtyBefore, qty_after: qtyBefore + item.qty,
            ref_type: 'order', ref_id: order.id, notes: `Cancel Order ${order.order_no}`,
            created_by: req.user?.id,
          }, { transaction: t });
        }
      }
    }

    await order.update({ status: 'cancelled' }, { transaction: t });
    await t.commit();
    return res.json({ success: true, message: `Order ${order.order_no} dibatalkan`, data: { order } });
  } catch (err) { await t.rollback(); next(err); }
};

// ════════════════════════════════════════════════════════════════
// PAYMENT
// ════════════════════════════════════════════════════════════════
const addPayment = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    const payment = await Payment.create({ ...req.body, order_id: order.id });
    return res.status(201).json({ success: true, data: { payment } });
  } catch (err) { next(err); }
};

const verifyPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByPk(req.params.paymentId);
    if (!payment) return res.status(404).json({ success: false, message: 'Pembayaran tidak ditemukan' });
    await payment.update({ status: 'verified', paid_at: new Date(), verified_by: req.user?.id });
    return res.json({ success: true, message: 'Pembayaran terverifikasi', data: { payment } });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════
// SHIPMENT
// ════════════════════════════════════════════════════════════════
const addShipment = async (req, res, next) => {
  try {
    const order    = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    const shipment = await Shipment.create({ ...req.body, order_id: order.id });
    await order.update({ status: 'shipped' });
    return res.status(201).json({ success: true, data: { shipment } });
  } catch (err) { next(err); }
};

const updateShipment = async (req, res, next) => {
  try {
    const shipment = await Shipment.findByPk(req.params.shipmentId);
    if (!shipment) return res.status(404).json({ success: false, message: 'Pengiriman tidak ditemukan' });
    await shipment.update(req.body);
    if (req.body.status === 'delivered') {
      await Order.update({ status: 'completed', completed_at: new Date() }, { where: { id: shipment.order_id } });
    }
    return res.json({ success: true, data: { shipment } });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════════════════════════
const getSalesReport = async (req, res, next) => {
  try {
    const { branch_id, date_from, date_to, group_by = 'day' } = req.query;
    const where = { status: { [Op.in]: ['confirmed','processing','shipped','completed'] } };
    if (branch_id) where.branch_id = branch_id;
    if (date_from || date_to) {
      where.order_date = {};
      if (date_from) where.order_date[Op.gte] = date_from;
      if (date_to)   where.order_date[Op.lte] = date_to;
    }

    const orders = await Order.findAll({
      where,
      attributes: ['order_date','channel','total_amount','subtotal','discount_amount','shipping_cost'],
      include: [{ model: OrderItem, as: 'items', attributes: ['qty','sell_price','buy_price','subtotal','profit'] }],
    });

    // Aggregate
    const summary = {
      total_orders:  orders.length,
      total_revenue: orders.reduce((s,o) => s + parseFloat(o.total_amount), 0),
      total_profit:  orders.reduce((s,o) => s + o.items.reduce((si, i) => si + parseFloat(i.profit), 0), 0),
      by_channel: {},
    };

    orders.forEach(o => {
      if (!summary.by_channel[o.channel]) summary.by_channel[o.channel] = { orders: 0, revenue: 0 };
      summary.by_channel[o.channel].orders++;
      summary.by_channel[o.channel].revenue += parseFloat(o.total_amount);
    });

    return res.json({ success: true, data: { summary, orders } });
  } catch (err) { next(err); }
};

const getShipmentReport = async (req, res, next) => {
  try {
    const { branch_id, date_from, date_to, status } = req.query;
    const orderWhere = {};
    if (branch_id) orderWhere.branch_id = branch_id;

    const shipmentWhere = {};
    if (status) shipmentWhere.status = status;
    if (date_from || date_to) {
      shipmentWhere.shipped_at = {};
      if (date_from) shipmentWhere.shipped_at[Op.gte] = new Date(date_from);
      if (date_to)   shipmentWhere.shipped_at[Op.lte] = new Date(date_to + 'T23:59:59');
    }

    const shipments = await Shipment.findAll({
      where: shipmentWhere,
      include: [{
        model: Order, as: 'order',
        where: orderWhere,
        attributes: ['id','order_no','customer_name','customer_phone','customer_city','total_amount'],
      }],
      order: [['shipped_at','DESC']],
    });

    return res.json({ success: true, data: { shipments, total: shipments.length } });
  } catch (err) { next(err); }
};

module.exports = {
  getOrders, getOrderDetail, createOrder,
  confirmOrder, completeOrder, cancelOrder,
  addPayment, verifyPayment,
  addShipment, updateShipment,
  getSalesReport, getShipmentReport,
};
