// ════════════════════════════════════════════════════════════
// PATCH 1: backend/server.js
// ════════════════════════════════════════════════════════════

// [1] Di bagian require routes (sekitar line 17), TAMBAH:
const storeRoutes = require('./routes/store');

// [2] Di bagian app.use routes (sekitar line 514), TAMBAH:
app.use('/api/store', storeRoutes);

// [3] Di dalam array `alters` di endpoint /run-alter,
//     TAMBAH semua query dari file migration_store.js
//     (copy seluruh isi file tersebut ke dalam array alters)


// ════════════════════════════════════════════════════════════
// PATCH 2: backend/models/index.js
// ════════════════════════════════════════════════════════════

// [1] Di bagian require (setelah require LoanManagement), TAMBAH:
const {
  StoreConfig, StoreCategory, StoreProduct, StoreBanner,
  StoreCustomer, StoreAddress, StoreCart, StoreVoucher,
  StoreOrder, StoreOrderItem, StorePayment, StoreReview,
} = require('./store');

// [2] Di bagian module.exports, TAMBAH:
// StoreConfig, StoreCategory, StoreProduct, StoreBanner,
// StoreCustomer, StoreAddress, StoreCart, StoreVoucher,
// StoreOrder, StoreOrderItem, StorePayment, StoreReview,


// ════════════════════════════════════════════════════════════
// PATCH 3: backend/.env — tambah env vars
// ════════════════════════════════════════════════════════════

// MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxx      (sandbox) / Mid-server-xxxxxxxx (prod)
// MIDTRANS_IS_PRODUCTION=false
// RAJAONGKIR_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
// FRONTEND_GPDISTRO_URL=https://gpdistro.com
// FRONTEND_GPRACING_URL=https://gpracingstore.com
