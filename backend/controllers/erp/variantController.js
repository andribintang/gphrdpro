const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const { ProductVariant, Product, Stock, StockMovement, OrderItem } = require('../../models/erp');

// ── Helper: generate Cartesian product dari attribute schema ──
// input:  { "Warna": ["Merah","Hitam"], "Ukuran": ["S","M"] }
// output: [
//   { Warna:"Merah", Ukuran:"S" },
//   { Warna:"Merah", Ukuran:"M" },
//   { Warna:"Hitam", Ukuran:"S" },
//   { Warna:"Hitam", Ukuran:"M" },
// ]
const cartesian = (schema) => {
  const keys = Object.keys(schema || {}).filter(k => Array.isArray(schema[k]) && schema[k].length);
  if (!keys.length) return [];
  return keys.reduce((acc, k) => {
    const vals = schema[k];
    if (!acc.length) return vals.map(v => ({ [k]: v }));
    return acc.flatMap(existing => vals.map(v => ({ ...existing, [k]: v })));
  }, []);
};

// Auto-name dari attributes: "Merah / L"
const buildName = (attrs) => {
  if (!attrs || typeof attrs !== 'object') return '';
  return Object.values(attrs).join(' / ');
};

// ═══════════════════════════════════════════════════════════════
// GET /api/erp/products/:productId/variants
// List semua varian + stock breakdown per cabang
// ═══════════════════════════════════════════════════════════════
const getVariants = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

    const variants = await ProductVariant.findAll({
      where: { product_id: productId },
      order: [['sort_order','ASC'], ['id','ASC']],
    });

    // Load stock breakdown for these variants (per branch)
    const variantIds = variants.map(v => v.id);
    let stockRows = [];
    if (variantIds.length) {
      stockRows = await Stock.findAll({
        where: { variant_id: { [Op.in]: variantIds } },
        attributes: ['variant_id', 'branch_id', 'qty', 'qty_reserved'],
      });
    }

    const stockByVariant = stockRows.reduce((acc, s) => {
      acc[s.variant_id] = acc[s.variant_id] || [];
      acc[s.variant_id].push({
        branch_id: s.branch_id,
        qty: parseInt(s.qty) || 0,
        qty_reserved: parseInt(s.qty_reserved) || 0,
      });
      return acc;
    }, {});

    const data = variants.map(v => {
      const json = v.toJSON();
      const stockList = stockByVariant[v.id] || [];
      return {
        ...json,
        attributes: typeof json.attributes === 'string' ? JSON.parse(json.attributes) : json.attributes,
        stock_branches: stockList,
        stock_total: stockList.reduce((s, x) => s + x.qty, 0),
      };
    });

    return res.json({ success: true, data: { variants: data } });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/erp/products/:productId/variants
// Buat satu varian manual
// ═══════════════════════════════════════════════════════════════
const createVariant = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

    const {
      attributes = {}, sku, barcode,
      price_override, buy_price_override, weight_override,
      stock_min = 0, is_active = true, sort_order = 0, image_url, notes,
    } = req.body;

    if (!attributes || !Object.keys(attributes).length) {
      return res.status(400).json({ success: false, message: 'Attributes wajib (mis. {Warna: "Merah"})' });
    }

    // Cek duplikat attribute combination
    const existing = await ProductVariant.findAll({ where: { product_id: productId } });
    const exists = existing.find(v => {
      const a = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
      return JSON.stringify(a) === JSON.stringify(attributes);
    });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Kombinasi varian sudah ada', code: 'DUPLICATE_VARIANT' });
    }

    const variant = await ProductVariant.create({
      product_id: productId,
      name: req.body.name?.trim() || buildName(attributes),
      sku, barcode, attributes,
      price_override: price_override === '' ? null : price_override,
      buy_price_override: buy_price_override === '' ? null : buy_price_override,
      weight_override: weight_override === '' ? null : weight_override,
      stock_min: parseInt(stock_min) || 0,
      is_active, sort_order: parseInt(sort_order) || 0,
      image_url, notes,
    });

    return res.status(201).json({ success: true, message: 'Varian ditambahkan', data: { variant } });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/erp/products/:productId/variants/generate
// Generate kombinasi varian dari attribute schema (cartesian product)
// Body: { schema: { Warna: ['Merah','Hitam'], Ukuran: ['S','M','L'] }, sku_prefix?: 'TS', overwrite?: false }
// ═══════════════════════════════════════════════════════════════
const generateCombinations = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { productId } = req.params;
    const { schema, sku_prefix, overwrite = false, default_stock_min = 0 } = req.body || {};

    const product = await Product.findByPk(productId);
    if (!product) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    }

    if (!schema || typeof schema !== 'object' || !Object.keys(schema).length) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Schema atribut wajib (mis. {Warna: ["Merah"]})' });
    }

    const combos = cartesian(schema);
    if (!combos.length) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Tidak ada kombinasi yang valid (atribut kosong)' });
    }

    // Cek existing
    const existing = await ProductVariant.findAll({
      where: { product_id: productId },
      transaction: t,
    });

    const existingAttrSet = new Set(
      existing.map(v => {
        const a = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
        return JSON.stringify(a || {});
      })
    );

    if (overwrite) {
      // Cek apakah ada variant yang sudah dipakai di order
      const variantIds = existing.map(v => v.id);
      if (variantIds.length) {
        const usedCount = await OrderItem.count({
          where: { variant_id: { [Op.in]: variantIds } },
          transaction: t,
        });
        if (usedCount > 0) {
          await t.rollback();
          return res.status(409).json({
            success: false,
            message: `Tidak bisa overwrite — ada ${usedCount} order item yang sudah pakai varian ini.`,
            code: 'VARIANTS_USED_IN_ORDERS',
          });
        }
      }

      // Hapus stock & varian lama
      if (variantIds.length) {
        await Stock.destroy({ where: { variant_id: { [Op.in]: variantIds } }, transaction: t });
        await ProductVariant.destroy({ where: { id: { [Op.in]: variantIds } }, transaction: t });
      }
      existingAttrSet.clear();
    }

    // Buat varian baru hanya untuk kombinasi yang belum ada
    const created = [];
    const skipped = [];
    let sortIdx = existing.length;

    for (const attrs of combos) {
      const key = JSON.stringify(attrs);
      if (existingAttrSet.has(key)) {
        skipped.push(attrs);
        continue;
      }

      const name = buildName(attrs);
      const skuParts = [];
      if (sku_prefix) skuParts.push(sku_prefix);
      Object.values(attrs).forEach(v => skuParts.push(String(v).replace(/\s+/g, '').slice(0, 4).toUpperCase()));
      const autoSku = skuParts.length > 1 ? skuParts.join('-') : null;

      const v = await ProductVariant.create({
        product_id: productId,
        name,
        sku: autoSku,
        attributes: attrs,
        stock_min: parseInt(default_stock_min) || 0,
        is_active: true,
        sort_order: sortIdx++,
      }, { transaction: t });
      created.push(v);
    }

    await t.commit();
    return res.status(201).json({
      success: true,
      message: `${created.length} varian dibuat${skipped.length ? `, ${skipped.length} dilewati (sudah ada)` : ''}`,
      data: {
        created_count: created.length,
        skipped_count: skipped.length,
        variants: created,
      },
    });
  } catch (err) {
    try { await t.rollback(); } catch {}
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
// PUT /api/erp/variants/:id
// ═══════════════════════════════════════════════════════════════
const updateVariant = async (req, res, next) => {
  try {
    const variant = await ProductVariant.findByPk(req.params.id);
    if (!variant) return res.status(404).json({ success: false, message: 'Varian tidak ditemukan' });

    const body = { ...req.body };

    // Convert '' to null untuk price overrides
    ['price_override','buy_price_override','weight_override'].forEach(k => {
      if (body[k] === '' || body[k] === undefined) body[k] = null;
    });

    // Re-build name kalau attributes diubah & name tidak di-overide
    if (body.attributes && !body.name) {
      body.name = buildName(body.attributes);
    }

    await variant.update(body);
    return res.json({ success: true, message: 'Varian diperbarui', data: { variant } });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// DELETE /api/erp/variants/:id
// Hanya bisa hapus kalau tidak ada referensi di OrderItem atau StockMovement
// ═══════════════════════════════════════════════════════════════
const deleteVariant = async (req, res, next) => {
  try {
    const variant = await ProductVariant.findByPk(req.params.id);
    if (!variant) return res.status(404).json({ success: false, message: 'Varian tidak ditemukan' });

    const usedCount = await OrderItem.count({ where: { variant_id: variant.id } });
    if (usedCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Tidak bisa hapus — varian ini dipakai di ${usedCount} order item. Nonaktifkan saja (toggle).`,
        code: 'VARIANT_USED_IN_ORDERS',
      });
    }

    // Hapus stock terkait variant ini juga
    await Stock.destroy({ where: { variant_id: variant.id } });
    await variant.destroy();

    return res.json({ success: true, message: 'Varian dihapus' });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/erp/variants/:id/toggle — aktifkan/nonaktifkan
// ═══════════════════════════════════════════════════════════════
const toggleVariant = async (req, res, next) => {
  try {
    const variant = await ProductVariant.findByPk(req.params.id);
    if (!variant) return res.status(404).json({ success: false, message: 'Varian tidak ditemukan' });
    await variant.update({ is_active: !variant.is_active });
    return res.json({
      success: true,
      message: `Varian ${variant.is_active ? 'diaktifkan' : 'dinonaktifkan'}`,
      data: { variant },
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/erp/variants/:id/adjust-stock
// Untuk inisialisasi/penyesuaian stock per varian
// Body: { branch_id, qty_change (delta), notes }
// ═══════════════════════════════════════════════════════════════
const adjustVariantStock = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { branch_id, qty_change, notes } = req.body || {};
    const variant = await ProductVariant.findByPk(req.params.id, { transaction: t });
    if (!variant) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Varian tidak ditemukan' });
    }
    if (!branch_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'branch_id wajib' });
    }
    const delta = parseInt(qty_change);
    if (!Number.isFinite(delta) || delta === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'qty_change harus angka non-zero' });
    }

    // Find or create stock row
    let stock = await Stock.findOne({
      where: { product_id: variant.product_id, variant_id: variant.id, branch_id },
      transaction: t,
    });
    const qtyBefore = stock ? (parseInt(stock.qty) || 0) : 0;
    const qtyAfter = qtyBefore + delta;
    if (qtyAfter < 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Stok tidak boleh negatif (${qtyBefore} + ${delta} = ${qtyAfter})` });
    }

    if (!stock) {
      stock = await Stock.create({
        product_id: variant.product_id,
        variant_id: variant.id,
        branch_id,
        qty: qtyAfter,
        qty_reserved: 0,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
    } else {
      await stock.update({ qty: qtyAfter }, { transaction: t });
    }

    // Log movement
    await StockMovement.create({
      product_id: variant.product_id,
      variant_id: variant.id,
      branch_id,
      type: 'adjustment',
      qty: delta,
      qty_before: qtyBefore,
      qty_after: qtyAfter,
      ref_type: 'variant_adjust',
      ref_id: variant.id,
      notes: notes || `Adjust varian ${variant.name}`,
      created_by: req.user?.id,
    }, { transaction: t });

    await t.commit();
    return res.json({
      success: true,
      message: `Stok varian "${variant.name}" diubah ${delta > 0 ? '+' : ''}${delta} → ${qtyAfter}`,
      data: { variant_id: variant.id, branch_id, qty_before: qtyBefore, qty_after: qtyAfter },
    });
  } catch (err) {
    try { await t.rollback(); } catch {}
    next(err);
  }
};

module.exports = {
  getVariants,
  createVariant,
  generateCombinations,
  updateVariant,
  deleteVariant,
  toggleVariant,
  adjustVariantStock,
};
