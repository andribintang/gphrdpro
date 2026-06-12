const express    = require('express');
const router     = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');

const hrAdmin  = authorize('admin','hr');
const allRoles = authorize('admin','hr','supervisor','employee');

const master    = require('../../controllers/erp/masterController');
const target    = require('../../controllers/erp/channelTargetController');
const inventory = require('../../controllers/erp/inventoryController');
const target    = require('../../controllers/erp/channelTargetController');
const order    = require('../../controllers/erp/orderController');
const purchase = require('../../controllers/erp/purchaseController');
const ret      = require('../../controllers/erp/returnController');

// ── Employees (for WA sub channel selector) ──────────────────
router.get('/employees', authenticate, allRoles, async (req, res, next) => {
  try {
    const incentiveModels = require('../../models/incentive');
    const { IncEmployee, Branch } = incentiveModels;
    const rows = await IncEmployee.findAll({
      include: [{ model: Branch, as: 'branch', attributes: ['id','name'] }],
      order: [['branch_id','ASC'],['name','ASC']],
      attributes: ['id','name','employee_code','employment_status','branch_id'],
    });
    return res.json({ success: true, data: { employees: rows } });
  } catch (err) {
    console.error('ERP employees error:', err.message);
    next(err);
  }
});

// ── Sub Channels ─────────────────────────────────────────────
router.get   ('/sub-channels',        authenticate, allRoles, master.getSubChannels);
router.get   ('/sub-channels/all',    authenticate, allRoles, master.getAllSubChannels);
router.post  ('/sub-channels',        authenticate, hrAdmin,  master.createSubChannel);
router.put   ('/sub-channels/:id',    authenticate, hrAdmin,  master.updateSubChannel);
router.delete('/sub-channels/:id',    authenticate, hrAdmin,  master.deleteSubChannel);

// ── Categories ───────────────────────────────────────────────
router.get   ('/categories',          authenticate, allRoles, master.getCategories);
router.post  ('/categories',          authenticate, hrAdmin,  master.createCategory);
router.put   ('/categories/:id',      authenticate, hrAdmin,  master.updateCategory);
router.delete('/categories/:id',      authenticate, hrAdmin,  master.deleteCategory);

// ── Products ─────────────────────────────────────────────────
router.get   ('/products',            authenticate, allRoles, master.getProducts);
router.get   ('/products/barcode/:code', authenticate, allRoles, master.getProductByBarcode);
router.post  ('/products',            authenticate, hrAdmin,  master.createProduct);
router.put   ('/products/:id',        authenticate, hrAdmin,  master.updateProduct);
router.delete('/products/:id',        authenticate, hrAdmin,  master.deleteProduct);
router.post  ('/products/:id/adjust-stock', authenticate, hrAdmin, master.adjustStock);

// ── Customers ─────────────────────────────────────────────────
router.get   ('/customers',           authenticate, allRoles, master.getCustomers);
router.post  ('/customers',           authenticate, hrAdmin,  master.createCustomer);
router.put   ('/customers/:id',       authenticate, hrAdmin,  master.updateCustomer);

// ── Orders ───────────────────────────────────────────────────
router.get   ('/orders',              authenticate, allRoles, order.getOrders);
router.get   ('/orders/:id',          authenticate, allRoles, order.getOrderDetail);
router.post  ('/orders',              authenticate, allRoles, order.createOrder);
router.post  ('/orders/:id/confirm',  authenticate, hrAdmin,  order.confirmOrder);
router.post  ('/orders/:id/complete', authenticate, hrAdmin,  order.completeOrder);
router.post  ('/orders/:id/cancel',   authenticate, hrAdmin,  order.cancelOrder);
router.post  ('/orders/:id/payment',  authenticate, hrAdmin,  order.addPayment);
router.put   ('/orders/:id/payments/:paymentId/verify', authenticate, hrAdmin, order.verifyPayment);
router.post  ('/orders/:id/shipment', authenticate, hrAdmin,  order.addShipment);
router.put   ('/orders/:id/shipments/:shipmentId', authenticate, hrAdmin, order.updateShipment);

// ── Returns ──────────────────────────────────────────────────
router.get   ('/returns',              authenticate, allRoles, ret.getReturns);
router.get   ('/returns/:id',          authenticate, allRoles, ret.getReturnDetail);
router.post  ('/returns',              authenticate, hrAdmin,  ret.createReturn);
router.post  ('/returns/:id/confirm',  authenticate, hrAdmin,  ret.confirmReturn);
router.post  ('/returns/:id/reject',   authenticate, hrAdmin,  ret.rejectReturn);

// ── Purchases ────────────────────────────────────────────────
router.get   ('/suppliers',             authenticate, allRoles,  purchase.getSuppliers);
router.get   ('/purchases',            authenticate, allRoles, purchase.getPurchases);
router.get   ('/purchases/:id',        authenticate, allRoles, purchase.getPurchaseDetail);
router.post  ('/purchases',            authenticate, hrAdmin,  purchase.createPurchase);
router.post  ('/purchases/:id/receive',authenticate, hrAdmin,  purchase.receivePurchase);
router.put   ('/purchases/:id',         authenticate, hrAdmin,  purchase.updatePurchase);
router.post  ('/purchases/:id/cancel', authenticate, hrAdmin,  purchase.cancelPurchase);

// ── Expenses ──────────────────────────────────────────────────
router.get   ('/expenses',             authenticate, allRoles, purchase.getExpenses);
router.post  ('/expenses',             authenticate, hrAdmin,  purchase.createExpense);
router.put   ('/expenses/:id',         authenticate, hrAdmin,  purchase.updateExpense);
router.delete('/expenses/:id',         authenticate, hrAdmin,  purchase.deleteExpense);

// ── Stock Opname ──────────────────────────────────────────────
// Channel Sales Targets
router.get   ('/channel-targets',         authenticate, allRoles, target.getTargets);
router.get   ('/channel-targets/summary', authenticate, allRoles, target.getSummary);
router.post  ('/channel-targets',         authenticate, hrAdmin,  target.upsertTarget);
router.post  ('/channel-targets/bulk',    authenticate, hrAdmin,  target.bulkUpsert);
router.delete('/channel-targets/:id',     authenticate, hrAdmin,  target.deleteTarget);

// Inventory Intelligence
router.get   ('/inventory/summary',        authenticate, allRoles, inventory.getSummary);
router.get   ('/inventory/movements',      authenticate, allRoles, inventory.getMovements);
router.get   ('/inventory/stock-value',    authenticate, allRoles, inventory.getStockValue);
router.get   ('/inventory/movement-trend', authenticate, allRoles, inventory.getMovementTrend);
router.post  ('/inventory/reorder',        authenticate, hrAdmin,  inventory.createReorderSuggestion);

router.get   ('/stock-opname',         authenticate, allRoles, purchase.getStockOpname);
router.post  ('/stock-opname',         authenticate, hrAdmin,  purchase.submitStockOpname);

// ── Import ───────────────────────────────────────────────────
router.post  ('/import/products',      authenticate, hrAdmin,  master.importProducts);
router.post  ('/import/customers',     authenticate, hrAdmin,  master.importCustomers);

// ── Reports ──────────────────────────────────────────────────
router.get   ('/reports/sales',        authenticate, allRoles, order.getSalesReport);
router.get   ('/reports/shipments',    authenticate, allRoles, order.getShipmentReport);
router.get   ('/reports/daily',        authenticate, allRoles, order.getDailyReport);
router.get   ('/reports/channel',      authenticate, allRoles, order.getChannelReport);
router.get   ('/reports/profit-loss',  authenticate, hrAdmin,  purchase.getProfitLoss);

module.exports = router;
