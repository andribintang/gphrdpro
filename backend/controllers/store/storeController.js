const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const axios   = require('axios');
const { Op }  = require('sequelize');
const { sequelize } = require('../../config/database');
const {
  StoreConfig, StoreCategory, StoreProduct, StoreBanner,
  StoreCustomer, StoreAddress, StoreCart, StoreVoucher,
  StoreOrder, StoreOrderItem, StorePayment,
} = require('../../models/store');

const toNum = v => parseFloat(v) || 0;

// ── Midtrans helper ────────────────────────────────────────────
const midtransRequest = async (path, body) => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const base = isProduction
    ? 'https://app.midtrans.com/snap/v1'
    : 'https://app.sandbox.midtrans.com/snap/v1';
  const auth = Buffer.from(`${serverKey}:`).toString('base64');
  const res = await axios.post(`${base}${path}`, body, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
  });
  return res.data;
};

// ── Store customer JWT ────────────────────────────────────────
const signCustomerToken = (customer) =>
  jwt.sign({ id: customer.id, email: customer.email, type: 'store_customer' },
    process.env.JWT_SECRET, { expiresIn: '30d' });

const requireCustomer = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Login diperlukan' });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (payload.type !== 'store_customer') return res.status(401).json({ success: false, message: 'Token tidak valid' });
    req.customer = payload;
    next();
  } catch { return res.status(401).json({ success: false, message: 'Token tidak valid / expired' }); }
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// GET /store/:brand/config
const getConfig = async (req, res, next) => {
  try {
    const cfg = await StoreConfig.findOne({ where: { brand: req.params.brand, is_active: true } });
    if (!cfg) return res.status(404).json({ success: false, message: 'Toko tidak ditemukan' });
    return res.json({ success: true, data: cfg });
  } catch (err) { next(err); }
};

// GET /store/:brand/banners
const getBanners = async (req, res, next) => {
  try {
    const rows = await StoreBanner.findAll({
      where: { brand: req.params.brand, is_active: true },
      order: [['sort_order', 'ASC']],
    });
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /store/:brand/categories
const getCategories = async (req, res, next) => {
  try {
    const rows = await StoreCategory.findAll({
      where: { brand: req.params.brand, is_active: true, parent_id: null },
      include: [{ model: StoreCategory, as: 'children', where: { is_active: true }, required: false }],
      order: [['sort_order', 'ASC'], [{ model: StoreCategory, as: 'children' }, 'sort_order', 'ASC']],
    });
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /store/:brand/products
const getProducts = async (req, res, next) => {
  try {
    const {
      search, category_id, featured, tag,
      sort = 'newest', page = 1, limit = 20,
      min_price, max_price,
    } = req.query;
    const brand = req.params.brand;

    const where = { brand, is_active: true, stock: { [Op.gt]: 0 } };
    if (category_id) where.category_id = parseInt(category_id);
    if (featured === '1') where.is_featured = true;
    if (min_price) where.price = { ...where.price, [Op.gte]: toNum(min_price) };
    if (max_price) where.price = { ...where.price, [Op.lte]: toNum(max_price) };

    if (search) {
      const words = search.trim().split(/\s+/).filter(Boolean).slice(0, 6);
      if (words.length === 1) {
        const s = `%${words[0]}%`;
        where[Op.or] = [
          { name: { [Op.like]: s } },
          { sku:  { [Op.like]: s } },
        ];
      } else {
        where[Op.and] = words.map(w => ({
          [Op.or]: [
            { name: { [Op.like]: `%${w}%` } },
            { sku:  { [Op.like]: `%${w}%` } },
          ],
        }));
      }
    }

    if (tag) {
      const tagLike = `%${tag}%`;
      where[Op.and] = [
        ...(where[Op.and] || []),
        sequelize.where(sequelize.cast(sequelize.col('tags'), 'CHAR'), { [Op.like]: tagLike }),
      ];
    }

    const ORDER_MAP = {
      newest:    [['created_at', 'DESC']],
      popular:   [['sold_count', 'DESC']],
      price_asc: [['price', 'ASC']],
      price_desc:[['price', 'DESC']],
    };
    const order = ORDER_MAP[sort] || ORDER_MAP.newest;

    const limit_n  = Math.min(parseInt(limit) || 20, 100);
    const offset_n = (parseInt(page) - 1) * limit_n;

    const { count, rows } = await StoreProduct.findAndCountAll({
      where, order,
      limit: limit_n, offset: offset_n,
      include: [{ model: StoreCategory, as: 'category', attributes: ['id','name','slug'], required: false }],
    });

    return res.json({
      success: true,
      data: { products: rows, pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count / limit_n) } },
    });
  } catch (err) { next(err); }
};

// GET /store/:brand/products/featured
const getFeatured = async (req, res, next) => {
  try {
    const rows = await StoreProduct.findAll({
      where: { brand: req.params.brand, is_active: true, is_featured: true, stock: { [Op.gt]: 0 } },
      order: [['sold_count', 'DESC']],
      limit: 12,
    });
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /store/:brand/products/:slug
const getProductBySlug = async (req, res, next) => {
  try {
    const product = await StoreProduct.findOne({
      where: { brand: req.params.brand, slug: req.params.slug, is_active: true },
      include: [{ model: StoreCategory, as: 'category', attributes: ['id','name','slug'], required: false }],
    });
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    // Increment view_count async (tidak perlu tunggu)
    StoreProduct.update({ view_count: product.view_count + 1 }, { where: { id: product.id } }).catch(() => {});
    return res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// POST /store/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi' });
    const existing = await StoreCustomer.findOne({ where: { email } });
    if (existing) return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
    const hashed = await bcrypt.hash(password, 10);
    const customer = await StoreCustomer.create({ name, email, phone, password: hashed });
    const token = signCustomerToken(customer);
    const { password: _, ...safe } = customer.toJSON();
    return res.status(201).json({ success: true, message: 'Registrasi berhasil', data: { customer: safe, token } });
  } catch (err) { next(err); }
};

// POST /store/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    const customer = await StoreCustomer.findOne({ where: { email, is_active: true } });
    if (!customer) return res.status(401).json({ success: false, message: 'Email atau password salah' });
    const match = await bcrypt.compare(password, customer.password);
    if (!match) return res.status(401).json({ success: false, message: 'Email atau password salah' });
    await customer.update({ last_login_at: new Date() });
    const token = signCustomerToken(customer);
    const { password: _, ...safe } = customer.toJSON();
    return res.json({ success: true, data: { customer: safe, token } });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// CUSTOMER (AUTHENTICATED) ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// GET /store/customer/profile
const getProfile = async (req, res, next) => {
  try {
    const customer = await StoreCustomer.findByPk(req.customer.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: StoreAddress, as: 'addresses' }],
    });
    return res.json({ success: true, data: customer });
  } catch (err) { next(err); }
};

// PUT /store/customer/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar_url, password, current_password } = req.body;
    const customer = await StoreCustomer.findByPk(req.customer.id);
    const updates = {};
    if (name)       updates.name       = name;
    if (phone)      updates.phone      = phone;
    if (avatar_url) updates.avatar_url = avatar_url;
    if (password) {
      if (!current_password) return res.status(400).json({ success: false, message: 'Password lama wajib diisi' });
      const match = await bcrypt.compare(current_password, customer.password);
      if (!match) return res.status(400).json({ success: false, message: 'Password lama salah' });
      updates.password = await bcrypt.hash(password, 10);
    }
    await customer.update(updates);
    const { password: _, ...safe } = customer.toJSON();
    return res.json({ success: true, data: safe });
  } catch (err) { next(err); }
};

// POST /store/customer/addresses
const addAddress = async (req, res, next) => {
  try {
    const { label, recipient, phone, address, province_id, province, city_id, city, district, postal_code, is_default } = req.body;
    if (!recipient || !phone || !address) return res.status(400).json({ success: false, message: 'Data alamat tidak lengkap' });
    if (is_default) {
      await StoreAddress.update({ is_default: false }, { where: { customer_id: req.customer.id } });
    }
    const row = await StoreAddress.create({
      customer_id: req.customer.id,
      label: label || 'Rumah', recipient, phone, address,
      province_id, province, city_id, city, district, postal_code,
      is_default: !!is_default,
    });
    return res.status(201).json({ success: true, data: row });
  } catch (err) { next(err); }
};

// PUT /store/customer/addresses/:id
const updateAddress = async (req, res, next) => {
  try {
    const addr = await StoreAddress.findOne({ where: { id: req.params.id, customer_id: req.customer.id } });
    if (!addr) return res.status(404).json({ success: false, message: 'Alamat tidak ditemukan' });
    if (req.body.is_default) {
      await StoreAddress.update({ is_default: false }, { where: { customer_id: req.customer.id } });
    }
    await addr.update(req.body);
    return res.json({ success: true, data: addr });
  } catch (err) { next(err); }
};

// DELETE /store/customer/addresses/:id
const deleteAddress = async (req, res, next) => {
  try {
    const addr = await StoreAddress.findOne({ where: { id: req.params.id, customer_id: req.customer.id } });
    if (!addr) return res.status(404).json({ success: false, message: 'Alamat tidak ditemukan' });
    await addr.destroy();
    return res.json({ success: true, message: 'Alamat dihapus' });
  } catch (err) { next(err); }
};

// GET /store/customer/orders
const getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const where = { customer_id: req.customer.id };
    if (status) where.status = status;
    const { count, rows } = await StoreOrder.findAndCountAll({
      where, order: [['created_at', 'DESC']],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
      include: [{ model: StoreOrderItem, as: 'items' }],
    });
    return res.json({ success: true, data: { orders: rows, pagination: { total: count, page: parseInt(page) } } });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// CART ENDPOINTS (session-based for guest, customer_id for logged-in)
// ═══════════════════════════════════════════════════════════════

const getCartWhere = (req) => {
  const sessionId = req.headers['x-session-id'];
  try {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      if (payload.type === 'store_customer') return { customer_id: payload.id };
    }
  } catch {}
  return sessionId ? { session_id: sessionId } : null;
};

// GET /store/cart
const getCart = async (req, res, next) => {
  try {
    const where = getCartWhere(req);
    if (!where) return res.json({ success: true, data: [] });
    const items = await StoreCart.findAll({
      where,
      include: [{ model: StoreProduct, as: 'product', attributes: ['id','name','slug','images','price','price_compare','stock'] }],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: items });
  } catch (err) { next(err); }
};

// POST /store/cart
const addToCart = async (req, res, next) => {
  try {
    const { product_id, quantity = 1, variant = {} } = req.body;
    const where = getCartWhere(req);
    if (!where) return res.status(400).json({ success: false, message: 'Session atau login diperlukan' });

    const product = await StoreProduct.findOne({ where: { id: product_id, is_active: true } });
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    if (product.stock < quantity) return res.status(400).json({ success: false, message: `Stok hanya ${product.stock}` });

    const variantKey = JSON.stringify(variant);
    const existing = await StoreCart.findOne({
      where: {
        ...where,
        product_id,
        [Op.and]: [sequelize.where(sequelize.cast(sequelize.col('variant'), 'CHAR'), variantKey)],
      },
    });

    if (existing) {
      const newQty = Math.min(existing.quantity + parseInt(quantity), product.stock);
      await existing.update({ quantity: newQty });
      return res.json({ success: true, data: existing });
    }

    const item = await StoreCart.create({
      ...where,
      brand: product.brand,
      product_id,
      variant,
      quantity: parseInt(quantity),
      price: product.price,
    });
    return res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
};

// PATCH /store/cart/:id
const updateCartItem = async (req, res, next) => {
  try {
    const where = getCartWhere(req);
    if (!where) return res.status(400).json({ success: false, message: 'Session diperlukan' });
    const item = await StoreCart.findOne({ where: { id: req.params.id, ...where } });
    if (!item) return res.status(404).json({ success: false, message: 'Item keranjang tidak ditemukan' });
    const { quantity } = req.body;
    if (parseInt(quantity) <= 0) {
      await item.destroy();
      return res.json({ success: true, message: 'Item dihapus' });
    }
    await item.update({ quantity: parseInt(quantity) });
    return res.json({ success: true, data: item });
  } catch (err) { next(err); }
};

// DELETE /store/cart/:id
const removeCartItem = async (req, res, next) => {
  try {
    const where = getCartWhere(req);
    if (!where) return res.status(400).json({ success: false, message: 'Session diperlukan' });
    const item = await StoreCart.findOne({ where: { id: req.params.id, ...where } });
    if (!item) return res.status(404).json({ success: false, message: 'Item tidak ditemukan' });
    await item.destroy();
    return res.json({ success: true, message: 'Item dihapus' });
  } catch (err) { next(err); }
};

// DELETE /store/cart (clear all)
const clearCart = async (req, res, next) => {
  try {
    const where = getCartWhere(req);
    if (!where) return res.json({ success: true });
    await StoreCart.destroy({ where });
    return res.json({ success: true, message: 'Keranjang dikosongkan' });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// ONGKIR via RajaOngkir
// ═══════════════════════════════════════════════════════════════

// GET /store/ongkir/provinces
const getProvinces = async (req, res, next) => {
  try {
    const key = process.env.RAJAONGKIR_KEY;
    if (!key) return res.json({ success: true, data: [] });
    const { data } = await axios.get('https://api.rajaongkir.com/starter/province', {
      headers: { key },
    });
    return res.json({ success: true, data: data.rajaongkir?.results || [] });
  } catch (err) { next(err); }
};

// GET /store/ongkir/cities?province_id=
const getCities = async (req, res, next) => {
  try {
    const key = process.env.RAJAONGKIR_KEY;
    if (!key) return res.json({ success: true, data: [] });
    const { data } = await axios.get('https://api.rajaongkir.com/starter/city', {
      params: { province: req.query.province_id },
      headers: { key },
    });
    return res.json({ success: true, data: data.rajaongkir?.results || [] });
  } catch (err) { next(err); }
};

// POST /store/ongkir/cost
const getOngkirCost = async (req, res, next) => {
  try {
    const key = process.env.RAJAONGKIR_KEY;
    if (!key) return res.json({ success: true, data: [] });
    const { origin = process.env.RAJAONGKIR_ORIGIN_CITY || '151', destination, weight, courier = 'jne:tiki:sicepat' } = req.body;
    const couriers = courier.split(':');
    const results = [];
    for (const cur of couriers) {
      try {
        const { data } = await axios.post('https://api.rajaongkir.com/starter/cost', {
          origin, destination, weight: parseInt(weight) || 500, courier: cur,
        }, { headers: { key, 'content-type': 'application/x-www-form-urlencoded' } });
        const services = data.rajaongkir?.results?.[0]?.costs || [];
        results.push(...services.map(s => ({
          courier: cur.toUpperCase(),
          service: s.service,
          description: s.description,
          cost: s.cost?.[0]?.value || 0,
          etd: s.cost?.[0]?.etd || '?',
        })));
      } catch {}
    }
    return res.json({ success: true, data: results.sort((a, b) => a.cost - b.cost) });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// VOUCHER
// ═══════════════════════════════════════════════════════════════

// POST /store/voucher/check
const checkVoucher = async (req, res, next) => {
  try {
    const { code, brand, total } = req.body;
    const now = new Date();
    const voucher = await StoreVoucher.findOne({
      where: {
        code: code.toUpperCase(),
        brand,
        is_active: true,
        [Op.or]: [{ valid_from: null }, { valid_from: { [Op.lte]: now } }],
        [Op.or]: [{ valid_until: null }, { valid_until: { [Op.gte]: now } }],
      },
    });
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher tidak valid atau sudah kedaluwarsa' });
    if (voucher.quota > 0 && voucher.used_count >= voucher.quota)
      return res.status(400).json({ success: false, message: 'Kuota voucher habis' });
    if (toNum(total) < toNum(voucher.min_purchase))
      return res.status(400).json({ success: false, message: `Minimum pembelian Rp ${toNum(voucher.min_purchase).toLocaleString('id')}` });

    let discount = 0;
    if (voucher.type === 'percent') {
      discount = toNum(total) * toNum(voucher.value) / 100;
      if (voucher.max_discount > 0) discount = Math.min(discount, toNum(voucher.max_discount));
    } else if (voucher.type === 'fixed') {
      discount = toNum(voucher.value);
    } else if (voucher.type === 'free_ongkir') {
      discount = 0; // handled on frontend
    }

    return res.json({
      success: true,
      data: {
        voucher: { id: voucher.id, code: voucher.code, type: voucher.type, value: voucher.value, description: voucher.description },
        discount: Math.round(discount),
      },
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// ORDERS (storefront)
// ═══════════════════════════════════════════════════════════════

// POST /store/orders
const createOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      brand, customer_name, customer_email, customer_phone,
      shipping_address, shipping_city, shipping_province, shipping_postal,
      shipping_courier, shipping_service, shipping_cost, shipping_etd,
      items, subtotal, discount, voucher_code, total, notes,
    } = req.body;

    // ── Validasi stok ──────────────────────────────────────────
    for (const item of items) {
      const product = await StoreProduct.findByPk(item.product_id, { transaction: t });
      if (!product) throw new Error(`Produk ID ${item.product_id} tidak ditemukan`);
      if (product.stock < item.quantity) throw new Error(`Stok ${product.name} tidak cukup`);
    }

    // ── Generate order number ──────────────────────────────────
    const prefix = brand === 'gpdistro' ? 'GPD' : 'GPR';
    const date   = new Date();
    const ymd    = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    const last   = await StoreOrder.findOne({ where: { brand }, order: [['id', 'DESC']] });
    const seq    = String((last?.id || 0) + 1).padStart(4, '0');
    const orderNumber = `${prefix}-${ymd}-${seq}`;

    // ── Get or set customer_id ─────────────────────────────────
    let customerId = null;
    try {
      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer ')) {
        const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
        if (payload.type === 'store_customer') customerId = payload.id;
      }
    } catch {}

    // ── Buat order ─────────────────────────────────────────────
    const order = await StoreOrder.create({
      brand, order_number: orderNumber,
      customer_id: customerId,
      customer_name, customer_email, customer_phone,
      shipping_address, shipping_city, shipping_province, shipping_postal,
      shipping_courier, shipping_service, shipping_cost: toNum(shipping_cost),
      shipping_etd, subtotal: toNum(subtotal), discount: toNum(discount),
      voucher_code: voucher_code || null, total: toNum(total),
      status: 'pending', payment_status: 'unpaid', notes,
    }, { transaction: t });

    // ── Buat order items + kurangi stok ────────────────────────
    for (const item of items) {
      const product = await StoreProduct.findByPk(item.product_id, { transaction: t });
      await StoreOrderItem.create({
        order_id:      order.id,
        product_id:    item.product_id,
        product_name:  product.name,
        product_image: (product.images || [])[0] || null,
        sku:           product.sku,
        variant:       item.variant || {},
        price:         toNum(item.price),
        quantity:      item.quantity,
        subtotal:      Math.round(toNum(item.price) * item.quantity),
      }, { transaction: t });
      await product.update({ stock: product.stock - item.quantity }, { transaction: t });
    }

    // ── Update voucher used_count ──────────────────────────────
    if (voucher_code) {
      await StoreVoucher.update(
        { used_count: sequelize.literal('used_count + 1') },
        { where: { code: voucher_code.toUpperCase() }, transaction: t }
      );
    }

    // ── Buat Midtrans Snap token ───────────────────────────────
    let midtransToken = null, midtransRedirect = null;
    try {
      const midtransOrderId = `${orderNumber}-${Date.now()}`;
      const snapData = await midtransRequest('/transactions', {
        transaction_details: {
          order_id: midtransOrderId,
          gross_amount: Math.round(toNum(total)),
        },
        customer_details: {
          first_name: customer_name,
          email: customer_email,
          phone: customer_phone,
        },
        item_details: [
          ...items.map(i => ({
            id: `PROD-${i.product_id}`,
            price: Math.round(toNum(i.price)),
            quantity: i.quantity,
            name: i.product_name || `Product ${i.product_id}`,
          })),
          { id: 'SHIPPING', price: Math.round(toNum(shipping_cost)), quantity: 1, name: `Ongkir ${shipping_courier || ''} ${shipping_service || ''}`.trim() },
          ...(toNum(discount) > 0 ? [{ id: 'DISCOUNT', price: -Math.round(toNum(discount)), quantity: 1, name: `Diskon ${voucher_code || ''}` }] : []),
        ],
        callbacks: {
          finish: `${process.env.STORE_FRONTEND_URL || ''}/order/${order.id}/success`,
        },
      });
      midtransToken    = snapData.token;
      midtransRedirect = snapData.redirect_url;
      await order.update({ midtrans_order_id: midtransOrderId, midtrans_token: midtransToken, midtrans_redirect: midtransRedirect }, { transaction: t });
    } catch (midErr) {
      console.error('[Midtrans]', midErr.message);
      // Lanjutkan meskipun Midtrans gagal — order tetap terbuat
    }

    // ── Clear cart ─────────────────────────────────────────────
    const cartWhere = getCartWhere(req);
    if (cartWhere) await StoreCart.destroy({ where: { ...cartWhere, brand }, transaction: t });

    await t.commit();
    return res.status(201).json({
      success: true,
      data: {
        order_id:         order.id,
        order_number:     orderNumber,
        midtrans_token:   midtransToken,
        midtrans_redirect:midtransRedirect,
        total:            order.total,
      },
    });
  } catch (err) { await t.rollback(); next(err); }
};

// GET /store/orders/:id
const getOrder = async (req, res, next) => {
  try {
    const order = await StoreOrder.findByPk(req.params.id, {
      include: [{ model: StoreOrderItem, as: 'items' }, { model: StorePayment, as: 'payments' }],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    // Boleh lihat kalau customer sendiri atau tidak login (belum ada akun)
    if (req.customer && order.customer_id && req.customer.id !== order.customer_id)
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    return res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

// POST /store/payment/notification (Midtrans webhook)
const paymentNotification = async (req, res, next) => {
  try {
    const { order_id, transaction_status, fraud_status, payment_type, gross_amount, transaction_id } = req.body;
    if (!order_id) return res.status(400).json({ message: 'invalid' });

    // order_id format: GPD-20260621-0001-{timestamp}
    const orderNumber = order_id.replace(/-\d{13}$/, '');
    const order = await StoreOrder.findOne({ where: { order_number: orderNumber } });
    if (!order) return res.status(404).json({ message: 'order not found' });

    const isPaid = ['capture', 'settlement'].includes(transaction_status) && fraud_status !== 'fraud';
    const isFailed = ['cancel', 'deny', 'expire'].includes(transaction_status);

    // Upsert payment record
    const [payment] = await StorePayment.findOrCreate({
      where: { midtrans_order_id: order_id },
      defaults: {
        order_id: order.id,
        midtrans_order_id: order_id,
        transaction_id,
        payment_type,
        amount: toNum(gross_amount),
        status: transaction_status,
        raw_response: req.body,
        paid_at: isPaid ? new Date() : null,
      },
    });
    if (payment && !payment.isNewRecord) {
      await payment.update({ status: transaction_status, raw_response: req.body, paid_at: isPaid ? new Date() : payment.paid_at });
    }

    if (isPaid && order.payment_status !== 'paid') {
      await order.update({ payment_status: 'paid', status: 'paid', paid_at: new Date(), payment_method: payment_type });
    } else if (isFailed) {
      await order.update({ payment_status: 'unpaid', status: 'cancelled' });
      // Restock
      const items = await StoreOrderItem.findAll({ where: { order_id: order.id } });
      for (const item of items) {
        await StoreProduct.update({ stock: sequelize.literal(`stock + ${item.quantity}`) }, { where: { id: item.product_id } });
      }
    }

    return res.json({ success: true });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS (pakai JWT ERP — authenticate middleware)
// ═══════════════════════════════════════════════════════════════

// GET /store/admin/stats?brand=
const getAdminStats = async (req, res, next) => {
  try {
    const { brand } = req.query;
    const where = brand ? { brand } : {};
    const today = new Date().toISOString().split('T')[0];

    const [totalOrders, todayOrders, pendingOrders, totalRevenue, totalProducts] = await Promise.all([
      StoreOrder.count({ where }),
      StoreOrder.count({ where: { ...where, created_at: { [Op.gte]: new Date(today) } } }),
      StoreOrder.count({ where: { ...where, status: { [Op.in]: ['pending','paid','processing'] } } }),
      StoreOrder.sum('total', { where: { ...where, payment_status: 'paid' } }),
      StoreProduct.count({ where: { ...where, is_active: true } }),
    ]);

    return res.json({
      success: true,
      data: { totalOrders, todayOrders, pendingOrders, totalRevenue: totalRevenue || 0, totalProducts },
    });
  } catch (err) { next(err); }
};

// GET /store/admin/products?brand=&page=&search=
const getAdminProducts = async (req, res, next) => {
  try {
    const { brand, page = 1, limit = 20, search, category_id, is_active } = req.query;
    const where = {};
    if (brand) where.brand = brand;
    if (category_id) where.category_id = parseInt(category_id);
    if (is_active !== undefined) where.is_active = is_active === '1';
    if (search) {
      const s = `%${search}%`;
      where[Op.or] = [{ name: { [Op.like]: s } }, { sku: { [Op.like]: s } }];
    }
    const { count, rows } = await StoreProduct.findAndCountAll({
      where, order: [['updated_at', 'DESC']],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
      include: [{ model: StoreCategory, as: 'category', attributes: ['id','name'], required: false }],
    });
    return res.json({ success: true, data: { products: rows, pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count/parseInt(limit)) } } });
  } catch (err) { next(err); }
};

// POST /store/admin/products
const createAdminProduct = async (req, res, next) => {
  try {
    const slug = req.body.slug || req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const product = await StoreProduct.create({ ...req.body, slug });
    return res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
};

// PUT /store/admin/products/:id
const updateAdminProduct = async (req, res, next) => {
  try {
    const product = await StoreProduct.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    if (req.body.name && !req.body.slug) {
      req.body.slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    await product.update(req.body);
    return res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

// DELETE /store/admin/products/:id
const deleteAdminProduct = async (req, res, next) => {
  try {
    const product = await StoreProduct.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    await product.update({ is_active: false });
    return res.json({ success: true, message: 'Produk dinonaktifkan' });
  } catch (err) { next(err); }
};

// GET /store/admin/orders?brand=&status=&page=
const getAdminOrders = async (req, res, next) => {
  try {
    const { brand, status, page = 1, limit = 20, search } = req.query;
    const where = {};
    if (brand) where.brand = brand;
    if (status) where.status = status;
    if (search) {
      const s = `%${search}%`;
      where[Op.or] = [
        { order_number:    { [Op.like]: s } },
        { customer_name:   { [Op.like]: s } },
        { customer_phone:  { [Op.like]: s } },
        { customer_email:  { [Op.like]: s } },
        { tracking_number: { [Op.like]: s } },
      ];
    }
    const { count, rows } = await StoreOrder.findAndCountAll({
      where, order: [['created_at', 'DESC']],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
      include: [{ model: StoreOrderItem, as: 'items' }],
    });
    return res.json({ success: true, data: { orders: rows, pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count/parseInt(limit)) } } });
  } catch (err) { next(err); }
};

// PATCH /store/admin/orders/:id/status
const updateAdminOrderStatus = async (req, res, next) => {
  try {
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    const updates = { status: req.body.status };
    if (req.body.tracking_number) updates.tracking_number = req.body.tracking_number;
    await order.update(updates);
    return res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

// ── Admin banners CRUD ──────────────────────────────────────
const getAdminBanners = async (req, res, next) => {
  try {
    const where = req.query.brand ? { brand: req.query.brand } : {};
    const rows = await StoreBanner.findAll({ where, order: [['sort_order','ASC']] });
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

const upsertAdminBanner = async (req, res, next) => {
  try {
    if (req.params.id) {
      const b = await StoreBanner.findByPk(req.params.id);
      if (!b) return res.status(404).json({ success: false, message: 'Banner tidak ditemukan' });
      await b.update(req.body);
      return res.json({ success: true, data: b });
    }
    const b = await StoreBanner.create(req.body);
    return res.status(201).json({ success: true, data: b });
  } catch (err) { next(err); }
};

const deleteAdminBanner = async (req, res, next) => {
  try {
    await StoreBanner.destroy({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Admin categories CRUD ───────────────────────────────────
const getAdminCategories = async (req, res, next) => {
  try {
    const where = req.query.brand ? { brand: req.query.brand } : {};
    const rows = await StoreCategory.findAll({ where, order: [['sort_order','ASC']] });
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

const upsertAdminCategory = async (req, res, next) => {
  try {
    if (!req.body.slug && req.body.name)
      req.body.slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (req.params.id) {
      const c = await StoreCategory.findByPk(req.params.id);
      if (!c) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
      await c.update(req.body);
      return res.json({ success: true, data: c });
    }
    const c = await StoreCategory.create(req.body);
    return res.status(201).json({ success: true, data: c });
  } catch (err) { next(err); }
};

// ── Admin vouchers CRUD ─────────────────────────────────────
const getAdminVouchers = async (req, res, next) => {
  try {
    const where = req.query.brand ? { brand: req.query.brand } : {};
    const rows = await StoreVoucher.findAll({ where, order: [['created_at','DESC']] });
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

const upsertAdminVoucher = async (req, res, next) => {
  try {
    if (req.body.code) req.body.code = req.body.code.toUpperCase();
    if (req.params.id) {
      const v = await StoreVoucher.findByPk(req.params.id);
      if (!v) return res.status(404).json({ success: false, message: 'Voucher tidak ditemukan' });
      await v.update(req.body);
      return res.json({ success: true, data: v });
    }
    const v = await StoreVoucher.create(req.body);
    return res.status(201).json({ success: true, data: v });
  } catch (err) { next(err); }
};

// ── Admin store config ─────────────────────────────────────
const getAdminConfig = async (req, res, next) => {
  try {
    const rows = await StoreConfig.findAll();
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

const updateAdminConfig = async (req, res, next) => {
  try {
    const { brand, ...updates } = req.body;
    const [,rows] = await StoreConfig.update(updates, { where: { brand }, returning: true });
    return res.json({ success: true, data: rows?.[0] || null });
  } catch (err) { next(err); }
};

module.exports = {
  // Public
  getConfig, getBanners, getCategories, getProducts, getFeatured, getProductBySlug,
  // Auth
  register, login,
  // Customer
  getProfile, updateProfile, addAddress, updateAddress, deleteAddress, getMyOrders,
  // Cart
  getCart, addToCart, updateCartItem, removeCartItem, clearCart,
  // Ongkir
  getProvinces, getCities, getOngkirCost,
  // Voucher
  checkVoucher,
  // Orders
  createOrder, getOrder, paymentNotification,
  // Admin
  getAdminStats,
  getAdminProducts, createAdminProduct, updateAdminProduct, deleteAdminProduct,
  getAdminOrders, updateAdminOrderStatus,
  getAdminBanners, upsertAdminBanner, deleteAdminBanner,
  getAdminCategories, upsertAdminCategory,
  getAdminVouchers, upsertAdminVoucher,
  getAdminConfig, updateAdminConfig,
  requireCustomer,
};
