const express = require('express');
const router  = express.Router();
const { body, param, query } = require('express-validator');
const {
  generate, getAll, getMy, getOne,
  markPaid, bulkPay, getSummary, remove,
} = require('../controllers/payrollController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ── All roles ────────────────────────────────────────────────
router.get('/my',   getMy);           // GET /api/payroll/my?month=YYYY-MM
router.get('/:id', [param('id').isInt()], getOne); // GET /api/payroll/:id

// ── Admin / HR only ──────────────────────────────────────────
router.use(authorize('admin', 'hr'));

router.post('/generate', [
  body('month')
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('Format bulan: YYYY-MM'),
  body('user_ids')
    .optional()
    .isArray()
    .withMessage('user_ids harus berupa array'),
], generate);

router.get('/',         getAll);        // GET /api/payroll?month=YYYY-MM&status=
router.get('/summary',  getSummary);    // GET /api/payroll/summary?year=YYYY

router.patch('/:id/pay', [param('id').isInt()], markPaid);
router.post('/bulk-pay', [body('month').matches(/^\d{4}-\d{2}$/)], bulkPay);
router.delete('/:id',    [param('id').isInt()], remove);

module.exports = router;
