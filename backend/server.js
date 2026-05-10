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

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves',     leaveRoutes);
app.use('/api/payroll',    payrollRoutes);
app.use('/api/employees',  employeeRoutes);
app.use('/api/reports',       reportsRoutes);
app.use('/api/payroll-engine', payrollEngineRoutes);

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
