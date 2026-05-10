const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const SalesChannel = sequelize.define('SalesChannel', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code:       { type: DataTypes.STRING(20), allowNull: false, unique: true }, // WA, MARKETPLACE, WEB
  name:       { type: DataTypes.STRING(100), allowNull: false },
  percentage: {
    type: DataTypes.DECIMAL(6, 3), allowNull: false, defaultValue: 0,
    comment: 'Persentase insentif dari nominal penjualan. Contoh: 3.000 = 3%',
  },
  input_type: {
    type: DataTypes.ENUM('per_transaction', 'per_period'),
    defaultValue: 'per_transaction',
    comment: 'per_transaction=WA, per_period=Marketplace/Web',
  },
  description: { type: DataTypes.TEXT, allowNull: true },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order:  { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'inc_sales_channels',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
});

module.exports = SalesChannel;
