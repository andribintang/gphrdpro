const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PayrollItem = sequelize.define('PayrollItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  payroll_run_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'payroll_runs', key: 'id' },
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },

  // Snapshot data karyawan saat generate
  employee_name:      { type: DataTypes.STRING(100), allowNull: true },
  employee_nip:       { type: DataTypes.STRING(50),  allowNull: true },
  employee_position:  { type: DataTypes.STRING(100), allowNull: true },
  employee_department:{ type: DataTypes.STRING(100), allowNull: true },
  salary_base_snapshot: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },

  // Totals
  total_income:     { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  total_deductions: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  pph21_amount:     { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  net_salary:       { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },

  // Attendance snapshot
  work_days:        { type: DataTypes.INTEGER, defaultValue: 0 },
  present_days:     { type: DataTypes.INTEGER, defaultValue: 0 },
  late_count:       { type: DataTypes.INTEGER, defaultValue: 0 },
  alpha_days:       { type: DataTypes.INTEGER, defaultValue: 0 },
  leave_days:       { type: DataTypes.INTEGER, defaultValue: 0 },

  // Income lines breakdown
  income_lines: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '[{component_id, code, name, amount, note}]',
  },

  // Deduction lines breakdown
  deduction_lines: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '[{component_id, code, name, amount, note}]',
  },

  // THR specific
  thr_months_worked:  { type: DataTypes.INTEGER, allowNull: true },
  thr_eligibility:    { type: DataTypes.ENUM('full','proportional','not_eligible'), allowNull: true },

  status: {
    type: DataTypes.ENUM('draft','approved','paid'),
    defaultValue: 'draft',
  },

  notes: { type: DataTypes.TEXT, allowNull: true },

}, {
  tableName: 'payroll_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['payroll_run_id', 'user_id'], unique: true },
    { fields: ['user_id'] },
  ],
});

module.exports = PayrollItem;
