const express    = require('express');
const router     = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/flipController');

// Public webhook (no auth — Flip calls this)
router.post('/webhook', ctrl.handleWebhook);

// Authenticated routes
router.use(authenticate);

router.get('/banks',                                          ctrl.getBanks);
router.post('/validate-account', authorize('admin','hr'),    ctrl.validateAccount);
router.post('/disburse/:runId',  authorize('admin','hr'),    ctrl.disburseRun);
router.post('/disburse-item/:itemId', authorize('admin','hr'), ctrl.disburseItem);
router.get('/status/:runId',     authorize('admin','hr'),    ctrl.getRunDisbursementStatus);

module.exports = router;
