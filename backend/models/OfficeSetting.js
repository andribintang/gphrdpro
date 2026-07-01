const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OfficeSetting = sequelize.define('OfficeSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Kantor Pusat',
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  lat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    comment: 'Latitude koordinat kantor',
  },
  lng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    comment: 'Longitude koordinat kantor',
  },
  radius: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    comment: 'Radius geofence dalam meter',
  },
  check_in_start: {
    type: DataTypes.STRING(5),
    defaultValue: '06:00',
    comment: 'Jam mulai bisa check-in (HH:MM)',
  },
  check_in_deadline: {
    type: DataTypes.STRING(5),
    defaultValue: '08:05',
    comment: 'Batas tepat waktu check-in (HH:MM)',
  },
  check_out_start: {
    type: DataTypes.STRING(5),
    defaultValue: '15:00',
    comment: 'Jam minimal bisa check-out (HH:MM)',
  },
  work_hours_required: {
    type: DataTypes.DECIMAL(3, 1),
    defaultValue: 8.0,
    comment: 'Jam kerja wajib per hari',
  },
  // Jam khusus weekend (Sabtu)
  check_out_weekend: {
    type: DataTypes.STRING(5),
    allowNull: true,
    defaultValue: null,
    comment: 'Jam minimal check-out di hari Sabtu (null = sama dengan hari biasa)',
  },
  // Daftar tanggal libur nasional (JSON array: ["2026-01-01","2026-08-17"])
  public_holidays: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array tanggal libur nasional format YYYY-MM-DD',
  },
  // Jam check-out khusus di hari libur nasional
  check_out_holiday: {
    type: DataTypes.STRING(5),
    allowNull: true,
    defaultValue: null,
    comment: 'Jam minimal check-out di hari libur (null = sama dgn hari biasa)',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'office_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = OfficeSetting;
