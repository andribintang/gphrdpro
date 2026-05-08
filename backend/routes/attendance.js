const express = require('express');
const router  = express.Router();
const { body, query } = require('express-validator');
const {
  checkIn, checkOut, getToday,
  getHistory, getAdminDaily, getAdminMonthly,
} = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

// Semua routes butuh auth
router.use(authenticate);

// ── Employee routes ──────────────────────────────────────────
router.get('/today',   getToday);

router.post('/check-in', [
  body('lat').optional().isFloat({ min: -90,  max: 90  }).withMessage('Latitude tidak valid'),
  body('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude tidak valid'),
  body('notes').optional().isString().isLength({ max: 500 }),
], checkIn);

router.post('/check-out', [
  body('lat').optional().isFloat({ min: -90,  max: 90  }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),
  body('notes').optional().isString().isLength({ max: 500 }),
], checkOut);

router.get('/history', [
  query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('Format bulan: YYYY-MM'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], getHistory);

// ── Admin / HR routes ────────────────────────────────────────
router.get('/admin/daily',   authorize('admin', 'hr', 'supervisor'), getAdminDaily);
router.get('/admin/monthly', authorize('admin', 'hr'),               getAdminMonthly);

module.exports = router;
