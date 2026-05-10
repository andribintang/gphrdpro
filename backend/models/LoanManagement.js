const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LoanManagement = sequelize.define('LoanManagement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },

  type: {
    type: DataTypes.ENUM('kasbon', 'hutang'),
    defaultValue: 'kasbon',
  },

  // Jumlah pinjaman
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  remaining_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },

  // Cicilan
  monthly_installment: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Jumlah cicilan per bulan',
  },
  installment_count:     { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Berapa kali sudah dicicil' },
  total_installments:    { type: DataTypes.INTEGER, allowNull: false, comment: 'Total cicilan yang harus dibayar' },

  // Tanggal
  loan_date:  { type: DataTypes.DATEONLY, allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false, comment: 'Mulai dipotong dari payroll bulan ini' },
  end_date:   { type: DataTypes.DATEONLY, allowNull: true,  comment: 'Estimasi lunas' },

  status: {
    type: DataTypes.ENUM('pending', 'active', 'completed', 'cancelled'),
    defaultValue: 'pending',
  },

  // Persetujuan
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  approved_at: { type: DataTypes.DATE,    allowNull: true },

  description: { type: DataTypes.TEXT, allowNull: true },

  // History cicilan
  installment_history: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '[{payroll_run_id, month, amount, paid_at}]',
  },

}, {
  tableName: 'loan_management',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = LoanManagement;
