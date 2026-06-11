const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const { SubChannel } = require('../../models/erp');

// ── GET /api/erp/channel-targets ─────────────────────────────
const getTargets = async (req, res, next) => {
  try {
    const { year, month, branch_id } = req.query;
    const where = [];
    if (year)      where.push(`ct.year = ${parseInt(year)}`);
    if (month)     where.push(`ct.month = ${parseInt(month)}`);
    if (branch_id) where.push(`ct.branch_id = ${parseInt(branch_id)}`);

    const [targets] = await sequelize.query(`
      SELECT 
        ct.*,
        sc.name      AS sub_channel_name,
        sc.channel   AS channel,
        sc.is_active AS sc_active,
        COALESCE(actual.revenue, 0)      AS actual_revenue,
        COALESCE(actual.order_count, 0)  AS actual_orders,
        COALESCE(actual.avg_order, 0)    AS actual_avg_order
      FROM erp_channel_targets ct
      LEFT JOIN erp_sub_channels sc ON sc.id = ct.sub_channel_id
      LEFT JOIN (
        SELECT 
          sub_channel_id,
          SUM(total_amount)           AS revenue,
          COUNT(*)                    AS order_count,
          AVG(total_amount)           AS avg_order
        FROM erp_orders
        WHERE status NOT IN ('cancelled','returned')
        ${year  ? `AND YEAR(order_date)  = ${parseInt(year)}` : ''}
        ${month ? `AND MONTH(order_date) = ${parseInt(month)}` : ''}
        ${branch_id ? `AND branch_id = ${parseInt(branch_id)}` : ''}
        GROUP BY sub_channel_id
      ) actual ON actual.sub_channel_id = ct.sub_channel_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY ct.year DESC, ct.month DESC, sc.channel ASC, sc.sort_order ASC
    `);

    return res.json({ success: true, data: { targets } });
  } catch (err) { next(err); }
};

// ── GET /api/erp/channel-targets/summary ─────────────────────
const getSummary = async (req, res, next) => {
  try {
    const { year, month, branch_id } = req.query;
    const nowY = new Date().getFullYear();
    const nowM = new Date().getMonth() + 1;
    const y = parseInt(year  || nowY);
    const m = parseInt(month || nowM);
    const branchCond = branch_id ? `AND o.branch_id = ${parseInt(branch_id)}` : '';

    // Get all sub channels with targets and actuals for this period
    const [rows] = await sequelize.query(`
      SELECT 
        sc.id, sc.name, sc.channel, sc.sort_order,
        COALESCE(ct.target_revenue, 0)   AS target_revenue,
        COALESCE(ct.target_orders, 0)    AS target_orders,
        COALESCE(ct.notes, '')           AS notes,
        COALESCE(act.revenue, 0)         AS actual_revenue,
        COALESCE(act.orders, 0)          AS actual_orders
      FROM erp_sub_channels sc
      LEFT JOIN erp_channel_targets ct 
        ON ct.sub_channel_id = sc.id AND ct.year = ${y} AND ct.month = ${m}
        ${branch_id ? `AND ct.branch_id = ${parseInt(branch_id)}` : ''}
      LEFT JOIN (
        SELECT sub_channel_id,
          SUM(total_amount) AS revenue,
          COUNT(*)          AS orders
        FROM erp_orders o
        WHERE YEAR(order_date) = ${y} AND MONTH(order_date) = ${m}
          AND status NOT IN ('cancelled','returned')
          ${branchCond}
        GROUP BY sub_channel_id
      ) act ON act.sub_channel_id = sc.id
      WHERE sc.is_active = 1
      ORDER BY sc.channel, sc.sort_order
    `);

    // Trend last 6 months
    const [trend] = await sequelize.query(`
      SELECT 
        YEAR(o.order_date)  AS year,
        MONTH(o.order_date) AS month,
        sc.name             AS sub_channel,
        sc.channel,
        SUM(o.total_amount) AS revenue,
        COUNT(*)            AS orders
      FROM erp_orders o
      LEFT JOIN erp_sub_channels sc ON sc.id = o.sub_channel_id
      WHERE o.order_date >= DATE_SUB(LAST_DAY(CONCAT(${y},'-',LPAD(${m},2,'0'),'-01')), INTERVAL 5 MONTH)
        AND o.status NOT IN ('cancelled','returned')
        ${branchCond}
      GROUP BY YEAR(o.order_date), MONTH(o.order_date), o.sub_channel_id
      ORDER BY year, month
    `);

    const totalTarget  = rows.reduce((s,r) => s + parseFloat(r.target_revenue||0), 0);
    const totalActual  = rows.reduce((s,r) => s + parseFloat(r.actual_revenue||0), 0);
    const achievement  = totalTarget > 0 ? (totalActual / totalTarget * 100) : 0;

    return res.json({
      success: true,
      data: { channels: rows, totalTarget, totalActual, achievement, trend, period: { year: y, month: m } }
    });
  } catch (err) { next(err); }
};

// ── POST /api/erp/channel-targets ────────────────────────────
const upsertTarget = async (req, res, next) => {
  try {
    const { sub_channel_id, year, month, branch_id = 1, target_revenue, target_orders, notes } = req.body;
    if (!sub_channel_id || !year || !month) {
      return res.status(400).json({ success: false, message: 'sub_channel_id, year, month wajib' });
    }

    const [existing] = await sequelize.query(
      `SELECT id FROM erp_channel_targets WHERE sub_channel_id = ? AND year = ? AND month = ? AND branch_id = ?`,
      { replacements: [sub_channel_id, year, month, branch_id], type: 'SELECT' }
    );

    if (existing) {
      await sequelize.query(
        `UPDATE erp_channel_targets SET target_revenue = ?, target_orders = ?, notes = ?, updated_at = NOW() WHERE id = ?`,
        { replacements: [parseFloat(target_revenue)||0, parseInt(target_orders)||0, notes||'', existing.id] }
      );
    } else {
      await sequelize.query(
        `INSERT INTO erp_channel_targets (sub_channel_id, year, month, branch_id, target_revenue, target_orders, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        { replacements: [sub_channel_id, year, month, branch_id, parseFloat(target_revenue)||0, parseInt(target_orders)||0, notes||''] }
      );
    }

    return res.json({ success: true, message: 'Target berhasil disimpan' });
  } catch (err) { next(err); }
};

// ── POST /api/erp/channel-targets/bulk ───────────────────────
const bulkUpsert = async (req, res, next) => {
  try {
    const { year, month, branch_id = 1, targets } = req.body;
    if (!targets?.length) return res.status(400).json({ success: false, message: 'targets wajib' });

    for (const t of targets) {
      const [existing] = await sequelize.query(
        `SELECT id FROM erp_channel_targets WHERE sub_channel_id = ? AND year = ? AND month = ? AND branch_id = ?`,
        { replacements: [t.sub_channel_id, year, month, branch_id], type: 'SELECT' }
      );
      if (existing) {
        await sequelize.query(
          `UPDATE erp_channel_targets SET target_revenue = ?, target_orders = ?, notes = ?, updated_at = NOW() WHERE id = ?`,
          { replacements: [parseFloat(t.target_revenue)||0, parseInt(t.target_orders)||0, t.notes||'', existing.id] }
        );
      } else {
        await sequelize.query(
          `INSERT INTO erp_channel_targets (sub_channel_id, year, month, branch_id, target_revenue, target_orders, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          { replacements: [t.sub_channel_id, year, month, branch_id, parseFloat(t.target_revenue)||0, parseInt(t.target_orders)||0, t.notes||''] }
        );
      }
    }

    return res.json({ success: true, message: `${targets.length} target berhasil disimpan` });
  } catch (err) { next(err); }
};

// ── DELETE /api/erp/channel-targets/:id ──────────────────────
const deleteTarget = async (req, res, next) => {
  try {
    await sequelize.query(`DELETE FROM erp_channel_targets WHERE id = ?`, { replacements: [req.params.id] });
    return res.json({ success: true, message: 'Target dihapus' });
  } catch (err) { next(err); }
};

module.exports = { getTargets, getSummary, upsertTarget, bulkUpsert, deleteTarget };
