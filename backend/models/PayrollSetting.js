const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PayrollSetting = sequelize.define('PayrollSetting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  // PPH21
  pph21_enabled:    { type: DataTypes.BOOLEAN, defaultValue: false },
  pph21_rate:       { type: DataTypes.DECIMAL(5,2), defaultValue: 5.00, comment: 'Persentase PPH21, default 5%' },
  ptkp_monthly:     { type: DataTypes.DECIMAL(15,2), defaultValue: 4500000, comment: 'PTKP per bulan' },

  // BPJS
  bpjs_kes_employee:  { type: DataTypes.DECIMAL(5,2), defaultValue: 1.00, comment: '% BPJS Kesehatan karyawan' },
  bpjs_kes_company:   { type: DataTypes.DECIMAL(5,2), defaultValue: 4.00, comment: '% BPJS Kesehatan perusahaan' },
  bpjs_tk_jht_emp:    { type: DataTypes.DECIMAL(5,2), defaultValue: 2.00, comment: '% JHT karyawan' },
  bpjs_tk_jht_comp:   { type: DataTypes.DECIMAL(5,2), defaultValue: 3.70, comment: '% JHT perusahaan' },
  bpjs_tk_jp_emp:     { type: DataTypes.DECIMAL(5,2), defaultValue: 1.00, comment: '% JP karyawan' },
  bpjs_tk_jp_comp:    { type: DataTypes.DECIMAL(5,2), defaultValue: 2.00, comment: '% JP perusahaan' },
  bpjs_enabled:       { type: DataTypes.BOOLEAN, defaultValue: true },

  // Attendance deduction
  late_deduction_amount:    { type: DataTypes.DECIMAL(15,2), defaultValue: 25000, comment: 'Potongan per keterlambatan' },
  alpha_deduction_type:     { type: DataTypes.ENUM('per_day_salary','flat'), defaultValue: 'per_day_salary' },
  alpha_flat_amount:        { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },

  // Work days
  work_days_per_month:  { type: DataTypes.INTEGER, defaultValue: 22 },

  // THR/Bonus minimum months
  thr_minimum_months:   { type: DataTypes.INTEGER, defaultValue: 6 },
  bonus_minimum_months: { type: DataTypes.INTEGER, defaultValue: 6 },

  // Incentive default date
  incentive_payment_day: { type: DataTypes.INTEGER, defaultValue: 15 },

  // Bonus month (12=Desember, 1=Januari)
  bonus_month: { type: DataTypes.INTEGER, defaultValue: 12 },

}, {
  tableName: 'payroll_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = PayrollSetting;
