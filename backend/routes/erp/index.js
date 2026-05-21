const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const master = require('../../controllers/erp/masterController');
const order    = require('../../controllers/erp/orderController');
const purchase = require('../../controllers/erp/purchaseController');

const hrAdmin  = authorize('admin','hr');
const allRoles = authorize('admin','hr','supervisor','employee');

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
router.get   ('/sub-channels/all',    authenticate, hrAdmin,  master.getAllSubChannels);
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
router.post  ('/products/stock/adjust', authenticate, hrAdmin, master.adjustStock);

// ── Customers ────────────────────────────────────────────────
router.get   ('/customers',           authenticate, allRoles, master.getCustomers);
router.post  ('/customers',           authenticate, allRoles, master.createCustomer);
router.put   ('/customers/:id',       authenticate, allRoles, master.updateCustomer);

// ── Import ───────────────────────────────────────────────────
router.get   ('/import/template/:type', authenticate, hrAdmin, master.getImportTemplate);
router.post  ('/import',              authenticate, hrAdmin,   master.importData);

// ── Orders ───────────────────────────────────────────────────
router.get   ('/orders',              authenticate, allRoles, order.getOrders);
router.get   ('/orders/:id',          authenticate, allRoles, order.getOrderDetail);
router.post  ('/orders',              authenticate, allRoles, order.createOrder);
router.post  ('/orders/:id/confirm',  authenticate, hrAdmin,  order.confirmOrder);
router.post  ('/orders/:id/complete', authenticate, hrAdmin,  order.completeOrder);
router.post  ('/orders/:id/cancel',   authenticate, hrAdmin,  order.cancelOrder);

// ── Payments ─────────────────────────────────────────────────
router.post  ('/orders/:id/payments',                     authenticate, allRoles, order.addPayment);
router.post  ('/orders/:id/payments/:paymentId/verify',   authenticate, hrAdmin,  order.verifyPayment);

// ── Shipments ────────────────────────────────────────────────
router.post  ('/orders/:id/shipment',                         authenticate, hrAdmin, order.addShipment);
router.put   ('/orders/:id/shipment/:shipmentId',             authenticate, hrAdmin, order.updateShipment);

// ── Purchases ────────────────────────────────────────────────
router.get   ('/purchases',                    authenticate, hrAdmin,  purchase.getPurchases);
router.get   ('/purchases/:id',                authenticate, hrAdmin,  purchase.getPurchaseDetail);
router.post  ('/purchases',                    authenticate, hrAdmin,  purchase.createPurchase);
router.post  ('/purchases/:id/receive',        authenticate, hrAdmin,  purchase.receivePurchase);
router.post  ('/purchases/:id/cancel',         authenticate, hrAdmin,  purchase.cancelPurchase);

// ── Expenses ──────────────────────────────────────────────────
router.get   ('/expenses',                     authenticate, hrAdmin,  purchase.getExpenses);
router.post  ('/expenses',                     authenticate, hrAdmin,  purchase.createExpense);
router.put   ('/expenses/:id',                 authenticate, hrAdmin,  purchase.updateExpense);
router.delete('/expenses/:id',                 authenticate, hrAdmin,  purchase.deleteExpense);

// ── Profit & Loss ─────────────────────────────────────────────
router.get   ('/reports/profit-loss',          authenticate, hrAdmin,  purchase.getProfitLoss);

// ── Stock Opname ──────────────────────────────────────────────
router.get   ('/stock-opname',                 authenticate, hrAdmin,  purchase.getStockOpname);
router.post  ('/stock-opname',                 authenticate, hrAdmin,  purchase.submitStockOpname);

// ── Reports ──────────────────────────────────────────────────
router.get   ('/reports/sales',     authenticate, allRoles, order.getSalesReport);
router.get   ('/reports/shipments', authenticate, allRoles, order.getShipmentReport);

module.exports = router;
