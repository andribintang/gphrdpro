const { sequelize } = require('../config/database');

const CLEANUP_SECRET = process.env.CLEANUP_SECRET || 'HAPUS-DATA-GPDISTRO-2024';

const verifySecret = (req, res) => {
  const secret = req.headers['x-cleanup-secret'] || req.body.secret;
  if (secret !== CLEANUP_SECRET) {
    res.status(403).json({ success:false, message:'Secret tidak valid. Gunakan header x-cleanup-secret.' });
    return false;
  }
  return true;
};

// ── GET /api/cleanup-erp/summary ──────────────────────────────
const getSummary = async (req, res, next) => {
  try {
    const tableCount = async (tbl) => {
      try {
        const [[{cnt}]] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM ${tbl}`);
        return parseInt(cnt);
      } catch { return 0; }
    };

    const [
      products, stock, stockMovements, customers,
      orders, orderItems, payments, shipments,
      returns, returnItems, importLogs, channelTargets,
      storeProducts, storeOrders, storeCustomers,
    ] = await Promise.all([
      tableCount('erp_products'), tableCount('erp_stock'), tableCount('erp_stock_movements'),
      tableCount('erp_customers'), tableCount('erp_orders'), tableCount('erp_order_items'),
      tableCount('erp_payments'), tableCount('erp_shipments'), tableCount('erp_returns'),
      tableCount('erp_return_items'), tableCount('erp_import_logs'), tableCount('erp_channel_targets'),
      tableCount('store_products'), tableCount('store_orders'), tableCount('store_customers'),
    ]);

    return res.json({
      success: true,
      data: { counts: {
        products, stock, stock_movements: stockMovements, customers,
        orders, order_items: orderItems, payments, shipments,
        returns, return_items: returnItems, import_logs: importLogs, channel_targets: channelTargets,
        store_products: storeProducts, store_orders: storeOrders, store_customers: storeCustomers,
      }},
    });
  } catch(err) { next(err); }
};

// ── DELETE /api/cleanup-erp/orders ────────────────────────────
// Hapus semua transaksi order (orders, items, payments, shipments, returns)
const cleanOrders = async (req, res, next) => {
  if (!verifySecret(req, res)) return;
  try {
    const t = await sequelize.transaction();
    try {
      const counts = {};
      const tables = ['erp_return_items','erp_returns','erp_shipments','erp_payments','erp_order_items','erp_orders'];
      for (const tbl of tables) {
        try {
          const [, meta] = await sequelize.query(`DELETE FROM ${tbl}`, { transaction: t });
          counts[tbl] = meta || 0;
        } catch(e) { counts[tbl] = `skip (${e.message.slice(0,30)})`; }
      }
      await t.commit();
      return res.json({ success:true, message:'Semua data transaksi order ERP berhasil dihapus', data:{ counts } });
    } catch(e) { await t.rollback(); throw e; }
  } catch(err) { next(err); }
};

// ── DELETE /api/cleanup-erp/products ──────────────────────────
// Hapus semua produk + stok + riwayat mutasi
const cleanProducts = async (req, res, next) => {
  if (!verifySecret(req, res)) return;
  try {
    const t = await sequelize.transaction();
    try {
      const counts = {};
      const tables = ['erp_stock_movements','erp_stock','erp_order_items','erp_products'];
      for (const tbl of tables) {
        try {
          const [, meta] = await sequelize.query(`DELETE FROM ${tbl}`, { transaction: t });
          counts[tbl] = meta || 0;
        } catch(e) { counts[tbl] = `skip (${e.message.slice(0,30)})`; }
      }
      await t.commit();
      return res.json({ success:true, message:'Semua data produk & stok berhasil dihapus', data:{ counts } });
    } catch(e) { await t.rollback(); throw e; }
  } catch(err) { next(err); }
};

// ── DELETE /api/cleanup-erp/stock-movements ───────────────────
// Hanya hapus riwayat mutasi stok (produk & stok tetap)
const cleanStockMovements = async (req, res, next) => {
  if (!verifySecret(req, res)) return;
  try {
    const [[{cnt}]] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM erp_stock_movements`);
    await sequelize.query(`DELETE FROM erp_stock_movements`);
    return res.json({ success:true, message:`${cnt} riwayat mutasi stok dihapus`, data:{ deleted: parseInt(cnt) } });
  } catch(err) { next(err); }
};

// ── DELETE /api/cleanup-erp/customers ─────────────────────────
const cleanCustomers = async (req, res, next) => {
  if (!verifySecret(req, res)) return;
  try {
    const [[{cnt}]] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM erp_customers`);
    await sequelize.query(`DELETE FROM erp_customers`);
    return res.json({ success:true, message:`${cnt} data pelanggan dihapus`, data:{ deleted: parseInt(cnt) } });
  } catch(err) { next(err); }
};

// ── DELETE /api/cleanup-erp/import-logs ───────────────────────
const cleanImportLogs = async (req, res, next) => {
  if (!verifySecret(req, res)) return;
  try {
    const [[{cnt}]] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM erp_import_logs`);
    await sequelize.query(`DELETE FROM erp_import_logs`);
    return res.json({ success:true, message:`${cnt} log import dihapus`, data:{ deleted: parseInt(cnt) } });
  } catch(err) { next(err); }
};

// ── DELETE /api/cleanup-erp/store ─────────────────────────────
// Hapus semua data toko online (carts, orders, payments, reviews — produk/kategori tetap)
const cleanStore = async (req, res, next) => {
  if (!verifySecret(req, res)) return;
  try {
    const t = await sequelize.transaction();
    try {
      const counts = {};
      const tables = ['store_reviews','store_payments','store_order_items','store_orders','store_carts','store_vouchers'];
      for (const tbl of tables) {
        try {
          const [, meta] = await sequelize.query(`DELETE FROM ${tbl}`, { transaction: t });
          counts[tbl] = meta || 0;
        } catch(e) { counts[tbl] = `skip (${e.message.slice(0,30)})`; }
      }
      await t.commit();
      return res.json({ success:true, message:'Data transaksi toko online berhasil dihapus', data:{ counts } });
    } catch(e) { await t.rollback(); throw e; }
  } catch(err) { next(err); }
};

// ── DELETE /api/cleanup-erp/channel-targets ───────────────────
const cleanChannelTargets = async (req, res, next) => {
  if (!verifySecret(req, res)) return;
  try {
    const [[{cnt}]] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM erp_channel_targets`);
    await sequelize.query(`DELETE FROM erp_channel_targets`);
    return res.json({ success:true, message:`${cnt} target sales channel dihapus`, data:{ deleted: parseInt(cnt) } });
  } catch(err) { next(err); }
};

// ── DELETE /api/cleanup-erp/all ────────────────────────────────
// Hapus SEMUA data ERP (transaksi + produk + pelanggan) — sangat berbahaya
const cleanAll = async (req, res, next) => {
  if (!verifySecret(req, res)) return;
  try {
    const t = await sequelize.transaction();
    try {
      const counts = {};
      const tables = [
        'erp_return_items','erp_returns','erp_shipments','erp_payments',
        'erp_order_items','erp_orders','erp_stock_movements','erp_stock',
        'erp_products','erp_customers','erp_import_logs','erp_channel_targets',
        'store_reviews','store_payments','store_order_items','store_orders','store_carts','store_vouchers',
      ];
      for (const tbl of tables) {
        try {
          const [, meta] = await sequelize.query(`DELETE FROM ${tbl}`, { transaction: t });
          counts[tbl] = meta || 0;
        } catch(e) { counts[tbl] = `skip (${e.message.slice(0,30)})`; }
      }
      await t.commit();
      return res.json({ success:true, message:'SEMUA data ERP & Toko Online berhasil dihapus', data:{ counts } });
    } catch(e) { await t.rollback(); throw e; }
  } catch(err) { next(err); }
};

module.exports = {
  getSummary, cleanOrders, cleanProducts, cleanStockMovements,
  cleanCustomers, cleanImportLogs, cleanStore, cleanChannelTargets, cleanAll,
};
