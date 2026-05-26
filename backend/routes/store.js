const express  = require('express');
const router   = express.Router();
const { authenticate, authorize } = require('../middleware/auth'); // gphrdpro admin auth
const { authenticateCustomer, softAuthenticateCustomer } = require('../middleware/storeAuth');

const catalog  = require('../controllers/store/catalogController');
const authCtrl = require('../controllers/store/authController');
const cartCtrl = require('../controllers/store/cartController');
const checkout = require('../controllers/store/checkoutController');
const admin    = require('../controllers/store/adminController');

// ─────────────────────────────────────────────────────────────
// PUBLIC — No auth required
// ─────────────────────────────────────────────────────────────

// Store config & brand info
router.get('/:brand/config',            catalog.getConfig);
router.get('/:brand/categories',        catalog.getCategories);
router.get('/:brand/banners',           catalog.getBanners);
router.get('/:brand/products/featured', catalog.getFeatured);
router.get('/:brand/products',          catalog.getProducts);
router.get('/:brand/products/:slug',    catalog.getProduct);

// Shipping
router.get('/ongkir/provinces',  checkout.getProvinces);
router.get('/ongkir/cities',     checkout.getCities);
router.post('/ongkir/cost',      checkout.getOngkir);

// Voucher check (soft auth — discount may differ for members later)
router.post('/voucher/check', softAuthenticateCustomer, checkout.checkVoucher);

// Midtrans webhook (NO auth — called by Midtrans server)
router.post('/payment/notify', checkout.paymentNotify);

// ─────────────────────────────────────────────────────────────
// CUSTOMER AUTH
// ─────────────────────────────────────────────────────────────
router.post('/auth/register', authCtrl.register);
router.post('/auth/login',    authCtrl.login);

// ─────────────────────────────────────────────────────────────
// CUSTOMER PROTECTED
// ─────────────────────────────────────────────────────────────
router.get('/customer/profile',            authenticateCustomer, authCtrl.getProfile);
router.put('/customer/profile',            authenticateCustomer, authCtrl.updateProfile);
router.post('/customer/addresses',         authenticateCustomer, authCtrl.addAddress);
router.put('/customer/addresses/:id',      authenticateCustomer, authCtrl.updateAddress);
router.delete('/customer/addresses/:id',   authenticateCustomer, authCtrl.deleteAddress);
router.get('/customer/orders',             authenticateCustomer, checkout.getMyOrders);

// ─────────────────────────────────────────────────────────────
// CART — soft auth (works for guest + logged in)
// ─────────────────────────────────────────────────────────────
router.get('/cart',          softAuthenticateCustomer, cartCtrl.getCart);
router.post('/cart',         softAuthenticateCustomer, cartCtrl.addToCart);
router.patch('/cart/:id',    softAuthenticateCustomer, cartCtrl.updateCart);
router.delete('/cart/:id',   softAuthenticateCustomer, cartCtrl.removeFromCart);
router.delete('/cart',       softAuthenticateCustomer, cartCtrl.clearCart);

// ─────────────────────────────────────────────────────────────
// ORDERS — soft auth (guest can track with order id)
// ─────────────────────────────────────────────────────────────
router.post('/orders',       softAuthenticateCustomer, checkout.createOrder);
router.get('/orders/:id',    softAuthenticateCustomer, checkout.getOrder);

// ─────────────────────────────────────────────────────────────
// ADMIN — gphrdpro staff only (admin / hr)
// ─────────────────────────────────────────────────────────────
router.use('/admin', authenticate, authorize('admin', 'hr'));

router.get('/admin/stats',                   admin.getStats);
router.get('/admin/config',                  admin.getConfig);
router.post('/admin/config',                 admin.upsertConfig);
// Categories — read-only from ERP (no create/update/delete here)
router.get('/admin/categories',              admin.getCategories);
router.get('/admin/products',                admin.getProducts);
router.post('/admin/products',               admin.createProduct);
router.put('/admin/products/:id',            admin.updateProduct);
router.delete('/admin/products/:id',         admin.deleteProduct);
router.get('/admin/banners',                 admin.getBanners);
router.post('/admin/banners',                admin.createBanner);
router.put('/admin/banners/:id',             admin.updateBanner);
router.delete('/admin/banners/:id',          admin.deleteBanner);
router.get('/admin/vouchers',                admin.getVouchers);
router.post('/admin/vouchers',               admin.createVoucher);
router.put('/admin/vouchers/:id',            admin.updateVoucher);
router.get('/admin/orders',                  admin.getOrders);
router.patch('/admin/orders/:id/status',     admin.updateOrderStatus);

module.exports = router;
