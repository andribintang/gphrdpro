const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeaveQuota = sequelize.define('LeaveQuota', {
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
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Tahun berlaku kuota',
  },
  annual_quota: {
    type: DataTypes.INTEGER,
    defaultValue: 12,
    comment: 'Jatah cuti tahunan (hari)',
  },
  annual_used: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Hari cuti tahunan yang sudah dipakai',
  },
  sick_used: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Hari cuti sakit yang sudah dipakai',
  },
  carry_over: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Sisa cuti tahun lalu yang dibawa',
  },
}, {
  tableName: 'leave_quotas',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['user_id', 'year'], unique: true },
  ],
});

module.exports = LeaveQuota;
