const { Op } = require('sequelize');
const { StoreConfig, StoreProduct, StoreBanner, StoreReview } = require('../../models/store');
const { Category: ErpCategory } = require('../../models/erp');

// Helper: get ERP category map for a brand
const getCatMap = async (brand) => {
  const branchId = brand === 'gpdistro' ? 2 : 1;
  const cats = await ErpCategory.findAll({ where: { branch_id: branchId }, attributes: ['id','name'] });
  return Object.fromEntries(cats.map(c => [c.id, { id: c.id, name: c.name, slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g,'-') }]));
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
    const branchId = req.params.brand === 'gpdistro' ? 2 : 1;
    const categories = await ErpCategory.findAll({
      where: { branch_id: branchId, is_active: true },
      order: [['sort_order','ASC'],['name','ASC']],
      attributes: ['id','name','description','sort_order'],
    });
    const mapped = categories.map(c => ({
      id: c.id, name: c.name,
      slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
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

// GET /api/store/:brand/products
const getProducts = async (req, res, next) => {
  try {
    const { category, search, min_price, max_price, sort = 'newest', featured, page = 1, limit = 24 } = req.query;
    const where = { brand: req.params.brand, is_active: true };
    if (category)  where.category_id = category;
    if (featured)  where.is_featured  = true;
    if (search)    where.name = { [Op.like]: `%${search}%` };
    if (min_price) where.price = { ...where.price, [Op.gte]: parseFloat(min_price) };
    if (max_price) where.price = { ...where.price, [Op.lte]: parseFloat(max_price) };

    const order = {
      newest:    [['created_at','DESC']],
      oldest:    [['created_at','ASC']],
      price_asc: [['price','ASC']],
      price_desc:[['price','DESC']],
      popular:   [['sold_count','DESC']],
    }[sort] || [['created_at','DESC']];

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await StoreProduct.findAndCountAll({
      where, order,
      limit: parseInt(limit), offset,
      attributes: { exclude: ['description','meta_title','meta_desc','erp_product_id'] },
    });

    const catMap   = await getCatMap(req.params.brand);
    const products = rows.map(p => ({ ...p.toJSON(), category: catMap[p.category_id] || null }));
    return res.json({ success: true, data: { products, total: count, page: parseInt(page), total_pages: Math.ceil(count / parseInt(limit)) } });
  } catch (err) { next(err); }
};

// GET /api/store/:brand/products/featured
const getFeatured = async (req, res, next) => {
  try {
    const rows = await StoreProduct.findAll({
      where: { brand: req.params.brand, is_featured: true, is_active: true },
      order: [['sold_count','DESC']], limit: 12,
      attributes: { exclude: ['description','meta_title','meta_desc','erp_product_id'] },
    });
    const catMap   = await getCatMap(req.params.brand);
    const products = rows.map(p => ({ ...p.toJSON(), category: catMap[p.category_id] || null }));
    return res.json({ success: true, data: { products } });
  } catch (err) { next(err); }
};

// GET /api/store/:brand/products/:slug
const getProduct = async (req, res, next) => {
  try {
    const product = await StoreProduct.findOne({
      where: { slug: req.params.slug, brand: req.params.brand, is_active: true },
      include: [
        { association: 'reviews', where: { is_approved: true }, required: false, limit: 10, order: [['created_at','DESC']] },
      ],
    });
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    await product.increment('view_count');
    const catMap = await getCatMap(req.params.brand);
    return res.json({ success: true, data: { product: { ...product.toJSON(), category: catMap[product.category_id] || null } } });
  } catch (err) { next(err); }
};

module.exports = { getConfig, getCategories, getBanners, getProducts, getFeatured, getProduct };
