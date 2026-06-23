const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const s = require('../../controllers/store/storeController');

// ── PUBLIC — no auth needed ────────────────────────────────────
// Config & display
router.get('/:brand/config',           s.getConfig);
router.get('/:brand/banners',          s.getBanners);
router.get('/:brand/categories',       s.getCategories);

// Products — PENTING: /featured harus SEBELUM /:slug
router.get('/:brand/products/featured',s.getFeatured);
router.get('/:brand/products',         s.getProducts);
router.get('/:brand/products/:slug',   s.getProductBySlug);

// ── AUTH ───────────────────────────────────────────────────────
router.post('/auth/register',          s.register);
router.post('/auth/login',             s.login);

// ── CART (session-based, opsional login) ──────────────────────
router.get   ('/cart',                 s.getCart);
router.post  ('/cart',                 s.addToCart);
router.patch ('/cart/:id',             s.updateCartItem);
router.delete('/cart/:id',             s.removeCartItem);
router.delete('/cart',                 s.clearCart);

// ── ONGKIR ─────────────────────────────────────────────────────
router.get ('/ongkir/provinces',       s.getProvinces);
router.get ('/ongkir/cities',          s.getCities);
router.post('/ongkir/cost',            s.getOngkirCost);

// ── VOUCHER ────────────────────────────────────────────────────
router.post('/voucher/check',          s.checkVoucher);

// ── ORDERS (publik — untuk akses tanpa login + webhook) ────────
router.post('/orders',                 s.createOrder);
router.get ('/orders/:id',             s.getOrder);
router.post('/payment/notification',   s.paymentNotification); // Midtrans webhook

// ── CUSTOMER (perlu token store customer) ─────────────────────
router.get   ('/customer/profile',            s.requireCustomer, s.getProfile);
router.put   ('/customer/profile',            s.requireCustomer, s.updateProfile);
router.post  ('/customer/addresses',          s.requireCustomer, s.addAddress);
router.put   ('/customer/addresses/:id',      s.requireCustomer, s.updateAddress);
router.delete('/customer/addresses/:id',      s.requireCustomer, s.deleteAddress);
router.get   ('/customer/orders',             s.requireCustomer, s.getMyOrders);

// ── ADMIN (perlu token ERP — authenticate) ─────────────────────
router.get ('/admin/stats',                   authenticate, s.getAdminStats);

// Products admin
router.get   ('/admin/products',              authenticate, s.getAdminProducts);
router.post  ('/admin/products',              authenticate, s.createAdminProduct);
router.put   ('/admin/products/:id',          authenticate, s.updateAdminProduct);
router.delete('/admin/products/:id',          authenticate, s.deleteAdminProduct);

// Orders admin
router.get   ('/admin/orders',                authenticate, s.getAdminOrders);
router.patch ('/admin/orders/:id/status',     authenticate, s.updateAdminOrderStatus);

// Banners admin
router.get   ('/admin/banners',               authenticate, s.getAdminBanners);
router.post  ('/admin/banners',               authenticate, s.upsertAdminBanner);
router.put   ('/admin/banners/:id',           authenticate, s.upsertAdminBanner);
router.delete('/admin/banners/:id',           authenticate, s.deleteAdminBanner);

// Categories admin
router.get   ('/admin/categories',            authenticate, s.getAdminCategories);
router.post  ('/admin/categories',            authenticate, s.upsertAdminCategory);
router.put   ('/admin/categories/:id',        authenticate, s.upsertAdminCategory);

// Vouchers admin
router.get   ('/admin/vouchers',              authenticate, s.getAdminVouchers);
router.post  ('/admin/vouchers',              authenticate, s.upsertAdminVoucher);
router.put   ('/admin/vouchers/:id',          authenticate, s.upsertAdminVoucher);

// Config admin
router.get   ('/admin/config',                authenticate, s.getAdminConfig);
router.put   ('/admin/config',                authenticate, s.updateAdminConfig);

module.exports = router;
