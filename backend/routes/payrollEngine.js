const express = require('express');
const router  = express.Router();
const { body, param, query } = require('express-validator');
const ctrl = require('../controllers/payrollEngineController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ── All authenticated (employee can see own) ─────────────────
router.get('/my',           ctrl.getMy);
router.get('/items/:id',    ctrl.getItem);

// ── Admin / HR only ──────────────────────────────────────────
router.use(authorize('admin', 'hr'));

// Runs
router.post('/runs/generate', ctrl.generateRun);
router.get('/runs',           ctrl.getRuns);
router.get('/runs/:id',       ctrl.getRunDetail);
router.patch('/runs/:id/approve', ctrl.approveRun);
router.patch('/runs/:id/pay',     ctrl.markPaid);

// Components
router.get('/components',         ctrl.getComponents);
router.post('/components',        ctrl.createComponent);
router.put('/components/:id',     ctrl.updateComponent);
router.patch('/components/:id/toggle', ctrl.toggleComponent);

// Employee allowances
router.get('/allowances/:userId',  ctrl.getEmployeeAllowances);
router.post('/allowances/:userId', ctrl.upsertEmployeeAllowance);

// Settings
router.get('/settings',  ctrl.getSettings);
router.put('/settings',  ctrl.updateSettings);

// Incentive
router.get('/incentive/parameters',  ctrl.getIncentiveParams);
router.post('/incentive/parameters', ctrl.createIncentiveParam);

// THR preview
router.get('/thr/preview', ctrl.previewTHR);

// Loans — supervisors can also create
router.get('/loans',          ctrl.getLoans);
router.post('/loans',         ctrl.createLoan);
router.patch('/loans/:id/approve', ctrl.approveLoan);

// All roles: my loans
router.get('/loans/my',  authorize('admin','hr','supervisor','employee'), ctrl.getMyLoans);

module.exports = router;
