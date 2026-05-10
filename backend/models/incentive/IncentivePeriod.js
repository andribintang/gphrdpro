const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const IncentivePeriod = sequelize.define('IncentivePeriod', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:        { type: DataTypes.STRING(100), allowNull: false, comment: 'Contoh: Insentif Januari 2025' },
  month:       { type: DataTypes.INTEGER, allowNull: false, comment: '1-12' },
  year:        { type: DataTypes.INTEGER, allowNull: false },
  start_date:  { type: DataTypes.DATEONLY, allowNull: false },
  end_date:    { type: DataTypes.DATEONLY, allowNull: false },
  status: {
    type: DataTypes.ENUM('draft', 'calculated', 'approved', 'locked'),
    defaultValue: 'draft',
  },
  // Snapshot totals (filled after calculation)
  total_wa_sales:          { type: DataTypes.DECIMAL(18,2), defaultValue: 0 },
  total_marketplace_sales: { type: DataTypes.DECIMAL(18,2), defaultValue: 0 },
  total_web_sales:         { type: DataTypes.DECIMAL(18,2), defaultValue: 0 },
  total_all_sales:         { type: DataTypes.DECIMAL(18,2), defaultValue: 0 },
  total_incentive_paid:    { type: DataTypes.DECIMAL(18,2), defaultValue: 0 },
  bonus_target_id:         { type: DataTypes.INTEGER, allowNull: true, comment: 'Target tier yang tercapai' },
  bonus_per_employee:      { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  active_employee_count:   { type: DataTypes.INTEGER, defaultValue: 0 },

  // Approval
  approved_by:   { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
  approved_at:   { type: DataTypes.DATE, allowNull: true },
  approved_notes:{ type: DataTypes.TEXT, allowNull: true },

  calculated_at: { type: DataTypes.DATE, allowNull: true },
  created_by:    { type: DataTypes.INTEGER, allowNull: true },
  notes:         { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'inc_periods',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ fields: ['year', 'month'], unique: true }],
});

module.exports = IncentivePeriod;
