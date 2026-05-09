const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmployeeFace = sequelize.define('EmployeeFace', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' },
  },
  // face-api.js returns 128-float descriptor array stored as JSON
  face_descriptor: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    comment: 'JSON array of 128 floats from face-api.js',
    get() {
      const raw = this.getDataValue('face_descriptor');
      try { return JSON.parse(raw); } catch { return null; }
    },
    set(val) {
      this.setDataValue('face_descriptor', JSON.stringify(val));
    },
  },
  face_photo_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Cloudinary URL foto referensi wajah',
  },
  registered_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'user_id yang melakukan registrasi (HR/Admin)',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'employee_faces',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = EmployeeFace;
