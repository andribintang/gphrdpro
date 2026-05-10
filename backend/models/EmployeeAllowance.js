const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Nilai komponen per karyawan (override dari default)
const EmployeeAllowance = sequelize.define('EmployeeAllowance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  component_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'payroll_components', key: 'id' },
  },

  // Override amount untuk karyawan ini
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },

  effective_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'null = berlaku selamanya',
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  notes: { type: DataTypes.TEXT, allowNull: true },

}, {
  tableName: 'employee_allowances',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['user_id', 'component_id'] },
  ],
});

module.exports = EmployeeAllowance;
