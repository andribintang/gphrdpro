const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const ActivityType = sequelize.define('ActivityType', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:      { type: DataTypes.STRING(100), allowNull: false },
  calc_type: {
    type: DataTypes.ENUM('per_hour', 'per_qty'),
    allowNull: false,
    defaultValue: 'per_qty',
    comment: 'per_hour=Live Stream, per_qty=Konten',
  },
  nominal:   {
    type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0,
    comment: 'Nominal per jam atau per qty',
  },
  unit_label:{ type: DataTypes.STRING(30), defaultValue: 'qty', comment: 'jam, konten, video, dll' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order:{ type: DataTypes.INTEGER, defaultValue: 0 },
  notes:     { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'inc_activity_types',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
});

module.exports = ActivityType;
