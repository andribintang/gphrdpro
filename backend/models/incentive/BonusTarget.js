const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const BonusTarget = sequelize.define('BonusTarget', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:        { type: DataTypes.STRING(100), allowNull: false, comment: 'Contoh: Target 300jt' },
  min_amount:  {
    type: DataTypes.DECIMAL(18, 2), allowNull: false,
    comment: 'Minimum total penjualan (semua channel) untuk mendapat bonus ini',
  },
  bonus_amount:{
    type: DataTypes.DECIMAL(15, 2), allowNull: false,
    comment: 'Total bonus yang dibagi rata ke semua karyawan aktif',
  },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order:  { type: DataTypes.INTEGER, defaultValue: 0 },
  notes:       { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'inc_bonus_targets',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
});

module.exports = BonusTarget;
