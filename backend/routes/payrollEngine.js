const express = require('express');
const router  = express.Router();
const { body, param, query } = require('express-validator');
const ctrl = require('../controllers/payrollEngineController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ── All authenticated roles ───────────────────────────────────
router.get('/my',           ctrl.getMy);
router.get('/items/:id',    ctrl.getItem);

// Loans — all roles can view own & create
router.get('/loans/my',    authorize('admin','hr','supervisor','employee'), ctrl.getMyLoans);
router.post('/loans',      authorize('admin','hr','supervisor','employee'), ctrl.createLoan);

// ── Admin / HR / Supervisor only ─────────────────────────────
router.use(authorize('admin', 'hr', 'supervisor'));

// Runs
router.post('/runs/generate', authorize('admin','hr'), ctrl.generateRun);
router.get('/runs',           ctrl.getRuns);
router.get('/runs/:id',       ctrl.getRunDetail);
router.patch('/runs/:id/approve', authorize('admin','hr'), ctrl.approveRun);
router.patch('/runs/:id/pay',     authorize('admin','hr'), ctrl.markPaid);

// Components
router.get('/components',         ctrl.getComponents);
router.post('/components',        authorize('admin','hr'), ctrl.createComponent);
router.put('/components/:id',     authorize('admin','hr'), ctrl.updateComponent);
router.patch('/components/:id/toggle', authorize('admin','hr'), ctrl.toggleComponent);

// Employee allowances
router.get('/allowances/:userId',  ctrl.getEmployeeAllowances);
router.post('/allowances/:userId', authorize('admin','hr'), ctrl.upsertEmployeeAllowance);

// Settings
router.get('/settings',  ctrl.getSettings);
router.put('/settings',  authorize('admin','hr'), ctrl.updateSettings);

// Incentive
router.get('/incentive/parameters',  ctrl.getIncentiveParams);
router.post('/incentive/parameters', authorize('admin','hr'), ctrl.createIncentiveParam);

// THR preview
router.get('/thr/preview', ctrl.previewTHR);

// Loans — admin/hr can view all & approve
router.get('/loans',               authorize('admin','hr'), ctrl.getLoans);
router.patch('/loans/:id/approve', authorize('admin','hr'), ctrl.approveLoan);

module.exports = router;
