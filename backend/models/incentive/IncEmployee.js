const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const IncEmployee = sequelize.define('IncEmployee', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:     {
    type: DataTypes.INTEGER, allowNull: true,
    references: { model: 'users', key: 'id' },
    comment: 'Link ke akun HRD Lite (opsional)',
  },
  branch_id:   { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inc_branches',  key: 'id' } },
  position_id: { type: DataTypes.INTEGER, allowNull: true,  references: { model: 'inc_positions', key: 'id' } },

  employee_code: { type: DataTypes.STRING(30),  allowNull: true,  unique: true },
  name:          { type: DataTypes.STRING(100), allowNull: false },
  email:         { type: DataTypes.STRING(150), allowNull: true },
  phone:         { type: DataTypes.STRING(20),  allowNull: true },
  photo_url:     { type: DataTypes.STRING(500), allowNull: true },
  join_date:     { type: DataTypes.DATEONLY,    allowNull: false },
  employment_status: {
    type: DataTypes.ENUM('magang', 'training', 'kontrak', 'tetap'),
    defaultValue: 'kontrak',
    comment: 'Status kepegawaian: magang, training, kontrak, tetap',
  },
  is_active:     { type: DataTypes.BOOLEAN, defaultValue: true },
  eligible_for_bonus: {
    type: DataTypes.BOOLEAN, defaultValue: true,
    comment: 'Apakah karyawan ini berhak mendapat bonus target (terlepas dari status kepegawaian)',
  },
  notes:         { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'inc_employees',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ fields: ['branch_id'] }, { fields: ['is_active'] }],
});

module.exports = IncEmployee;
