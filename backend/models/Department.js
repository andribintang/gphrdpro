const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Department = sequelize.define('Department', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:        { type: DataTypes.STRING(100), allowNull: false, unique: true },
  code:        { type: DataTypes.STRING(20),  allowNull: true },
  description: { type: DataTypes.TEXT,        allowNull: true },
  head_name:   { type: DataTypes.STRING(100), allowNull: true },
  is_active:   { type: DataTypes.BOOLEAN,     defaultValue: true },
  sort_order:  { type: DataTypes.INTEGER,     defaultValue: 0 },
}, {
  tableName: 'departments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Department;
