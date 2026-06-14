const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/quotesController');

router.get ('/today',      authenticate, ctrl.getToday);
router.get ('/history',    authenticate, authorize('admin','hr'), ctrl.getHistory);
router.post('/regenerate', authenticate, authorize('admin','hr'), ctrl.regenerate);

module.exports = router;
