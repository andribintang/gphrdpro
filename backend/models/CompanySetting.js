const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompanySetting = sequelize.define('CompanySetting', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  // Identity
  company_name: { type: DataTypes.STRING(100), defaultValue: 'GPDISTRO HR Pro' },
  company_tagline: { type: DataTypes.STRING(200), defaultValue: 'Human Resource Management System' },
  company_address: { type: DataTypes.TEXT,       allowNull: true },
  company_phone:   { type: DataTypes.STRING(20), allowNull: true },
  company_email:   { type: DataTypes.STRING(150),allowNull: true },
  company_website: { type: DataTypes.STRING(200),allowNull: true },

  // Branding
  logo_url:     {
    type: DataTypes.TEXT, // TEXT to support base64 fallback
    defaultValue: '/logo-gpdistro.png',
    comment: 'URL logo — bisa Cloudinary URL atau path lokal',
  },
  primary_color: {
    type: DataTypes.STRING(20),
    defaultValue: '#e11d48',
    comment: 'Hex warna utama brand',
  },
  favicon_url: { type: DataTypes.STRING(500), allowNull: true },

  // App config
  app_name: { type: DataTypes.STRING(100), defaultValue: 'GPDISTRO HR Pro' },
  timezone: { type: DataTypes.STRING(50),  defaultValue: 'Asia/Jakarta' },

}, {
  tableName: 'company_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = CompanySetting;
