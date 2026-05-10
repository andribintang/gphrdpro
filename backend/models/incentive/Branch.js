const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Branch = sequelize.define('Branch', {
  id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code:    { type: DataTypes.STRING(20),  allowNull: false, unique: true },
  name:    { type: DataTypes.STRING(100), allowNull: false },
  business_type: { type: DataTypes.STRING(100), allowNull: true, comment: 'e.g. Online Store Spare Part Racing' },
  address: { type: DataTypes.TEXT,        allowNull: true },
  phone:   { type: DataTypes.STRING(20),  allowNull: true },
  email:   { type: DataTypes.STRING(150), allowNull: true },
  logo_url:{ type: DataTypes.STRING(500), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order:{ type: DataTypes.INTEGER,  defaultValue: 0 },
}, {
  tableName: 'inc_branches',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
});

module.exports = Branch;
