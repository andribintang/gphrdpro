const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  nip: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Nomor Induk Pegawai',
  },
  position: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  salary_base: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
  join_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'terminated', 'on_leave'),
    defaultValue: 'active',
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  emergency_contact: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  emergency_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
}, {
  tableName: 'employees',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Employee;
