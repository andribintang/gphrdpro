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
    const where = { is_active: true };
    if (branch_id) where.branch_id = branch_id;
    if (category_id) where.category_id = category_id;
    if (search) where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { sku:  { [Op.like]: `%${search}%` } },
      { barcode: { [Op.like]: `%${search}%` } },
    ];
    const offset = (parseInt(page)-1)*parseInt(limit);
    const { count, rows } = await Product.findAndCountAll({
      where, limit: parseInt(limit), offset,
      include: [
        { model: Category, as:'category', attributes:['id','name'] },
        { model: Stock, as:'stock', required:false },
      ],
      order: [['name','ASC']],
    });
    let products = rows;
    if (low_stock === 'true') products = rows.filter(p => (p.stock?.qty||0) <= (p.stock_min||0));
    return res.json({ success:true, data:{ products, total:count } });
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
    const product = await Product.create(req.body, { transaction: t });
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
