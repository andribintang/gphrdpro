const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Position = sequelize.define('Position', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_branches', key: 'id' } },
  name:      { type: DataTypes.STRING(100), allowNull: false },
  level:     { type: DataTypes.INTEGER, defaultValue: 1, comment: '1=staff, 2=senior, 3=lead, 4=manager' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'inc_positions',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
});

module.exports = Position;
