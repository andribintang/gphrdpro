const { Op } = require('sequelize');
const {
  StoreConfig, StoreProduct, StoreBanner,
  StoreVoucher, StoreOrder, StoreOrderItem,
} = require('../../models/store');
const { Category: ErpCategory } = require('../../models/erp');

// ── Config ────────────────────────────────────────────────────
const getConfig    = async (req, res, next) => {
  try {
    const configs = await StoreConfig.findAll();
    return res.json({ success: true, data: { configs } });
  } catch (err) { next(err); }
};
const upsertConfig = async (req, res, next) => {
  try {
    const { brand, ...data } = req.body;
    const [config] = await StoreConfig.upsert({ brand, ...data });
    return res.json({ success: true, data: { config } });
  } catch (err) { next(err); }
};

// ── Categories — read from ERP, no CRUD here ──────────────────
// gpdistro = branch_id 2, gpracing = branch_id 1
const getCategories = async (req, res, next) => {
  try {
    const { brand } = req.query;
    const where = { is_active: true };
    if (brand) where.branch_id = brand === 'gpdistro' ? 2 : 1;
    const cats = await ErpCategory.findAll({
      where,
      order: [['branch_id', 'ASC'], ['sort_order', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'branch_id', 'name', 'description', 'sort_order', 'is_active'],
    });
    // Map slug for frontend compatibility
    const mapped = cats.map(c => ({
      ...c.toJSON(),
      slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      brand: c.branch_id === 2 ? 'gpdistro' : 'gpracing',
    }));
    return res.json({ success: true, data: { categories: mapped } });
  } catch (err) { next(err); }
};

// ── Products ──────────────────────────────────────────────────
const getProducts = async (req, res, next) => {
  try {
    const { brand, search, category, page = 1, limit = 20 } = req.query;
    const { sequelize } = require('../../config/database');

    // Use raw SQL to bypass any Sequelize model issues
    let sql = 'SELECT * FROM store_products WHERE 1=1';
    const replacements = [];
    if (brand)    { sql += ' AND brand = ?';        replacements.push(brand); }
    if (category) { sql += ' AND category_id = ?';  replacements.push(category); }
    if (search)   { sql += ' AND (name LIKE ? OR sku LIKE ?)'; replacements.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY created_at DESC';

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await sequelize.query(countSql, { replacements, type: 'SELECT' });
    const total = countResult.total || 0;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    const [rows] = await sequelize.query(sql, { replacements });

    // Get ERP categories
    const branchId = brand === 'gpdistro' ? 2 : 1;
    const [erpCats] = await sequelize.query(
      'SELECT id, name FROM erp_categories WHERE branch_id = ? AND is_active = 1',
      { replacements: [branchId] }
    );
    const catMap = Object.fromEntries(erpCats.map(c => [c.id, { id: c.id, name: c.name, slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g,'-') }]));

    const products = rows.map(p => {
      try { p.images   = typeof p.images   === 'string' ? JSON.parse(p.images)   : (p.images   || []); } catch { p.images   = []; }
      try { p.variants = typeof p.variants === 'string' ? JSON.parse(p.variants) : (p.variants || {}); } catch { p.variants = {}; }
      try { p.tags     = typeof p.tags     === 'string' ? JSON.parse(p.tags)     : (p.tags     || []); } catch { p.tags     = []; }
      return { ...p, category: p.category_id ? catMap[p.category_id] || null : null };
    });

    return res.json({ success: true, data: { products, total: parseInt(total), page: parseInt(page), total_pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};
const createProduct = async (req, res, next) => {
  try {
    // Auto-generate slug if not provided
    if (!req.body.slug && req.body.name) {
      req.body.slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '-' + Date.now();
    }
    const product = await StoreProduct.create(req.body);
    return res.status(201).json({ success: true, data: { product } });
  } catch (err) { next(err); }
};
const updateProduct = async (req, res, next) => {
  try {
    const product = await StoreProduct.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    await product.update(req.body);
    return res.json({ success: true, data: { product } });
  } catch (err) { next(err); }
};
const deleteProduct = async (req, res, next) => {
  try {
    await StoreProduct.update({ is_active: false }, { where: { id: req.params.id } });
    return res.json({ success: true, message: 'Produk dinonaktifkan' });
  } catch (err) { next(err); }
};

// ── Banners ───────────────────────────────────────────────────
const getBanners   = async (req, res, next) => {
  try {
    const { brand } = req.query;
    const banners = await StoreBanner.findAll({ where: brand ? { brand } : {}, order: [['brand','ASC'],['sort_order','ASC']] });
    return res.json({ success: true, data: { banners } });
  } catch (err) { next(err); }
};
const createBanner = async (req, res, next) => {
  try {
    const banner = await StoreBanner.create(req.body);
    return res.status(201).json({ success: true, data: { banner } });
  } catch (err) { next(err); }
};
const updateBanner = async (req, res, next) => {
  try {
    const banner = await StoreBanner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner tidak ditemukan' });
    await banner.update(req.body);
    return res.json({ success: true, data: { banner } });
  } catch (err) { next(err); }
};
const deleteBanner = async (req, res, next) => {
  try {
    await StoreBanner.destroy({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Banner dihapus' });
  } catch (err) { next(err); }
};

// ── Vouchers ──────────────────────────────────────────────────
const getVouchers   = async (req, res, next) => {
  try {
    const { brand } = req.query;
    const vouchers = await StoreVoucher.findAll({ where: brand ? { brand } : {}, order: [['created_at','DESC']] });
    return res.json({ success: true, data: { vouchers } });
  } catch (err) { next(err); }
};
const createVoucher = async (req, res, next) => {
  try {
    if (req.body.code) req.body.code = req.body.code.toUpperCase();
    const voucher = await StoreVoucher.create(req.body);
    return res.status(201).json({ success: true, data: { voucher } });
  } catch (err) { next(err); }
};
const updateVoucher = async (req, res, next) => {
  try {
    const voucher = await StoreVoucher.findByPk(req.params.id);
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher tidak ditemukan' });
    await voucher.update(req.body);
    return res.json({ success: true, data: { voucher } });
  } catch (err) { next(err); }
};

// ── Orders ────────────────────────────────────────────────────
const getOrders = async (req, res, next) => {
  try {
    const { brand, status, page = 1, limit = 20, search } = req.query;
    const where = {};
    if (brand)  where.brand = brand;
    if (status) where.status = status;
    if (search) where[Op.or] = [
      { order_number: { [Op.like]: `%${search}%` } },
      { customer_name: { [Op.like]: `%${search}%` } },
      { customer_email: { [Op.like]: `%${search}%` } },
    ];
    const { count, rows } = await StoreOrder.findAndCountAll({
      where,
      include: [{ association: 'items', attributes: ['product_name','quantity','price','subtotal'] }],
      order: [['created_at','DESC']],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
    });
    return res.json({ success: true, data: { orders: rows, total: count } });
  } catch (err) { next(err); }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, tracking_number } = req.body;
    const order = await StoreOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    const update = {};
    if (status) update.status = status;
    if (tracking_number) update.tracking_number = tracking_number;
    await order.update(update);
    return res.json({ success: true, data: { order } });
  } catch (err) { next(err); }
};

// ── Dashboard Stats ───────────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const { brand } = req.query;
    const where = brand ? { brand } : {};
    const today = new Date(); today.setHours(0,0,0,0);

    const [totalOrders, todayOrders, totalRevenue, pendingOrders] = await Promise.all([
      StoreOrder.count({ where }),
      StoreOrder.count({ where: { ...where, created_at: { [Op.gte]: today } } }),
      StoreOrder.sum('total', { where: { ...where, payment_status: 'paid' } }),
      StoreOrder.count({ where: { ...where, status: 'pending' } }),
    ]);
    return res.json({ success: true, data: { totalOrders, todayOrders, totalRevenue: totalRevenue || 0, pendingOrders } });
  } catch (err) { next(err); }
};

module.exports = {
  getConfig, upsertConfig,
  getCategories,
  getProducts, createProduct, updateProduct, deleteProduct,
  getBanners, createBanner, updateBanner, deleteBanner,
  getVouchers, createVoucher, updateVoucher,
  getOrders, updateOrderStatus,
  getStats,
};
