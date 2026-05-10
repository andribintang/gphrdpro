const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

// ── WA Sales — input per transaksi ────────────────────────────
const WaSale = sequelize.define('WaSale', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  period_id:     { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_periods', key: 'id' } },
  employee_id:   { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_employees', key: 'id' } },
  branch_id:     { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_branches', key: 'id' } },
  date:          { type: DataTypes.DATEONLY, allowNull: false },
  customer_name: { type: DataTypes.STRING(100), allowNull: true },
  sale_amount:   { type: DataTypes.DECIMAL(15,2), allowNull: false },
  channel_pct:   { type: DataTypes.DECIMAL(6,3),  allowNull: false, comment: 'Snapshot % WA saat input' },
  incentive_amount:{ type: DataTypes.DECIMAL(15,2), allowNull: false, defaultValue: 0 },
  notes:         { type: DataTypes.TEXT, allowNull: true },
  created_by:    { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'inc_wa_sales',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ fields: ['period_id', 'employee_id'] }, { fields: ['period_id', 'branch_id'] }],
});

// ── Marketplace Sales — input total per periode per cabang ─────
const MarketplaceSale = sequelize.define('MarketplaceSale', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  period_id:       { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_periods', key: 'id' } },
  branch_id:       { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_branches', key: 'id' } },
  total_amount:    { type: DataTypes.DECIMAL(18,2), allowNull: false },
  channel_pct:     { type: DataTypes.DECIMAL(6,3),  allowNull: false, comment: 'Snapshot % Marketplace' },
  notes:           { type: DataTypes.TEXT, allowNull: true },
  created_by:      { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'inc_marketplace_sales',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ fields: ['period_id', 'branch_id'], unique: true }],
});

// Pembagian marketplace ke karyawan (total harus = 100%)
const MarketplaceShare = sequelize.define('MarketplaceShare', {
  id:                 { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  marketplace_sale_id:{ type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_marketplace_sales', key: 'id' } },
  employee_id:        { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_employees', key: 'id' } },
  share_percentage:   { type: DataTypes.DECIMAL(6,3), allowNull: false, comment: 'Contoh: 50.000 = 50%' },
  performance_amount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: 'total_amount × share_pct/100' },
  incentive_amount:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: 'performance × channel_pct/100' },
}, {
  tableName: 'inc_marketplace_shares',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ fields: ['marketplace_sale_id', 'employee_id'], unique: true }],
});

// ── Web Sales ─────────────────────────────────────────────────
const WebSale = sequelize.define('WebSale', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  period_id:    { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_periods', key: 'id' } },
  branch_id:    { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_branches', key: 'id' } },
  total_amount: { type: DataTypes.DECIMAL(18,2), allowNull: false },
  channel_pct:  { type: DataTypes.DECIMAL(6,3),  allowNull: false },
  notes:        { type: DataTypes.TEXT, allowNull: true },
  created_by:   { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'inc_web_sales',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ fields: ['period_id', 'branch_id'], unique: true }],
});

const WebShare = sequelize.define('WebShare', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  web_sale_id:     { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_web_sales', key: 'id' } },
  employee_id:     { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_employees', key: 'id' } },
  share_percentage:{ type: DataTypes.DECIMAL(6,3), allowNull: false },
  performance_amount:{ type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  incentive_amount:{ type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
}, {
  tableName: 'inc_web_shares',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ fields: ['web_sale_id', 'employee_id'], unique: true }],
});

// ── Employee Activities ───────────────────────────────────────
const EmployeeActivity = sequelize.define('EmployeeActivity', {
  id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  period_id:        { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_periods', key: 'id' } },
  employee_id:      { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_employees', key: 'id' } },
  branch_id:        { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_branches', key: 'id' } },
  activity_type_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_activity_types', key: 'id' } },
  date:             { type: DataTypes.DATEONLY, allowNull: false },
  qty:              { type: DataTypes.DECIMAL(8,2), allowNull: false, comment: 'Jam atau jumlah konten' },
  nominal_snapshot: { type: DataTypes.DECIMAL(15,2), allowNull: false, comment: 'Snapshot nominal saat input' },
  incentive_amount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: 'qty × nominal' },
  notes:            { type: DataTypes.TEXT, allowNull: true },
  created_by:       { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'inc_employee_activities',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ fields: ['period_id', 'employee_id'] }],
});

// ── Incentive Result — final calculation per karyawan ─────────
const IncentiveResult = sequelize.define('IncentiveResult', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  period_id:   { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_periods', key: 'id' } },
  employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_employees', key: 'id' } },
  branch_id:   { type: DataTypes.INTEGER, allowNull: false },

  // Performance amounts
  wa_sales_amount:          { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  marketplace_performance:  { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  web_performance:          { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },

  // Incentive breakdown
  wa_incentive:             { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  marketplace_incentive:    { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  web_incentive:            { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  activity_incentive:       { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  bonus_target:             { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  total_incentive:          { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },

  // Snapshot data for slip
  employee_name:      { type: DataTypes.STRING(100), allowNull: true },
  branch_name:        { type: DataTypes.STRING(100), allowNull: true },
  position_name:      { type: DataTypes.STRING(100), allowNull: true },
  details_json:       { type: DataTypes.JSON, defaultValue: {}, comment: 'Full breakdown for slip' },

  status: { type: DataTypes.ENUM('draft','approved','locked'), defaultValue: 'draft' },
}, {
  tableName: 'inc_results',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [
    { fields: ['period_id', 'employee_id'], unique: true },
    { fields: ['period_id'] },
  ],
});

// ── Audit Log ─────────────────────────────────────────────────
const AuditLog = sequelize.define('AuditLog', {
  id:          { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  user_id:     { type: DataTypes.INTEGER, allowNull: true },
  user_name:   { type: DataTypes.STRING(100), allowNull: true },
  action:      { type: DataTypes.STRING(50),  allowNull: false },  // CREATE/UPDATE/DELETE/APPROVE
  module:      { type: DataTypes.STRING(50),  allowNull: false },
  record_id:   { type: DataTypes.INTEGER,     allowNull: true },
  description: { type: DataTypes.TEXT,        allowNull: true },
  old_value:   { type: DataTypes.JSON,        allowNull: true },
  new_value:   { type: DataTypes.JSON,        allowNull: true },
  ip_address:  { type: DataTypes.STRING(45),  allowNull: true },
}, {
  tableName: 'inc_audit_logs',
  timestamps: true, createdAt: 'created_at', updatedAt: false,
});

module.exports = {
  WaSale, MarketplaceSale, MarketplaceShare,
  WebSale, WebShare, EmployeeActivity,
  IncentiveResult, AuditLog,
};
