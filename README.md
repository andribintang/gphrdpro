# 🎯 GPDISTRO Product Variants — Phase 1: Foundation

Pondasi untuk fitur variant proper dengan stock terpisah per kombinasi. Phase ini fokus di **database + CRUD variant + UI manage** di ProductsPage. Phase 2 (order flow) dan Phase 3 (opname & reporting) menyusul.

---

## 📦 Isi Paket

```
gphrdpro-variants-phase1/
├── README.md                                       ← file ini
├── migrations/
│   └── 002_variants_phase1.sql                     ← SQL migration (run di Railway DB)
├── backend/
│   ├── controllers/erp/
│   │   └── variantController.js                    ← NEW (CRUD + generate combinations)
│   └── routes/erp/
│       └── index.js                                ← REPLACE (sudah include variant routes)
└── frontend/
    └── src/
        ├── utils/erp/
        │   └── erpService.js                       ← REPLACE (tambah 7 variant methods)
        └── pages/erp/
            └── ProductsPage.jsx                    ← REPLACE (tab Varian + 2 modals baru)
```

---

## 🚀 Deployment Steps

### Step 1️⃣ — Extract & Copy File

Extract zip → drop folder `backend/` dan `frontend/` ke root repo. File akan auto-replace.

**File NEW:**
- `backend/controllers/erp/variantController.js`

**File REPLACE:**
- `backend/routes/erp/index.js`
- `frontend/src/utils/erp/erpService.js`
- `frontend/src/pages/erp/ProductsPage.jsx`

### Step 2️⃣ — Patch Backend Model

File: `backend/models/erp/index.js` — **tambah model `ProductVariant` baru**, dan **tambah field `variant_id`** ke model `Stock`, `StockMovement`, `OrderItem`.

**A. Tambahkan model baru sebelum atau sesudah model Product:**

```javascript
// ── PRODUCT VARIANT ───────────────────────────────────────────
const ProductVariant = sequelize.define('ErpProductVariant', {
  id:                   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id:           { type: DataTypes.INTEGER, allowNull: false },
  name:                 { type: DataTypes.STRING(150), allowNull: false },
  sku:                  { type: DataTypes.STRING(50),  allowNull: true },
  barcode:              { type: DataTypes.STRING(100), allowNull: true },
  attributes:           { type: DataTypes.JSON, allowNull: true },
  price_override:       { type: DataTypes.DECIMAL(15,2), allowNull: true },
  buy_price_override:   { type: DataTypes.DECIMAL(15,2), allowNull: true },
  weight_override:      { type: DataTypes.DECIMAL(8,2),  allowNull: true },
  stock_min:            { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active:            { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order:           { type: DataTypes.INTEGER, defaultValue: 0 },
  image_url:            { type: DataTypes.TEXT, allowNull: true },
  notes:                { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'erp_product_variants', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
```

**B. Update model `Stock` — tambah field `variant_id`:**

```javascript
const Stock = sequelize.define('ErpStock', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id:   { type: DataTypes.INTEGER, allowNull: false },
  variant_id:   { type: DataTypes.INTEGER, allowNull: true },   // ← BARU
  branch_id:    { type: DataTypes.INTEGER, allowNull: false },
  qty:          { type: DataTypes.INTEGER, defaultValue: 0 },
  qty_reserved: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'erp_stock', timestamps: false });
```

**C. Update model `StockMovement` — tambah field `variant_id`:**

```javascript
const StockMovement = sequelize.define('ErpStockMovement', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER, allowNull: true },     // ← BARU
  branch_id:  { type: DataTypes.INTEGER, allowNull: false },
  // ... field lainnya tetap
});
```

**D. Update model `OrderItem` — tambah field `variant_id` dan `variant_name`:**

```javascript
const OrderItem = sequelize.define('ErpOrderItem', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id:     { type: DataTypes.INTEGER, allowNull: false },
  product_id:   { type: DataTypes.INTEGER, allowNull: false },
  variant_id:   { type: DataTypes.INTEGER, allowNull: true },              // ← BARU
  variant_name: { type: DataTypes.STRING(150), allowNull: true },          // ← BARU
  // ... field lainnya tetap
});
```

**E. Export model baru di akhir file** — cari section `module.exports` dan tambahkan `ProductVariant`:

```javascript
module.exports = {
  // ...existing exports
  Product,
  ProductVariant,   // ← TAMBAH
  Stock,
  StockMovement,
  OrderItem,
  // ...
};
```

### Step 3️⃣ — Commit & Push

```bash
git add .
git commit -m "feat(erp): product variants phase 1 — foundation (model, CRUD, UI)"
git push
```

Tunggu Railway selesai redeploy backend (~1-2 menit, status Active).

### Step 4️⃣ — Jalankan Migrasi SQL

> ⚠️ Handler `/run-alter` di server.js Anda kemungkinan **belum** include statements untuk Phase 1 ini (handler-nya hardcoded). Pakai SQL langsung sebagai pendekatan utama untuk migrasi ini.

Di Railway → MySQL service → Query/Console, jalankan isi file `migrations/002_variants_phase1.sql`. Atau copy SQL ini langsung:

```sql
-- 1) Tabel utama varian
CREATE TABLE IF NOT EXISTS erp_product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(50) NULL,
  barcode VARCHAR(100) NULL,
  attributes JSON NULL,
  price_override DECIMAL(15,2) NULL,
  buy_price_override DECIMAL(15,2) NULL,
  weight_override DECIMAL(8,2) NULL,
  stock_min INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  image_url TEXT NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_product (product_id),
  KEY idx_sku (sku),
  KEY idx_active (product_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Stock per varian
ALTER TABLE erp_stock ADD COLUMN IF NOT EXISTS variant_id INT NULL AFTER product_id;
CREATE INDEX IF NOT EXISTS idx_stock_variant ON erp_stock (variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_lookup  ON erp_stock (product_id, variant_id, branch_id);

-- 3) Stock movement
ALTER TABLE erp_stock_movements ADD COLUMN IF NOT EXISTS variant_id INT NULL AFTER product_id;
CREATE INDEX IF NOT EXISTS idx_movement_variant ON erp_stock_movements (variant_id);

-- 4) Order item (prep untuk Phase 2)
ALTER TABLE erp_order_items
  ADD COLUMN IF NOT EXISTS variant_id   INT          NULL AFTER product_id,
  ADD COLUMN IF NOT EXISTS variant_name VARCHAR(150) NULL AFTER variant_id;
CREATE INDEX IF NOT EXISTS idx_orderitem_variant ON erp_order_items (variant_id);

-- Verifikasi
DESCRIBE erp_product_variants;
DESCRIBE erp_stock;
DESCRIBE erp_stock_movements;
DESCRIBE erp_order_items;
```

### Step 5️⃣ — Hard Refresh Browser & Test

Ctrl+Shift+R (atau buka di tab incognito).

---

## ✅ Testing Phase 1

1. **Buka `/erp/products`** → klik produk yang ada, masuk edit modal
2. **Pindah ke tab "Foto & Varian"**
3. Bagian atas: definisikan atribut (klik preset "Ukuran" + "Warna" atau buat manual)
4. **Klik tombol "Simpan"** di modal (varian foundation butuh produk sudah punya ID dulu)
5. **Buka lagi produk yang baru di-save** → tab Foto & Varian → sekarang muncul section **"Kombinasi Varian"** di bawah
6. **Klik "Generate Kombinasi"** → kombinasi auto-generate (mis. 3 Ukuran × 3 Warna = 9 varian)
7. Per varian, klik **🔧 (wrench icon)** untuk adjust stok (test add +10 di GP Racing branch, +5 di GP Distro)
8. Klik **✏️ (edit icon)** untuk ubah nama, SKU, harga override
9. Klik **⏻ (power icon)** untuk toggle aktif/nonaktif
10. Klik **🗑** untuk delete (akan gagal kalau sudah ada di order — sesuai design)

---

## 🆕 API Endpoints Baru

| Method | URL | Keterangan |
|---|---|---|
| GET | `/api/erp/products/:productId/variants` | List varian + stock breakdown per cabang |
| POST | `/api/erp/products/:productId/variants` | Buat satu varian manual |
| POST | `/api/erp/products/:productId/variants/generate` | Generate kombinasi otomatis dari schema |
| PUT | `/api/erp/variants/:id` | Update varian |
| DELETE | `/api/erp/variants/:id` | Hapus (tolak jika ada di order) |
| POST | `/api/erp/variants/:id/toggle` | Toggle aktif/nonaktif |
| POST | `/api/erp/variants/:id/adjust-stock` | Adjust stok per varian per cabang (dengan audit) |

---

## 🛠️ Apa yang BELUM di Phase 1 (untuk Phase 2 & 3)

- ❌ Selector varian di **NewOrderPage** saat add product ke order
- ❌ Stock decrement saat order **per variant** (sekarang masih per-product saja)
- ❌ **Purchase** receive ke varian spesifik
- ❌ **StockOpname** input fisik per varian
- ❌ **InventoryPage** breakdown per varian (expand/collapse)
- ❌ Laporan top variant
- ❌ Migrate produk lama yang punya `store_variants` JSON ke variant rows

Semua di atas akan dibuat di Phase 2 (order & stock flow) dan Phase 3 (opname & reporting).

---

## 🔧 Troubleshooting

**Q: "Simpan produk dulu" muncul di tab Varian padahal produk sudah di-edit?**
A: Refresh page. Component butuh `product.id` ada di state dan ada di DB.

**Q: Klik "Generate Kombinasi" → "Schema atribut wajib"?**
A: Atribut di VariantEditor bagian atas masih kosong atau ada grup yang nilainya kosong. Pastikan setiap grup (Ukuran/Warna) ada minimal 1 nilai.

**Q: Generate dengan overwrite gagal "VARIANTS_USED_IN_ORDERS"?**
A: Sesuai design — varian yang sudah dipakai di order tidak bisa di-overwrite. Hapus orderan dulu (jika hanya untuk test), atau pakai mode "tambahan" (jangan overwrite).

**Q: Adjust stok tapi muncul "Stok tidak boleh negatif"?**
A: Cek stok saat ini di kolom Stok di tabel. Pastikan delta yang dimasukkan tidak membuat stok jadi minus.

**Q: API endpoint variant return 500?**
A: Kemungkinan model `ProductVariant` belum di-define di `models/erp/index.js` atau belum di-export. Cek Step 2.

---

**Project:** GPDISTRO RACING ID
**Phase:** 1 / 3
**Next:** Phase 2 — Order flow with variant selector + stock decrement per variant
