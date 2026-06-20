const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../../config/database');
const { Product, Stock, StockMovement, Category } = require('../../models/erp');

// ── GET /api/erp/inventory/summary ───────────────────────────
// Overview: total SKU, total stok value, low stock, out of stock
const getSummary = async (req, res, next) => {
  try {
    const { branch_id } = req.query;
    const where = branch_id ? { branch_id: parseInt(branch_id) } : {};

    const [rows] = await sequelize.query(`
      SELECT 
        ep.id, ep.name, ep.sku, ep.branch_id, ep.category_id,
        ep.buy_price, ep.sell_price, ep.stock_min,
        ec.name AS category_name,
        COALESCE(s.qty, 0) AS qty
      FROM erp_products ep
      LEFT JOIN erp_categories ec ON ec.id = ep.category_id
      LEFT JOIN (
        SELECT product_id, branch_id, SUM(qty) AS qty
        FROM erp_stock
        GROUP BY product_id, branch_id
      ) s ON s.product_id = ep.id ${branch_id ? 'AND s.branch_id = ' + parseInt(branch_id) : ''}
      WHERE ep.is_active = 1
      ORDER BY qty ASC
    `);

    const totalSKU    = rows.length;
    const outOfStock  = rows.filter(r => r.qty <= 0);
    const lowStock    = rows.filter(r => r.qty > 0 && r.qty <= (r.stock_min || 0));
    const healthy     = rows.filter(r => r.qty > (r.stock_min || 0));
    const totalValue  = rows.reduce((s, r) => s + (parseFloat(r.buy_price || 0) * r.qty), 0);
    const sellValue   = rows.reduce((s, r) => s + (parseFloat(r.sell_price || 0) * r.qty), 0);

    // Category breakdown
    const byCat = {};
    rows.forEach(r => {
      const cat = r.category_name || 'Lainnya';
      if (!byCat[cat]) byCat[cat] = { name: cat, total: 0, value: 0, qty: 0 };
      byCat[cat].total++;
      byCat[cat].qty   += r.qty;
      byCat[cat].value += parseFloat(r.buy_price || 0) * r.qty;
    });

    return res.json({
      success: true,
      data: {
        summary: { totalSKU, outOfStock: outOfStock.length, lowStock: lowStock.length, healthy: healthy.length, totalValue, sellValue },
        reorderAlerts: [...outOfStock, ...lowStock].map(r => ({
          id: r.id, name: r.name, sku: r.sku, qty: r.qty,
          stock_min: r.stock_min || 0, category: r.category_name,
          status: r.qty <= 0 ? 'out' : 'low',
          urgency: r.qty <= 0 ? 'critical' : r.qty <= Math.ceil((r.stock_min||0) * 0.5) ? 'high' : 'medium',
        })),
        byCategory: Object.values(byCat).sort((a,b) => b.value - a.value),
      }
    });
  } catch (err) { next(err); }
};

// ── GET /api/erp/inventory/movements ─────────────────────────
const getMovements = async (req, res, next) => {
  try {
    const { branch_id, type, product_id, date_from, date_to, limit = 50, page = 1 } = req.query;
    const where = {};
    if (branch_id)  where.branch_id  = parseInt(branch_id);
    if (type)       where.type       = type;
    if (product_id) where.product_id = parseInt(product_id);
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to)   where.created_at[Op.lte] = new Date(date_to + 'T23:59:59');
    }

    const { count, rows } = await StockMovement.findAndCountAll({
      where,
      include: [{ model: Product, as: 'product', attributes: ['id','name','sku','unit'], required: false }],
      order: [['created_at', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page)-1) * parseInt(limit),
    });

    return res.json({
      success: true,
      data: {
        movements: rows,
        pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count/parseInt(limit)) }
      }
    });
  } catch (err) { next(err); }
};

// ── GET /api/erp/inventory/stock-value ───────────────────────
const getStockValue = async (req, res, next) => {
  try {
    const { branch_id } = req.query;
    const branchCond = branch_id ? `AND s.branch_id = ${parseInt(branch_id)}` : '';

    const [rows] = await sequelize.query(`
      SELECT 
        ec.name AS category,
        COUNT(DISTINCT ep.id) AS sku_count,
        SUM(COALESCE(s.qty, 0)) AS total_qty,
        SUM(COALESCE(s.qty, 0) * ep.buy_price) AS buy_value,
        SUM(COALESCE(s.qty, 0) * ep.sell_price) AS sell_value
      FROM erp_products ep
      LEFT JOIN erp_categories ec ON ec.id = ep.category_id
      LEFT JOIN erp_stock s ON s.product_id = ep.id ${branchCond}
      WHERE ep.is_active = 1
      GROUP BY ec.name
      ORDER BY buy_value DESC
    `);

    return res.json({ success: true, data: { breakdown: rows } });
  } catch (err) { next(err); }
};

// ── GET /api/erp/inventory/movement-trend ────────────────────
// Last 30 days in/out totals per day
const getMovementTrend = async (req, res, next) => {
  try {
    const { branch_id, days = 30 } = req.query;
    const branchCond = branch_id ? `AND branch_id = ${parseInt(branch_id)}` : '';

    const [rows] = await sequelize.query(`
      SELECT 
        DATE(created_at) AS date,
        type,
        SUM(ABS(qty)) AS total_qty
      FROM erp_stock_movements
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${parseInt(days)} DAY)
        ${branchCond}
      GROUP BY DATE(created_at), type
      ORDER BY date ASC
    `);

    return res.json({ success: true, data: { trend: rows } });
  } catch (err) { next(err); }
};

// ── POST /api/erp/inventory/reorder ──────────────────────────
// Create purchase suggestion / trigger PO draft
const createReorderSuggestion = async (req, res, next) => {
  try {
    const { product_ids, branch_id = 1 } = req.body;
    if (!product_ids?.length) return res.status(400).json({ success: false, message: 'product_ids wajib' });

    const [rows] = await sequelize.query(`
      SELECT ep.id, ep.name, ep.sku, ep.stock_min, ep.buy_price,
             COALESCE(s.qty, 0) AS qty
      FROM erp_products ep
      LEFT JOIN (
        SELECT product_id, branch_id, SUM(qty) AS qty
        FROM erp_stock
        GROUP BY product_id, branch_id
      ) s ON s.product_id = ep.id AND s.branch_id = ${parseInt(branch_id)}
      WHERE ep.id IN (${product_ids.join(',')})
    `);

    const suggestions = rows.map(p => ({
      product_id: p.id, name: p.name, sku: p.sku,
      current_qty: p.qty, stock_min: p.stock_min || 0,
      suggested_order: Math.max(0, (p.stock_min || 10) * 2 - p.qty),
      estimated_cost: Math.max(0, (p.stock_min || 10) * 2 - p.qty) * parseFloat(p.buy_price || 0),
    }));

    return res.json({ success: true, data: { suggestions, total_estimate: suggestions.reduce((s,r) => s + r.estimated_cost, 0) } });
  } catch (err) { next(err); }
};

module.exports = { getSummary, getMovements, getStockValue, getMovementTrend, createReorderSuggestion };
