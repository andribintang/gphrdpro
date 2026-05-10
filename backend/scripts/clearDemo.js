/**
 * CLEAR DEMO DATA — Hapus semua data demo, pertahankan struktur
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
        IncentiveParameter, IncentiveEmployeeRate, EmployeeFace,
      } = models;

      // Hapus semua data transaksi (urutan penting — child dulu)
      await IncentiveEmployeeRate.destroy({ where: {}, truncate: true });
      await IncentiveParameter.destroy({ where: {}, truncate: true });
      await PayrollItem.destroy({ where: {}, truncate: true });
      await PayrollRun.destroy({ where: {}, truncate: true });
      await Payroll.destroy({ where: {}, truncate: true });
      await LoanManagement.destroy({ where: {}, truncate: true });
      await LeaveRequest.destroy({ where: {}, truncate: true });
      await LeaveQuota.destroy({ where: {}, truncate: true });
      await Attendance.destroy({ where: {}, truncate: true });
      await EmployeeFace.destroy({ where: {}, truncate: true });
      await Employee.destroy({ where: {}, truncate: true });

      // Hapus semua user KECUALI admin
      await User.destroy({ where: { role: { [require('sequelize').Op.ne]: 'admin' } } });

      // Reset password admin ke default
      const bcrypt = require('bcryptjs');
      const adminUser = await User.findOne({ where: { role: 'admin' } });
      if (adminUser) {
        const hash = await bcrypt.hash('Admin@123', 12);
        await adminUser.update({
          name: 'Admin HRD',
          email: 'admin@hrd.com',
          password_hash: hash,
        });
      }

      return res.json({
        success: true,
        message: 'Data demo berhasil dihapus! Hanya akun Admin yang tersisa.',
        data: {
          cleared: ['employees', 'attendance', 'leaves', 'payroll', 'loans', 'incentives', 'faces'],
          admin_kept: { email: 'admin@hrd.com', password: 'Admin@123' },
          next_step: 'Login dengan admin@hrd.com / Admin@123 lalu tambah karyawan baru',
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
};

module.exports = clearDemoData;
