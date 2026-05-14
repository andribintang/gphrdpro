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
