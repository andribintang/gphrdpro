const { sequelize } = require('../config/database');

// Secret token untuk double-confirm penghapusan
const CLEANUP_SECRET = process.env.CLEANUP_SECRET || 'HAPUS-DATA-GPDISTRO-2024';

const verifySecret = (req, res) => {
  const secret = req.headers['x-cleanup-secret'] || req.body.secret;
  if (secret !== CLEANUP_SECRET) {
    res.status(403).json({ success:false, message:'Secret tidak valid. Gunakan header x-cleanup-secret.' });
    return false;
  }
  return true;
};

// ── GET /api/cleanup/summary ──────────────────────────────────
// Preview berapa data yang akan dihapus
const getSummary = async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        (SELECT COUNT(*) FROM payroll_runs WHERE type='monthly') AS payroll_monthly,
        (SELECT COUNT(*) FROM payroll_runs WHERE type='thr')     AS payroll_thr,
        (SELECT COUNT(*) FROM payroll_runs WHERE type='bonus')   AS payroll_bonus,
        (SELECT COUNT(*) FROM payroll_runs WHERE type='incentive') AS payroll_incentive,
        (SELECT COUNT(*) FROM payroll_items)                     AS payroll_items,
        (SELECT COUNT(*) FROM inc_periods)                       AS inc_periods,
        (SELECT COUNT(*) FROM inc_results)                       AS inc_results,
        (SELECT COUNT(*) FROM loan_management)                   AS loans,
        (SELECT COUNT(*) FROM notifications)                     AS notifications
    `);

    return res.json({ success:true, data:{ counts: rows[0] } });
  } catch(err) { next(err); }
};

// ── DELETE /api/cleanup/payroll ───────────────────────────────
const cleanPayroll = async (req, res, next) => {
  if (!verifySecret(req, res)) return;
  try {
    const { types = ['monthly','thr','bonus','incentive'] } = req.body;
    const typeList = types.map(t => `'${t}'`).join(',');

    const t = await sequelize.transaction();
    try {
      // Get run IDs to delete
      const [runs] = await sequelize.query(
        `SELECT id FROM payroll_runs WHERE type IN (${typeList})`,
        { transaction: t }
      );
      const runIds = runs.map(r => r.id);

      let deletedItems = 0;
      let deletedRuns  = 0;

      if (runIds.length > 0) {
        const ids = runIds.join(',');
        // Delete items first (FK)
        const [, itemMeta] = await sequelize.query(
          `DELETE FROM payroll_items WHERE payroll_run_id IN (${ids})`,
          { transaction: t }
        );
        deletedItems = itemMeta || 0;
        // Delete runs
        await sequelize.query(
          `DELETE FROM payroll_runs WHERE id IN (${ids})`,
          { transaction: t }
        );
        deletedRuns = runIds.length;
      }

      await t.commit();

      return res.json({
        success: true,
        message: `Berhasil menghapus ${deletedRuns} payroll run dan ${deletedItems} slip`,
        data: { deleted_runs: deletedRuns, deleted_items: deletedItems, types },
      });
    } catch(e) {
      await t.rollback();
      throw e;
    }
  } catch(err) { next(err); }
};

// ── DELETE /api/cleanup/incentive ─────────────────────────────
const cleanIncentive = async (req, res, next) => {
  if (!verifySecret(req, res)) return;
  try {
    const t = await sequelize.transaction();
    try {
      // Delete in correct FK order
      const tables = [
        'inc_results',
        'inc_employee_activities',
        'inc_wa_sales',
        'inc_marketplace_sales',
        'inc_web_sales',
      ];
      const counts = {};
      for (const tbl of tables) {
        try {
          const [, meta] = await sequelize.query(`DELETE FROM ${tbl}`, { transaction: t });
          counts[tbl] = meta || 0;
        } catch(e) { counts[tbl] = `skip (${e.message.slice(0,30)})`; }
      }
      // Delete periods last
      const [[{cnt}]] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM inc_periods`, { transaction: t });
      await sequelize.query(`DELETE FROM inc_periods`, { transaction: t });
      counts.inc_periods = parseInt(cnt);

      await t.commit();
      return res.json({ success:true, message:`Semua data insentif berhasil dihapus`, data:{ counts } });
    } catch(e) { await t.rollback(); throw e; }
  } catch(err) { next(err); }
};

// ── DELETE /api/cleanup/notifications ────────────────────────
const cleanNotifications = async (req, res, next) => {
  if (!verifySecret(req, res)) return;
  try {
    const [[{cnt}]] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM notifications`);
    await sequelize.query(`DELETE FROM notifications`);
    return res.json({ success:true, message:`${cnt} notifikasi dihapus`, data:{ deleted: parseInt(cnt) } });
  } catch(err) { next(err); }
};

// ── DELETE /api/cleanup/loans ─────────────────────────────────
const cleanLoans = async (req, res, next) => {
  if (!verifySecret(req, res)) return;
  try {
    const [[{cnt}]] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM loan_management`);
    await sequelize.query(`DELETE FROM loan_management`);
    return res.json({ success:true, message:`${cnt} data kasbon/pinjaman dihapus`, data:{ deleted: parseInt(cnt) } });
  } catch(err) { next(err); }
};

module.exports = { getSummary, cleanPayroll, cleanIncentive, cleanNotifications, cleanLoans };
