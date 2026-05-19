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
const reportsRoutes      = require('./routes/reports');
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
  'https://gphrdpro-production.up.railway.app',
  'http://localhost:5173',
  'http://localhost:3000',
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
    const errors  = [];

    const alters = [
      // Add employment_status to inc_employees
      `ALTER TABLE inc_employees ADD COLUMN employment_status ENUM('magang','training','kontrak','tetap') NOT NULL DEFAULT 'kontrak'`,
      // Add eligible_statuses to inc_bonus_targets
      `ALTER TABLE inc_bonus_targets ADD COLUMN eligible_statuses JSON`,
      // Add eligible_statuses to inc_sales_channels
      `ALTER TABLE inc_sales_channels ADD COLUMN eligible_statuses JSON`,
      // Add logo_url as TEXT in company_settings (was VARCHAR(500))
      `ALTER TABLE company_settings MODIFY COLUMN logo_url TEXT`,
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
