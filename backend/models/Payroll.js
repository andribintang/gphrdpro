const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payroll = sequelize.define('Payroll', {
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
  month: {
    type: DataTypes.STRING(7),
    allowNull: false,
    comment: 'Format: YYYY-MM',
  },
  salary_base: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  allowances: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  deductions: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  overtime_pay: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  total_salary: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  details_json: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Breakdown details: allowances[], deductions[], etc.',
  },
  status: {
    type: DataTypes.ENUM('draft', 'processed', 'paid'),
    defaultValue: 'draft',
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  processed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
}, {
  tableName: 'payroll',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['user_id', 'month'], unique: true },
  ],
});

module.exports = Payroll;
