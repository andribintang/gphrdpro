const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Purchase = sequelize.define('ErpPurchase', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  po_no:         { type: DataTypes.STRING(50), allowNull: false, unique: true },
  branch_id:     { type: DataTypes.INTEGER, allowNull: false },
  supplier_name: { type: DataTypes.STRING(200), allowNull: true },
  supplier_phone:   { type: DataTypes.STRING(20),  allowNull: true },
  status:        { type: DataTypes.ENUM('draft','ordered','partial','received','cancelled'), defaultValue: 'draft' },
  order_date:    { type: DataTypes.DATEONLY, allowNull: false },
  expected_date: { type: DataTypes.DATEONLY, allowNull: true },
  received_date: { type: DataTypes.DATEONLY, allowNull: true },
  subtotal:      { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  shipping_cost: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  total_amount:  { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  notes:         { type: DataTypes.TEXT, allowNull: true },
  created_by:    { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'erp_purchases', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const PurchaseItem = sequelize.define('ErpPurchaseItem', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  purchase_id:  { type: DataTypes.INTEGER, allowNull: false },
  product_id:   { type: DataTypes.INTEGER, allowNull: false },
  product_name: { type: DataTypes.STRING(200), allowNull: false },
  qty_ordered:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  qty_received: { type: DataTypes.INTEGER, defaultValue: 0 },
  buy_price:    { type: DataTypes.DECIMAL(15,2), allowNull: false },
  subtotal:     { type: DataTypes.DECIMAL(15,2), allowNull: false },
}, { tableName: 'erp_purchase_items', timestamps: false });

const Expense = sequelize.define('ErpExpense', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  branch_id:      { type: DataTypes.INTEGER, allowNull: true },
  category:       { type: DataTypes.ENUM('operasional','gaji','sewa','listrik','air','internet','transport','pembelian','marketing','lainnya'), defaultValue: 'operasional' },
  description:    { type: DataTypes.STRING(300), allowNull: false },
  amount:         { type: DataTypes.DECIMAL(15,2), allowNull: false },
  expense_date:   { type: DataTypes.DATEONLY, allowNull: false },
  payment_method: { type: DataTypes.ENUM('cash','transfer','qris'), defaultValue: 'cash' },
  notes:          { type: DataTypes.TEXT, allowNull: true },
  created_by:     { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'erp_expenses', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = { Purchase, PurchaseItem, Expense };
