const { Op } = require('sequelize');
const {
  StoreConfig, StoreBanner,
  StoreVoucher, StoreOrder, StoreOrderItem,
} = require('../../models/store');

// ── Helper ────────────────────────────────────────────────────
const parseJSON = (v, fb) => { try { return typeof v === 'string' ? JSON.parse(v) : (v || fb); } catch { return fb; } };

const mapProduct = (p, brand) => ({
  id:            p.id,
  name:          p.name,
  sku:           p.sku,
  category_id:   p.category_id,
  category:      p.category_id ? { id: p.category_id, name: p.cat_name } : null,
  price:         parseFloat(p.store_price || p.sell_price_mp || p.sell_price || 0),
  price_compare: parseFloat(p.store_price_compare || 0),
  stock:         parseInt(p.stock_qty || 0),
  weight:        Math.round((parseFloat(p.weight) || 0.5) * 1000),
  images:        parseJSON(p.store_images, []),
  variants:      parseJSON(p.store_variants, {}),
  tags:          parseJSON(p.store_tags, []),
  is_active:     brand === 'gpdistro' ? !!p.store_active_gpd : !!p.store_active_gpr,
  is_featured:   !!p.store_featured,
  short_desc:    p.store_short_desc,
  description:   p.store_description,
  meta_title:    p.store_meta_title,
  meta_desc:     p.store_meta_desc,
  slug:          p.store_slug || (p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + p.id),
  sold_count:    parseInt(p.store_sold_count || 0),
  brand,
});

// ── Config ────────────────────────────────────────────────────
const getConfig = async (req, res, next) => {
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

// ── Categories — from ERP ─────────────────────────────────────
const getCategories = async (req, res, next) => {
  try {
    const { brand } = req.query;
    const { sequelize } = require('../../config/database');
    const where = brand ? `branch_id = ${brand === 'gpdistro' ? 2 : 1}` : '1=1';
    const [cats] = await sequelize.query(
      `SELECT id, branch_id, name, description, sort_order, is_active FROM erp_categories WHERE ${where} ORDER BY branch_id, sort_order, name`
    );
    const mapped = cats.map(c => ({
      ...c, slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      brand: c.branch_id === 2 ? 'gpdistro' : 'gpracing',
    }));
    return res.json({ success: true, data: { categories: mapped } });
  } catch (err) { next(err); }
};

// ── Products — from erp_products ─────────────────────────────
const getProducts = async (req, res, next) => {
  try {
    const { brand, search, category, page = 1, limit = 20 } = req.query;
    const { sequelize } = require('../../config/database');
    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.max(1, parseInt(limit) || 20);
    const offset   = (pageNum - 1) * limitNum;

    const branchId = brand === 'gpdistro' ? 2 : 1;
    let where = `ep.branch_id = ${branchId} AND ep.is_active = 1`;
    if (category) where += ` AND ep.category_id = ${parseInt(category)}`;
    if (search)   where += ` AND (ep.name LIKE ${sequelize.escape('%' + search + '%')} OR ep.sku LIKE ${sequelize.escape('%' + search + '%')})`;

    const [[{ n }]] = await sequelize.query(
      `SELECT COUNT(*) as n FROM erp_products ep WHERE ${where}`
    );
    const total = parseInt(n) || 0;

    const [rows] = await sequelize.query(
      `SELECT ep.*, ec.name as cat_name, COALESCE(s.qty,0) as stock_qty
       FROM erp_products ep
       LEFT JOIN erp_categories ec ON ec.id = ep.category_id
       LEFT JOIN erp_stock s ON s.product_id = ep.id AND s.branch_id = ep.branch_id
       WHERE ${where} ORDER BY ep.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`
    );

    return res.json({ success: true, data: {
      products: rows.map(p => mapProduct(p, brand || (p.branch_id === 2 ? 'gpdistro' : 'gpracing'))),
      total, page: pageNum,
      total_pages: Math.ceil(total / limitNum),
    }});
  } catch (err) { next(err); }
};

const createProduct = async (req, res, next) => {
  try {
    const { sequelize } = require('../../config/database');
    const b = req.body;
    const brand = b.brand || 'gpracing';
    const branchId = brand === 'gpdistro' ? 2 : 1;
    const slug = b.slug || (b.name.toLowerCase().replace(/[^a-z0-9]+/g,'-') + '-' + Date.now());

    const [result] = await sequelize.query(
      `INSERT INTO erp_products (branch_id, category_id, name, sku, sell_price, sell_price_mp,
        weight, notes, is_active,
        store_price, store_price_compare, store_active_gpd, store_active_gpr,
        store_images, store_variants, store_tags, store_short_desc, store_description,
        store_meta_title, store_meta_desc, store_slug, store_featured,
        created_at, updated_at)
       VALUES (${branchId}, ${b.category_id ? parseInt(b.category_id) : 'NULL'},
        ${sequelize.escape(b.name)}, ${sequelize.escape(b.sku||'')},
        ${parseFloat(b.price)||0}, ${parseFloat(b.price)||0},
        ${parseFloat(b.weight)||500},
        ${sequelize.escape(b.description||b.short_desc||'')}, 1,
        ${parseFloat(b.price)||0}, ${parseFloat(b.price_compare)||0},
        ${brand==='gpdistro'?1:0}, ${brand==='gpracing'?1:0},
        ${sequelize.escape(JSON.stringify(b.images||[]))},
        ${sequelize.escape(JSON.stringify(b.variants||{}))},
        ${sequelize.escape(JSON.stringify(b.tags||[]))},
        ${sequelize.escape(b.short_desc||'')},
        ${sequelize.escape(b.description||'')},
        ${sequelize.escape(b.meta_title||b.name)},
        ${sequelize.escape(b.meta_desc||'')},
        ${sequelize.escape(slug)}, ${b.is_featured?1:0},
        NOW(), NOW())`
    );
    const [[product]] = await sequelize.query(`SELECT * FROM erp_products WHERE id = ${result.insertId}`);
    return res.status(201).json({ success: true, data: { product: mapProduct(product, brand) } });
  } catch (err) { next(err); }
};

const updateProduct = async (req, res, next) => {
  try {
    const { sequelize } = require('../../config/database');
    const id = parseInt(req.params.id);
    const b  = req.body;
    const brand = b.brand;

    const sets = [`updated_at = NOW()`];
    const str  = (k, v) => sets.push(`${k} = ${sequelize.escape(v)}`);
    const num  = (k, v) => sets.push(`${k} = ${parseFloat(v)||0}`);
    const int  = (k, v) => sets.push(`${k} = ${parseInt(v)||0}`);
    const bit  = (k, v) => sets.push(`${k} = ${v?1:0}`);
    const jsn  = (k, v) => sets.push(`${k} = ${sequelize.escape(JSON.stringify(v||[]))}`);

    if (b.name          !== undefined) str('name', b.name);
    if (b.sku           !== undefined) str('sku', b.sku);
    if (b.category_id   !== undefined) sets.push(`category_id = ${b.category_id ? parseInt(b.category_id) : 'NULL'}`);
    if (b.price         !== undefined) { num('store_price', b.price); num('sell_price_mp', b.price); }
    if (b.price_compare !== undefined) num('store_price_compare', b.price_compare);
    if (b.weight        !== undefined) num('weight', (parseFloat(b.weight)||500) / 1000);
    if (b.is_active     !== undefined && brand === 'gpdistro') bit('store_active_gpd', b.is_active);
    if (b.is_active     !== undefined && brand === 'gpracing') bit('store_active_gpr', b.is_active);
    if (b.is_featured   !== undefined) bit('store_featured', b.is_featured);
    if (b.images        !== undefined) jsn('store_images', b.images);
    if (b.variants      !== undefined) jsn('store_variants', b.variants);
    if (b.tags          !== undefined) jsn('store_tags', b.tags);
    if (b.short_desc    !== undefined) str('store_short_desc', b.short_desc);
    if (b.description   !== undefined) str('store_description', b.description);
    if (b.meta_title    !== undefined) str('store_meta_title', b.meta_title);
    if (b.meta_desc     !== undefined) str('store_meta_desc', b.meta_desc);
    if (b.slug          !== undefined) str('store_slug', b.slug);

    await sequelize.query(`UPDATE erp_products SET ${sets.join(', ')} WHERE id = ${id}`);
    const [[product]] = await sequelize.query(
      `SELECT ep.*, ec.name as cat_name, COALESCE(s.qty,0) as stock_qty
       FROM erp_products ep
       LEFT JOIN erp_categories ec ON ec.id = ep.category_id
       LEFT JOIN erp_stock s ON s.product_id = ep.id AND s.branch_id = ep.branch_id
       WHERE ep.id = ${id} LIMIT 1`
    );
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    return res.json({ success: true, data: { product: mapProduct(product, brand || (product.branch_id===2?'gpdistro':'gpracing')) } });
  } catch (err) { next(err); }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { sequelize } = require('../../config/database');
    const id    = parseInt(req.params.id);
    const brand = req.query.brand || 'gpracing';
    const col   = brand === 'gpdistro' ? 'store_active_gpd' : 'store_active_gpr';
    await sequelize.query(`UPDATE erp_products SET ${col} = 0, updated_at = NOW() WHERE id = ${id}`);
    return res.json({ success: true, message: 'Produk dinonaktifkan dari toko' });
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
  try { const b = await StoreBanner.create(req.body); return res.status(201).json({ success: true, data: { banner: b } }); }
  catch (err) { next(err); }
};
const updateBanner = async (req, res, next) => {
  try {
    const b = await StoreBanner.findByPk(req.params.id);
    if (!b) return res.status(404).json({ success: false, message: 'Banner tidak ditemukan' });
    await b.update(req.body);
    return res.json({ success: true, data: { banner: b } });
  } catch (err) { next(err); }
};
const deleteBanner = async (req, res, next) => {
  try { await StoreBanner.destroy({ where: { id: req.params.id } }); return res.json({ success: true }); }
  catch (err) { next(err); }
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
    const v = await StoreVoucher.create(req.body);
    return res.status(201).json({ success: true, data: { voucher: v } });
  } catch (err) { next(err); }
};
const updateVoucher = async (req, res, next) => {
  try {
    const v = await StoreVoucher.findByPk(req.params.id);
    if (!v) return res.status(404).json({ success: false, message: 'Voucher tidak ditemukan' });
    await v.update(req.body);
    return res.json({ success: true, data: { voucher: v } });
  } catch (err) { next(err); }
};

// ── Orders ────────────────────────────────────────────────────
const getOrders = async (req, res, next) => {
  try {
    const { brand, status, page = 1, limit = 20, search } = req.query;
    const where = {};
    if (brand)  where.brand  = brand;
    if (status) where.status = status;
    if (search) where[Op.or] = [
      { order_number: { [Op.like]: `%${search}%` } },
      { customer_name: { [Op.like]: `%${search}%` } },
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

// ── Stats ─────────────────────────────────────────────────────
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
