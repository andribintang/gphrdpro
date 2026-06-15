const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/cleanupController');

// Admin only
const adminOnly = authorize('admin');

router.get   ('/summary',       authenticate, adminOnly, ctrl.getSummary);
router.delete('/payroll',       authenticate, adminOnly, ctrl.cleanPayroll);
router.delete('/incentive',     authenticate, adminOnly, ctrl.cleanIncentive);
router.delete('/notifications', authenticate, adminOnly, ctrl.cleanNotifications);
router.delete('/loans',         authenticate, adminOnly, ctrl.cleanLoans);

module.exports = router;
