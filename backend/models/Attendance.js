const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  date: { type: DataTypes.DATEONLY, allowNull: false },

  // Check-in
  check_in: { type: DataTypes.TIME, allowNull: true },
  check_in_lat: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  check_in_lng: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  check_in_selfie_url: { type: DataTypes.STRING(500), allowNull: true },
  check_in_face_score: { type: DataTypes.DECIMAL(4, 3), allowNull: true },
  check_in_face_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  check_in_distance: { type: DataTypes.INTEGER, allowNull: true },
  check_in_location_verified: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Check-out
  check_out: { type: DataTypes.TIME, allowNull: true },
  check_out_lat: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  check_out_lng: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  check_out_selfie_url: { type: DataTypes.STRING(500), allowNull: true },
  check_out_face_verified: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Break
  break_start: { type: DataTypes.TIME, allowNull: true },
  break_end: { type: DataTypes.TIME, allowNull: true },
  total_break_minutes: { type: DataTypes.INTEGER, defaultValue: 0 },

  // Status
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'half_day', 'leave', 'holiday'),
    defaultValue: 'present',
  },
  work_hours: { type: DataTypes.DECIMAL(4, 2), allowNull: true },

  // Meta
  device_info: { type: DataTypes.JSON, allowNull: true },
  ip_address: { type: DataTypes.STRING(45), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'attendance',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['user_id', 'date'], unique: true },
    { fields: ['date'] },
  ],
});

module.exports = Attendance;
