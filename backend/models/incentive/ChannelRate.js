const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const ChannelRate = sequelize.define('ChannelRate', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  branch_id:  {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'inc_branches', key: 'id' },
  },
  channel_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'inc_sales_channels', key: 'id' },
  },
  percentage: {
    type: DataTypes.DECIMAL(6, 3), allowNull: false, defaultValue: 0,
    comment: 'Override % insentif untuk cabang ini. Jika 0 pakai rate global.',
  },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  notes:     { type: DataTypes.STRING(200), allowNull: true },
}, {
  tableName: 'inc_channel_rates',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ fields: ['branch_id', 'channel_id'], unique: true }],
});

module.exports = ChannelRate;
