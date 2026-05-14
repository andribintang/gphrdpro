const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const BonusExclusion = sequelize.define('BonusExclusion', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'inc_employees', key: 'id' },
    comment: 'Karyawan yang dikecualikan dari bonus target',
  },
  reason: {
    type: DataTypes.STRING(200), allowNull: true,
    comment: 'Alasan pengecualian, misal: Masa Training, Kontrak Jangka Pendek',
  },
  // Bisa diset untuk periode tertentu atau permanent
  start_date: {
    type: DataTypes.DATEONLY, allowNull: true,
    comment: 'Mulai berlaku pengecualian. null = dari awal',
  },
  end_date: {
    type: DataTypes.DATEONLY, allowNull: true,
    comment: 'Akhir pengecualian. null = permanent sampai dihapus',
  },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by:  { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'inc_bonus_exclusions',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ fields: ['employee_id'] }],
});

module.exports = BonusExclusion;
