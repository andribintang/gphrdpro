const express = require('express');
const router  = express.Router();
const { body, query, param } = require('express-validator');
const {
  checkIn, checkOut, breakStart, breakEnd,
  getToday, getHistory,
  getRealtimeMonitoring, getAdminMonthly, getAllAttendances,
  getOfficeSettingsApi, updateOfficeSettings,
  registerFace, getFaceStatus,
} = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ── Employee routes ──────────────────────────────────────────
router.get('/today',       getToday);
router.post('/check-in',   checkIn);
router.post('/check-out',  checkOut);
router.post('/break-start', breakStart);
router.post('/break-end',   breakEnd);

router.get('/history', [
  query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('Format: YYYY-MM'),
  query('page').optional().isInt({ min: 1 }),
], getHistory);

// ── Face registration ────────────────────────────────────────
router.post('/register-face', registerFace);
router.get('/face-status/:userId?', getFaceStatus);

// ── Office settings ──────────────────────────────────────────
router.get('/office/settings',  getOfficeSettingsApi);
router.put('/office/settings',  authorize('admin', 'hr'), [
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 }),
  body('radius').isInt({ min: 10, max: 5000 }),
], updateOfficeSettings);

// ── Admin / HR ───────────────────────────────────────────────
router.get('/admin/realtime', authorize('admin', 'hr', 'supervisor'), getRealtimeMonitoring);
router.get('/admin/monthly',  authorize('admin', 'hr'),               getAdminMonthly);
router.get('/admin/all',      authorize('admin', 'hr'),               getAllAttendances);

router.post('/admin/bulk-import', authorize('admin', 'hr'), bulkImport);

module.exports = router;
