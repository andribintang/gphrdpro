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

    // Try full query with store columns, fallback if columns don't exist yet
    let rows;
    try {
      [rows] = await sequelize.query(
        `SELECT ep.id, ep.branch_id, ep.category_id, ep.sku, ep.barcode, ep.name,
                ep.unit, ep.buy_price, ep.sell_price, ep.sell_price_mp, ep.sell_price_wa,
                ep.stock_min, ep.weight, ep.notes, ep.is_active,
                ep.store_price, ep.store_price_compare, ep.store_active_gpd, ep.store_active_gpr,
                IFNULL(ep.store_images, '[]') as store_images,
                IFNULL(ep.store_variants, '{}') as store_variants,
                IFNULL(ep.store_tags, '[]') as store_tags,
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
    } catch (queryErr) {
      // Fallback: query without store columns (columns may not exist yet)
      console.warn('getProducts fallback query:', queryErr.message);
      [rows] = await sequelize.query(
        `SELECT ep.id, ep.branch_id, ep.category_id, ep.sku, ep.barcode, ep.name,
                ep.unit, ep.buy_price, ep.sell_price, ep.sell_price_mp, ep.sell_price_wa,
                ep.stock_min, ep.weight, ep.notes, ep.is_active,
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
    }

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
    const b = req.body;
    const esc = (v) => sequelize.escape(v == null ? '' : String(v));
    const num = (v, d=0) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
    const int = (v, d=0) => { const n = parseInt(v); return isNaN(n) ? d : n; };
    const jsn = (v, d='[]') => esc(JSON.stringify(v && typeof v === 'object' ? v : JSON.parse(d)));

    const [, insertMeta] = await sequelize.query(
      `INSERT INTO erp_products 
        (branch_id, category_id, name, sku, barcode, unit, buy_price, sell_price, 
         sell_price_mp, sell_price_wa, stock_min, weight, notes, is_active,
         store_price, store_price_compare, store_active_gpd, store_active_gpr,
         store_images, store_variants, store_tags, store_short_desc, store_description,
         store_meta_title, store_meta_desc, store_slug, store_featured,
         created_at, updated_at)
       VALUES (
        ${int(b.branch_id,1)},
        ${b.category_id ? int(b.category_id) : 'NULL'},
        ${esc(b.name)},
        ${esc(b.sku)},
        ${esc(b.barcode)},
        ${esc(b.unit||'pcs')},
        ${num(b.buy_price)},
        ${num(b.sell_price)},
        ${b.sell_price_mp != null && b.sell_price_mp !== '' ? num(b.sell_price_mp) : 'NULL'},
        ${b.sell_price_wa != null && b.sell_price_wa !== '' ? num(b.sell_price_wa) : 'NULL'},
        ${int(b.stock_min)},
        ${num(b.weight)},
        ${esc(b.notes)},
        1,
        ${num(b.store_price)},
        ${num(b.store_price_compare)},
        ${b.store_active_gpd ? 1 : 0},
        ${b.store_active_gpr ? 1 : 0},
        ${jsn(b.store_images,'[]')},
        ${jsn(b.store_variants,'{}')},
        ${jsn(b.store_tags,'[]')},
        ${esc(b.store_short_desc)},
        ${esc(b.store_description)},
        ${esc(b.store_meta_title||b.name)},
        ${esc(b.store_meta_desc)},
        ${esc(b.store_slug||'')},
        ${b.store_featured ? 1 : 0},
        NOW(), NOW()
       )`,
      { transaction: t }
    );
    // Get insertId — works across Sequelize versions
    const productId = insertMeta?.insertId
      || (Array.isArray(insertMeta) ? insertMeta[0]?.insertId : null)
      || await sequelize.query('SELECT LAST_INSERT_ID() as id', { transaction: t })
           .then(([[row]]) => row?.id);
    if (!productId) throw new Error('Gagal mendapatkan ID produk baru');
    await sequelize.query(
      `INSERT INTO erp_stock (product_id, branch_id, qty, created_at, updated_at) VALUES (${productId}, ${parseInt(b.branch_id)||1}, 0, NOW(), NOW())`,
      { transaction: t }
    );
    await t.commit();
    const [[product]] = await sequelize.query(`SELECT * FROM erp_products WHERE id = ${productId}`);
    return res.status(201).json({ success:true, data:{ product } });
  } catch (err) { await t.rollback(); next(err); }
};

const updateProduct = async (req, res, next) => {
  try {
    const b = req.body;
    const num = (v, d=0) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
    const int = (v, d=0) => { const n = parseInt(v);   return isNaN(n) ? d : n; };
    const safe = (v) => (v == null ? null : v);

    // Build explicit update — only known columns, no undefined fields
    const data = {
      name:                safe(b.name),
      sku:                 safe(b.sku),
      barcode:             safe(b.barcode),
      unit:                safe(b.unit),
      buy_price:           num(b.buy_price),
      sell_price:          num(b.sell_price),
      sell_price_mp:       b.sell_price_mp != null && b.sell_price_mp !== '' ? num(b.sell_price_mp) : null,
      sell_price_wa:       b.sell_price_wa != null && b.sell_price_wa !== '' ? num(b.sell_price_wa) : null,
      stock_min:           int(b.stock_min),
      weight:              num(b.weight),
      notes:               safe(b.notes),
      category_id:         b.category_id ? int(b.category_id) : null,
      // Store fields
      store_price:         num(b.store_price),
      store_price_compare: num(b.store_price_compare),
      store_active_gpd:    b.store_active_gpd ? 1 : 0,
      store_active_gpr:    b.store_active_gpr ? 1 : 0,
      store_short_desc:    safe(b.store_short_desc),
      store_description:   safe(b.store_description),
      store_meta_title:    safe(b.store_meta_title || b.name),
      store_meta_desc:     safe(b.store_meta_desc),
      store_slug:          safe(b.store_slug),
      store_featured:      b.store_featured ? 1 : 0,
    };
    // JSON fields — only update if provided
    if (b.store_images  !== undefined) data.store_images  = Array.isArray(b.store_images)  ? b.store_images  : [];
    if (b.store_variants !== undefined) data.store_variants = typeof b.store_variants === 'object' ? b.store_variants : {};
    if (b.store_tags    !== undefined) data.store_tags    = Array.isArray(b.store_tags)    ? b.store_tags    : [];

    // Remove undefined keys
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
    await product.update(data);
    return res.json({ success:true, data:{ product } });
  } catch (err) { next(err); }
};

const deleteProduct = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
    // Delete stock first (FK constraint)
    await Stock.destroy({ where: { product_id: req.params.id }, transaction: t });
    await StockMovement.destroy({ where: { product_id: req.params.id }, transaction: t });
    await product.destroy({ transaction: t });
    await t.commit();
    return res.json({ success:true, message:'Produk berhasil dihapus' });
  } catch (err) { await t.rollback(); next(err); }
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
    const { branch_id, rows, filename } = req.body;
    const bid = parseInt(branch_id) || 1;
    let success = 0, updated = 0, failed = 0, errors = [];

    const num = (v, d=0) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
    const int = (v, d=0) => { const n = parseInt(v);   return isNaN(n) ? d : n; };
    const str = (v)       => (v == null || v === '') ? null : String(v).trim();

    for (const row of (rows||[])) {
      try {
        if (!row.name) { failed++; errors.push(`Baris dilewati: nama kosong`); continue; }

        // Build safe data object — only valid columns
        const data = {
          branch_id:         bid,
          name:              str(row.name),
          sku:               str(row.sku),
          barcode:           str(row.barcode),
          category_id:       row.category_id ? int(row.category_id) : null,
          unit:              str(row.unit) || 'pcs',
          buy_price:         num(row.buy_price),
          sell_price:        num(row.sell_price),
          sell_price_mp:     row.sell_price_mp ? num(row.sell_price_mp) : null,
          sell_price_wa:     row.sell_price_wa ? num(row.sell_price_wa) : null,
          weight:            num(row.weight, 0),
          stock_min:         int(row.stock_min, 0),
          notes:             str(row.notes),
          is_active:         true,
          // Store fields
          store_price:       row.store_price ? num(row.store_price) : num(row.sell_price_mp || row.sell_price),
          store_active_gpd:  bid === 2 ? (int(row.store_active, 0) ? 1 : 0) : 0,
          store_active_gpr:  bid === 1 ? (int(row.store_active, 0) ? 1 : 0) : 0,
          store_short_desc:  str(row.store_short_desc),
        };

        const existing = row.sku ? await Product.findOne({ where: { sku: data.sku, branch_id: bid } }) : null;
        if (existing) {
          const { is_active, ...updateData } = data;
          await existing.update(updateData);
          updated++;
        } else {
          const [, insertMeta] = await sequelize.query(
            `INSERT INTO erp_products (branch_id, category_id, name, sku, barcode, unit,
               buy_price, sell_price, sell_price_mp, sell_price_wa, weight, stock_min,
               notes, is_active, store_price, store_active_gpd, store_active_gpr,
               store_short_desc, created_at, updated_at)
             VALUES (
               ${bid},
               ${data.category_id || 'NULL'},
               ${sequelize.escape(data.name)},
               ${sequelize.escape(data.sku || '')},
               ${sequelize.escape(data.barcode || '')},
               ${sequelize.escape(data.unit)},
               ${data.buy_price}, ${data.sell_price},
               ${data.sell_price_mp || 'NULL'},
               ${data.sell_price_wa || 'NULL'},
               ${data.weight}, ${data.stock_min},
               ${sequelize.escape(data.notes || '')},
               1,
               ${data.store_price}, ${data.store_active_gpd}, ${data.store_active_gpr},
               ${sequelize.escape(data.store_short_desc || '')},
               NOW(), NOW()
             )`
          );
          const productId = insertMeta?.insertId
            || await sequelize.query('SELECT LAST_INSERT_ID() as id').then(([[r]]) => r?.id);
          if (productId) {
            await sequelize.query(
              `INSERT INTO erp_stock (product_id, branch_id, qty, created_at, updated_at)
               VALUES (${productId}, ${bid}, ${int(row.initial_stock, 0)}, NOW(), NOW())`
            );
          }
          success++;
        }
      } catch (e) {
        failed++;
        errors.push(`Baris "${row.name||'?'}": ${e.message}`);
      }
    }

    await ImportLog.create({
      type: 'products', filename: filename || 'import',
      total: rows?.length || 0, success: success + updated, failed,
      errors: JSON.stringify(errors), created_by: req.user?.id
    });
    return res.json({ success: true, data: { success, updated, failed, errors } });
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
