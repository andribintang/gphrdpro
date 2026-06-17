const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/cleanupErpController');

const adminOnly = authorize('admin');

router.get   ('/summary',         authenticate, adminOnly, ctrl.getSummary);
router.delete('/orders',          authenticate, adminOnly, ctrl.cleanOrders);
router.delete('/products',        authenticate, adminOnly, ctrl.cleanProducts);
router.delete('/stock-movements', authenticate, adminOnly, ctrl.cleanStockMovements);
router.delete('/customers',       authenticate, adminOnly, ctrl.cleanCustomers);
router.delete('/import-logs',     authenticate, adminOnly, ctrl.cleanImportLogs);
router.delete('/store',           authenticate, adminOnly, ctrl.cleanStore);
router.delete('/channel-targets', authenticate, adminOnly, ctrl.cleanChannelTargets);
router.delete('/all',             authenticate, adminOnly, ctrl.cleanAll);

module.exports = router;
