const { DataTypes } = require('sequelize');
const { sequelize }  = require('../../config/database');
const { Purchase, PurchaseItem, Expense } = require('./Purchase');

// ── SUB CHANNEL ──────────────────────────────────────────────
const SubChannel = sequelize.define('ErpSubChannel', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  channel:     { type: DataTypes.ENUM('wa','marketplace','direct'), allowNull: false },
  name:        { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.STRING(200), allowNull: true },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order:  { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'erp_sub_channels', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── CATEGORY ─────────────────────────────────────────────────
const Category = sequelize.define('ErpCategory', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  branch_id:   { type: DataTypes.INTEGER, allowNull: true, comment: 'null = semua cabang' },
  name:        { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  sort_order:  { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'erp_categories', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── PRODUCT ───────────────────────────────────────────────────
const Product = sequelize.define('ErpProduct', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  branch_id:    { type: DataTypes.INTEGER, allowNull: false, comment: 'Cabang pemilik produk' },
  category_id:  { type: DataTypes.INTEGER, allowNull: true },
  sku:          { type: DataTypes.STRING(100), allowNull: true, unique: true },
  barcode:      { type: DataTypes.STRING(100), allowNull: true, unique: true },
  name:         { type: DataTypes.STRING(200), allowNull: false },
  description:  { type: DataTypes.TEXT, allowNull: true },
  unit:         { type: DataTypes.STRING(20), defaultValue: 'pcs', comment: 'pcs, kg, meter, dll' },
  // Harga
  buy_price:    { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: 'Harga beli/HPP' },
  sell_price:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: 'Harga jual normal' },
  sell_price_mp:{ type: DataTypes.DECIMAL(15,2), allowNull: true, comment: 'Harga khusus marketplace' },
  sell_price_wa:{ type: DataTypes.DECIMAL(15,2), allowNull: true, comment: 'Harga khusus WA' },
  // Stok
  stock_min:    { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Minimum stok alert' },
  weight:       { type: DataTypes.DECIMAL(8,2), defaultValue: 0, comment: 'Berat gram untuk ongkir' },
  // Status
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true },
  image_url:    { type: DataTypes.TEXT, allowNull: true },
  notes:        { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'erp_products', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── STOCK ─────────────────────────────────────────────────────
const Stock = sequelize.define('ErpStock', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id:  { type: DataTypes.INTEGER, allowNull: false },
  branch_id:   { type: DataTypes.INTEGER, allowNull: false },
  qty:         { type: DataTypes.INTEGER, defaultValue: 0 },
  qty_reserved:{ type: DataTypes.INTEGER, defaultValue: 0, comment: 'Stok yang sudah di-order tapi belum kirim' },
}, {
  tableName: 'erp_stock',
  timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  indexes: [{ fields: ['product_id', 'branch_id'], unique: true }],
});

// ── STOCK MOVEMENT ────────────────────────────────────────────
const StockMovement = sequelize.define('ErpStockMovement', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id:  { type: DataTypes.INTEGER, allowNull: false },
  branch_id:   { type: DataTypes.INTEGER, allowNull: false },
  type:        {
    type: DataTypes.ENUM('in','out','adjustment','transfer','return'),
    allowNull: false,
  },
  qty:         { type: DataTypes.INTEGER, allowNull: false, comment: 'Positif = masuk, negatif = keluar' },
  qty_before:  { type: DataTypes.INTEGER, allowNull: false },
  qty_after:   { type: DataTypes.INTEGER, allowNull: false },
  ref_type:    { type: DataTypes.STRING(50), allowNull: true, comment: 'order/purchase/adjustment' },
  ref_id:      { type: DataTypes.INTEGER,   allowNull: true },
  notes:       { type: DataTypes.TEXT,      allowNull: true },
  created_by:  { type: DataTypes.INTEGER,   allowNull: true },
}, { tableName: 'erp_stock_movements', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── CUSTOMER ──────────────────────────────────────────────────
const Customer = sequelize.define('ErpCustomer', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  branch_id:    { type: DataTypes.INTEGER, allowNull: true, comment: 'null = semua cabang' },
  code:         { type: DataTypes.STRING(50),  allowNull: true, unique: true },
  name:         { type: DataTypes.STRING(200), allowNull: false },
  phone:        { type: DataTypes.STRING(20),  allowNull: true },
  email:        { type: DataTypes.STRING(150), allowNull: true },
  address:      { type: DataTypes.TEXT,        allowNull: true },
  city:         { type: DataTypes.STRING(100), allowNull: true },
  province:     { type: DataTypes.STRING(100), allowNull: true },
  postal_code:  { type: DataTypes.STRING(10),  allowNull: true },
  // Stats (denormalized untuk performa)
  total_orders: { type: DataTypes.INTEGER,     defaultValue: 0 },
  total_spent:  { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  last_order_at:{ type: DataTypes.DATE,        allowNull: true },
  notes:        { type: DataTypes.TEXT,        allowNull: true },
  is_active:    { type: DataTypes.BOOLEAN,     defaultValue: true },
}, { tableName: 'erp_customers', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── ORDER (Header) ────────────────────────────────────────────
const Order = sequelize.define('ErpOrder', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_no:        { type: DataTypes.STRING(50), allowNull: false, unique: true },
  branch_id:       { type: DataTypes.INTEGER, allowNull: false },
  customer_id:     { type: DataTypes.INTEGER, allowNull: true },
  // Salesperson (linked to inc_employees)
  salesperson_id:  { type: DataTypes.INTEGER, allowNull: true, comment: 'inc_employees.id' },
  salesperson_user_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'users.id' },
  // Channel
  channel:         {
    type: DataTypes.ENUM('wa','marketplace','direct'),
    defaultValue: 'direct',
  },
  sub_channel_id:  { type: DataTypes.INTEGER, allowNull: true, comment: 'FK ke erp_sub_channels' },
  sub_channel_name:{ type: DataTypes.STRING(100), allowNull: true, comment: 'Snapshot nama sub channel' },
  marketplace_name:{ type: DataTypes.STRING(50), allowNull: true, comment: 'shopee, tiktok, tokopedia' },
  marketplace_order_id: { type: DataTypes.STRING(100), allowNull: true },
  // Customer info (snapshot saat order)
  customer_name:   { type: DataTypes.STRING(200), allowNull: true },
  customer_phone:  { type: DataTypes.STRING(20),  allowNull: true },
  customer_address:{ type: DataTypes.TEXT,         allowNull: true },
  customer_city:   { type: DataTypes.STRING(100),  allowNull: true },
  // Amounts
  subtotal:        { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  shipping_cost:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  total_amount:    { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  // Status
  status:          {
    type: DataTypes.ENUM('draft','confirmed','processing','shipped','completed','cancelled','returned'),
    defaultValue: 'draft',
  },
  // Dates
  order_date:      { type: DataTypes.DATEONLY, allowNull: false },
  confirmed_at:    { type: DataTypes.DATE, allowNull: true },
  completed_at:    { type: DataTypes.DATE, allowNull: true },
  // Flags
  is_synced_incentive: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Sudah di-sync ke sistem insentif?' },
  synced_at:       { type: DataTypes.DATE, allowNull: true },
  admin_fee:       { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: 'Biaya admin marketplace' },
  notes:           { type: DataTypes.TEXT, allowNull: true },
  created_by:      { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'erp_orders', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── ORDER ITEM (Detail) ───────────────────────────────────────
const OrderItem = sequelize.define('ErpOrderItem', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id:      { type: DataTypes.INTEGER, allowNull: false },
  product_id:    { type: DataTypes.INTEGER, allowNull: false },
  product_name:  { type: DataTypes.STRING(200), allowNull: false, comment: 'Snapshot nama saat order' },
  product_sku:   { type: DataTypes.STRING(100), allowNull: true },
  qty:           { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  buy_price:     { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: 'HPP saat transaksi' },
  sell_price:    { type: DataTypes.DECIMAL(15,2), allowNull: false },
  discount_pct:  { type: DataTypes.DECIMAL(5,2),  defaultValue: 0 },
  subtotal:      { type: DataTypes.DECIMAL(15,2), allowNull: false },
  profit:        { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: 'subtotal - (buy_price * qty)' },
}, { tableName: 'erp_order_items', timestamps: false });

// ── PAYMENT ───────────────────────────────────────────────────
const Payment = sequelize.define('ErpPayment', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id:     { type: DataTypes.INTEGER, allowNull: false },
  method:       {
    type: DataTypes.ENUM('cash','transfer','qris','cod'),
    allowNull: false,
  },
  bank_name:    { type: DataTypes.STRING(50), allowNull: true, comment: 'BCA, BRI, Mandiri, dll' },
  amount:       { type: DataTypes.DECIMAL(15,2), allowNull: false },
  paid_at:      { type: DataTypes.DATE, allowNull: true },
  ref_no:       { type: DataTypes.STRING(100), allowNull: true, comment: 'No. rekening / ref transfer' },
  status:       {
    type: DataTypes.ENUM('pending','verified','failed'),
    defaultValue: 'pending',
  },
  verified_by:  { type: DataTypes.INTEGER, allowNull: true },
  notes:        { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'erp_payments', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── SHIPMENT ──────────────────────────────────────────────────
const Shipment = sequelize.define('ErpShipment', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id:     { type: DataTypes.INTEGER, allowNull: false },
  courier:      { type: DataTypes.STRING(50), allowNull: true, comment: 'JNE, JNT, Sicepat, Anteraja, dll' },
  service:      { type: DataTypes.STRING(50), allowNull: true, comment: 'REG, YES, OKE, dll' },
  tracking_no:  { type: DataTypes.STRING(100), allowNull: true, comment: 'Nomor resi' },
  weight:       { type: DataTypes.DECIMAL(8,2), allowNull: true, comment: 'Berat kg' },
  shipping_cost:{ type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  shipped_at:   { type: DataTypes.DATE, allowNull: true },
  delivered_at: { type: DataTypes.DATE, allowNull: true },
  status:       {
    type: DataTypes.ENUM('pending','packed','shipped','delivered','returned'),
    defaultValue: 'pending',
  },
  notes:        { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'erp_shipments', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── IMPORT LOG ────────────────────────────────────────────────
const ImportLog = sequelize.define('ErpImportLog', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  type:         { type: DataTypes.ENUM('products','customers','stock'), allowNull: false },
  filename:     { type: DataTypes.STRING(200), allowNull: true },
  total_rows:   { type: DataTypes.INTEGER, defaultValue: 0 },
  success_rows: { type: DataTypes.INTEGER, defaultValue: 0 },
  error_rows:   { type: DataTypes.INTEGER, defaultValue: 0 },
  errors_json:  { type: DataTypes.JSON, allowNull: true },
  status:       { type: DataTypes.ENUM('processing','done','failed'), defaultValue: 'processing' },
  imported_by:  { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'erp_import_logs', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// ── SubChannel associations ───────────────────────────────────
Order.belongsTo(SubChannel, { foreignKey: 'sub_channel_id', as: 'subChannel' });
SubChannel.hasMany(Order,   { foreignKey: 'sub_channel_id', as: 'orders' });

// ── RETURN ───────────────────────────────────────────────────
const Return = sequelize.define('ErpReturn', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  return_no:      { type: DataTypes.STRING(50), allowNull: false, unique: true },
  order_id:       { type: DataTypes.INTEGER, allowNull: false },
  branch_id:      { type: DataTypes.INTEGER, allowNull: false },
  status:         { type: DataTypes.ENUM('pending','confirmed','rejected'), defaultValue: 'pending' },
  reason:         { type: DataTypes.ENUM('barang_rusak','salah_produk','tidak_sesuai','cod_ditolak','lainnya'), defaultValue: 'lainnya' },
  resolution:     { type: DataTypes.ENUM('refund','exchange','none'), defaultValue: 'refund' },
  restock:        { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Apakah stok dikembalikan' },
  total_return:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  notes:          { type: DataTypes.TEXT, allowNull: true },
  confirmed_at:   { type: DataTypes.DATE, allowNull: true },
  created_by:     { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'erp_returns', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const ReturnItem = sequelize.define('ErpReturnItem', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  return_id:    { type: DataTypes.INTEGER, allowNull: false },
  order_item_id:{ type: DataTypes.INTEGER, allowNull: false },
  product_id:   { type: DataTypes.INTEGER, allowNull: false },
  product_name: { type: DataTypes.STRING(200), allowNull: false },
  qty_return:   { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  sell_price:   { type: DataTypes.DECIMAL(15,2), allowNull: false },
  subtotal:     { type: DataTypes.DECIMAL(15,2), allowNull: false },
}, { tableName: 'erp_return_items', timestamps: false });

// ── Return associations ───────────────────────────────────────
Return.hasMany(ReturnItem,   { foreignKey: 'return_id',  as: 'items' });
ReturnItem.belongsTo(Return, { foreignKey: 'return_id',  as: 'return' });
Return.belongsTo(Order,      { foreignKey: 'order_id',   as: 'order' });
Order.hasMany(Return,        { foreignKey: 'order_id',   as: 'returns' });

// ── ASSOCIATIONS ──────────────────────────────────────────────
Category.hasMany(Product,    { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category,  { foreignKey: 'category_id', as: 'category' });

Product.hasOne(Stock,        { foreignKey: 'product_id', as: 'stock' });
Stock.belongsTo(Product,     { foreignKey: 'product_id', as: 'product' });

Product.hasMany(StockMovement, { foreignKey: 'product_id', as: 'movements' });
Product.hasMany(OrderItem,   { foreignKey: 'product_id', as: 'orderItems' });

Order.hasMany(OrderItem,     { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order,   { foreignKey: 'order_id', as: 'order' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Order.hasMany(Payment,       { foreignKey: 'order_id', as: 'payments' });
Payment.belongsTo(Order,     { foreignKey: 'order_id', as: 'order' });

Order.hasOne(Shipment,       { foreignKey: 'order_id', as: 'shipment' });
Shipment.belongsTo(Order,    { foreignKey: 'order_id', as: 'order' });

Order.belongsTo(Customer,    { foreignKey: 'customer_id', as: 'customer' });
Customer.hasMany(Order,      { foreignKey: 'customer_id', as: 'orders' });

module.exports = {
  SubChannel,
  Category, Product, Stock, StockMovement,
  Customer, Order, OrderItem, Payment, Shipment,
  ImportLog,
  Purchase, PurchaseItem, Expense,
  Return, ReturnItem,
};
