const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

// ── STORE CONFIG ──────────────────────────────────────────────
// One row per brand: 'gpdistro' | 'gpracing'
const StoreConfig = sequelize.define('StoreConfig', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  brand:        { type: DataTypes.ENUM('gpdistro','gpracing'), allowNull: false, unique: true },
  name:         { type: DataTypes.STRING(100), allowNull: false },
  tagline:      { type: DataTypes.STRING(200) },
  logo_url:     { type: DataTypes.TEXT },
  favicon_url:  { type: DataTypes.TEXT },
  primary_color:{ type: DataTypes.STRING(20), defaultValue: '#e11d48' },
  domain:       { type: DataTypes.STRING(100) },
  whatsapp:     { type: DataTypes.STRING(20) },
  email:        { type: DataTypes.STRING(100) },
  address:      { type: DataTypes.TEXT },
  meta_title:   { type: DataTypes.STRING(200) },
  meta_desc:    { type: DataTypes.TEXT },
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'store_config', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── STORE CATEGORIES ──────────────────────────────────────────
const StoreCategory = sequelize.define('StoreCategory', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  brand:       { type: DataTypes.ENUM('gpdistro','gpracing'), allowNull: false },
  name:        { type: DataTypes.STRING(100), allowNull: false },
  slug:        { type: DataTypes.STRING(120), allowNull: false },
  description: { type: DataTypes.TEXT },
  image_url:   { type: DataTypes.TEXT },
  parent_id:   { type: DataTypes.INTEGER, allowNull: true },
  sort_order:  { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'store_categories', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── STORE PRODUCTS ────────────────────────────────────────────
const StoreProduct = sequelize.define('StoreProduct', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  brand:           { type: DataTypes.ENUM('gpdistro','gpracing'), allowNull: false },
  category_id:     { type: DataTypes.INTEGER, allowNull: true },
  erp_product_id:  { type: DataTypes.INTEGER, allowNull: true, comment: 'link to erp_products.id' },
  name:            { type: DataTypes.STRING(200), allowNull: false },
  slug:            { type: DataTypes.STRING(220), allowNull: false, unique: true },
  sku:             { type: DataTypes.STRING(50) },
  description:     { type: DataTypes.TEXT },
  short_desc:      { type: DataTypes.STRING(500) },
  price:           { type: DataTypes.DECIMAL(15,2), allowNull: false, defaultValue: 0 },
  price_compare:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: 'harga coret' },
  weight:          { type: DataTypes.INTEGER, defaultValue: 500, comment: 'gram, untuk ongkir' },
  stock:           { type: DataTypes.INTEGER, defaultValue: 0 },
  images:          { type: DataTypes.JSON, defaultValue: [] },
  variants:        { type: DataTypes.JSON, defaultValue: [], comment: 'ukuran/warna/tipe' },
  tags:            { type: DataTypes.JSON, defaultValue: [] },
  is_featured:     { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active:       { type: DataTypes.BOOLEAN, defaultValue: true },
  sold_count:      { type: DataTypes.INTEGER, defaultValue: 0 },
  view_count:      { type: DataTypes.INTEGER, defaultValue: 0 },
  meta_title:      { type: DataTypes.STRING(200) },
  meta_desc:       { type: DataTypes.TEXT },
}, { tableName: 'store_products', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── STORE BANNERS ─────────────────────────────────────────────
const StoreBanner = sequelize.define('StoreBanner', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  brand:       { type: DataTypes.ENUM('gpdistro','gpracing'), allowNull: false },
  title:       { type: DataTypes.STRING(150) },
  subtitle:    { type: DataTypes.STRING(250) },
  image_url:   { type: DataTypes.TEXT, allowNull: false },
  image_mobile_url: { type: DataTypes.TEXT },
  link_url:    { type: DataTypes.TEXT },
  sort_order:  { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'store_banners', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── STORE CUSTOMERS ───────────────────────────────────────────
const StoreCustomer = sequelize.define('StoreCustomer', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:         { type: DataTypes.STRING(100), allowNull: false },
  email:        { type: DataTypes.STRING(150), allowNull: false, unique: true },
  phone:        { type: DataTypes.STRING(20) },
  password:     { type: DataTypes.STRING(255), allowNull: false },
  avatar_url:   { type: DataTypes.TEXT },
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true },
  email_verified_at: { type: DataTypes.DATE, allowNull: true },
  last_login_at:     { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'store_customers', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── STORE ADDRESSES ───────────────────────────────────────────
const StoreAddress = sequelize.define('StoreAddress', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customer_id:  { type: DataTypes.INTEGER, allowNull: false },
  label:        { type: DataTypes.STRING(50), defaultValue: 'Rumah' },
  recipient:    { type: DataTypes.STRING(100), allowNull: false },
  phone:        { type: DataTypes.STRING(20), allowNull: false },
  province_id:  { type: DataTypes.INTEGER },
  province:     { type: DataTypes.STRING(100) },
  city_id:      { type: DataTypes.INTEGER },
  city:         { type: DataTypes.STRING(100) },
  district:     { type: DataTypes.STRING(100) },
  postal_code:  { type: DataTypes.STRING(10) },
  address:      { type: DataTypes.TEXT, allowNull: false },
  is_default:   { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'store_addresses', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── STORE CARTS ───────────────────────────────────────────────
const StoreCart = sequelize.define('StoreCart', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customer_id:  { type: DataTypes.INTEGER, allowNull: true, comment: 'null = guest' },
  session_id:   { type: DataTypes.STRING(100), allowNull: true, comment: 'for guest cart' },
  brand:        { type: DataTypes.ENUM('gpdistro','gpracing'), allowNull: false },
  product_id:   { type: DataTypes.INTEGER, allowNull: false },
  variant:      { type: DataTypes.JSON, defaultValue: {}, comment: '{size:"M", color:"red"}' },
  quantity:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  price:        { type: DataTypes.DECIMAL(15,2), allowNull: false },
}, { tableName: 'store_carts', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── STORE VOUCHERS ────────────────────────────────────────────
const StoreVoucher = sequelize.define('StoreVoucher', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  brand:          { type: DataTypes.ENUM('gpdistro','gpracing'), allowNull: false },
  code:           { type: DataTypes.STRING(50), allowNull: false, unique: true },
  type:           { type: DataTypes.ENUM('percent','fixed','free_ongkir'), allowNull: false },
  value:          { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  min_purchase:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  max_discount:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  quota:          { type: DataTypes.INTEGER, defaultValue: 0, comment: '0 = unlimited' },
  used_count:     { type: DataTypes.INTEGER, defaultValue: 0 },
  valid_from:     { type: DataTypes.DATE },
  valid_until:    { type: DataTypes.DATE },
  is_active:      { type: DataTypes.BOOLEAN, defaultValue: true },
  description:    { type: DataTypes.STRING(200) },
}, { tableName: 'store_vouchers', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── STORE ORDERS ──────────────────────────────────────────────
const StoreOrder = sequelize.define('StoreOrder', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  brand:           { type: DataTypes.ENUM('gpdistro','gpracing'), allowNull: false },
  order_number:    { type: DataTypes.STRING(30), allowNull: false, unique: true },
  customer_id:     { type: DataTypes.INTEGER, allowNull: true },
  customer_name:   { type: DataTypes.STRING(100), allowNull: false },
  customer_email:  { type: DataTypes.STRING(150), allowNull: false },
  customer_phone:  { type: DataTypes.STRING(20), allowNull: false },
  // Shipping
  shipping_address:{ type: DataTypes.TEXT, allowNull: false },
  shipping_city:   { type: DataTypes.STRING(100) },
  shipping_province:{ type: DataTypes.STRING(100) },
  shipping_postal: { type: DataTypes.STRING(10) },
  shipping_courier:{ type: DataTypes.STRING(50) },
  shipping_service:{ type: DataTypes.STRING(50) },
  shipping_cost:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  shipping_etd:    { type: DataTypes.STRING(50) },
  tracking_number: { type: DataTypes.STRING(100) },
  // Pricing
  subtotal:        { type: DataTypes.DECIMAL(15,2), allowNull: false },
  discount:        { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  voucher_code:    { type: DataTypes.STRING(50) },
  total:           { type: DataTypes.DECIMAL(15,2), allowNull: false },
  // Status
  status:          { type: DataTypes.ENUM('pending','paid','processing','shipped','delivered','cancelled','refunded'), defaultValue: 'pending' },
  payment_status:  { type: DataTypes.ENUM('unpaid','paid','partial','refunded'), defaultValue: 'unpaid' },
  payment_method:  { type: DataTypes.STRING(50) },
  midtrans_order_id:   { type: DataTypes.STRING(100) },
  midtrans_token:      { type: DataTypes.TEXT },
  midtrans_redirect:   { type: DataTypes.TEXT },
  paid_at:         { type: DataTypes.DATE },
  notes:           { type: DataTypes.TEXT },
  erp_order_id:    { type: DataTypes.INTEGER, allowNull: true, comment: 'synced to erp_orders' },
}, { tableName: 'store_orders', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── STORE ORDER ITEMS ─────────────────────────────────────────
const StoreOrderItem = sequelize.define('StoreOrderItem', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id:     { type: DataTypes.INTEGER, allowNull: false },
  product_id:   { type: DataTypes.INTEGER, allowNull: false },
  product_name: { type: DataTypes.STRING(200), allowNull: false },
  product_image:{ type: DataTypes.TEXT },
  sku:          { type: DataTypes.STRING(50) },
  variant:      { type: DataTypes.JSON, defaultValue: {} },
  price:        { type: DataTypes.DECIMAL(15,2), allowNull: false },
  quantity:     { type: DataTypes.INTEGER, allowNull: false },
  subtotal:     { type: DataTypes.DECIMAL(15,2), allowNull: false },
}, { tableName: 'store_order_items', timestamps: false });

// ── STORE PAYMENTS ────────────────────────────────────────────
const StorePayment = sequelize.define('StorePayment', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id:        { type: DataTypes.INTEGER, allowNull: false },
  midtrans_order_id: { type: DataTypes.STRING(100) },
  transaction_id:  { type: DataTypes.STRING(100) },
  payment_type:    { type: DataTypes.STRING(50) },
  amount:          { type: DataTypes.DECIMAL(15,2), allowNull: false },
  status:          { type: DataTypes.STRING(30) },
  raw_response:    { type: DataTypes.JSON },
  paid_at:         { type: DataTypes.DATE },
}, { tableName: 'store_payments', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── STORE REVIEWS ─────────────────────────────────────────────
const StoreReview = sequelize.define('StoreReview', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id:   { type: DataTypes.INTEGER, allowNull: false },
  order_id:     { type: DataTypes.INTEGER, allowNull: false },
  customer_id:  { type: DataTypes.INTEGER, allowNull: false },
  customer_name:{ type: DataTypes.STRING(100) },
  rating:       { type: DataTypes.TINYINT, allowNull: false },
  comment:      { type: DataTypes.TEXT },
  images:       { type: DataTypes.JSON, defaultValue: [] },
  is_approved:  { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'store_reviews', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── ASSOCIATIONS ──────────────────────────────────────────────
StoreCategory.hasMany(StoreCategory,  { foreignKey: 'parent_id', as: 'children' });
StoreCategory.belongsTo(StoreCategory,{ foreignKey: 'parent_id', as: 'parent' });
StoreCategory.hasMany(StoreProduct,   { foreignKey: 'category_id', as: 'products' });
StoreProduct.belongsTo(StoreCategory, { foreignKey: 'category_id', as: 'category' });
StoreCustomer.hasMany(StoreAddress,   { foreignKey: 'customer_id', as: 'addresses' });
StoreAddress.belongsTo(StoreCustomer, { foreignKey: 'customer_id', as: 'customer' });
StoreCustomer.hasMany(StoreOrder,     { foreignKey: 'customer_id', as: 'orders' });
StoreOrder.belongsTo(StoreCustomer,   { foreignKey: 'customer_id', as: 'customer' });
StoreOrder.hasMany(StoreOrderItem,    { foreignKey: 'order_id', as: 'items' });
StoreOrderItem.belongsTo(StoreOrder,  { foreignKey: 'order_id', as: 'order' });
StoreOrderItem.belongsTo(StoreProduct,{ foreignKey: 'product_id', as: 'product' });
StoreOrder.hasMany(StorePayment,      { foreignKey: 'order_id', as: 'payments' });
StoreProduct.hasMany(StoreReview,     { foreignKey: 'product_id', as: 'reviews' });
StoreCart.belongsTo(StoreProduct,     { foreignKey: 'product_id', as: 'product' });

module.exports = {
  StoreConfig, StoreCategory, StoreProduct, StoreBanner,
  StoreCustomer, StoreAddress, StoreCart, StoreVoucher,
  StoreOrder, StoreOrderItem, StorePayment, StoreReview,
};
