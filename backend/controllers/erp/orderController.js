const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const {
  SubChannel, Category, Product, Stock, StockMovement,
  Customer, Order, OrderItem, Payment, Shipment,
  Return, ReturnItem,
} = require('../../models/erp');

const toNum = v => parseFloat(v) || 0;

const generateOrderNo = async (branchId) => {
  const prefix = branchId === 1 ? 'GPC' : 'GPD';
  const date   = new Date();
  const ymd    = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
  const last   = await Order.findOne({ where: { order_no: { [Op.like]: `${prefix}${ymd}%` } }, order: [['id','DESC']] });
  const seq    = last ? parseInt(last.order_no.slice(-4)) + 1 : 1;
  return `${prefix}${ymd}${String(seq).padStart(4,'0')}`;
};

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

const getOrderDetail = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: Customer,  as: 'customer' },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id','name','sku'] }] },
        { model: Payment,   as: 'payments' },
        { model: Shipment,  as: 'shipment' },
      ],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    return res.json({ success: true, data: { order } });
  } catch (err) { next(err); }
};

const createOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      branch_id, customer_id, channel, marketplace_name,
      salesperson_id, salesperson_user_id,
      customer_name, customer_phone, customer_address, customer_city,
      items, discount_amount = 0, shipping_cost = 0, admin_fee = 0,
      sub_channel_id, sub_channel_name,
      notes, order_date, payment_method,
    } = req.body;

    if (!items?.length) { await t.rollback(); return res.status(400).json({ success: false, message: 'Minimal 1 produk' }); }

    let subtotal = 0;
    const itemsData = [];
    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) throw new Error(`Produk ID ${item.product_id} tidak ditemukan`);
      const stock = await Stock.findOne({ where: { product_id: item.product_id, branch_id }, transaction: t });
      const availableQty = stock ? stock.qty - (stock.qty_reserved||0) : 0;
      if (availableQty < item.qty) throw new Error(`Stok ${product.name} tidak cukup (tersedia: ${availableQty})`);
      const sellPrice    = toNum(item.sell_price || product.sell_price);
      const discountPct  = toNum(item.discount_pct);
      const discountAmt  = sellPrice * item.qty * discountPct / 100;
      const itemSubtotal = (sellPrice * item.qty) - discountAmt;
      const itemProfit   = itemSubtotal - (toNum(product.buy_price) * item.qty);
      subtotal += itemSubtotal;
      itemsData.push({ product_id: item.product_id, product_name: product.name, product_sku: product.sku,
        qty: item.qty, buy_price: product.buy_price, sell_price: sellPrice,
        discount_pct: discountPct, subtotal: itemSubtotal, profit: itemProfit });
      if (stock) await stock.update({ qty_reserved: (stock.qty_reserved||0) + item.qty }, { transaction: t });
    }

    const adminFeeAmt = channel === 'marketplace' ? toNum(admin_fee) : 0;
    const totalAmount = subtotal - toNum(discount_amount) + toNum(shipping_cost) + adminFeeAmt;
    const orderNo     = await generateOrderNo(branch_id);
    const order = await Order.create({
      order_no: orderNo, branch_id, customer_id, channel,
      marketplace_name: marketplace_name || null,
      salesperson_id: salesperson_id || null,
      salesperson_user_id: salesperson_user_id || null,
      customer_name, customer_phone, customer_address, customer_city,
      sub_channel_id: sub_channel_id || null,
      sub_channel_name: sub_channel_name || null,
      admin_fee: adminFeeAmt,
      subtotal, discount_amount: toNum(discount_amount),
      shipping_cost: toNum(shipping_cost), total_amount: totalAmount,
      status: 'draft',
      order_date: order_date || new Date().toISOString().split('T')[0],
      notes, created_by: req.user?.id,
    }, { transaction: t });

    await OrderItem.bulkCreate(itemsData.map(i => ({ ...i, order_id: order.id })), { transaction: t });
    if (payment_method) await Payment.create({ order_id: order.id, method: payment_method, amount: totalAmount, status: 'pending' }, { transaction: t });
    await t.commit();
    const created = await Order.findByPk(order.id, { include: [{ model: OrderItem, as: 'items' }, { model: Payment, as: 'payments' }] });
    return res.status(201).json({ success: true, message: `Order ${orderNo} berhasil dibuat`, data: { order: created } });
  } catch (err) { await t.rollback(); next(err); }
};

const syncOrderToIncentive = async (order) => {
  if (order.is_synced_incentive) return;
  if (!order.salesperson_id && !order.salesperson_user_id) return;
  const { WaSale, MarketplaceSale, MarketplaceShare, IncentivePeriod, SalesChannel } = require('../../models/incentive');
  const period = await IncentivePeriod.findOne({
    where: { status: { [Op.in]: ['draft','calculated'] }, start_date: { [Op.lte]: order.order_date }, end_date: { [Op.gte]: order.order_date } },
  });
  if (!period) return;
  const employeeId = order.salesperson_id;
  const amount     = parseFloat(order.total_amount);
  if (order.channel === 'wa') {
    const ch = await SalesChannel.findOne({ where: { code: 'WA' } });
    const pct = parseFloat(ch?.percentage || 3);
    await WaSale.create({ period_id: period.id, employee_id: employeeId, branch_id: order.branch_id,
      sale_amount: amount, channel_pct: pct, incentive_amount: amount * pct / 100,
      date: order.order_date, customer_name: order.customer_name || '', notes: `Auto dari Order ${order.order_no}` });
  } else if (order.channel === 'marketplace') {
    const ch = await SalesChannel.findOne({ where: { code: 'MARKETPLACE' } });
    const pct = parseFloat(ch?.percentage || 0.5);
    const mpSale = await MarketplaceSale.create({ period_id: period.id, branch_id: order.branch_id,
      platform: order.marketplace_name || 'marketplace', total_amount: amount,
      date: order.order_date, notes: `Auto dari Order ${order.order_no}` });
    await MarketplaceShare.create({ marketplace_sale_id: mpSale.id, employee_id: employeeId,
      performance_amount: amount, incentive_amount: amount * pct / 100 });
  }
  await Order.update({ is_synced_incentive: true, synced_at: new Date() }, { where: { id: order.id } });
};

const confirmOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, { include: [{ model: OrderItem, as: 'items' }], transaction: t });
    if (!order) { await t.rollback(); return res.status(404).json({ success: false, message: 'Order tidak ditemukan' }); }
    if (order.status !== 'draft') { await t.rollback(); return res.status(400).json({ success: false, message: `Order sudah ${order.status}` }); }
    for (const item of order.items) {
      const stock = await Stock.findOne({ where: { product_id: item.product_id, branch_id: order.branch_id }, transaction: t });
      if (!stock || stock.qty < item.qty) { await t.rollback(); return res.status(400).json({ success: false, message: `Stok ${item.product_name} tidak cukup` }); }
      const qtyBefore = stock.qty;
      await stock.update({ qty: qtyBefore - item.qty, qty_reserved: Math.max(0, (stock.qty_reserved||0) - item.qty) }, { transaction: t });
      await StockMovement.create({ product_id: item.product_id, branch_id: order.branch_id,
        type: 'out', qty: -item.qty, qty_before: qtyBefore, qty_after: qtyBefore - item.qty,
        ref_type: 'order', ref_id: order.id, notes: `Order ${order.order_no}`, created_by: req.user?.id }, { transaction: t });
    }
    await order.update({ status: 'confirmed', confirmed_at: new Date() }, { transaction: t });
    await t.commit();
    try { await syncOrderToIncentive(order); } catch(e) { console.warn('Incentive sync failed:', e.message); }
    return res.json({ success: true, message: `Order ${order.order_no} dikonfirmasi`, data: { order } });
  } catch (err) { await t.rollback(); next(err); }
};

const completeOrder = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    await order.update({ status: 'completed', completed_at: new Date() });
    return res.json({ success: true, message: `Order ${order.order_no} selesai`, data: { order } });
  } catch (err) { next(err); }
};

const cancelOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, { include: [{ model: OrderItem, as: 'items' }], transaction: t });
    if (!order) { await t.rollback(); return res.status(404).json({ success: false, message: 'Order tidak ditemukan' }); }
    if (['completed','cancelled'].includes(order.status)) { await t.rollback(); return res.status(400).json({ success: false, message: `Order sudah ${order.status}` }); }
    if (['confirmed','processing'].includes(order.status)) {
      for (const item of order.items) {
        const stock = await Stock.findOne({ where: { product_id: item.product_id, branch_id: order.branch_id }, transaction: t });
        if (stock) {
          const qtyBefore = stock.qty;
          await stock.update({ qty: qtyBefore + item.qty }, { transaction: t });
          await StockMovement.create({ product_id: item.product_id, branch_id: order.branch_id,
            type: 'in', qty: item.qty, qty_before: qtyBefore, qty_after: qtyBefore + item.qty,
            ref_type: 'order', ref_id: order.id, notes: `Cancel ${order.order_no}`, created_by: req.user?.id }, { transaction: t });
        }
      }
    }
    await order.update({ status: 'cancelled' }, { transaction: t });
    await t.commit();
    return res.json({ success: true, message: `Order ${order.order_no} dibatalkan`, data: { order } });
  } catch (err) { await t.rollback(); next(err); }
};

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

const addShipment = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id);
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

const getSalesReport = async (req, res, next) => {
  try {
    const { branch_id, date_from, date_to } = req.query;
    const where = { status: { [Op.in]: ['confirmed','processing','shipped','completed'] } };
    if (branch_id) where.branch_id = branch_id;
    if (date_from || date_to) {
      where.order_date = {};
      if (date_from) where.order_date[Op.gte] = date_from;
      if (date_to)   where.order_date[Op.lte] = date_to;
    }
    const orders = await Order.findAll({ where,
      attributes: ['order_date','channel','total_amount','subtotal','discount_amount','shipping_cost'],
      include: [{ model: OrderItem, as: 'items', attributes: ['qty','sell_price','buy_price','subtotal','profit'] }] });
    const summary = { total_orders: orders.length,
      total_revenue: orders.reduce((s,o) => s + parseFloat(o.total_amount), 0),
      total_profit:  orders.reduce((s,o) => s + (o.items||[]).reduce((si,i) => si + parseFloat(i?.profit||0), 0), 0),
      by_channel: {} };
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
    const shipments = await Shipment.findAll({ where: shipmentWhere,
      include: [{ model: Order, as: 'order', where: orderWhere, attributes: ['id','order_no','customer_name','customer_phone','customer_city','total_amount'] }],
      order: [['shipped_at','DESC']] });
    return res.json({ success: true, data: { shipments, total: shipments.length } });
  } catch (err) { next(err); }
};

const getDailyReport = async (req, res, next) => {
  try {
    const { branch_id, date_from, date_to } = req.query;
    const now  = new Date();
    const from = date_from || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const to   = date_to   || now.toISOString().split('T')[0];
    const where = { status: { [Op.in]: ['confirmed','processing','shipped','completed'] }, order_date: { [Op.between]: [from, to] } };
    if (branch_id) where.branch_id = branch_id;
    const orders = await Order.findAll({ where, attributes: ['id','order_date','channel','sub_channel_name','total_amount','branch_id'], order: [['order_date','ASC']], raw: true });
    const dates = [];
    const cur = new Date(from); const end = new Date(to);
    while (cur <= end) { dates.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1); }
    const CHANNELS = ['marketplace','direct','wa'];
    const subMap = {}; CHANNELS.forEach(ch => { subMap[ch] = new Set(); });
    orders.forEach(o => { const ch = o.channel||'direct'; const sub = o.sub_channel_name||'(Langsung)'; if (subMap[ch]) subMap[ch].add(sub); });
    const matrix = {};
    orders.forEach(o => { const key = `${o.channel||'direct'}::${o.sub_channel_name||'(Langsung)'}`; if (!matrix[key]) matrix[key] = {}; matrix[key][o.order_date] = (matrix[key][o.order_date]||0) + parseFloat(o.total_amount||0); });
    const rows = [];
    CHANNELS.forEach(ch => {
      const subs = [...subMap[ch]].sort();
      if (!subs.length) return;
      let chTotal = 0; const chByDate = {};
      subs.forEach(sub => {
        const key = `${ch}::${sub}`; const rowData = { no: rows.length+1, channel: ch, sub_channel: sub, by_date: {}, total: 0 };
        dates.forEach(d => { const amt = matrix[key]?.[d]||0; rowData.by_date[d]=amt; rowData.total+=amt; chByDate[d]=(chByDate[d]||0)+amt; });
        chTotal += rowData.total; rows.push(rowData);
      });
      rows.push({ is_subtotal: true, channel: ch, label: `TOTAL ${ch.toUpperCase()}`, by_date: chByDate, total: chTotal });
    });
    const grandByDate = {}; let grandTotal = 0;
    rows.filter(r=>!r.is_subtotal).forEach(r => { Object.entries(r.by_date).forEach(([d,v]) => { grandByDate[d]=(grandByDate[d]||0)+v; }); grandTotal+=r.total; });
    rows.push({ is_grand_total: true, label: 'GRAND TOTAL', by_date: grandByDate, total: grandTotal });
    return res.json({ success: true, data: { dates, rows, period: { from, to }, grand_total: grandTotal } });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════
// LAPORAN HARIAN BY CHANNEL (bulan ini vs bulan lalu + forecast + retur)
// ════════════════════════════════════════════════════════════════
const getChannelReport = async (req, res, next) => {
  try {
    const { branch_id } = req.query;
    const today   = new Date();
    const year    = today.getFullYear();
    const month   = today.getMonth();
    const todayStr     = today.toISOString().split('T')[0];
    const mtdFrom      = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const mtdTo        = todayStr;
    const prevFrom     = new Date(year, month-1, 1).toISOString().split('T')[0];
    const prevTo       = new Date(year, month, 0).toISOString().split('T')[0];
    const daysInMonth  = new Date(year, month+1, 0).getDate();
    const daysPassed   = today.getDate();

    const baseWhere = { status: { [Op.in]: ['confirmed','processing','shipped','completed','returned'] } };
    if (branch_id) baseWhere.branch_id = branch_id;

    const [todayOrders, mtdOrders, prevOrders] = await Promise.all([
      Order.findAll({ where: { ...baseWhere, order_date: todayStr }, attributes:['channel','sub_channel_name','total_amount'], raw:true }),
      Order.findAll({ where: { ...baseWhere, order_date: { [Op.between]: [mtdFrom, mtdTo] } }, attributes:['channel','sub_channel_name','total_amount'], raw:true }),
      Order.findAll({ where: { ...baseWhere, order_date: { [Op.between]: [prevFrom, prevTo] } }, attributes:['channel','sub_channel_name','total_amount'], raw:true }),
    ]);

    // Returns for today and MTD
    const retWhere = { status: 'confirmed' };
    if (branch_id) retWhere.branch_id = branch_id;
    const [todayRets, mtdRets] = await Promise.all([
      Return.findAll({ where: { ...retWhere, confirmed_at: { [Op.between]: [new Date(todayStr+'T00:00:00'), new Date(todayStr+'T23:59:59')] } }, include: [{ model: ReturnItem, as:'items', attributes:['subtotal'] }, { model: Order, as:'order', attributes:['channel','sub_channel_name'] }] }),
      Return.findAll({ where: { ...retWhere, confirmed_at: { [Op.between]: [new Date(mtdFrom), new Date(mtdTo+'T23:59:59')] } }, include: [{ model: ReturnItem, as:'items', attributes:['subtotal'] }, { model: Order, as:'order', attributes:['channel','sub_channel_name'] }] }),
    ]);

    const getSubLabel = (channel, subName) => {
      if (subName && subName.trim()) return subName;
      if (channel === 'wa')          return '(WhatsApp)';
      if (channel === 'marketplace') return '(Marketplace)';
      return '(Langsung)';
    };
    const sumBy = (arr) => {
      const m = {};
      arr.forEach(o => {
        const ch  = o.channel || 'direct';
        const sub = getSubLabel(ch, o.sub_channel_name);
        const k   = `${ch}::${sub}`;
        m[k] = (m[k]||0) + parseFloat(o.total_amount||0);
      });
      return m;
    };
    const sumRets = (arr) => {
      const m = {};
      arr.forEach(r => { if (!r.order) return; const k = `${r.order.channel||'direct'}::${r.order.sub_channel_name||'(Langsung)'}`; const tot = (r.items||[]).reduce((s,i)=>s+parseFloat(i.subtotal||0),0); m[k]=(m[k]||0)+tot; });
      return m;
    };

    const todayMap = sumBy(todayOrders);
    const mtdMap   = sumBy(mtdOrders);
    const prevMap  = sumBy(prevOrders);
    const retTodayMap = sumRets(todayRets);
    const retMtdMap   = sumRets(mtdRets);

    const allKeys = new Set([...Object.keys(todayMap), ...Object.keys(mtdMap), ...Object.keys(prevMap)]);
    const CHANNELS = ['marketplace','direct','wa'];
    const CH_LABEL = { marketplace:'MARKETPLACE', direct:'LANGSUNG', wa:'WHATSAPP' };
    const rows = [];
    let gToday=0, gPrev=0, gMtd=0, gForecast=0, gRetToday=0, gRetMtd=0;

    CHANNELS.forEach(ch => {
      const chKeys = [...allKeys].filter(k=>k.startsWith(`${ch}::`));
      if (!chKeys.length) return;
      let cToday=0, cPrev=0, cMtd=0, cRetToday=0, cRetMtd=0;
      let no = 1;
      chKeys.sort().forEach(key => {
        const sub = key.split('::')[1];
        const tv=todayMap[key]||0, mv=mtdMap[key]||0, pv=prevMap[key]||0;
        const fc = daysPassed>0 ? Math.round((mv/daysPassed)*daysInMonth) : 0;
        const rt=retTodayMap[key]||0, rm=retMtdMap[key]||0;
        rows.push({ no:no++, channel:ch, sub_channel:sub, is_subtotal:false, prev:pv, today:tv, mtd:mv, forecast:fc, ret_today:rt, ret_total:rm });
        cToday+=tv; cPrev+=pv; cMtd+=mv; cRetToday+=rt; cRetMtd+=rm;
      });
      const cFc = daysPassed>0 ? Math.round((cMtd/daysPassed)*daysInMonth) : 0;
      rows.push({ is_subtotal:true, channel:ch, label:`TOTAL ${CH_LABEL[ch]}`, prev:cPrev, today:cToday, mtd:cMtd, forecast:cFc, ret_today:cRetToday, ret_total:cRetMtd });
      gToday+=cToday; gPrev+=cPrev; gMtd+=cMtd; gForecast+=cFc; gRetToday+=cRetToday; gRetMtd+=cRetMtd;
    });

    rows.push({ is_grand_total:true, label:'GRAND TOTAL', prev:gPrev, today:gToday, mtd:gMtd,
      forecast: daysPassed>0 ? Math.round((gMtd/daysPassed)*daysInMonth) : 0,
      ret_today:gRetToday, ret_total:gRetMtd });

    const prevMonthName = new Date(year,month-1,1).toLocaleString('id-ID',{month:'long'}).toUpperCase();
    const currMonthName = new Date(year,month,1).toLocaleString('id-ID',{month:'long'}).toUpperCase();

    return res.json({ success:true, data: { rows, meta: {
      today: todayStr, prev_month: prevMonthName, curr_month: currMonthName,
      days_in_month: daysInMonth, days_passed: daysPassed,
      report_date: today.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}),
    }}});
  } catch (err) { next(err); }
};

module.exports = {
  getOrders, getOrderDetail, createOrder,
  confirmOrder, completeOrder, cancelOrder,
  addPayment, verifyPayment,
  addShipment, updateShipment,
  getSalesReport, getShipmentReport, getDailyReport, getChannelReport,
};
