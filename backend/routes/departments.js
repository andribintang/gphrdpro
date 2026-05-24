const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getDepartments, createDepartment, updateDepartment,
  deleteDepartment, seedDepartments,
} = require('../controllers/departmentController');

router.use(authenticate);

router.get   ('/',         getDepartments);
router.post  ('/',         authorize('admin','hr'), createDepartment);
router.put   ('/:id',      authorize('admin','hr'), updateDepartment);
router.delete('/:id',      authorize('admin','hr'), deleteDepartment);
router.post  ('/seed',     authorize('admin','hr'), seedDepartments);

module.exports = router;
