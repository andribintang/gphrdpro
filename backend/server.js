require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Routes
const authRoutes       = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes      = require('./routes/leaves');
const payrollRoutes    = require('./routes/payroll');
const employeeRoutes   = require('./routes/employees');
const departmentRoutes = require('./routes/departments');
const reportsRoutes      = require('./routes/reports');
const storeRoutes = require('./routes/store');   // di bagian require
const payrollEngineRoutes = require('./routes/payrollEngine');
const incentiveRoutes      = require('./routes/incentive');
const companyRoutes        = require('./routes/company');
const erpRoutes            = require('./routes/erp');

const app  = express();
// ── Railway requires PORT from env, bound to 0.0.0.0 ──
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// ── Security ──────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS — allow Railway frontend URL + localhost ─────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://frontend-gphrdpro.up.railway.app',
  'https://gphrdpro-production.up.railway.app',
  // Store frontends (Railway + custom domains)
  process.env.FRONTEND_GPDISTRO_URL,
  process.env.FRONTEND_GPRACING_URL,
  'https://gpdistro.com',
  'https://www.gpdistro.com',
  'https://gpracingstore.com',
  'https://www.gpracingstore.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4173',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return cb(null, true);
    }
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts' },
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

// ── Body parsers ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health check ──────────────────────────────────────────────
app.get('/',       (_req, res) => res.json({ success: true, message: 'HRD Lite API', version: '1.0.0' }));
app.get('/health', (_req, res) => res.json({
  success: true,
  message: 'HRD System API is running',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV || 'production',
  port: PORT,
}));

// ── Clear demo data endpoint
require('./scripts/clearDemo')(app);

// ── Add missing columns (safe ALTER) ─────────────────────────
app.post('/run-alter', async (req, res) => {
  const secret = req.headers['x-migrate-secret'];
  if (!secret || secret !== process.env.MIGRATE_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  try {
    const { sequelize } = require('./config/database');
    const results = [];

    // Create departments table
    try {
      await sequelize.query(`CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(20) NULL,
        description TEXT NULL,
        head_name VARCHAR(100) NULL,
        is_active TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      results.push('OK: departments table created');
    } catch(e) { results.push('SKIP: departments - ' + e.message.substring(0,60)); }

    const errors  = [];

    const alters = [
      `CREATE TABLE IF NOT EXISTS store_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand ENUM('gpdistro','gpracing') NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  tagline VARCHAR(200),
  logo_url TEXT,
  favicon_url TEXT,
  primary_color VARCHAR(20) DEFAULT '#e11d48',
  domain VARCHAR(100),
  whatsapp VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  meta_title VARCHAR(200),
  meta_desc TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`,

`CREATE TABLE IF NOT EXISTS store_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand ENUM('gpdistro','gpracing') NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id INT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sc_brand (brand),
  INDEX idx_sc_parent (parent_id)
)`,

`CREATE TABLE IF NOT EXISTS store_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand ENUM('gpdistro','gpracing') NOT NULL,
  category_id INT NULL,
  erp_product_id INT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  sku VARCHAR(50),
  description TEXT,
  short_desc VARCHAR(500),
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  price_compare DECIMAL(15,2) DEFAULT 0,
  weight INT DEFAULT 500,
  stock INT DEFAULT 0,
  images JSON,
  variants JSON,
  tags JSON,
  is_featured TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  sold_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  meta_title VARCHAR(200),
  meta_desc TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sp_brand (brand),
  INDEX idx_sp_category (category_id),
  INDEX idx_sp_active (is_active),
  FULLTEXT idx_sp_search (name)
)`,

`CREATE TABLE IF NOT EXISTS store_banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand ENUM('gpdistro','gpracing') NOT NULL,
  title VARCHAR(150),
  subtitle VARCHAR(250),
  image_url TEXT NOT NULL,
  image_mobile_url TEXT,
  link_url TEXT,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`,

`CREATE TABLE IF NOT EXISTS store_customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  is_active TINYINT(1) DEFAULT 1,
  email_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scust_email (email)
)`,

`CREATE TABLE IF NOT EXISTS store_addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  label VARCHAR(50) DEFAULT 'Rumah',
  recipient VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  province_id INT,
  province VARCHAR(100),
  city_id INT,
  city VARCHAR(100),
  district VARCHAR(100),
  postal_code VARCHAR(10),
  address TEXT NOT NULL,
  is_default TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_saddr_customer (customer_id)
)`,

`CREATE TABLE IF NOT EXISTS store_carts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NULL,
  session_id VARCHAR(100) NULL,
  brand ENUM('gpdistro','gpracing') NOT NULL,
  product_id INT NOT NULL,
  variant JSON,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(15,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scart_customer (customer_id),
  INDEX idx_scart_session (session_id)
)`,

`CREATE TABLE IF NOT EXISTS store_vouchers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand ENUM('gpdistro','gpracing') NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  type ENUM('percent','fixed','free_ongkir') NOT NULL,
  value DECIMAL(15,2) DEFAULT 0,
  min_purchase DECIMAL(15,2) DEFAULT 0,
  max_discount DECIMAL(15,2) DEFAULT 0,
  quota INT DEFAULT 0,
  used_count INT DEFAULT 0,
  valid_from DATETIME,
  valid_until DATETIME,
  is_active TINYINT(1) DEFAULT 1,
  description VARCHAR(200),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_svoucher_code (code)
)`,

`CREATE TABLE IF NOT EXISTS store_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand ENUM('gpdistro','gpracing') NOT NULL,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  customer_id INT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city VARCHAR(100),
  shipping_province VARCHAR(100),
  shipping_postal VARCHAR(10),
  shipping_courier VARCHAR(50),
  shipping_service VARCHAR(50),
  shipping_cost DECIMAL(15,2) DEFAULT 0,
  shipping_etd VARCHAR(50),
  tracking_number VARCHAR(100),
  subtotal DECIMAL(15,2) NOT NULL,
  discount DECIMAL(15,2) DEFAULT 0,
  voucher_code VARCHAR(50),
  total DECIMAL(15,2) NOT NULL,
  status ENUM('pending','paid','processing','shipped','delivered','cancelled','refunded') DEFAULT 'pending',
  payment_status ENUM('unpaid','paid','partial','refunded') DEFAULT 'unpaid',
  payment_method VARCHAR(50),
  midtrans_order_id VARCHAR(100),
  midtrans_token TEXT,
  midtrans_redirect TEXT,
  paid_at DATETIME,
  notes TEXT,
  erp_order_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sorder_brand (brand),
  INDEX idx_sorder_customer (customer_id),
  INDEX idx_sorder_status (status),
  INDEX idx_sorder_midtrans (midtrans_order_id)
)`,

`CREATE TABLE IF NOT EXISTS store_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  product_image TEXT,
  sku VARCHAR(50),
  variant JSON,
  price DECIMAL(15,2) NOT NULL,
  quantity INT NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  INDEX idx_soi_order (order_id)
)`,

`CREATE TABLE IF NOT EXISTS store_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  midtrans_order_id VARCHAR(100),
  transaction_id VARCHAR(100),
  payment_type VARCHAR(50),
  amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(30),
  raw_response JSON,
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_spay_order (order_id)
)`,

`CREATE TABLE IF NOT EXISTS store_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  order_id INT NOT NULL,
  customer_id INT NOT NULL,
  customer_name VARCHAR(100),
  rating TINYINT NOT NULL,
  comment TEXT,
  images JSON,
  is_approved TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_srev_product (product_id)
)`,

// Seed default store configs
`INSERT IGNORE INTO store_config (brand, name, tagline, primary_color, domain, is_active) VALUES
  ('gpdistro', 'GPDISTRO', 'Fashion & Digital Printing', '#1a1a2e', 'gpdistro.com', 1),
  ('gpracing', 'GP RACING STORE', 'Spare Part Motor Racing', '#dc2626', 'gpracingstore.com', 1)`,
  
      // Add employment_status to inc_employees
      `ALTER TABLE inc_employees ADD COLUMN employment_status ENUM('magang','training','kontrak','tetap') NOT NULL DEFAULT 'kontrak'`,
      // Add eligible_statuses to inc_bonus_targets
      `ALTER TABLE inc_bonus_targets ADD COLUMN eligible_statuses JSON`,
      // Add eligible_statuses to inc_sales_channels
      `ALTER TABLE inc_sales_channels ADD COLUMN eligible_statuses JSON`,
      // Add logo_url as TEXT in company_settings (was VARCHAR(500))
      `ALTER TABLE company_settings MODIFY COLUMN logo_url TEXT`,
      // Add theme color columns for sidebar & topbar
      `ALTER TABLE company_settings ADD COLUMN sidebar_color VARCHAR(20) NOT NULL DEFAULT 'default'`,
      `ALTER TABLE company_settings ADD COLUMN topbar_color VARCHAR(20) NOT NULL DEFAULT 'default'`,
      // Fix store_products — add missing columns (SKIP jika sudah ada)
      `ALTER TABLE store_products ADD COLUMN brand ENUM('gpdistro','gpracing') NOT NULL DEFAULT 'gpracing'`,
      `ALTER TABLE store_products ADD COLUMN erp_product_id INT NULL`,
      `ALTER TABLE store_products ADD COLUMN short_desc VARCHAR(500)`,
      `ALTER TABLE store_products ADD COLUMN price_compare DECIMAL(15,2) DEFAULT 0`,
      `ALTER TABLE store_products ADD COLUMN weight INT DEFAULT 500`,
      `ALTER TABLE store_products ADD COLUMN images JSON`,
      `ALTER TABLE store_products ADD COLUMN variants JSON`,
      `ALTER TABLE store_products ADD COLUMN tags JSON`,
      `ALTER TABLE store_products ADD COLUMN sold_count INT DEFAULT 0`,
      `ALTER TABLE store_products ADD COLUMN view_count INT DEFAULT 0`,
      `ALTER TABLE store_products ADD COLUMN is_active TINYINT(1) DEFAULT 1`,
      `ALTER TABLE store_products ADD COLUMN is_featured TINYINT(1) DEFAULT 0`,
      `ALTER TABLE store_products ADD COLUMN meta_title VARCHAR(200)`,
      `ALTER TABLE store_products ADD COLUMN meta_desc TEXT`,
      // Create inc_channel_rates if not exists
      `CREATE TABLE IF NOT EXISTS inc_channel_rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch_id INT NOT NULL,
        channel_id INT NOT NULL,
        percentage DECIMAL(6,3) NOT NULL DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        notes VARCHAR(200),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_branch_channel (branch_id, channel_id)
      )`,
      // Create inc_bonus_exclusions if not exists
      `CREATE TABLE IF NOT EXISTS inc_bonus_exclusions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        reason VARCHAR(200),
        start_date DATE,
        end_date DATE,
        is_active TINYINT(1) DEFAULT 1,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      // Create company_settings if not exists
      `CREATE TABLE IF NOT EXISTS company_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(100) DEFAULT 'GPDISTRO HR Pro',
        company_tagline VARCHAR(200),
        company_address TEXT,
        company_phone VARCHAR(20),
        company_email VARCHAR(150),
        company_website VARCHAR(200),
        logo_url TEXT,
        primary_color VARCHAR(20) DEFAULT '#e11d48',
        favicon_url VARCHAR(500),
        app_name VARCHAR(100) DEFAULT 'GPDISTRO HR Pro',
        timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      // Create loan_management table for kasbon feature
      `CREATE TABLE IF NOT EXISTS loan_management (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('kasbon','hutang') DEFAULT 'kasbon',
        total_amount DECIMAL(15,2) NOT NULL,
        remaining_amount DECIMAL(15,2) NOT NULL,
        monthly_installment DECIMAL(15,2) NOT NULL,
        installment_count INT DEFAULT 0,
        total_installments INT NOT NULL,
        loan_date DATE NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NULL,
        status ENUM('pending','active','completed','cancelled') DEFAULT 'pending',
        approved_by INT NULL,
        approved_at DATETIME NULL,
        description TEXT NULL,
        installment_history JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_loan_user (user_id),
        INDEX idx_loan_status (status)
      )`,
    ];

    for (const sql of alters) {
      try {
        await sequelize.query(sql);
        results.push('OK: ' + sql.substring(0, 60) + '...');
      } catch (e) {
        // Column already exists = OK
        if (e.message.includes('Duplicate column') || e.message.includes('already exists')) {
          results.push('SKIP (already exists): ' + sql.substring(0, 50));
        } else {
          errors.push('ERR: ' + e.message.substring(0, 100));
        }
      }
    }

    // Create erp_sub_channels table if not exists
    try {
      await sequelize.query(`CREATE TABLE IF NOT EXISTS erp_sub_channels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        channel ENUM('wa','marketplace','direct') NOT NULL,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(200),
        is_active TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`);
      results.push('OK: erp_sub_channels table ready');

      // Seed default sub channels
      const existing = await sequelize.query('SELECT COUNT(*) as cnt FROM erp_sub_channels', { type: 'SELECT' });
      if (existing[0].cnt == 0) {
        const seeds = [
          // WA — list karyawan dihandle di frontend via employees API
          // Marketplace
          "('marketplace','TOKOPEDIA #01','Toko Tokopedia utama',1,1)",
          "('marketplace','TOKOPEDIA #02','Toko Tokopedia kedua',1,2)",
          "('marketplace','SHOPEE #01','Toko Shopee utama',1,3)",
          "('marketplace','SHOPEE #02','Toko Shopee kedua',1,4)",
          "('marketplace','TIKTOK SHOP','TikTok Shop official',1,5)",
          "('marketplace','BRT PLAZA','BRT Plaza offline store',1,6)",
          // Langsung
          "('direct','Datang ke Toko','Pelanggan datang langsung',1,1)",
          "('direct','Website','Order via website',1,2)",
        ];
        for (const seed of seeds) {
          await sequelize.query(`INSERT INTO erp_sub_channels (channel,name,description,is_active,sort_order) VALUES ${seed}`).catch(()=>{});
        }
        results.push('OK: erp_sub_channels seeded');
      }
    } catch(e) { errors.push('ERR sub_channels: ' + e.message.substring(0,80)); }

    // Add sub_channel columns to erp_orders
    for (const col of [
      "ALTER TABLE erp_orders ADD COLUMN sub_channel_id INT",
      "ALTER TABLE erp_orders ADD COLUMN sub_channel_name VARCHAR(100)",
    ]) {
      try { await sequelize.query(col); results.push('OK: ' + col.substring(0,60)); }
      catch(e) {
        if (e.message.includes('Duplicate column') || e.message.includes('already exists'))
          results.push('SKIP: ' + col.substring(0,50));
        else errors.push('ERR: ' + e.message.substring(0,80));
      }
    }

    // Create erp_returns table
    try {
      await sequelize.query(`CREATE TABLE IF NOT EXISTS erp_returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_no VARCHAR(50) NOT NULL UNIQUE,
        order_id INT NOT NULL,
        branch_id INT NOT NULL,
        status ENUM('pending','confirmed','rejected') DEFAULT 'pending',
        reason ENUM('barang_rusak','salah_produk','tidak_sesuai','cod_ditolak','lainnya') DEFAULT 'lainnya',
        resolution ENUM('refund','exchange','none') DEFAULT 'refund',
        restock TINYINT(1) DEFAULT 1,
        total_return DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        confirmed_at DATETIME,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`);
      results.push('OK: erp_returns table ready');
    } catch(e) { errors.push('ERR erp_returns: ' + e.message.substring(0,80)); }

    try {
      await sequelize.query(`CREATE TABLE IF NOT EXISTS erp_return_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_id INT NOT NULL,
        order_item_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name VARCHAR(200) NOT NULL,
        qty_return INT NOT NULL DEFAULT 1,
        sell_price DECIMAL(15,2) NOT NULL,
        subtotal DECIMAL(15,2) NOT NULL
      )`);
      results.push('OK: erp_return_items table ready');
    } catch(e) { errors.push('ERR erp_return_items: ' + e.message.substring(0,80)); }

    // Add 'returned' to order status enum
    try {
      await sequelize.query("ALTER TABLE erp_orders MODIFY COLUMN status ENUM('draft','confirmed','processing','shipped','completed','cancelled','returned') DEFAULT 'draft'");
      results.push('OK: erp_orders.status enum updated');
    } catch(e) { results.push('SKIP: ' + e.message.substring(0,60)); }

    // Add admin_fee column to erp_orders if missing
    try {
      await sequelize.query('ALTER TABLE `erp_orders` ADD COLUMN `admin_fee` DECIMAL(15,2) NOT NULL DEFAULT 0');
      results.push('OK: erp_orders.admin_fee added');
    } catch(e) {
      if (e.message.includes('Duplicate column') || e.message.includes('already exists')) {
        results.push('SKIP: erp_orders.admin_fee already exists');
      } else { errors.push('ERR admin_fee: ' + e.message.substring(0,80)); }
    }


    // Seed GP Racing categories if empty
    try {
      const catCount = await sequelize.query('SELECT COUNT(*) as cnt FROM erp_categories WHERE branch_id=1', { type: 'SELECT' });
      if (catCount[0].cnt == 0) {
        const cats = [
          'BUSI RACING','ROLLER BRT','PAKET TRABAS','RACING PARTS',
          'CYLINDER HEAD','BORE UP KIT','CDI RACING','ECU RACING',
          'CAM SHAFT','OTHER PARTS','WORKSHOP TOOLS',
        ];
        for (const [i,name] of cats.entries()) {
          await sequelize.query(`INSERT INTO erp_categories (branch_id,name,sort_order,is_active) VALUES (1,'${name}',${i+1},1)`).catch(()=>{});
        }
        results.push('OK: GP Racing categories seeded');
      }
    } catch(e) { errors.push('ERR categories seed: ' + e.message.substring(0,60)); }

    // Set defaults for eligible_statuses
    await sequelize.query(
      `UPDATE inc_bonus_targets SET eligible_statuses = '["kontrak","tetap"]' WHERE eligible_statuses IS NULL`
    ).catch(() => {});
    await sequelize.query(
      `UPDATE inc_sales_channels SET eligible_statuses = '["kontrak","tetap"]' WHERE eligible_statuses IS NULL`
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'ALTER selesai',
      data: { results, errors }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Quick clear payroll demo data only ───────────────────────
app.post('/clear-payroll-demo', async (req, res) => {
  const secret = req.headers['x-migrate-secret'];
  if (!secret || secret !== process.env.MIGRATE_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  try {
    const { sequelize } = require('./config/database');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    // Correct table names from models
    await sequelize.query('TRUNCATE TABLE `payroll`');
    await sequelize.query('TRUNCATE TABLE `payroll_items`');
    await sequelize.query('TRUNCATE TABLE `payroll_runs`');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    return res.json({
      success: true,
      message: 'Data payroll demo berhasil dihapus!',
      data: { cleared: ['payroll', 'payroll_items', 'payroll_runs'] }
    });
  } catch (err) {
    try { const { sequelize } = require('./config/database'); await sequelize.query('SET FOREIGN_KEY_CHECKS = 1'); } catch {}
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── One-time migrate endpoint (protected by secret key) ──────
app.post('/run-migrate', async (req, res) => {
  const secret = req.headers['x-migrate-secret'];
  if (!secret || secret !== process.env.MIGRATE_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  try {
    const { sequelize } = require('./config/database');
    const models = require('./models');
    const incModels = require('./models/incentive');
    const { seedDefaultComponents } = require('./controllers/payrollEngineController');
    const {
      User, Employee, Attendance, LeaveRequest, LeaveQuota,
      Payroll, OfficeSetting, EmployeeFace, CompanySetting,
      PayrollSetting, PayrollComponent, EmployeeAllowance,
      PayrollRun, PayrollItem, LoanManagement,
      IncentiveParameter, IncentiveEmployeeRate,
    } = models;
    const {
      Branch, Position, IncEmployee, SalesChannel, ChannelRate,
      ActivityType, BonusTarget, IncentivePeriod,
      WaSale, MarketplaceSale, MarketplaceShare,
      WebSale, WebShare, EmployeeActivity,
      IncentiveResult, AuditLog,
    } = incModels;

    // Smart sync — only create tables that don't exist
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    const [existingRows] = await sequelize.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
    );
    const existing = new Set(existingRows.map(t => t.TABLE_NAME || t.table_name));

    const syncIfNew = async (model) => {
      const tbl = model.getTableName();
      if (!existing.has(tbl)) await model.sync({ force: false });
    };

    // HRD core
    await syncIfNew(User);         await syncIfNew(Employee);
    await syncIfNew(Attendance);   await syncIfNew(LeaveRequest);
    await syncIfNew(LeaveQuota);   await syncIfNew(Payroll);
    await syncIfNew(OfficeSetting);await syncIfNew(EmployeeFace);
    await syncIfNew(CompanySetting);
    // Payroll engine
    await syncIfNew(PayrollSetting);    await syncIfNew(PayrollComponent);
    await syncIfNew(EmployeeAllowance); await syncIfNew(PayrollRun);
    await syncIfNew(PayrollItem);       await syncIfNew(LoanManagement);
    await syncIfNew(IncentiveParameter);await syncIfNew(IncentiveEmployeeRate);
    // ERP tables
    const erpModels = require('./models/erp');
    await syncIfNew(erpModels.Category);
    await syncIfNew(erpModels.Product);
    await syncIfNew(erpModels.Stock);
    await syncIfNew(erpModels.StockMovement);
    await syncIfNew(erpModels.Customer);
    await syncIfNew(erpModels.Order);
    await syncIfNew(erpModels.OrderItem);
    await syncIfNew(erpModels.Payment);
    await syncIfNew(erpModels.Shipment);
    await syncIfNew(erpModels.ImportLog);
    const { Purchase, PurchaseItem, Expense } = require('./models/erp/Purchase');
    await syncIfNew(Purchase);
    await syncIfNew(PurchaseItem);
    await syncIfNew(Expense);

    // Incentive system
    await syncIfNew(Branch);       await syncIfNew(Position);
    await syncIfNew(IncEmployee);  await syncIfNew(SalesChannel);
    await syncIfNew(ChannelRate);  await syncIfNew(ActivityType);
    await syncIfNew(BonusTarget);  await syncIfNew(IncentivePeriod);
    await syncIfNew(WaSale);       await syncIfNew(MarketplaceSale);
    await syncIfNew(MarketplaceShare); await syncIfNew(WebSale);
    await syncIfNew(WebShare);     await syncIfNew(EmployeeActivity);
    await syncIfNew(IncentiveResult);  await syncIfNew(AuditLog);

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // Seeds
    const psExists = await PayrollSetting.findOne();
    if (!psExists) await PayrollSetting.create({});

    const compCount = await PayrollComponent.count();
    if (compCount === 0) await seedDefaultComponents();

    const offExists = await OfficeSetting.findOne();
    if (!offExists) await OfficeSetting.create({
      name: 'GPDISTRO HR Pro', address: 'Jakarta',
      lat: -6.2088, lng: 106.8456, radius: 100,
      check_in_start: '06:00', check_in_deadline: '08:05',
      check_out_start: '15:00', work_hours_required: 8, is_active: true,
    });

    const csExists = await CompanySetting.findOne();
    if (!csExists) await CompanySetting.create({
      company_name: 'GPDISTRO HR Pro',
      app_name: 'GPDISTRO HR Pro',
      logo_url: '/logo-gpdistro.png',
      primary_color: '#e11d48',
    });

    const branchCount = await Branch.count();
    if (branchCount === 0) {
      await Branch.bulkCreate([
        { code:'GPRACING', name:'GP Racing', business_type:'Online Store Spare Part Racing', sort_order:1 },
        { code:'GPDISTRO', name:'GP Distro', business_type:'Online Store Fashion', sort_order:2 },
      ]);
    }

    const channelCount = await SalesChannel.count();
    if (channelCount === 0) {
      await SalesChannel.bulkCreate([
        { code:'WA',          name:'WhatsApp',    percentage:3.000, input_type:'per_transaction', sort_order:1 },
        { code:'MARKETPLACE', name:'Marketplace', percentage:0.500, input_type:'per_period',      sort_order:2 },
        { code:'WEB',         name:'Website',     percentage:2.000, input_type:'per_period',      sort_order:3 },
      ]);
    }

    const compTotal = await PayrollComponent.count();
    const newTables = [...existing].length;
    return res.json({
      success: true,
      message: 'Migration berhasil!',
      data: {
        tables_synced: true,
        new_tables_created: newTables,
        payroll_components: compTotal,
      }
    });
  } catch (err) {
    try { const { sequelize } = require('./config/database'); await sequelize.query('SET FOREIGN_KEY_CHECKS = 1'); } catch {}
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves',     leaveRoutes);
app.use('/api/payroll',    payrollRoutes);
app.use('/api/employees',  employeeRoutes);
// ── STORE PRODUCTS — direct (must be BEFORE storeRoutes) ────
app.get('/api/store/admin/products', async (req, res) => {
  try {
    const { brand, search, category, page = 1, limit = 20 } = req.query;
    const { sequelize } = require('./config/database');
    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.max(1, parseInt(limit) || 20);
    const offset   = (pageNum - 1) * limitNum;
    let where = 'WHERE 1=1';
    if (brand)    where += ` AND brand = ${sequelize.escape(brand)}`;
    if (category) where += ` AND category_id = ${parseInt(category)}`;
    if (search)   where += ` AND (name LIKE ${sequelize.escape('%'+search+'%')} OR sku LIKE ${sequelize.escape('%'+search+'%')})`;
    const [[{ n }]] = await sequelize.query(`SELECT COUNT(*) as n FROM store_products ${where}`);
    const total = parseInt(n) || 0;
    const [rows] = await sequelize.query(`SELECT * FROM store_products ${where} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`);
    const branchId = brand === 'gpdistro' ? 2 : 1;
    const [cats] = await sequelize.query(`SELECT id, name FROM erp_categories WHERE branch_id = ${branchId} AND is_active = 1`);
    const catMap = {};
    cats.forEach(cat => { catMap[cat.id] = { id: cat.id, name: cat.name }; });
    const products = (rows || []).map(p => {
      try { p.images   = typeof p.images   === 'string' ? JSON.parse(p.images)   : (p.images   || []); } catch(e) { p.images = []; }
      try { p.variants = typeof p.variants === 'string' ? JSON.parse(p.variants) : (p.variants || {}); } catch(e) { p.variants = {}; }
      try { p.tags     = typeof p.tags     === 'string' ? JSON.parse(p.tags)     : (p.tags     || []); } catch(e) { p.tags = []; }
      return { ...p, category: p.category_id ? (catMap[p.category_id] || null) : null };
    });
    return res.json({ success: true, data: { products, total, page: pageNum, total_pages: Math.ceil(total / limitNum) } });
  } catch(e) { return res.status(500).json({ success: false, message: e.message }); }
});

app.use('/api/store', storeRoutes);               // di bagian app.use

// ── Debug: check store_products table ────────────────────────
app.get('/debug-store', async (req, res) => {
  try {
    const secret = req.headers['x-migrate-secret'] || req.query.secret;
    if (!secret || secret !== process.env.MIGRATE_SECRET) return res.status(403).json({ error: 'Forbidden' });
    const { sequelize } = require('./config/database');
    const [products]    = await sequelize.query('SELECT id, name, brand, is_active, created_at FROM store_products ORDER BY created_at DESC LIMIT 20');
    const [cnt]         = await sequelize.query('SELECT COUNT(*) as total FROM store_products');
    const [tbl]         = await sequelize.query("SELECT COUNT(*) as c FROM information_schema.tables WHERE table_name='store_products' AND table_schema=DATABASE()");
    const [cols]        = await sequelize.query("SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_name='store_products' AND table_schema=DATABASE() ORDER BY ORDINAL_POSITION");
    return res.json({ tableExists: tbl[0].c > 0, total: cnt[0].total, products, columns: cols.map(c=>c.COLUMN_NAME) });
  } catch (e) { return res.json({ error: e.message }); }
});

// check-store via POST with CORS-friendly approach
app.post('/check-store', async (req, res) => {
  try {
    const { secret } = req.body || {};
    if (!secret || secret !== process.env.MIGRATE_SECRET) return res.status(403).json({ error: 'Forbidden' });
    const { sequelize } = require('./config/database');
    const [products] = await sequelize.query('SELECT id, name, brand, is_active, created_at FROM store_products ORDER BY created_at DESC LIMIT 20');
    const [cnt]      = await sequelize.query('SELECT COUNT(*) as total FROM store_products');
    const [cols]     = await sequelize.query("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_name='store_products' AND table_schema=DATABASE() ORDER BY ORDINAL_POSITION");
    return res.json({ total: cnt[0].total, products, columns: cols.map(c=>c.COLUMN_NAME) });
  } catch (e) { return res.json({ error: e.message }); }
});
// Fix store_products timestamps
app.post('/fix-store-timestamps', async (req, res) => {
  try {
    const secret = req.body?.secret;
    if (secret !== process.env.MIGRATE_SECRET) return res.status(403).json({error:'Forbidden'});
    const { sequelize } = require('./config/database');
    const fixes = [
      "ALTER TABLE store_products MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "ALTER TABLE store_products MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
      "ALTER TABLE store_products MODIFY COLUMN price DECIMAL(15,2) NOT NULL DEFAULT 0",
      "ALTER TABLE store_products MODIFY COLUMN stock INT NOT NULL DEFAULT 0",
      "ALTER TABLE store_products MODIFY COLUMN name VARCHAR(200) NOT NULL",
      "ALTER TABLE store_products MODIFY COLUMN slug VARCHAR(220) NOT NULL",
    ];
    const results = [];
    for (const sql of fixes) {
      try { await sequelize.query(sql); results.push('OK: ' + sql.slice(0,60)); }
      catch(e) { results.push('ERR: ' + e.message.slice(0,80)); }
    }
    res.json({ success: true, results });
  } catch(e) { res.json({ error: e.message }); }
});

// Simple no-param store test
app.get('/store-test', async (req, res) => {
  try {
    const { sequelize } = require('./config/database');
    const [all]   = await sequelize.query('SELECT id, name, brand FROM store_products LIMIT 5');
    const [[cnt]] = await sequelize.query('SELECT COUNT(*) as n FROM store_products');
    const [cols]  = await sequelize.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME='store_products' AND TABLE_SCHEMA=DATABASE()");
    res.json({ total: cnt.n, rows: all, columns: cols.map(c=>c.COLUMN_NAME) });
  } catch(e) { res.json({ error: e.message }); }
});

app.use('/api/departments', departmentRoutes);
app.use('/api/reports',       reportsRoutes);
app.use('/api/payroll-engine', payrollEngineRoutes);
app.use('/api/incentive',      incentiveRoutes);
app.use('/api/company',        companyRoutes);
app.use('/api/erp',            erpRoutes);

// ── 404 + Error ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
const startServer = async () => {
  // Connect DB but don't block server startup if DB is slow
  connectDB().catch(err => console.error('DB init error:', err.message));

  app.listen(PORT, HOST, () => {
    console.log(`\n🚀 HRD System running on ${HOST}:${PORT}`);
    console.log(`📡 Env: ${process.env.NODE_ENV || 'production'}`);
    console.log(`❤️  Health: /health\n`);
  });
};

startServer();

module.exports = app;
