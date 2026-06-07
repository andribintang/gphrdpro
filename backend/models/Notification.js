const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Penerima notifikasi',
  },

  type: {
    type: DataTypes.ENUM(
      'payroll_ready',      // Slip gaji sudah bisa dilihat
      'payroll_paid',       // Gaji sudah ditransfer
      'leave_approved',     // Cuti disetujui
      'leave_rejected',     // Cuti ditolak
      'leave_pending',      // Ada pengajuan cuti (untuk HR/supervisor)
      'leave_reminder',     // Reminder cuti akan habis
      'loan_approved',      // Kasbon disetujui
      'loan_reminder',      // Reminder cicilan kasbon
      'birthday',           // Selamat ulang tahun
      'attendance_late',    // Peringatan sering terlambat
      'announcement',       // Pengumuman umum
      'system'              // Notifikasi sistem
    ),
    allowNull: false,
  },

  title:   { type: DataTypes.STRING(100), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },

  link: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'URL tujuan saat notif diklik',
  },

  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  read_at: { type: DataTypes.DATE, allowNull: true },

  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID yang membuat notifikasi (null = sistem)',
  },

  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Data tambahan (run_id, leave_id, dll)',
  },
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['is_read'] },
    { fields: ['type'] },
    { fields: ['created_at'] },
  ],
});

module.exports = Notification;
