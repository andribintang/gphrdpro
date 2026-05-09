const express = require('express');
const router  = express.Router();
const { body, param, query } = require('express-validator');
const {
  getAll, getOne, create, update,
  deactivate, reactivate, getStats, getDepartments,
} = require('../controllers/employeeController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ── Read — all authenticated roles ─────────────────────────
router.get('/stats',       authorize('admin', 'hr', 'supervisor'), getStats);
router.get('/departments', getDepartments);
router.get('/',            authorize('admin', 'hr', 'supervisor'), getAll);
router.get('/:id', [param('id').isInt()], getOne);

// ── Write — Admin / HR only ────────────────────────────────
router.post('/', authorize('admin', 'hr'), [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nama minimal 2 karakter'),
  body('email').isEmail().withMessage('Email tidak valid').normalizeEmail(),
  body('nip').trim().isLength({ min: 3, max: 50 }).withMessage('NIP minimal 3 karakter'),
  body('position').trim().notEmpty().withMessage('Jabatan diperlukan'),
  body('department').trim().notEmpty().withMessage('Departemen diperlukan'),
  body('salary_base').isNumeric().withMessage('Gaji harus berupa angka'),
  body('join_date').isDate().withMessage('Format tanggal bergabung tidak valid (YYYY-MM-DD)'),
  body('role').optional().isIn(['employee', 'hr', 'supervisor']).withMessage('Role tidak valid'),
], create);

router.put('/:id', [param('id').isInt()], update);

router.patch('/:id/deactivate', authorize('admin', 'hr'), [
  param('id').isInt(),
  body('status').optional().isIn(['inactive', 'terminated', 'on_leave']),
], deactivate);

router.patch('/:id/reactivate', authorize('admin', 'hr'), [param('id').isInt()], reactivate);

module.exports = router;
