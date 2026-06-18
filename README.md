# 🎯 GPDISTRO Customer Module Upgrade — Paket A

Upgrade besar untuk modul Pelanggan: KPI dashboard, filter chips, drawer detail dengan order history, segmentasi RFM otomatis, WhatsApp quick action, duplicate detection, tag/label customer, source tracking, birthday, dan **cascade dropdown wilayah Indonesia** (Provinsi → Kab/Kota → Kecamatan → Kelurahan).

---

## 📦 Isi Paket

```
gphrdpro-customers-upgrade/
├── README.md                                        ← file ini
├── migrations/
│   └── 001_customers_upgrade.sql                    ← FALLBACK SQL (kalau /run-alter miss)
├── backend/
│   ├── controllers/erp/customerController.js        ← NEW dedicated controller
│   └── routes/erp/index.js                          ← REPLACE (sudah include allRoles)
└── frontend/src/
    ├── components/WilayahPicker.jsx                 ← NEW component
    ├── pages/erp/CustomersPage.jsx                  ← REPLACE redesign
    └── utils/wilayah.js                             ← NEW utility
```

---

## 🚀 Deployment Steps — URUTAN WAJIB

> ⚠️ **Migrasi pakai endpoint `/run-alter` via Postman, BUKAN SQL langsung.**
> SQL di folder `migrations/` adalah **fallback** kalau `/run-alter` miss tabel/kolom.

### Step 1️⃣ — Extract & Copy File

Extract zip → drop folder `backend/` dan `frontend/` ke root repo. File akan auto-replace.

File **NEW** (sebelumnya tidak ada):
- `backend/controllers/erp/customerController.js`
- `frontend/src/components/WilayahPicker.jsx`
- `frontend/src/utils/wilayah.js`

File **REPLACE** (sudah ada, akan tertimpa):
- `backend/routes/erp/index.js`
- `frontend/src/pages/erp/CustomersPage.jsx`

### Step 2️⃣ — Patch Backend Model (manual, snippet pendek)

File: `backend/models/erp/index.js` — cari blok `const Customer = sequelize.define('ErpCustomer', { ... })` dan **tambah 9 field baru** sehingga definisi jadi seperti ini:

```javascript
const Customer = sequelize.define('ErpCustomer', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:          { type: DataTypes.STRING(200), allowNull: false },
  phone:         { type: DataTypes.STRING(20),  allowNull: true },
  email:         { type: DataTypes.STRING(100), allowNull: true },
  address:       { type: DataTypes.TEXT, allowNull: true },
  city:          { type: DataTypes.STRING(100), allowNull: true },
  city_code:     { type: DataTypes.STRING(10),  allowNull: true },   // ← BARU
  province:      { type: DataTypes.STRING(100), allowNull: true },
  province_code: { type: DataTypes.STRING(10),  allowNull: true },   // ← BARU
  district:      { type: DataTypes.STRING(100), allowNull: true },   // ← BARU
  district_code: { type: DataTypes.STRING(10),  allowNull: true },   // ← BARU
  village:       { type: DataTypes.STRING(100), allowNull: true },   // ← BARU
  village_code:  { type: DataTypes.STRING(10),  allowNull: true },   // ← BARU
  postal_code:   { type: DataTypes.STRING(10),  allowNull: true },
  notes:         { type: DataTypes.TEXT, allowNull: true },
  tags:          { type: DataTypes.TEXT, allowNull: true },          // ← BARU (JSON string)
  source:        { type: DataTypes.STRING(50), allowNull: true },    // ← BARU
  birthday:      { type: DataTypes.DATEONLY, allowNull: true },      // ← BARU
  total_orders:  { type: DataTypes.INTEGER, defaultValue: 0 },
  total_spent:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
}, { tableName: 'erp_customers', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
```

### Step 3️⃣ — Patch Frontend erpService (manual, 7 baris)

File: `frontend/src/utils/erp/erpService.js` — cari section Customers, ganti dengan ini:

```javascript
  // Customers
  getCustomers:        (p)      => api.get(`${BASE}/customers`, { params: p }),
  getCustomerDetail:   (id)     => api.get(`${BASE}/customers/${id}`),
  getCustomerOrders:   (id, p)  => api.get(`${BASE}/customers/${id}/orders`, { params: p }),
  checkDuplicate:      (p)      => api.get(`${BASE}/customers/check-duplicate`, { params: p }),
  createCustomer:      (d)      => api.post(`${BASE}/customers`, d),
  updateCustomer:      (id, d)  => api.put(`${BASE}/customers/${id}`, d),
  deleteCustomer:      (id)     => api.delete(`${BASE}/customers/${id}`),
```

### Step 4️⃣ — Commit & Push

```bash
git add .
git commit -m "feat(erp): customer module overhaul + wilayah indonesia cascade picker"
git push
```

Tunggu Railway selesai auto-deploy backend (~1-2 menit). Cek di Railway dashboard sampai status **Active**.

### Step 5️⃣ — Jalankan Migrasi via Postman ⚡

> **WAJIB.** Tanpa step ini, model di kode sudah baru tapi tabel di MySQL masih lama → error `Unknown column 'tags'` dll.

Buka Postman, buat request baru:

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `https://backend-gphrdpro.up.railway.app/run-alter` |
| **Header** | `x-migrate-secret: hrd2024migrateNow!` |
| **Body** | (kosong) |

Klik **Send**. Response sukses:

```json
{
  "success": true,
  "message": "Migration berhasil!",
  "data": { "tables_synced": true }
}
```

### Step 6️⃣ — Verifikasi Struktur Tabel

Di Railway → MySQL service → Query/Console, jalankan:

```sql
DESCRIBE erp_customers;
```

Pastikan **9 kolom baru** ada:
`tags`, `source`, `birthday`, `province_code`, `city_code`, `district`, `district_code`, `village`, `village_code`

### Step 7️⃣ — Fallback (HANYA kalau ada kolom yang miss)

Sesuai pengalaman sesi sebelumnya: *"POST /run-alter endpoint sometimes misses tables"*.

Kalau setelah Step 5+6 ada kolom yang **belum muncul** di tabel, run SQL fallback `migrations/001_customers_upgrade.sql` langsung di Railway DB console:

```sql
ALTER TABLE erp_customers
  ADD COLUMN IF NOT EXISTS tags          TEXT          NULL AFTER notes,
  ADD COLUMN IF NOT EXISTS source        VARCHAR(50)   NULL AFTER tags,
  ADD COLUMN IF NOT EXISTS birthday      DATE          NULL AFTER source,
  ADD COLUMN IF NOT EXISTS province_code VARCHAR(10)   NULL AFTER province,
  ADD COLUMN IF NOT EXISTS city_code     VARCHAR(10)   NULL AFTER city,
  ADD COLUMN IF NOT EXISTS district      VARCHAR(100)  NULL AFTER city_code,
  ADD COLUMN IF NOT EXISTS district_code VARCHAR(10)   NULL AFTER district,
  ADD COLUMN IF NOT EXISTS village       VARCHAR(100)  NULL AFTER district_code,
  ADD COLUMN IF NOT EXISTS village_code  VARCHAR(10)   NULL AFTER village;
```

---

## ✅ Verifikasi Setelah Deploy

1. **Buka `/erp/customers`** — KPI cards, filter chips, dan tabel tampil
2. **Klik salah satu pelanggan** — drawer kanan harus terbuka dengan order history
3. **Klik "Tambah Pelanggan"** — modal muncul
4. **Tab "Alamat"** — pilih provinsi (load dari emsifa), lalu kab/kota → kecamatan → kelurahan harus cascade
5. **Coba duplicate detection** — ketik nama pelanggan yang sudah ada, harus muncul alert kuning
6. **Klik icon WhatsApp di tabel** — buka `wa.me/62...` di tab baru
7. **Test sebagai role employee** — semua fitur (termasuk delete) harus aktif

---

## 🎨 Fitur Baru Ringkas

### Frontend
- ✨ **4 KPI Cards**: Total, Aktif Bulan Ini, Avg CLV, Top Spender (clickable)
- 🏆 **Segmentasi RFM Otomatis**: Champion/Loyal/At Risk/Lost/New — badge per row + filter
- 🎨 **Avatar 2-huruf** dengan warna konsisten per-nama (hash-based)
- 💬 **WhatsApp Quick Action**: icon di row + tombol besar di drawer
- 🔍 **Filter Chips**: by Segmen, Sumber Akuisisi, Ada/Tidak HP
- 📋 **Drawer Detail** (slide-in kanan):
  - Header gradient dengan avatar, segment, tags
  - 4 stats mini (order, spending, AOV, last order)
  - Tab Order History (klikable ke detail order)
  - Tab Produk Favorit (top 5 most-purchased)
  - Tab Info & Alamat lengkap
- 🏷 **Tag/Label System**: VIP, Reseller, Dropshipper, Member, Bermasalah + custom
- 📍 **Source Tracking**: WhatsApp, Instagram, Marketplace, Walk-in, Referral
- 🎂 **Birthday tracking** (input date picker)
- ⚠️ **Duplicate Detection**: real-time saat input nama/HP (debounced 500ms)
- 🗺️ **Cascade Wilayah Indonesia**: 4-level dropdown dengan search & cache
- 🗑️ **Delete Customer**: dengan validasi (tidak bisa hapus kalau ada order)

### Backend
- 🆕 `GET /api/erp/customers/:id` — detail + stats (order_count, total_spent, AOV, first/last order, by_channel, favorite_products)
- 🆕 `GET /api/erp/customers/:id/orders` — paginated order history
- 🆕 `GET /api/erp/customers/check-duplicate?phone=&name=` — realtime duplicate check
- 🆕 `DELETE /api/erp/customers/:id` — dengan validasi has_orders
- ⚙️ `GET /api/erp/customers` — support filter: `search`, `city`, `province_code`, `source`, `has_phone`, `tag`, dengan auto-compute `last_order_date` via SQL subquery
- ⚙️ `POST /api/erp/customers` — auto duplicate check by phone (normalized 628xxx)

---

## 🗺️ Tentang Cascade Wilayah Indonesia

Pakai API publik **emsifa/api-wilayah-indonesia** (data resmi Kemendagri RI). Hosted di GitHub Pages — gratis, CORS terbuka, no API key.

**Endpoint yang dipakai:**
- `https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json`
- `https://emsifa.github.io/api-wilayah-indonesia/api/regencies/{prov_id}.json`
- `https://emsifa.github.io/api-wilayah-indonesia/api/districts/{reg_id}.json`
- `https://emsifa.github.io/api-wilayah-indonesia/api/villages/{dist_id}.json`

**Caching:** Setiap level di-cache di `localStorage` (key prefix `wilayah:`) selama 30 hari.

**Fallback:** Kalau API gagal/timeout (>10 detik), tampilkan banner peringatan dan tetap izinkan input alamat manual.

---

## 🔧 Troubleshooting

**Q: POST /run-alter return 403 Forbidden?**
A: Header `x-migrate-secret` salah. Value harus persis: `hrd2024migrateNow!`. Cek juga Railway Variables ada `MIGRATE_SECRET=hrd2024migrateNow!`.

**Q: POST /run-alter return 500?**
A: Cek Railway logs untuk error message. Biasanya karena model definition error. Pastikan Step 2 sudah benar.

**Q: Sudah run /run-alter, tapi POST /api/erp/customers tetap error "Unknown column 'tags'"?**
A: Model di kode update, tapi tabel di DB belum berubah. Verify dulu dengan `DESCRIBE erp_customers` — kalau kolom belum ada, jalankan SQL fallback (Step 7).

**Q: Field `tags` muncul sebagai "[]" atau "null" di tabel pelanggan lama?**
A: Customer lama belum punya tag → array kosong otomatis. Aman.

**Q: Drawer detail kosong / error 404?**
A: Pastikan `customerController.js` ter-deploy & route `/customers/:id` ada di `routes/erp/index.js`. Cek Railway logs.

**Q: WilayahPicker stuck loading?**
A: Cek browser console. Kalau CORS error → emsifa down sementara. Refresh atau gunakan field alamat manual.

**Q: Total order/spending tidak update setelah customer order?**
A: Sudah handle di `orderController.confirmOrder`. Pastikan order di-confirm via tombol (bukan create only).

---

## 📝 Catatan untuk Iterasi Berikutnya

Fitur yang **tidak masuk paket A** dan bisa di-iterate next:
- Multi-address book (customer bisa punya >1 alamat pengiriman)
- Notes timeline (log interaksi per tanggal, bukan textarea tunggal)
- Map view sebaran customer
- WA broadcast / blast ke segment
- Loyalty points system
- Customer source attribution report
- Mini-CRM pipeline (Lead → Prospect → Customer → Churned)

---

**Project:** GPDISTRO RACING ID
**Repo:** github.com/andribintang/gphrdpro
**Deployed:** Railway (frontend + backend)
**Stack:** React+Vite+Tailwind / Express+Sequelize+MySQL
**Migrate endpoint:** `POST https://backend-gphrdpro.up.railway.app/run-alter`
**Header:** `x-migrate-secret: hrd2024migrateNow!`
