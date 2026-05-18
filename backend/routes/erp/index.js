const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const master = require('../../controllers/erp/masterController');
const order  = require('../../controllers/erp/orderController');

const hrAdmin  = authorize('admin','hr');
const allRoles = authorize('admin','hr','supervisor','employee');

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

// ── Reports ──────────────────────────────────────────────────
router.get   ('/reports/sales',     authenticate, hrAdmin, order.getSalesReport);
router.get   ('/reports/shipments', authenticate, hrAdmin, order.getShipmentReport);

module.exports = router;
