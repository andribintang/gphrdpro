/**
 * CLEAR DEMO DATA
 * POST /clear-demo-data
 * Header: x-migrate-secret: <MIGRATE_SECRET>
 */
const clearDemoData = async (app) => {
  app.post('/clear-demo-data', async (req, res) => {
    const secret = req.headers['x-migrate-secret'];
    if (!secret || secret !== process.env.MIGRATE_SECRET) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    try {
      const { sequelize } = require('../config/database');
      const { Op }        = require('sequelize');
      const bcrypt        = require('bcryptjs');

      // Disable FK checks, truncate all, re-enable
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

      const tables = [
        // Incentive transaction tables
        'inc_audit_logs',
        'inc_results',
        'inc_employee_activities',
        'inc_web_shares',
        'inc_web_sales',
        'inc_marketplace_shares',
        'inc_marketplace_sales',
        'inc_wa_sales',
        'inc_periods',
        'inc_employees',
        'inc_positions',
        // HRD transaction tables
        'payroll_items',
        'payroll_runs',
        'loan_management',
        'employee_allowances',
        'employee_faces',
        'leave_requests',
        'leave_quotas',
        'attendance',
        'payrolls',
        'employees',
      ];

      for (const table of tables) {
        try {
          await sequelize.query(`TRUNCATE TABLE \`${table}\``);
        } catch (e) {
          // Table might not exist yet — skip
          console.log(`Skip ${table}: ${e.message}`);
        }
      }

      // Delete non-admin users
      await sequelize.query(
        `DELETE FROM users WHERE role != 'admin'`
      );

      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

      // Reset admin
      const hash = await bcrypt.hash('Admin@123', 12);
      await sequelize.query(
        `UPDATE users SET name='Admin HRD', email='admin@hrd.com', password_hash=? WHERE role='admin'`,
        { replacements: [hash] }
      );

      return res.json({
        success: true,
        message: 'Semua data demo berhasil dihapus!',
        data: {
          cleared: [
            'karyawan & users (kecuali admin)',
            'absensi', 'cuti', 'payroll', 'kasbon',
            'insentif (transaksi, periode, karyawan)',
            'wajah karyawan',
          ],
          kept: [
            'admin account (admin@hrd.com / Admin@123)',
            'company settings', 'office settings',
            'payroll components', 'payroll settings',
            'branches', 'sales channels',
            'activity types', 'bonus targets',
          ],
        },
      });

    } catch (err) {
      // Make sure FK checks are re-enabled even on error
      try {
        const { sequelize } = require('../config/database');
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch {}
      console.error('clearDemo error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  });
};

module.exports = clearDemoData;
