const { Op } = require('sequelize');
const { StoreConfig, StoreBanner, StoreReview } = require('../../models/store');

// Helper: map erp_product row to store product format
const mapProduct = (p) => {
  const parse = (v, fallback) => { try { return typeof v === 'string' ? JSON.parse(v) : (v || fallback); } catch { return fallback; } };
  return {
    id:           p.id,
    erp_id:       p.id,
    brand:        p.brand,
    name:         p.name,
    slug:         p.store_slug || (p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + p.id),
    sku:          p.sku,
    short_desc:   p.store_short_desc,
    description:  p.store_description,
    price:        parseFloat(p.store_price || p.sell_price_mp || p.sell_price || 0),
    price_compare:parseFloat(p.store_price_compare || 0),
    weight:       Math.round((parseFloat(p.weight) || 0.5) * 1000),
    stock:        parseInt(p.stock_qty || 0),
    images:       parse(p.store_images, []),
    variants:     parse(p.store_variants, {}),
    tags:         parse(p.store_tags, []),
    is_featured:  !!p.store_featured,
    is_active:    true,
    sold_count:   parseInt(p.store_sold_count || 0),
    view_count:   parseInt(p.store_view_count || 0),
    meta_title:   p.store_meta_title || p.name,
    meta_desc:    p.store_meta_desc,
    category_id:  p.category_id,
    category:     p.category_id ? { id: p.category_id, name: p.cat_name, slug: (p.cat_name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-') } : null,
    created_at:   p.created_at,
    updated_at:   p.updated_at,
  };
};

// GET /api/store/:brand/config
const getConfig = async (req, res, next) => {
  try {
    const config = await StoreConfig.findOne({ where: { brand: req.params.brand, is_active: true } });
    if (!config) return res.status(404).json({ success: false, message: 'Store tidak ditemukan' });
    return res.json({ success: true, data: { config } });
  } catch (err) { next(err); }
};

// GET /api/store/:brand/categories — from ERP
const getCategories = async (req, res, next) => {
  try {
    const { sequelize } = require('../../config/database');
    const branchId = req.params.brand === 'gpdistro' ? 2 : 1;
    const [cats] = await sequelize.query(
      `SELECT id, name, description, sort_order FROM erp_categories WHERE branch_id = ${branchId} AND is_active = 1 ORDER BY sort_order ASC, name ASC`
    );
    const mapped = cats.map(c => ({
      id: c.id, name: c.name,
      slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: c.description, sort_order: c.sort_order,
      is_active: true, children: [],
    }));
    return res.json({ success: true, data: { categories: mapped } });
  } catch (err) { next(err); }
};

// GET /api/store/:brand/banners
const getBanners = async (req, res, next) => {
  try {
    const banners = await StoreBanner.findAll({
      where: { brand: req.params.brand, is_active: true },
      order: [['sort_order','ASC']],
    });
    return res.json({ success: true, data: { banners } });
  } catch (err) { next(err); }
};

// Build WHERE for product queries
const buildWhere = (brand, { category, search, min_price, max_price, featured }) => {
  const storeCol = brand === 'gpdistro' ? 'store_active_gpd' : 'store_active_gpr';
  const branchId = brand === 'gpdistro' ? 2 : 1;
  let where = `ep.branch_id = ${branchId} AND ep.${storeCol} = 1 AND ep.is_active = 1`;
  if (category)  where += ` AND ep.category_id = ${parseInt(category)}`;
  if (search)    where += ` AND ep.name LIKE '%${search.replace(/'/g,"''")}%'`;
  if (min_price) where += ` AND COALESCE(ep.store_price, ep.sell_price_mp, ep.sell_price) >= ${parseFloat(min_price)}`;
  if (max_price) where += ` AND COALESCE(ep.store_price, ep.sell_price_mp, ep.sell_price) <= ${parseFloat(max_price)}`;
  if (featured)  where += ` AND ep.store_featured = 1`;
  return where;
};

const ORDER_MAP = {
  newest:    'ep.created_at DESC',
  oldest:    'ep.created_at ASC',
  price_asc: 'COALESCE(ep.store_price, ep.sell_price_mp, ep.sell_price) ASC',
  price_desc:'COALESCE(ep.store_price, ep.sell_price_mp, ep.sell_price) DESC',
  popular:   'ep.store_sold_count DESC',
};

const SELECT_COLS = `ep.*, 
  COALESCE(ep.store_price, ep.sell_price_mp, ep.sell_price) as effective_price,
  ec.name as cat_name,
  COALESCE(s.qty, 0) as stock_qty`;

const JOIN = `FROM erp_products ep
  LEFT JOIN erp_categories ec ON ec.id = ep.category_id
  LEFT JOIN erp_stock s ON s.product_id = ep.id AND s.branch_id = ep.branch_id`;

// GET /api/store/:brand/products
const getProducts = async (req, res, next) => {
  try {
    const { category, search, min_price, max_price, sort = 'newest', featured, page = 1, limit = 24 } = req.query;
    const { sequelize } = require('../../config/database');
    const pageNum  = parseInt(page)  || 1;
    const limitNum = parseInt(limit) || 24;
    const offset   = (pageNum - 1) * limitNum;
    const where    = buildWhere(req.params.brand, { category, search, min_price, max_price, featured });
    const order    = ORDER_MAP[sort] || ORDER_MAP.newest;

    const [[{ total }]] = await sequelize.query(`SELECT COUNT(*) as total ${JOIN} WHERE ${where}`);
    const [rows]        = await sequelize.query(`SELECT ${SELECT_COLS} ${JOIN} WHERE ${where} ORDER BY ${order} LIMIT ${limitNum} OFFSET ${offset}`);

    return res.json({ success: true, data: {
      products: rows.map(p => ({ ...mapProduct(p), brand: req.params.brand })),
      total: parseInt(total), page: pageNum,
      total_pages: Math.ceil(total / limitNum),
    }});
  } catch (err) { next(err); }
};

// GET /api/store/:brand/products/featured
const getFeatured = async (req, res, next) => {
  try {
    const { sequelize } = require('../../config/database');
    const where = buildWhere(req.params.brand, { featured: true });
    const [rows] = await sequelize.query(
      `SELECT ${SELECT_COLS} ${JOIN} WHERE ${where} ORDER BY ep.store_sold_count DESC LIMIT 12`
    );
    return res.json({ success: true, data: { products: rows.map(p => ({ ...mapProduct(p), brand: req.params.brand })) } });
  } catch (err) { next(err); }
};

// GET /api/store/:brand/products/:slug
const getProduct = async (req, res, next) => {
  try {
    const { sequelize } = require('../../config/database');
    const branchId = req.params.brand === 'gpdistro' ? 2 : 1;
    const slug = req.params.slug.replace(/'/g, "''");
    const [[row]] = await sequelize.query(
      `SELECT ${SELECT_COLS} ${JOIN}
       WHERE ep.branch_id = ${branchId} AND ep.is_active = 1
       AND (ep.store_slug = '${slug}' OR CONCAT(LOWER(REPLACE(ep.name,' ','-')), '-', ep.id) = '${slug}')
       LIMIT 1`
    );
    if (!row) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    await sequelize.query(`UPDATE erp_products SET store_view_count = COALESCE(store_view_count,0) + 1 WHERE id = ${row.id}`);
    const product = { ...mapProduct(row), brand: req.params.brand };

    // Attach reviews from store_reviews
    try {
      const [reviews] = await sequelize.query(
        `SELECT * FROM store_reviews WHERE product_id = ${row.id} AND is_approved = 1 ORDER BY created_at DESC LIMIT 10`
      );
      product.reviews = reviews;
    } catch { product.reviews = []; }

    return res.json({ success: true, data: { product } });
  } catch (err) { next(err); }
};

module.exports = { getConfig, getCategories, getBanners, getProducts, getFeatured, getProduct };
