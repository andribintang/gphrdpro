/**
 * CLEAR DEMO DATA — Hapus semua data, pertahankan admin + settings
 * Dipanggil via: POST /clear-demo-data
 * Header: x-migrate-secret: <MIGRATE_SECRET>
 */
const clearDemoData = async (app) => {
  app.post('/clear-demo-data', async (req, res) => {
    const secret = req.headers['x-migrate-secret'];
    if (!secret || secret !== process.env.MIGRATE_SECRET) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    try {
      const { sequelize } = require('./config/database');
      const models = require('./models');
      const {
        User, Employee, Attendance, LeaveRequest, LeaveQuota,
        Payroll, PayrollRun, PayrollItem, LoanManagement,
        EmployeeFace, EmployeeAllowance,
      } = models;

      // Hapus incentive data juga
      const {
        WaSale, MarketplaceSale, MarketplaceShare,
        WebSale, WebShare, EmployeeActivity,
        IncentiveResult, IncentivePeriod, IncEmployee,
        Position, AuditLog,
      } = require('./models/incentive');

      // Urutan hapus: child tables first
      await AuditLog.destroy({ where: {}, truncate: true });
      await IncentiveResult.destroy({ where: {}, truncate: true });
      await EmployeeActivity.destroy({ where: {}, truncate: true });
      await WebShare.destroy({ where: {}, truncate: true });
      await WebSale.destroy({ where: {}, truncate: true });
      await MarketplaceShare.destroy({ where: {}, truncate: true });
      await MarketplaceSale.destroy({ where: {}, truncate: true });
      await WaSale.destroy({ where: {}, truncate: true });
      await IncentivePeriod.destroy({ where: {}, truncate: true });
      await IncEmployee.destroy({ where: {}, truncate: true });
      await Position.destroy({ where: {}, truncate: true });

      // HRD data
      await PayrollItem.destroy({ where: {}, truncate: true });
      await PayrollRun.destroy({ where: {}, truncate: true });
      await Payroll.destroy({ where: {}, truncate: true });
      await LoanManagement.destroy({ where: {}, truncate: true });
      await EmployeeAllowance.destroy({ where: {}, truncate: true });
      await LeaveRequest.destroy({ where: {}, truncate: true });
      await LeaveQuota.destroy({ where: {}, truncate: true });
      await Attendance.destroy({ where: {}, truncate: true });
      await EmployeeFace.destroy({ where: {}, truncate: true });
      await Employee.destroy({ where: {}, truncate: true });

      // Hapus semua user KECUALI admin
      const { Op } = require('sequelize');
      await User.destroy({ where: { role: { [Op.ne]: 'admin' } } });

      // Reset admin password
      const bcrypt = require('bcryptjs');
      const adminUser = await User.findOne({ where: { role: 'admin' } });
      if (adminUser) {
        const hash = await bcrypt.hash('Admin@123', 12);
        await adminUser.update({
          name:          'Admin HRD',
          email:         'admin@hrd.com',
          password_hash: hash,
        });
      }

      return res.json({
        success: true,
        message: 'Semua data demo berhasil dihapus!',
        data: {
          cleared: [
            'karyawan & users (kecuali admin)',
            'absensi', 'cuti', 'payroll', 'kasbon',
            'insentif (transaksi, periode, karyawan insentif)',
            'wajah karyawan',
          ],
          kept: ['admin account', 'company settings', 'office settings', 'payroll components', 'branches', 'sales channels', 'activity types', 'bonus targets'],
          admin: { email: 'admin@hrd.com', password: 'Admin@123' },
        },
      });
    } catch (err) {
      console.error('clearDemo error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  });
};

module.exports = clearDemoData;
