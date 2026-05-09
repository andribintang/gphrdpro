const express = require('express');
const router  = express.Router();
const { body, query, param } = require('express-validator');
const {
  create, getMyLeaves, getMyQuota, getOne, cancel,
  getPending, getAll, approve, reject,
} = require('../controllers/leaveController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ── Employee ─────────────────────────────────────────────────
router.post('/', [
  body('type').isIn(['annual','sick','emergency','maternity','paternity','unpaid','other']).withMessage('Tipe cuti tidak valid'),
  body('start_date').isDate().withMessage('Format tanggal mulai tidak valid (YYYY-MM-DD)'),
  body('end_date').isDate().withMessage('Format tanggal selesai tidak valid (YYYY-MM-DD)'),
  body('reason').trim().isLength({ min: 10, max: 1000 }).withMessage('Alasan minimal 10 karakter'),
], create);

router.get('/',       getMyLeaves);
router.get('/quota',  getMyQuota);
router.get('/:id',    [param('id').isInt()], getOne);
router.delete('/:id', [param('id').isInt()], cancel);

// ── Admin / HR / Supervisor ───────────────────────────────────
router.get('/admin/pending', authorize('admin', 'hr', 'supervisor'), getPending);
router.get('/admin/all',     authorize('admin', 'hr', 'supervisor'), getAll);

router.patch('/:id/approve', authorize('admin', 'hr', 'supervisor'), approve);
router.patch('/:id/reject',  authorize('admin', 'hr', 'supervisor'), [
  body('rejection_reason').optional().isString().isLength({ max: 500 }),
], reject);

module.exports = router;
