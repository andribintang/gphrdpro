const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const {
  SubChannel, Category, Product, Stock, StockMovement,
  Customer, Order, OrderItem, Payment, Shipment, ImportLog,
} = require('../../models/erp');

const toNum = v => parseFloat(v) || 0;

// ── Sub Channels ──────────────────────────────────────────────
const getSubChannels = async (req, res, next) => {
  try {
    const { channel } = req.query;
    const where = { is_active: true };
    if (channel) where.channel = channel;
    const rows = await SubChannel.findAll({ where, order: [['channel','ASC'],['sort_order','ASC'],['name','ASC']] });
    return res.json({ success: true, data: { sub_channels: rows } });
  } catch (err) { next(err); }
};

const getAllSubChannels = async (req, res, next) => {
  try {
    const rows = await SubChannel.findAll({ order: [['channel','ASC'],['sort_order','ASC']] });
    return res.json({ success: true, data: { sub_channels: rows } });
  } catch (err) { next(err); }
};

const createSubChannel = async (req, res, next) => {
  try {
    const { channel, name, description, sort_order } = req.body;
    if (!channel || !name) return res.status(400).json({ success:false, message:'channel dan name wajib' });
    const sc = await SubChannel.create({ channel, name, description, sort_order: sort_order||0 });
    return res.status(201).json({ success:true, data:{ sub_channel: sc } });
  } catch (err) { next(err); }
};

const updateSubChannel = async (req, res, next) => {
  try {
    const sc = await SubChannel.findByPk(req.params.id);
    if (!sc) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
    await sc.update(req.body);
    return res.json({ success:true, data:{ sub_channel: sc } });
  } catch (err) { next(err); }
};

const deleteSubChannel = async (req, res, next) => {
  try {
    const sc = await SubChannel.findByPk(req.params.id);
    if (!sc) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
    await sc.update({ is_active: false });
    return res.json({ success:true, message:`${sc.name} dinonaktifkan` });
  } catch (err) { next(err); }
};

// ── Categories ────────────────────────────────────────────────
const getCategories = async (req, res, next) => {
  try {
    const { branch_id, limit=200 } = req.query;
    const where = { is_active: true };
    if (branch_id) where[Op.or] = [{ branch_id }, { branch_id: null }];
    const rows = await Category.findAll({ where, order: [['sort_order','ASC'],['name','ASC']], limit: parseInt(limit) });
    return res.json({ success:true, data:{ categories: rows } });
  } catch (err) { next(err); }
};

const createCategory = async (req, res, next) => {
  try {
    const cat = await Category.create(req.body);
    return res.status(201).json({ success:true, data:{ category: cat } });
  } catch (err) { next(err); }
};

const updateCategory = async (req, res, next) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
    await cat.update(req.body);
    return res.json({ success:true, data:{ category: cat } });
  } catch (err) { next(err); }
};

const deleteCategory = async (req, res, next) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
    await cat.update({ is_active: false });
    return res.json({ success:true, message:'Dihapus' });
  } catch (err) { next(err); }
};

// ── Products ──────────────────────────────────────────────────
const getProducts = async (req, res, next) => {
  try {
    const { branch_id, search, category_id, low_stock, limit=50, page=1 } = req.query;
    const { sequelize } = require('../../config/database');
    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.max(1, parseInt(limit) || 50);
    const offset   = (pageNum - 1) * limitNum;

    let where = 'ep.is_active = 1';
    if (branch_id)   where += ` AND ep.branch_id = ${parseInt(branch_id)}`;
    if (category_id) where += ` AND ep.category_id = ${parseInt(category_id)}`;
    if (search) {
      const s = sequelize.escape('%' + search + '%');
      where += ` AND (ep.name LIKE ${s} OR ep.sku LIKE ${s} OR ep.barcode LIKE ${s})`;
    }

    const [[{ total }]] = await sequelize.query(
      `SELECT COUNT(*) as total FROM erp_products ep WHERE ${where}`
    );

    const [rows] = await sequelize.query(
      `SELECT ep.id, ep.branch_id, ep.category_id, ep.sku, ep.barcode, ep.name,
              ep.unit, ep.buy_price, ep.sell_price, ep.sell_price_mp, ep.sell_price_wa,
              ep.stock_min, ep.weight, ep.notes, ep.is_active,
              ep.store_price, ep.store_price_compare, ep.store_active_gpd, ep.store_active_gpr,
              ep.store_short_desc, ep.store_description, ep.store_slug, ep.store_featured,
              ep.store_sold_count, ep.store_view_count, ep.store_meta_title, ep.store_meta_desc,
              ep.created_at, ep.updated_at,
              ec.name as category_name,
              COALESCE(s.qty, 0) as stock_qty
       FROM erp_products ep
       LEFT JOIN erp_categories ec ON ec.id = ep.category_id
       LEFT JOIN erp_stock s ON s.product_id = ep.id AND s.branch_id = ep.branch_id
       WHERE ${where}
       ORDER BY ep.name ASC
       LIMIT ${limitNum} OFFSET ${offset}`
    );

    // Parse JSON fields safely
    const parse = (v, fb) => { try { return v ? (typeof v==='string' ? JSON.parse(v) : v) : fb; } catch { return fb; } };

    let products = rows.map(p => ({
      ...p,
      store_images:   parse(p.store_images, []),
      store_variants: parse(p.store_variants, {}),
      store_tags:     parse(p.store_tags, []),
      category:       p.category_id ? { id: p.category_id, name: p.category_name } : null,
      stock:          { qty: parseInt(p.stock_qty || 0), branch_id: p.branch_id, product_id: p.id },
    }));

    if (low_stock === 'true') products = products.filter(p => (p.stock?.qty||0) <= (p.stock_min||0));
    return res.json({ success: true, data: { products, total: parseInt(total) } });
  } catch (err) { next(err); }
};

const getProductByBarcode = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      where: { barcode: req.params.code, is_active: true },
      include: [{ model: Stock, as:'stock' }],
    });
    if (!product) return res.status(404).json({ success:false, message:'Produk tidak ditemukan' });
    return res.json({ success:true, data:{ product } });
  } catch (err) { next(err); }
};

const createProduct = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const now = new Date();
    const product = await Product.create({ ...req.body, created_at: now, updated_at: now }, { transaction: t });
    await Stock.create({ product_id: product.id, branch_id: product.branch_id, qty: 0 }, { transaction: t });
    await t.commit();
    return res.status(201).json({ success:true, data:{ product } });
  } catch (err) { await t.rollback(); next(err); }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
    await product.update(req.body);
    return res.json({ success:true, data:{ product } });
  } catch (err) { next(err); }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
    await product.update({ is_active: false });
    return res.json({ success:true, message:'Dinonaktifkan' });
  } catch (err) { next(err); }
};

const adjustStock = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { product_id, branch_id, type, qty, notes } = req.body;
    let stock = await Stock.findOne({ where: { product_id, branch_id }, transaction: t });
    if (!stock) stock = await Stock.create({ product_id, branch_id, qty: 0 }, { transaction: t });
    const qtyBefore = stock.qty;
    const qtyAfter  = type === 'in' ? qtyBefore + qty : qtyBefore - qty;
    if (qtyAfter < 0) { await t.rollback(); return res.status(400).json({ success:false, message:'Stok tidak cukup' }); }
    await stock.update({ qty: qtyAfter }, { transaction: t });
    await StockMovement.create({ product_id, branch_id, type, qty, qty_before: qtyBefore, qty_after: qtyAfter, ref_type:'manual', notes, created_by: req.user?.id }, { transaction: t });
    await t.commit();
    return res.json({ success:true, data:{ stock } });
  } catch (err) { await t.rollback(); next(err); }
};

// ── Customers ─────────────────────────────────────────────────
const getCustomers = async (req, res, next) => {
  try {
    const { search, limit=100, page=1 } = req.query;
    const where = {};
    if (search) where[Op.or] = [
      { name:  { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
    const offset = (parseInt(page)-1)*parseInt(limit);
    const { count, rows } = await Customer.findAndCountAll({ where, limit: parseInt(limit), offset, order: [['name','ASC']] });
    return res.json({ success:true, data:{ customers: rows, total: count } });
  } catch (err) { next(err); }
};

const createCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.create(req.body);
    return res.status(201).json({ success:true, data:{ customer } });
  } catch (err) { next(err); }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
    await customer.update(req.body);
    return res.json({ success:true, data:{ customer } });
  } catch (err) { next(err); }
};

// ── Import ────────────────────────────────────────────────────
const importProducts = async (req, res, next) => {
  try {
    const { branch_id, rows } = req.body;
    let success = 0, failed = 0, errors = [];
    for (const row of (rows||[])) {
      try {
        const existing = row.sku ? await Product.findOne({ where: { sku: row.sku, branch_id } }) : null;
        if (existing) { await existing.update({ ...row, branch_id }); }
        else {
          const p = await Product.create({ ...row, branch_id, is_active: true });
          await Stock.findOrCreate({ where: { product_id: p.id, branch_id }, defaults: { qty: parseInt(row.initial_stock||0) } });
        }
        success++;
      } catch (e) { failed++; errors.push(`Row ${success+failed}: ${e.message}`); }
    }
    const log = await ImportLog.create({ type:'products', filename: req.body.filename||'import', total: rows?.length||0, success, failed, errors: JSON.stringify(errors), created_by: req.user?.id });
    return res.json({ success:true, data:{ success, failed, errors } });
  } catch (err) { next(err); }
};

const importCustomers = async (req, res, next) => {
  try {
    const { rows } = req.body;
    let success = 0, failed = 0, errors = [];
    for (const row of (rows||[])) {
      try {
        const existing = row.phone ? await Customer.findOne({ where: { phone: row.phone } }) : null;
        if (existing) await existing.update(row);
        else await Customer.create(row);
        success++;
      } catch (e) { failed++; errors.push(`Row ${success+failed}: ${e.message}`); }
    }
    return res.json({ success:true, data:{ success, failed, errors } });
  } catch (err) { next(err); }
};

module.exports = {
  getSubChannels, getAllSubChannels, createSubChannel, updateSubChannel, deleteSubChannel,
  getCategories, createCategory, updateCategory, deleteCategory,
  getProducts, getProductByBarcode, createProduct, updateProduct, deleteProduct, adjustStock,
  getCustomers, createCustomer, updateCustomer,
  importProducts, importCustomers,
};
