const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Header: total sales per bulan
const IncentiveParameter = sequelize.define('IncentiveParameter', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  period_month: { type: DataTypes.INTEGER, allowNull: false },
  period_year:  { type: DataTypes.INTEGER, allowNull: false },

  // Total penjualan bulan ini
  total_sales: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0,
  },

  // Nama/label parameter (bisa multi parameter)
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Sales Bulan Ini',
    comment: 'Bisa ada multiple parameter per bulan',
  },

  description: { type: DataTypes.TEXT, allowNull: true },

  status: {
    type: DataTypes.ENUM('draft', 'final'),
    defaultValue: 'draft',
  },

  created_by: { type: DataTypes.INTEGER, allowNull: true },

}, {
  tableName: 'incentive_parameters',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['period_year', 'period_month'] },
  ],
});

// Detail: % per karyawan per parameter
const IncentiveEmployeeRate = sequelize.define('IncentiveEmployeeRate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  incentive_parameter_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'incentive_parameters', key: 'id' },
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },

  // % insentif karyawan ini dari total sales
  rate_percentage: {
    type: DataTypes.DECIMAL(6, 3),
    allowNull: false,
    comment: 'Contoh: 0.500 = 0.5%',
  },

  // Hasil kalkulasi
  calculated_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'total_sales × rate_percentage / 100',
  },

  notes: { type: DataTypes.TEXT, allowNull: true },

}, {
  tableName: 'incentive_employee_rates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['incentive_parameter_id', 'user_id'] },
  ],
});

// Associations
IncentiveParameter.hasMany(IncentiveEmployeeRate, { foreignKey: 'incentive_parameter_id', as: 'rates' });
IncentiveEmployeeRate.belongsTo(IncentiveParameter, { foreignKey: 'incentive_parameter_id', as: 'parameter' });

module.exports = { IncentiveParameter, IncentiveEmployeeRate };
