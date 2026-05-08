const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  check_in: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  check_out: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  check_in_lat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
  },
  check_in_lng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
  },
  check_out_lat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
  },
  check_out_lng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'half_day', 'leave', 'holiday'),
    defaultValue: 'present',
  },
  work_hours: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    comment: 'Total working hours for the day',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
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
