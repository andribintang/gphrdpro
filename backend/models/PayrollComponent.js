const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PayrollComponent = sequelize.define('PayrollComponent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    comment: 'Kode unik: GAPOK, TJ, MAKAN, dll',
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('income', 'deduction'),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(
      'basic_salary',       // Gaji pokok
      'position_allowance', // Tunjangan jabatan
      'attendance_bonus',   // Uang kerajinan (proporsional)
      'meal_allowance',     // Uang makan (per hari hadir)
      'transport_allowance',// Transport (per hari hadir)
      'incentive',          // Insentif (modul khusus)
      'thr',                // THR
      'bonus',              // Bonus tahunan
      'flat',               // Flat amount custom
      'percentage',         // % dari gaji pokok
      'bpjs',               // BPJS (auto hitung)
      'late_deduction',     // Potongan telat (auto)
      'alpha_deduction',    // Potongan alpha (auto)
      'loan_installment',   // Cicilan kasbon/hutang (auto)
      'pph21'               // PPH21 (auto, optional)
    ),
    allowNull: false,
  },

  // Nilai default (bisa di-override per karyawan)
  default_value: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Nilai default flat atau % tergantung category',
  },

  // Untuk category=percentage: % dari gaji pokok
  percentage_of_base: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Persentase dari gaji pokok jika category=percentage',
  },

  // Urutan tampil di slip gaji
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
  },

  // Apakah kena pajak
  is_taxable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  // Apakah sistem (tidak bisa dihapus)
  is_system: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'true = komponen bawaan sistem, tidak bisa dihapus',
  },

  // Masuk ke jenis payroll apa
  applicable_to: {
    type: DataTypes.JSON,
    defaultValue: ['monthly'],
    comment: 'Array: monthly, incentive, thr, bonus',
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

}, {
  tableName: 'payroll_components',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = PayrollComponent;
