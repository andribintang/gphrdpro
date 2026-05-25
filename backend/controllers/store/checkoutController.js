const axios   = require('axios');
const crypto  = require('crypto');
const { Op }  = require('sequelize');
const { sequelize } = require('../../config/database');
const {
  StoreOrder, StoreOrderItem, StoreProduct, StoreCart,
  StoreVoucher, StorePayment,
} = require('../../models/store');

// ── Midtrans config ───────────────────────────────────────────
const MT_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MT_IS_PROD    = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const MT_BASE_URL   = MT_IS_PROD
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const MT_AUTH       = Buffer.from(MT_SERVER_KEY + ':').toString('base64');

// ── Helpers ───────────────────────────────────────────────────
const generateOrderNumber = (brand) => {
  const prefix = brand === 'gpdistro' ? 'GPD' : 'GPR';
  const ts = Date.now().toString().slice(-8);
  return `${prefix}-${ts}`;
};

// ── Raja Ongkir ───────────────────────────────────────────────
// GET /api/store/ongkir/provinces
const getProvinces = async (req, res, next) => {
  try {
    const { data } = await axios.get('https://api.rajaongkir.com/starter/province', {
      headers: { key: process.env.RAJAONGKIR_KEY },
    });
    return res.json({ success: true, data: data.rajaongkir.results });
  } catch (err) { next(err); }
};

// GET /api/store/ongkir/cities?province_id=xx
const getCities = async (req, res, next) => {
  try {
    const { data } = await axios.get(`https://api.rajaongkir.com/starter/city?province=${req.query.province_id || ''}`, {
      headers: { key: process.env.RAJAONGKIR_KEY },
    });
    return res.json({ success: true, data: data.rajaongkir.results });
  } catch (err) { next(err); }
};

// POST /api/store/ongkir/cost
const getOngkir = async (req, res, next) => {
  try {
    const { origin, destination, weight, courier } = req.body;
    const { data } = await axios.post('https://api.rajaongkir.com/starter/cost',
      { origin, destination, weight, courier },
      { headers: { key: process.env.RAJAONGKIR_KEY, 'content-type': 'application/json' } }
    );
    return res.json({ success: true, data: data.rajaongkir.results });
  } catch (err) { next(err); }
};

// ── Voucher check ─────────────────────────────────────────────
// POST /api/store/voucher/check
const checkVoucher = async (req, res, next) => {
  try {
    const { code, brand, subtotal } = req.body;
    const v = await StoreVoucher.findOne({
      where: {
        code: code.toUpperCase(), brand, is_active: true,
        valid_from: { [Op.lte]: new Date() },
        valid_until: { [Op.gte]: new Date() },
      },
    });
    if (!v) return res.status(404).json({ success: false, message: 'Voucher tidak ditemukan atau sudah kadaluarsa' });
    if (v.quota > 0 && v.used_count >= v.quota) return res.status(400).json({ success: false, message: 'Kuota voucher habis' });
    if (parseFloat(subtotal) < parseFloat(v.min_purchase)) return res.status(400).json({ success: false, message: `Minimum pembelian Rp ${Number(v.min_purchase).toLocaleString('id')}` });

    let discount = 0;
    if (v.type === 'percent') {
      discount = Math.min(parseFloat(subtotal) * v.value / 100, v.max_discount > 0 ? parseFloat(v.max_discount) : Infinity);
    } else if (v.type === 'fixed') {
      discount = parseFloat(v.value);
    } else if (v.type === 'free_ongkir') {
      discount = 0; // handled on frontend
    }
    return res.json({ success: true, data: { voucher: v, discount, type: v.type } });
  } catch (err) { next(err); }
};

// ── Create Order + Midtrans Snap ──────────────────────────────
// POST /api/store/orders
const createOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      brand,
      customer_name, customer_email, customer_phone,
      shipping_address, shipping_city, shipping_province, shipping_postal,
      shipping_courier, shipping_service, shipping_cost, shipping_etd,
      items, // [{ product_id, variant, quantity }]
      voucher_code,
    } = req.body;

    if (!items || !items.length) return res.status(400).json({ success: false, message: 'Keranjang kosong' });

    // Validate + lock stock
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await StoreProduct.findByPk(item.product_id, { transaction: t });
      if (!product || !product.is_active) throw new Error(`Produk "${item.product_id}" tidak tersedia`);
      if (product.stock < item.quantity) throw new Error(`Stok "${product.name}" tidak cukup`);
      const itemSubtotal = parseFloat(product.price) * item.quantity;
      subtotal += itemSubtotal;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_image: product.images?.[0] || null,
        sku: product.sku,
        variant: item.variant || {},
        price: product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
      await product.decrement('stock', { by: item.quantity, transaction: t });
    }

    // Voucher
    let discount = 0;
    let voucherObj = null;
    if (voucher_code) {
      voucherObj = await StoreVoucher.findOne({ where: { code: voucher_code.toUpperCase(), brand, is_active: true }, transaction: t });
      if (voucherObj) {
        if (voucherObj.type === 'percent') discount = Math.min(subtotal * voucherObj.value / 100, voucherObj.max_discount > 0 ? parseFloat(voucherObj.max_discount) : Infinity);
        else if (voucherObj.type === 'fixed') discount = parseFloat(voucherObj.value);
        else if (voucherObj.type === 'free_ongkir') discount = parseFloat(shipping_cost);
        await voucherObj.increment('used_count', { transaction: t });
      }
    }

    const total = Math.max(0, subtotal - discount + parseFloat(shipping_cost || 0));
    const orderNumber = generateOrderNumber(brand);

    // Create order
    const order = await StoreOrder.create({
      brand, order_number: orderNumber,
      customer_id: req.customer?.id || null,
      customer_name, customer_email, customer_phone,
      shipping_address, shipping_city, shipping_province, shipping_postal,
      shipping_courier, shipping_service,
      shipping_cost: parseFloat(shipping_cost || 0),
      shipping_etd,
      subtotal, discount, voucher_code: voucher_code || null, total,
      status: 'pending', payment_status: 'unpaid',
      midtrans_order_id: orderNumber,
    }, { transaction: t });

    // Create order items
    for (const item of orderItems) await StoreOrderItem.create({ order_id: order.id, ...item }, { transaction: t });

    // Clear cart if logged in
    if (req.customer) await StoreCart.destroy({ where: { customer_id: req.customer.id, brand }, transaction: t });

    // Midtrans Snap
    const snapPayload = {
      transaction_details: { order_id: orderNumber, gross_amount: Math.round(total) },
      customer_details: { first_name: customer_name, email: customer_email, phone: customer_phone },
      item_details: [
        ...orderItems.map(i => ({ id: String(i.product_id), name: i.product_name.substring(0, 50), price: Math.round(i.price), quantity: i.quantity })),
        ...(parseFloat(shipping_cost) > 0 ? [{ id: 'ONGKIR', name: `Ongkir ${shipping_courier}`, price: Math.round(shipping_cost), quantity: 1 }] : []),
        ...(discount > 0 ? [{ id: 'DISKON', name: 'Diskon Voucher', price: -Math.round(discount), quantity: 1 }] : []),
      ],
      callbacks: {
        finish: `${process.env.FRONTEND_URL || 'https://gpdistro.com'}/orders/${order.id}`,
      },
    };

    const snapRes = await axios.post(MT_BASE_URL, snapPayload, {
      headers: { Authorization: `Basic ${MT_AUTH}`, 'Content-Type': 'application/json' },
    });

    const { token: midtransToken, redirect_url } = snapRes.data;
    await order.update({ midtrans_token: midtransToken, midtrans_redirect: redirect_url }, { transaction: t });

    await t.commit();
    return res.status(201).json({
      success: true,
      data: { order: { id: order.id, order_number: orderNumber, total }, midtrans_token: midtransToken, redirect_url },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// GET /api/store/orders/:id
const getOrder = async (req, res, next) => {
  try {
    const where = { id: req.params.id };
    if (req.customer) where.customer_id = req.customer.id;
    const order = await StoreOrder.findOne({
      where,
      include: [{ association: 'items', include: [{ association: 'product', attributes: ['id','name','slug','images'] }] }],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    return res.json({ success: true, data: { order } });
  } catch (err) { next(err); }
};

// GET /api/store/customer/orders
const getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const where = { customer_id: req.customer.id };
    if (status) where.status = status;
    const { count, rows } = await StoreOrder.findAndCountAll({
      where,
      include: [{ association: 'items', attributes: ['product_name','product_image','quantity','price'] }],
      order: [['created_at','DESC']],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
    });
    return res.json({ success: true, data: { orders: rows, total: count } });
  } catch (err) { next(err); }
};

// ── Midtrans Webhook ──────────────────────────────────────────
// POST /api/store/payment/notify
const paymentNotify = async (req, res, next) => {
  try {
    const { order_id, transaction_status, fraud_status, payment_type, gross_amount, signature_key, transaction_id } = req.body;

    // Verify signature
    const expected = crypto.createHash('sha512')
      .update(order_id + req.body.status_code + gross_amount + MT_SERVER_KEY)
      .digest('hex');
    if (expected !== signature_key) return res.status(403).json({ success: false, message: 'Invalid signature' });

    const order = await StoreOrder.findOne({ where: { midtrans_order_id: order_id } });
    if (!order) return res.status(404).json({ success: false });

    // Log payment
    await StorePayment.upsert({
      order_id: order.id,
      midtrans_order_id: order_id,
      transaction_id, payment_type,
      amount: parseFloat(gross_amount),
      status: transaction_status,
      raw_response: req.body,
      paid_at: ['capture','settlement'].includes(transaction_status) ? new Date() : null,
    });

    // Update order status
    let paymentStatus = 'unpaid';
    let orderStatus = order.status;
    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      if (fraud_status === 'accept' || !fraud_status) {
        paymentStatus = 'paid';
        orderStatus = 'paid';
      }
    } else if (transaction_status === 'cancel' || transaction_status === 'deny' || transaction_status === 'expire') {
      paymentStatus = 'unpaid';
      orderStatus = 'cancelled';
      // Restore stock
      const items = await StoreOrderItem.findAll({ where: { order_id: order.id } });
      for (const item of items) await StoreProduct.increment('stock', { by: item.quantity, where: { id: item.product_id } });
    } else if (transaction_status === 'refund') {
      paymentStatus = 'refunded'; orderStatus = 'refunded';
    }

    await order.update({ payment_status: paymentStatus, payment_method: payment_type, status: orderStatus, paid_at: paymentStatus === 'paid' ? new Date() : order.paid_at });
    return res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getProvinces, getCities, getOngkir, checkVoucher, createOrder, getOrder, getMyOrders, paymentNotify };
