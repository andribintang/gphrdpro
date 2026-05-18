const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const {
  Category, Product, Stock, StockMovement,
  Customer, Order, OrderItem, Payment, Shipment, ImportLog,
} = require('../models/erp');

const toNum = v => parseFloat(v) || 0;

// ════════════════════════════════════════════════════════════════
// CATEGORIES
// ════════════════════════════════════════════════════════════════
const getCategories = async (req, res, next) => {
  try {
    const { branch_id } = req.query;
    const where = { is_active: true };
    if (branch_id) where[Op.or] = [{ branch_id }, { branch_id: null }];
    const cats = await Category.findAll({ where, order: [['sort_order','ASC'],['name','ASC']] });
    return res.json({ success: true, data: { categories: cats } });
  } catch (err) { next(err); }
};

const createCategory = async (req, res, next) => {
  try {
    const cat = await Category.create(req.body);
    return res.status(201).json({ success: true, data: { category: cat } });
  } catch (err) { next(err); }
};

const updateCategory = async (req, res, next) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
    await cat.update(req.body);
    return res.json({ success: true, data: { category: cat } });
  } catch (err) { next(err); }
};

const deleteCategory = async (req, res, next) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
    const count = await Product.count({ where: { category_id: cat.id } });
    if (count > 0) return res.status(400).json({ success: false, message: `Tidak bisa hapus — ada ${count} produk` });
    await cat.destroy();
    return res.json({ success: true, message: 'Kategori dihapus' });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════════
const getProducts = async (req, res, next) => {
  try {
    const { branch_id, category_id, search, low_stock, page = 1, limit = 50 } = req.query;
    const where = { is_active: true };
    if (branch_id)   where.branch_id   = branch_id;
    if (category_id) where.category_id = category_id;
    if (search) {
      where[Op.or] = [
        { name:    { [Op.like]: `%${search}%` } },
        { sku:     { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category', attributes: ['id','name'] },
        { model: Stock,    as: 'stock',    attributes: ['qty','qty_reserved'] },
      ],
      order: [['name','ASC']],
      limit: parseInt(limit),
      offset,
    });

    let products = rows;
    if (low_stock === 'true') {
      products = rows.filter(p => (p.stock?.qty || 0) <= p.stock_min);
    }

    return res.json({ success: true, data: { products, total: count, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { next(err); }
};

const getProductByBarcode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const product = await Product.findOne({
      where: { [Op.or]: [{ barcode: code }, { sku: code }], is_active: true },
      include: [
        { model: Category, as: 'category', attributes: ['id','name'] },
        { model: Stock,    as: 'stock',    attributes: ['qty','qty_reserved'] },
      ],
    });
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    return res.json({ success: true, data: { product } });
  } catch (err) { next(err); }
};

const createProduct = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const product = await Product.create(req.body, { transaction: t });
    // Init stock record
    await Stock.create({ product_id: product.id, branch_id: product.branch_id, qty: 0 }, { transaction: t });
    await t.commit();
    return res.status(201).json({ success: true, data: { product } });
  } catch (err) { await t.rollback(); next(err); }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    await product.update(req.body);
    return res.json({ success: true, data: { product } });
  } catch (err) { next(err); }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    await product.update({ is_active: false });
    return res.json({ success: true, message: 'Produk dinonaktifkan' });
  } catch (err) { next(err); }
};

// ── Stock Adjustment ─────────────────────────────────────────
const adjustStock = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { product_id, branch_id, type, qty, notes } = req.body;
    let stock = await Stock.findOne({ where: { product_id, branch_id }, transaction: t });
    if (!stock) stock = await Stock.create({ product_id, branch_id, qty: 0 }, { transaction: t });

    const qtyBefore = stock.qty;
    const qtyChange = type === 'in' ? Math.abs(qty) : -Math.abs(qty);
    const qtyAfter  = qtyBefore + qtyChange;

    if (qtyAfter < 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Stok tidak cukup. Stok saat ini: ${qtyBefore}` });
    }

    await stock.update({ qty: qtyAfter }, { transaction: t });
    await StockMovement.create({
      product_id, branch_id, type, qty: qtyChange,
      qty_before: qtyBefore, qty_after: qtyAfter,
      ref_type: 'adjustment', notes, created_by: req.user?.id,
    }, { transaction: t });

    await t.commit();
    return res.json({ success: true, message: `Stok diupdate: ${qtyBefore} → ${qtyAfter}`, data: { qty_after: qtyAfter } });
  } catch (err) { await t.rollback(); next(err); }
};

// ════════════════════════════════════════════════════════════════
// CUSTOMERS
// ════════════════════════════════════════════════════════════════
const getCustomers = async (req, res, next) => {
  try {
    const { search, branch_id, page = 1, limit = 50 } = req.query;
    const where = { is_active: true };
    if (branch_id) where[Op.or] = [{ branch_id }, { branch_id: null }];
    if (search) {
      where[Op.or] = [
        { name:  { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { code:  { [Op.like]: `%${search}%` } },
      ];
    }
    const offset = (parseInt(page)-1) * parseInt(limit);
    const { count, rows } = await Customer.findAndCountAll({
      where, order: [['name','ASC']], limit: parseInt(limit), offset,
    });
    return res.json({ success: true, data: { customers: rows, total: count } });
  } catch (err) { next(err); }
};

const createCustomer = async (req, res, next) => {
  try {
    // Auto-generate code
    if (!req.body.code) {
      const count = await Customer.count();
      req.body.code = `CUST-${String(count + 1).padStart(5, '0')}`;
    }
    const customer = await Customer.create(req.body);
    return res.status(201).json({ success: true, data: { customer } });
  } catch (err) { next(err); }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
    await customer.update(req.body);
    return res.json({ success: true, data: { customer } });
  } catch (err) { next(err); }
};

// ════════════════════════════════════════════════════════════════
// IMPORT EXCEL/CSV
// ════════════════════════════════════════════════════════════════
const importData = async (req, res, next) => {
  try {
    const { type, branch_id, rows } = req.body;
    // rows = array of objects parsed from Excel on frontend

    if (!['products','customers','stock'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type tidak valid' });
    }
    if (!rows?.length) {
      return res.status(400).json({ success: false, message: 'Tidak ada data untuk diimport' });
    }

    const log = await ImportLog.create({
      type, total_rows: rows.length, status: 'processing', imported_by: req.user?.id,
    });

    let success = 0, errors = [], errorRows = 0;

    if (type === 'products') {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row.name) throw new Error('Nama produk wajib diisi');
          const branchId = row.branch_id || branch_id;
          if (!branchId) throw new Error('Branch ID wajib');

          // Find or create category
          let categoryId = null;
          if (row.category) {
            const [cat] = await Category.findOrCreate({
              where: { name: row.category, branch_id: branchId },
              defaults: { name: row.category, branch_id: branchId },
            });
            categoryId = cat.id;
          }

          const t = await sequelize.transaction();
          try {
            // Upsert by SKU or barcode
            const existing = row.sku
              ? await Product.findOne({ where: { sku: row.sku }, transaction: t })
              : null;

            let product;
            if (existing) {
              await existing.update({
                name: row.name, category_id: categoryId,
                buy_price:  toNum(row.buy_price),
                sell_price: toNum(row.sell_price),
                unit: row.unit || 'pcs',
                barcode: row.barcode || existing.barcode,
                weight: toNum(row.weight),
              }, { transaction: t });
              product = existing;
            } else {
              product = await Product.create({
                branch_id: branchId, category_id: categoryId,
                sku:        row.sku       || null,
                barcode:    row.barcode   || null,
                name:       row.name,
                unit:       row.unit      || 'pcs',
                buy_price:  toNum(row.buy_price),
                sell_price: toNum(row.sell_price),
                sell_price_mp: row.sell_price_mp ? toNum(row.sell_price_mp) : null,
                weight:     toNum(row.weight),
                stock_min:  parseInt(row.stock_min) || 0,
              }, { transaction: t });

              // Init stock
              await Stock.findOrCreate({
                where: { product_id: product.id, branch_id: branchId },
                defaults: { qty: parseInt(row.stock_qty) || 0 },
                transaction: t,
              });
            }

            // Set initial stock if provided
            if (row.stock_qty && parseInt(row.stock_qty) > 0) {
              const stock = await Stock.findOne({ where: { product_id: product.id }, transaction: t });
              if (stock && stock.qty === 0) {
                const initQty = parseInt(row.stock_qty);
                await stock.update({ qty: initQty }, { transaction: t });
                await StockMovement.create({
                  product_id: product.id, branch_id: branchId,
                  type: 'in', qty: initQty, qty_before: 0, qty_after: initQty,
                  ref_type: 'import', notes: 'Import awal / migrasi data',
                  created_by: req.user?.id,
                }, { transaction: t });
              }
            }

            await t.commit();
            success++;
          } catch (e2) { await t.rollback(); throw e2; }
        } catch (e) {
          errorRows++;
          errors.push({ row: i + 2, data: row.name || '?', error: e.message });
        }
      }
    }

    if (type === 'customers') {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row.name) throw new Error('Nama pelanggan wajib diisi');
          const branchId = row.branch_id || branch_id || null;

          await Customer.findOrCreate({
            where: { phone: row.phone || `NOPHONE-${i}` },
            defaults: {
              branch_id:   branchId,
              code:        row.code || `CUST-${String(i+1).padStart(5,'0')}`,
              name:        row.name,
              phone:       row.phone   || null,
              email:       row.email   || null,
              address:     row.address || null,
              city:        row.city    || null,
              province:    row.province|| null,
              postal_code: row.postal_code || null,
            },
          });
          success++;
        } catch (e) {
          errorRows++;
          errors.push({ row: i + 2, data: row.name || '?', error: e.message });
        }
      }
    }

    await log.update({
      status: 'done',
      success_rows: success,
      error_rows: errorRows,
      errors_json: errors.length ? errors : null,
    });

    return res.json({
      success: true,
      message: `Import selesai: ${success} berhasil, ${errorRows} gagal`,
      data: { success, errors: errorRows, error_details: errors.slice(0, 20) },
    });
  } catch (err) { next(err); }
};

// Template download info
const getImportTemplate = async (req, res) => {
  const { type } = req.params;
  const templates = {
    products: {
      columns: ['name*','sku','barcode','category','unit','buy_price*','sell_price*','sell_price_mp','weight','stock_qty','stock_min'],
      example: { name:'Kampas Rem Honda', sku:'KR-001', barcode:'8991234567890', category:'Spare Part', unit:'pcs', buy_price:15000, sell_price:25000, weight:100, stock_qty:50 },
      notes: '* = wajib diisi. Kolom sell_price_mp = harga khusus marketplace (opsional)',
    },
    customers: {
      columns: ['name*','phone','email','address','city','province','postal_code','code'],
      example: { name:'Budi Santoso', phone:'08123456789', city:'Jakarta', province:'DKI Jakarta' },
      notes: '* = wajib diisi',
    },
  };
  return res.json({ success: true, data: templates[type] || {} });
};

module.exports = {
  // Categories
  getCategories, createCategory, updateCategory, deleteCategory,
  // Products
  getProducts, getProductByBarcode, createProduct, updateProduct, deleteProduct,
  // Stock
  adjustStock,
  // Customers
  getCustomers, createCustomer, updateCustomer,
  // Import
  importData, getImportTemplate,
};
