const express    = require('express');
const router     = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');

// ⚠️ Semua karyawan kini punya akses penuh ke modul ERP, termasuk
//   - create/edit/delete master data (produk, kategori, customer, sub-channel)
//   - approve/cancel order, verify payment, kirim shipment
//   - retur, pembelian, pengeluaran, stock opname, import
//   - laporan keuangan (profit-loss)
// Hak akses dibatasi hanya oleh middleware authenticate (login wajib).
const allRoles = authorize('admin','hr','supervisor','employee');

const master    = require('../../controllers/erp/masterController');
const customer  = require('../../controllers/erp/customerController');
const variant  = require('../../controllers/erp/variantController');
const target    = require('../../controllers/erp/channelTargetController');
const inventory = require('../../controllers/erp/inventoryController');
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
router.post  ('/sub-channels',        authenticate, allRoles, master.createSubChannel);
router.put   ('/sub-channels/:id',    authenticate, allRoles, master.updateSubChannel);
router.delete('/sub-channels/:id',    authenticate, allRoles, master.deleteSubChannel);

// ── Categories ───────────────────────────────────────────────
router.get   ('/categories',          authenticate, allRoles, master.getCategories);
router.post  ('/categories',          authenticate, allRoles, master.createCategory);
router.put   ('/categories/:id',      authenticate, allRoles, master.updateCategory);
router.delete('/categories/:id',      authenticate, allRoles, master.deleteCategory);

// ── Products ─────────────────────────────────────────────────
router.get   ('/products',            authenticate, allRoles, master.getProducts);
router.get   ('/products/barcode/:code', authenticate, allRoles, master.getProductByBarcode);
router.post  ('/products',            authenticate, allRoles, master.createProduct);
router.put   ('/products/:id',        authenticate, allRoles, master.updateProduct);
router.delete('/products/:id',        authenticate, allRoles, master.deleteProduct);
router.post  ('/products/:id/adjust-stock', authenticate, allRoles, master.adjustStock);

// ── Product Variants ─────────────────────────────────────────
router.get   ('/products/:productId/variants',          authenticate, allRoles, variant.getVariants);
router.post  ('/products/:productId/variants',          authenticate, allRoles, variant.createVariant);
router.post  ('/products/:productId/variants/generate', authenticate, allRoles, variant.generateCombinations);
router.put   ('/variants/:id',                          authenticate, allRoles, variant.updateVariant);
router.delete('/variants/:id',                          authenticate, allRoles, variant.deleteVariant);
router.post  ('/variants/:id/toggle',                   authenticate, allRoles, variant.toggleVariant);
router.post  ('/variants/:id/adjust-stock',             authenticate, allRoles, variant.adjustVariantStock);

// ── Customers (NEW dedicated controller) ─────────────────────
router.get   ('/customers',                   authenticate, allRoles, customer.getCustomers);
router.get   ('/customers/check-duplicate',   authenticate, allRoles, customer.checkDuplicate);
router.get   ('/customers/:id',               authenticate, allRoles, customer.getCustomerDetail);
router.get   ('/customers/:id/orders',        authenticate, allRoles, customer.getCustomerOrders);
router.post  ('/customers',                   authenticate, allRoles, customer.createCustomer);
router.put   ('/customers/:id',               authenticate, allRoles, customer.updateCustomer);
router.delete('/customers/:id',               authenticate, allRoles, customer.deleteCustomer);

// ── Orders ───────────────────────────────────────────────────
router.get   ('/orders',              authenticate, allRoles, order.getOrders);
router.get   ('/orders/:id',          authenticate, allRoles, order.getOrderDetail);
router.post  ('/orders',              authenticate, allRoles, order.createOrder);
router.post  ('/orders/:id/confirm',  authenticate, allRoles, order.confirmOrder);
router.post  ('/orders/:id/complete', authenticate, allRoles, order.completeOrder);
router.post  ('/orders/:id/cancel',   authenticate, allRoles, order.cancelOrder);
router.post  ('/orders/:id/payment',  authenticate, allRoles, order.addPayment);
router.put   ('/orders/:id/payments/:paymentId/verify', authenticate, allRoles, order.verifyPayment);
router.post  ('/orders/:id/shipment', authenticate, allRoles, order.addShipment);
router.put   ('/orders/:id/shipments/:shipmentId', authenticate, allRoles, order.updateShipment);

// ── Returns ──────────────────────────────────────────────────
router.get   ('/returns',              authenticate, allRoles, ret.getReturns);
router.get   ('/returns/:id',          authenticate, allRoles, ret.getReturnDetail);
router.post  ('/returns',              authenticate, allRoles, ret.createReturn);
router.post  ('/returns/:id/confirm',  authenticate, allRoles, ret.confirmReturn);
router.post  ('/returns/:id/reject',   authenticate, allRoles, ret.rejectReturn);

// ── Purchases ────────────────────────────────────────────────
router.get   ('/suppliers',             authenticate, allRoles, purchase.getSuppliers);
router.get   ('/purchases',            authenticate, allRoles, purchase.getPurchases);
router.get   ('/purchases/:id',        authenticate, allRoles, purchase.getPurchaseDetail);
router.post  ('/purchases',            authenticate, allRoles, purchase.createPurchase);
router.post  ('/purchases/:id/receive',authenticate, allRoles, purchase.receivePurchase);
router.put   ('/purchases/:id',         authenticate, allRoles, purchase.updatePurchase);
router.post  ('/purchases/:id/cancel', authenticate, allRoles, purchase.cancelPurchase);

// ── Expenses ──────────────────────────────────────────────────
router.get   ('/expenses',             authenticate, allRoles, purchase.getExpenses);
router.post  ('/expenses',             authenticate, allRoles, purchase.createExpense);
router.put   ('/expenses/:id',         authenticate, allRoles, purchase.updateExpense);
router.delete('/expenses/:id',         authenticate, allRoles, purchase.deleteExpense);

// ── Channel Sales Targets ────────────────────────────────────
router.get   ('/channel-targets',         authenticate, allRoles, target.getTargets);
router.get   ('/channel-targets/summary', authenticate, allRoles, target.getSummary);
router.post  ('/channel-targets',         authenticate, allRoles, target.upsertTarget);
router.post  ('/channel-targets/bulk',    authenticate, allRoles, target.bulkUpsert);
router.delete('/channel-targets/:id',     authenticate, allRoles, target.deleteTarget);

// ── Inventory Intelligence ───────────────────────────────────
router.get   ('/inventory/summary',        authenticate, allRoles, inventory.getSummary);
router.get   ('/inventory/movements',      authenticate, allRoles, inventory.getMovements);
router.get   ('/inventory/stock-value',    authenticate, allRoles, inventory.getStockValue);
router.get   ('/inventory/movement-trend', authenticate, allRoles, inventory.getMovementTrend);
router.post  ('/inventory/reorder',        authenticate, allRoles, inventory.createReorderSuggestion);

// ── Stock Opname ──────────────────────────────────────────────
router.get   ('/stock-opname',         authenticate, allRoles, purchase.getStockOpname);
router.post  ('/stock-opname',         authenticate, allRoles, purchase.submitStockOpname);

// ── Import ───────────────────────────────────────────────────
router.post  ('/import/products',      authenticate, allRoles, master.importProducts);
router.post  ('/import/customers',     authenticate, allRoles, master.importCustomers);
router.post  ('/import/orders',        authenticate, allRoles, master.importOrders);
router.post  ('/marketplace-import/parse',   authenticate, allRoles, master.parseMarketplaceExport);
router.post  ('/marketplace-import/confirm', authenticate, allRoles, master.confirmMarketplaceImport);
router.get   ('/marketplace-import/mappings',        authenticate, allRoles, master.getMarketplaceMappings);
router.delete('/marketplace-import/mappings/:id',    authenticate, allRoles, master.deleteMarketplaceMapping);

// ── Reports ──────────────────────────────────────────────────
router.get   ('/reports/sales',        authenticate, allRoles, order.getSalesReport);
router.get   ('/reports/shipments',    authenticate, allRoles, order.getShipmentReport);
router.get   ('/reports/daily',        authenticate, allRoles, order.getDailyReport);
router.get   ('/reports/channel',      authenticate, allRoles, order.getChannelReport);
router.get   ('/reports/profit-loss',  authenticate, allRoles, purchase.getProfitLoss);

module.exports = router;
