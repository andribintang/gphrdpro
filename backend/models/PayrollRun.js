const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PayrollRun = sequelize.define('PayrollRun', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  type: {
    type: DataTypes.ENUM('monthly', 'incentive', 'thr', 'bonus'),
    allowNull: false,
  },

  // Periode
  period_month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '1-12',
  },
  period_year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  period_label: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Contoh: Januari 2024, THR 2024, dll',
  },

  // Status workflow
  status: {
    type: DataTypes.ENUM('draft', 'calculated', 'approved', 'paid'),
    defaultValue: 'draft',
  },

  // Tanggal
  run_date:     { type: DataTypes.DATEONLY, allowNull: true },
  payment_date: { type: DataTypes.DATEONLY, allowNull: true },
  approved_at:  { type: DataTypes.DATE, allowNull: true },
  paid_at:      { type: DataTypes.DATE, allowNull: true },

  // Totals
  total_employees:  { type: DataTypes.INTEGER, defaultValue: 0 },
  total_gross:      { type: DataTypes.DECIMAL(18,2), defaultValue: 0 },
  total_deductions: { type: DataTypes.DECIMAL(18,2), defaultValue: 0 },
  total_net:        { type: DataTypes.DECIMAL(18,2), defaultValue: 0 },

  // PPH21 setting snapshot
  pph21_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  pph21_rate:    { type: DataTypes.DECIMAL(5,2), defaultValue: 5 },

  // Untuk incentive: total sales input
  incentive_sales_total: {
    type: DataTypes.DECIMAL(18,2),
    allowNull: true,
    comment: 'Total sales bulan ini untuk hitung insentif',
  },

  // User yang generate & approve
  generated_by: { type: DataTypes.INTEGER, allowNull: true },
  approved_by:  { type: DataTypes.INTEGER, allowNull: true },

  notes: { type: DataTypes.TEXT, allowNull: true },

}, {
  tableName: 'payroll_runs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['type', 'period_year', 'period_month'] },
    { fields: ['status'] },
  ],
});

module.exports = PayrollRun;
