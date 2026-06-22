const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const {
  SubChannel, Category, Product, Stock, StockMovement, ProductVariant,
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
         LEFT JOIN (
           SELECT product_id, branch_id, SUM(qty) AS qty
           FROM erp_stock
           GROUP BY product_id, branch_id
         ) s ON s.product_id = ep.id AND s.branch_id = ep.branch_id
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
         LEFT JOIN (
           SELECT product_id, branch_id, SUM(qty) AS qty
           FROM erp_stock
           GROUP BY product_id, branch_id
         ) s ON s.product_id = ep.id AND s.branch_id = ep.branch_id
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
    });
    if (!product) return res.status(404).json({ success:false, message:'Produk tidak ditemukan' });
    // Agregat manual (bukan include hasOne) — produk dgn varian punya BANYAK baris
    // Stock (1 per varian), hasOne cuma ambil 1 baris secara acak/tidak akurat.
    const { sequelize } = require('../../config/database');
    const [[stockRow]] = await sequelize.query(
      'SELECT SUM(qty) as qty FROM erp_stock WHERE product_id = ? AND branch_id = ?',
      { replacements: [product.id, product.branch_id] }
    );
    const productJson = product.toJSON();
    productJson.stock = { qty: parseInt(stockRow?.qty) || 0, branch_id: product.branch_id, product_id: product.id };
    return res.json({ success:true, data:{ product: productJson } });
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
    // Force JSON string then parse to ensure Sequelize detects change
    if (b.store_images  !== undefined) data.store_images  = JSON.parse(JSON.stringify(Array.isArray(b.store_images)  ? b.store_images  : []));
    if (b.store_variants !== undefined) data.store_variants = JSON.parse(JSON.stringify(typeof b.store_variants === 'object' && b.store_variants ? b.store_variants : {}));
    if (b.store_tags    !== undefined) data.store_tags    = JSON.parse(JSON.stringify(Array.isArray(b.store_tags)    ? b.store_tags    : []));

    // Remove undefined keys
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success:false, message:'Tidak ditemukan' });

    // Use raw SQL for JSON fields to ensure proper storage
    const { sequelize: seq } = require('../../config/database');
    const jsonUpdates = [];
    if (data.store_images  !== undefined) {
      jsonUpdates.push(`store_images = ${seq.escape(JSON.stringify(data.store_images))}`);
      delete data.store_images;
    }
    if (data.store_variants !== undefined) {
      jsonUpdates.push(`store_variants = ${seq.escape(JSON.stringify(data.store_variants))}`);
      delete data.store_variants;
    }
    if (data.store_tags !== undefined) {
      jsonUpdates.push(`store_tags = ${seq.escape(JSON.stringify(data.store_tags))}`);
      delete data.store_tags;
    }

    // Update non-JSON fields via Sequelize
    await product.update(data);

    // Update JSON fields via raw SQL
    if (jsonUpdates.length > 0) {
      await seq.query(`UPDATE erp_products SET ${jsonUpdates.join(', ')} WHERE id = ${product.id}`);
    }

    const updated = await Product.findByPk(product.id);
    return res.json({ success:true, data:{ product: updated } });
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
    const bool01 = (v)    => ['1','true','yes','ya','y','aktif'].includes(String(v).trim().toLowerCase()) ? 1 : 0;

    // Cache kategori per nama (case-insensitive) untuk hindari query berulang & auto-create
    const categoryCache = {};
    const resolveCategoryId = async (rawValue) => {
      if (!rawValue) return null;
      const raw = String(rawValue).trim();
      if (!raw) return null;
      // Jika numeric, anggap sudah ID — validasi exists
      if (/^\d+$/.test(raw)) {
        const found = await Category.findByPk(parseInt(raw));
        return found ? found.id : null; // ID tidak valid -> null, jangan paksa insert FK rusak
      }
      const key = raw.toLowerCase();
      if (categoryCache[key] !== undefined) return categoryCache[key];
      let cat = await Category.findOne({ where: { name: raw } });
      if (!cat) {
        // Auto-create kategori baru by nama supaya import tidak gagal karena kategori belum ada
        cat = await Category.create({ name: raw, branch_id: bid, is_active: true });
      }
      categoryCache[key] = cat.id;
      return cat.id;
    };

    for (const row of (rows||[])) {
      try {
        if (!row.name) { failed++; errors.push(`Baris dilewati: nama kosong`); continue; }

        const categoryId = await resolveCategoryId(row.category_id || row.category_name);

        // store_active: kontrol independen per toko, default ikut cabang produk jika tidak diisi
        const hasGpdCol = row.store_active_gpd !== undefined && row.store_active_gpd !== '';
        const hasGprCol = row.store_active_gpr !== undefined && row.store_active_gpr !== '';
        const storeActiveGpd = hasGpdCol ? bool01(row.store_active_gpd)
          : (row.store_active !== undefined ? (bid === 2 ? bool01(row.store_active) : 0) : 0);
        const storeActiveGpr = hasGprCol ? bool01(row.store_active_gpr)
          : (row.store_active !== undefined ? (bid === 1 ? bool01(row.store_active) : 0) : 0);

        // Build safe data object — only valid columns
        const data = {
          branch_id:         bid,
          category_id:       categoryId,
          name:              str(row.name),
          sku:               str(row.sku),
          barcode:           str(row.barcode),
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
          store_price:         row.store_price ? num(row.store_price) : num(row.sell_price_mp || row.sell_price),
          store_price_compare: row.store_price_compare ? num(row.store_price_compare) : null,
          store_active_gpd:    storeActiveGpd,
          store_active_gpr:    storeActiveGpr,
          store_short_desc:    str(row.store_short_desc),
          store_description:   str(row.store_description),
          store_meta_title:    str(row.store_meta_title),
          store_meta_desc:     str(row.store_meta_desc),
          store_tags:          row.store_tags ? JSON.stringify(String(row.store_tags).split(',').map(t=>t.trim()).filter(Boolean)) : null,
          store_featured:      bool01(row.store_featured),
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
               notes, is_active, store_price, store_price_compare, store_active_gpd, store_active_gpr,
               store_short_desc, store_description, store_meta_title, store_meta_desc, store_tags, store_featured,
               created_at, updated_at)
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
               ${data.store_price}, ${data.store_price_compare || 'NULL'},
               ${data.store_active_gpd}, ${data.store_active_gpr},
               ${sequelize.escape(data.store_short_desc || '')},
               ${sequelize.escape(data.store_description || '')},
               ${sequelize.escape(data.store_meta_title || '')},
               ${sequelize.escape(data.store_meta_desc || '')},
               ${data.store_tags ? sequelize.escape(data.store_tags) : 'NULL'},
               ${data.store_featured},
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

    // Defensive: log gagal tidak boleh crash response
    try {
      await ImportLog.create({
        type: 'products', filename: filename || 'import',
        total: rows?.length || 0, success: success + updated, failed,
        errors: JSON.stringify(errors), created_by: req.user?.id
      });
    } catch (logErr) {
      console.error('[ImportLog] Gagal simpan log:', logErr.message);
    }
    return res.json({ success: true, data: { success, updated, failed, errors } });
  } catch (err) { next(err); }
};

const importCustomers = async (req, res, next) => {
  try {
    const { rows, filename } = req.body;
    let success = 0, updated = 0, failed = 0, errors = [];

    const str = (v) => (v == null || v === '') ? null : String(v).trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRe = /^[0-9+\-\s()]{6,20}$/;

    let rowNum = 2; // baris ke-3 di excel adalah data pertama (header 2 baris)
    for (const row of (rows||[])) {
      rowNum++;
      try {
        if (!row.name || !String(row.name).trim()) {
          failed++; errors.push(`Baris ${rowNum}: nama wajib diisi`); continue;
        }

        const phone = str(row.phone);
        const email = str(row.email);

        if (phone && !phoneRe.test(phone)) {
          failed++; errors.push(`Baris ${rowNum}: format No. HP tidak valid (${phone})`); continue;
        }
        if (email && !emailRe.test(email)) {
          failed++; errors.push(`Baris ${rowNum}: format email tidak valid (${email})`); continue;
        }

        // Hanya kolom yang valid di model Customer — cegah field asing dari Excel ikut terinsert
        const data = {
          name:        str(row.name),
          phone,
          email,
          address:     str(row.address),
          city:        str(row.city),
          province:    str(row.province),
          postal_code: str(row.postal_code),
          notes:       str(row.notes),
        };

        // Cek duplikat berdasarkan phone ATAU email (mana yang terisi)
        let existing = null;
        if (phone) existing = await Customer.findOne({ where: { phone } });
        if (!existing && email) existing = await Customer.findOne({ where: { email } });

        if (existing) {
          await existing.update(data);
          updated++;
        } else {
          await Customer.create(data);
          success++;
        }
      } catch (e) {
        failed++;
        errors.push(`Baris ${rowNum} "${row.name||'?'}": ${e.message}`);
      }
    }

    // Defensive: log gagal tidak boleh crash response
    try {
      await ImportLog.create({
        type: 'customers', filename: filename || 'import',
        total: rows?.length || 0, success: success + updated, failed,
        errors: JSON.stringify(errors), created_by: req.user?.id
      });
    } catch (logErr) {
      console.error('[ImportLog] Gagal simpan log:', logErr.message);
    }
    return res.json({ success: true, data: { success, updated, failed, errors } });
  } catch (err) { next(err); }
};

// ── Import Order dari Excel (marketplace) ──────────────────────
// Format file: 1 BARIS = 1 item produk. Order dengan banyak produk berarti
// banyak baris dengan order_ref yang SAMA — dikelompokkan di sini jadi 1 order.
// Setiap order dibuat dalam transaksi sendiri-sendiri (1 order gagal tidak
// menggagalkan order lain dalam batch yang sama). Status hasil import selalu
// 'draft' — TIDAK langsung memotong stok permanen, supaya staff bisa review
// dulu sebelum bulk-confirm (lihat fitur bulk action di halaman Order).
const importOrders = async (req, res, next) => {
  try {
    const { buildOrder } = require('./orderController');
    const { branch_id, sub_channel_id, sub_channel_name, rows, filename } = req.body;
    const bid = parseInt(branch_id) || 1;
    let success = 0, skipped = 0, failed = 0;
    const errors = [];
    const notes  = [];

    // Kelompokkan baris per order_ref — 1 order bisa terdiri dari banyak baris produk
    const groups = {};
    for (const row of (rows || [])) {
      const ref = String(row.order_ref || '').trim();
      if (!ref) { failed++; errors.push('Baris dilewati: No. Order kosong'); continue; }
      (groups[ref] = groups[ref] || []).push(row);
    }

    for (const [ref, groupRows] of Object.entries(groups)) {
      const t = await sequelize.transaction();
      try {
        // Cegah duplikat — order dgn ref yg sama di cabang yg sama dianggap sudah pernah diimport
        const existing = await Order.findOne({ where: { external_ref: ref, branch_id: bid }, transaction: t });
        if (existing) {
          await t.rollback();
          skipped++;
          errors.push(`Order ${ref}: dilewati, sudah pernah diimport sebagai ${existing.order_no}`);
          continue;
        }

        const first = groupRows[0];
        const items = [];
        for (const row of groupRows) {
          const sku = String(row.product_sku || '').trim();
          if (!sku) throw new Error('Kolom SKU Produk kosong pada salah satu baris');
          const product = await Product.findOne({ where: { sku, branch_id: bid }, transaction: t });
          if (!product) throw new Error(`SKU "${sku}" tidak ditemukan di cabang ini`);

          let variantId = null;
          const variantRaw = String(row.variant_name || '').trim();
          const activeVariants = await ProductVariant.findAll({ where: { product_id: product.id, is_active: true }, transaction: t });
          if (activeVariants.length > 0) {
            if (!variantRaw) throw new Error(`Produk "${product.name}" punya varian — kolom Varian wajib diisi`);
            const matched = activeVariants.find(v => v.name.trim().toLowerCase() === variantRaw.toLowerCase());
            if (!matched) throw new Error(`Varian "${variantRaw}" tidak ditemukan untuk produk "${product.name}"`);
            variantId = matched.id;
          }

          const qty = parseInt(row.qty) || 0;
          if (qty <= 0) throw new Error(`Qty tidak valid untuk SKU "${sku}"`);

          items.push({
            product_id: product.id,
            variant_id: variantId,
            qty,
            sell_price: row.sell_price ? toNum(row.sell_price) : undefined,
            discount_pct: 0,
          });
        }

        const { orderNo } = await buildOrder({
          branch_id: bid,
          channel: 'marketplace',
          sub_channel_id: sub_channel_id ? parseInt(sub_channel_id) : null,
          sub_channel_name: sub_channel_name || null,
          customer_name:    first.customer_name || '',
          customer_phone:   first.customer_phone || '',
          customer_address: first.customer_address || '',
          customer_city:    first.customer_city || '',
          items,
          discount_amount: toNum(first.discount_amount),
          shipping_cost:   toNum(first.shipping_cost),
          admin_fee: 0,
          notes: first.notes || `Import marketplace — Ref: ${ref}`,
          order_date: first.order_date || new Date().toISOString().split('T')[0],
          payment_method: null,
          external_ref: ref,
          status: 'draft',
          created_by: req.user?.id,
        }, t);

        await t.commit();
        success++;
        notes.push(`Order ${ref} → ${orderNo}`);
      } catch (e) {
        await t.rollback();
        failed++;
        errors.push(`Order ${ref}: ${e.message}`);
      }
    }

    try {
      await ImportLog.create({
        type: 'orders', filename: filename || 'import',
        total: Object.keys(groups).length, success, failed,
        errors: JSON.stringify(errors), created_by: req.user?.id,
      });
    } catch (logErr) {
      console.error('[ImportLog] Gagal simpan log:', logErr.message);
    }

    return res.json({ success: true, data: { success, skipped, failed, errors, notes } });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════════
// IMPORT ORDER MARKETPLACE — Parser khusus per platform
// Membaca file export asli Shopee/TikTok tanpa perlu template manual.
// Mengembalikan rows dalam format standar + daftar unresolved_skus
// (produk yang Seller SKU-nya tidak ada di sistem, khususnya TikTok).
// ══════════════════════════════════════════════════════════════════

const mpNum = (v) => {
  if (v == null || String(v).trim() === '' || String(v).trim() === 'nan') return 0;
  const s = String(v).replace(/\./g, '').replace(/,/g, '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

// ── Detect platform dari kolom header ─────────────────────────
const detectPlatform = (cols) => {
  if (cols.includes('Order ID') && cols.includes('Seller SKU') && cols.includes('Handling Fee')) return 'tiktok';
  if (cols.includes('No. Pesanan') && cols.includes('Nomor Referensi SKU') && cols.includes('Voucher Ditanggung Shopee')) return 'shopee';
  return null;
};

// ── Parser TikTok Shop ─────────────────────────────────────────
// Admin fee = Handling Fee + Buyer Service Fee (per order, bukan per item)
const parseTikTok = (rows) => {
  const groups = {};
  for (const row of rows) {
    const ref = String(row['Order ID'] || '').trim();
    if (!ref) continue;
    (groups[ref] = groups[ref] || []).push(row);
  }

  const parsed = [];
  for (const [ref, items] of Object.entries(groups)) {
    const first = items[0];
    // Admin fee hanya dihitung sekali per order (sum dari semua item baris)
    const handlingFee  = items.reduce((s, r) => s + mpNum(r['Handling Fee']), 0);
    const buyerSvcFee  = items.reduce((s, r) => s + mpNum(r['Buyer Service Fee']), 0);
    const adminFee     = handlingFee + buyerSvcFee;

    // Shipping cost dari baris pertama (nilai sama di semua baris multi-item)
    const shippingCost = mpNum(first['Shipping Fee After Discount']) || mpNum(first['Original Shipping Fee']);

    // Payment method mapping
    const pmRaw = String(first['Payment Method'] || '').toLowerCase();
    const paymentMethod = pmRaw.includes('cod') || pmRaw.includes('tempat') ? 'cod'
      : pmRaw.includes('qris') ? 'qris'
      : pmRaw.includes('paylater') ? 'transfer'
      : 'transfer';

    // Tanggal
    const createdRaw = String(first['Created Time'] || first['Paid Time'] || '').trim();
    let orderDate = new Date().toISOString().split('T')[0];
    if (createdRaw) {
      // Format: DD/MM/YYYY HH:MM:SS
      const m = createdRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) orderDate = `${m[3]}-${m[2]}-${m[1]}`;
    }

    const orderItems = items.map(item => {
      const sellerSku = String(item['Seller SKU'] || '').trim();
      const variation = String(item['Variation'] || '').trim();
      const qty       = parseInt(item['Quantity']) || 1;
      const subtotal  = mpNum(item['SKU Subtotal After Discount']);
      const sellPrice = qty > 0 ? Math.round(subtotal / qty) : mpNum(item['SKU Unit Original Price']);
      return {
        seller_sku:    sellerSku || null,   // null = staff harus pilih manual
        product_name:  String(item['Product Name'] || '').trim(),
        variant_name:  variation || null,
        qty,
        sell_price:    sellPrice,
        _raw_product:  `${String(item['Product Name'] || '').trim()}${variation ? ' — ' + variation : ''}`,
      };
    });

    parsed.push({
      order_ref:        ref,
      platform:         'tiktok',
      customer_name:    String(first['Recipient'] || first['Buyer Username'] || '').replace(/\*/g, '').trim(),
      customer_phone:   String(first['Phone #'] || '').replace(/[^0-9+]/g, '').replace('+62', '0'),
      customer_address: [
        first['Detail Address'], first['Villages'], first['Districts'],
        first['Regency and City'], first['Province'],
      ].filter(v => v && String(v).trim() && !String(v).includes('*')).join(', '),
      customer_city:    String(first['Regency and City'] || '').replace(/\*/g, '').trim(),
      order_date:       orderDate,
      shipping_cost:    shippingCost,
      admin_fee:        adminFee,
      admin_fee_detail: { handling_fee: handlingFee, buyer_service_fee: buyerSvcFee },
      payment_method:   paymentMethod,
      courier:          String(first['Shipping Provider Name'] || first['Delivery Option'] || '').trim() || null,
      tracking_no:      String(first['Tracking ID'] || '').trim() || null,
      notes:            String(first['Buyer Message'] || first['Seller Note'] || '').trim() || null,
      items:            orderItems,
    });
  }
  return parsed;
};

// ── Parser Shopee ──────────────────────────────────────────────
// Admin fee = Voucher Ditanggung Penjual + Voucher Ditanggung Shopee +
//             Estimasi Potongan Biaya Pengiriman + Cashback Koin +
//             Diskon Kartu Kredit + Paket Diskon (Diskon dari Shopee) +
//             Paket Diskon (Diskon dari Penjual)
// Catatan: Voucher/Cashback/Potongan yang dibayar PLATFORM sebenarnya tidak
//          jadi biaya penjual, tapi untuk kepentingan rekonsiliasi internal
//          kita tetap catat semuanya agar Total Pembayaran yang diterima
//          penjual bisa dihitung: Harga - admin_fee + ongkir_nett.
// Untuk keperluan ERP ini, admin_fee = biaya yang MENGURANGI pendapatan
//          penjual = Voucher Ditanggung Penjual + Potongan platform lainnya.
const parseShopee = (rows) => {
  // Shopee biasanya 1 No. Pesanan = 1 baris (multi-item dalam 1 sel nama produk)
  const groups = {};
  for (const row of rows) {
    const ref = String(row['No. Pesanan'] || '').trim();
    if (!ref) continue;
    (groups[ref] = groups[ref] || []).push(row);
  }

  const parsed = [];
  for (const [ref, items] of Object.entries(groups)) {
    const first = items[0];

    // Admin fee (biaya platform yang jadi tanggungan penjual)
    const voucherPenjual   = mpNum(first['Voucher Ditanggung Penjual']);
    const voucherShopee    = mpNum(first['Voucher Ditanggung Shopee']);
    const potOngkir        = mpNum(first['Estimasi Potongan Biaya Pengiriman']);
    const cashback         = mpNum(first['Cashback Koin']);
    const diskonKartuKredit= mpNum(first['Diskon Kartu Kredit']);
    const paketDiskonShopee= mpNum(first['Paket Diskon (Diskon dari Shopee)']);
    const paketDiskonPenjual=mpNum(first['Paket Diskon (Diskon dari Penjual)']);
    const adminFee = voucherPenjual + voucherShopee + potOngkir + cashback
                   + diskonKartuKredit + paketDiskonShopee + paketDiskonPenjual;

    const shippingCost = mpNum(first['Perkiraan Ongkos Kirim']);

    const pmRaw = String(first['Metode Pembayaran'] || '').toLowerCase();
    const paymentMethod = pmRaw.includes('cod') || pmRaw.includes('tempat') ? 'cod'
      : pmRaw.includes('qris') ? 'qris'
      : pmRaw.includes('paylater') || pmRaw.includes('spaylater') ? 'transfer'
      : 'transfer';

    const createdRaw = String(first['Waktu Pesanan Dibuat'] || '').trim();
    let orderDate = new Date().toISOString().split('T')[0];
    if (createdRaw) {
      // Format: YYYY-MM-DD HH:MM
      const m = createdRaw.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (m) orderDate = `${m[1]}-${m[2]}-${m[3]}`;
    }

    // Ekstrak kurir dari "Opsi Pengiriman" (mis. "Hemat Kargo-SPX Hemat" → "SPX Hemat")
    const kurirRaw = String(first['Opsi Pengiriman'] || '').trim();
    const courier  = kurirRaw.includes('-') ? kurirRaw.split('-').slice(1).join('-').trim() : kurirRaw || null;

    const orderItems = items.map(item => {
      const sku       = String(item['Nomor Referensi SKU'] || '').trim();
      const variation = String(item['Nama Variasi'] || '').trim();
      const qty       = parseInt(item['Jumlah']) || 1;
      const hargaDiskon = mpNum(item['Harga Setelah Diskon']);
      return {
        seller_sku:   sku || null,
        product_name: String(item['Nama Produk'] || '').trim(),
        variant_name: variation || null,
        qty,
        sell_price:   hargaDiskon,
        _raw_product: `${String(item['Nama Produk'] || '').trim()}${variation ? ' — ' + variation : ''}`,
      };
    });

    // Alamat dari Shopee digabung dalam 1 field "Alamat Pengiriman"
    const alamatFull = String(first['Alamat Pengiriman'] || '').replace(/\*/g, '').trim();

    parsed.push({
      order_ref:        ref,
      platform:         'shopee',
      customer_name:    String(first['Nama Penerima'] || first['Username (Pembeli)'] || '').replace(/\*/g, '').trim(),
      customer_phone:   String(first['No. Telepon'] || '').replace(/[^0-9+]/g, '').replace('+62', '0'),
      customer_address: alamatFull,
      customer_city:    String(first['Kota/Kabupaten'] || '').replace(/KAB\. |KOTA /g, '').trim(),
      order_date:       orderDate,
      shipping_cost:    shippingCost,
      admin_fee:        adminFee,
      admin_fee_detail: {
        voucher_penjual: voucherPenjual,
        voucher_shopee: voucherShopee,
        potongan_ongkir: potOngkir,
        cashback_koin: cashback,
        diskon_kartu: diskonKartuKredit,
        paket_shopee: paketDiskonShopee,
        paket_penjual: paketDiskonPenjual,
      },
      payment_method:   paymentMethod,
      courier:          courier,
      tracking_no:      String(first['No. Resi'] || '').trim() || null,
      notes:            String(first['Catatan dari Pembeli'] || first['Catatan'] || '').trim() || null,
      items:            orderItems,
    });
  }
  return parsed;
};

// ── POST /api/marketplace-import/parse ────────────────────────
// Step 1: parse file Excel → return structured preview + unresolved_skus
// Frontend tampilkan preview + minta staff resolve SKU yang tidak ketemu.
const parseMarketplaceExport = async (req, res, next) => {
  try {
    const { platform, branch_id, rows } = req.body;
    const bid = parseInt(branch_id) || 1;
    if (!rows?.length) return res.status(400).json({ success: false, message: 'Tidak ada data baris' });
    if (!['tiktok','shopee'].includes(platform)) return res.status(400).json({ success: false, message: 'Platform tidak didukung' });

    // Parse per platform
    const parsedOrders = platform === 'tiktok' ? parseTikTok(rows) : parseShopee(rows);

    // Resolve SKU ke product_id di database
    // Untuk setiap item: cari by seller_sku, kalau tidak ketemu return ke frontend untuk resolusi manual
    const unresolvedSkus = []; // { item_key, seller_sku, product_name, variant_name, order_ref }
    const skuCache = {}; // sku → { product_id, product_name, variant_id, variant_name }

    for (const order of parsedOrders) {
      for (const item of order.items) {
        if (!item.seller_sku) {
          // TikTok tanpa SKU — langsung masuk unresolved
          const itemKey = `${order.order_ref}::${item._raw_product}`;
          if (!unresolvedSkus.find(u => u.item_key === itemKey)) {
            unresolvedSkus.push({
              item_key:     itemKey,
              order_ref:    order.order_ref,
              seller_sku:   null,
              product_name: item.product_name,
              variant_name: item.variant_name,
              qty:          item.qty,
              sell_price:   item.sell_price,
            });
          }
          item._resolved = null;
          continue;
        }

        if (skuCache[item.seller_sku] !== undefined) {
          item._resolved = skuCache[item.seller_sku];
          continue;
        }

        const product = await require('../../models/erp').Product.findOne({
          where: { sku: item.seller_sku, branch_id: bid, is_active: true },
        });
        if (!product) {
          const itemKey = `${order.order_ref}::${item.seller_sku}`;
          unresolvedSkus.push({
            item_key:     itemKey,
            order_ref:    order.order_ref,
            seller_sku:   item.seller_sku,
            product_name: item.product_name,
            variant_name: item.variant_name,
            qty:          item.qty,
            sell_price:   item.sell_price,
          });
          item._resolved = null;
          skuCache[item.seller_sku] = null;
          continue;
        }

        // Resolve varian jika ada
        let variantId = null;
        let variantName = item.variant_name;
        if (item.variant_name) {
          const { ProductVariant } = require('../../models/erp');
          const activeVariants = await ProductVariant.findAll({ where: { product_id: product.id, is_active: true } });
          const matched = activeVariants.find(v => v.name.trim().toLowerCase() === item.variant_name.trim().toLowerCase());
          if (matched) { variantId = matched.id; variantName = matched.name; }
        }

        const resolved = { product_id: product.id, product_name: product.name, variant_id: variantId, variant_name: variantName };
        item._resolved = resolved;
        skuCache[item.seller_sku] = resolved;
      }
    }

    return res.json({
      success: true,
      data: {
        orders: parsedOrders,
        unresolved_skus: unresolvedSkus,
        summary: {
          total_orders:     parsedOrders.length,
          total_items:      parsedOrders.reduce((s, o) => s + o.items.length, 0),
          unresolved_count: unresolvedSkus.length,
        },
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/marketplace-import/confirm ──────────────────────
// Step 2: Staff sudah resolve SKU manual → eksekusi buat order
const confirmMarketplaceImport = async (req, res, next) => {
  try {
    const { buildOrder } = require('./orderController');
    const { orders, branch_id, sub_channel_id, sub_channel_name, resolutions } = req.body;
    // resolutions: { [item_key]: { product_id, variant_id } } — dari UI konfirmasi staff
    const bid = parseInt(branch_id) || 1;
    const resMap = resolutions || {};
    let success = 0, skipped = 0, failed = 0;
    const errors = [], notes = [];

    for (const order of (orders || [])) {
      const t = await sequelize.transaction();
      try {
        // Cek duplikat
        const existing = await Order.findOne({ where: { external_ref: order.order_ref, branch_id: bid }, transaction: t });
        if (existing) {
          await t.rollback();
          skipped++;
          errors.push(`Order ${order.order_ref}: dilewati, sudah pernah diimport sebagai ${existing.order_no}`);
          continue;
        }

        // Build items payload
        const items = [];
        for (const item of order.items) {
          const itemKey = `${order.order_ref}::${item.seller_sku || item._raw_product}`;
          let productId = item._resolved?.product_id;
          let variantId = item._resolved?.variant_id ?? null;

          // Staff sudah override via UI resolusi manual
          if (!productId && resMap[itemKey]) {
            productId = resMap[itemKey].product_id;
            variantId = resMap[itemKey].variant_id ?? null;
          }

          if (!productId) throw new Error(`Produk belum di-mapping: "${item._raw_product || item.seller_sku}" — selesaikan resolusi SKU dulu`);

          items.push({
            product_id:   productId,
            variant_id:   variantId,
            qty:          item.qty,
            sell_price:   item.sell_price,
            discount_pct: 0,
          });
        }

        const { orderNo } = await buildOrder({
          branch_id:       bid,
          channel:         'marketplace',
          sub_channel_id:  sub_channel_id ? parseInt(sub_channel_id) : null,
          sub_channel_name: sub_channel_name || order.platform || null,
          customer_name:   order.customer_name,
          customer_phone:  order.customer_phone,
          customer_address: order.customer_address,
          customer_city:   order.customer_city,
          items,
          discount_amount: 0,
          shipping_cost:   order.shipping_cost || 0,
          admin_fee:       order.admin_fee || 0,
          notes:           [order.notes, order.admin_fee ? `Admin fee ${order.platform}: Rp ${order.admin_fee.toLocaleString('id')}` : ''].filter(Boolean).join(' | ') || null,
          order_date:      order.order_date,
          payment_method:  order.payment_method,
          external_ref:    order.order_ref,
          status:          'draft',
          created_by:      req.user?.id,
        }, t);

        // Simpan resi sekalian kalau ada
        if (order.tracking_no) {
          await require('../../models/erp').Shipment.create({
            order_id:    null, // akan di-update setelah order.id diketahui
            courier:     order.courier || '',
            tracking_no: order.tracking_no,
            status:      'shipped',
          }, { transaction: t }).catch(() => {}); // non-critical, skip kalau gagal
        }

        await t.commit();
        success++;
        notes.push(`${order.order_ref} → ${orderNo}`);
      } catch (e) {
        await t.rollback();
        failed++;
        errors.push(`Order ${order.order_ref}: ${e.message}`);
      }
    }

    try {
      await ImportLog.create({
        type: 'marketplace_orders', filename: `marketplace_import`,
        total: orders?.length || 0, success, failed,
        errors: JSON.stringify(errors), created_by: req.user?.id,
      });
    } catch (logErr) { console.error('[ImportLog]', logErr.message); }

    return res.json({ success: true, data: { success, skipped, failed, errors, notes } });
  } catch (err) { next(err); }
};

module.exports = {
  getSubChannels, getAllSubChannels, createSubChannel, updateSubChannel, deleteSubChannel,
  getCategories, createCategory, updateCategory, deleteCategory,
  getProducts, getProductByBarcode, createProduct, updateProduct, deleteProduct, adjustStock,
  getCustomers, createCustomer, updateCustomer,
  importProducts, importCustomers, importOrders,
  parseMarketplaceExport, confirmMarketplaceImport,
};
