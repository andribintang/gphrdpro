const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/backupController');

const adminOnly = authorize('admin');

router.get   ('/',         authenticate, adminOnly, ctrl.getBackups);
router.post  ('/run',      authenticate, adminOnly, ctrl.createBackup);
router.post  ('/restore',  authenticate, adminOnly, ctrl.restoreBackup);
router.get   ('/schedule', authenticate, adminOnly, ctrl.getSchedule);
router.put   ('/schedule', authenticate, adminOnly, ctrl.updateSchedule);
router.delete('/:id',      authenticate, adminOnly, ctrl.deleteBackup);

module.exports = router;
