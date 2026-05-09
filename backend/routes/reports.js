const express = require('express');
const router  = express.Router();
const { query } = require('express-validator');
const {
  getOverview, getAttendanceReport, getLeaveReport,
  getPayrollReport, getEmployeeReport, exportData,
} = require('../controllers/reportsController');
const { authenticate, authorize } = require('../middleware/auth');

// All reports require admin/hr/supervisor
router.use(authenticate);
router.use(authorize('admin', 'hr', 'supervisor'));

router.get('/overview',    getOverview);          // ?month=YYYY-MM
router.get('/attendance',  getAttendanceReport);  // ?month=YYYY-MM
router.get('/leaves',      getLeaveReport);       // ?year=YYYY
router.get('/payroll',     getPayrollReport);     // ?year=YYYY
router.get('/employees',   getEmployeeReport);    // ?year=YYYY
router.get('/export',      exportData);           // ?type=attendance|payroll|employees&month=

module.exports = router;
