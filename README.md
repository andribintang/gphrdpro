# 🐛 Fix: "Field 'created_at' doesn't have a default value" saat Adjust Stok

## Akar Masalah

Tabel `erp_stock` di database punya kolom `created_at`/`updated_at` yang **NOT NULL tanpa default value**. Model Sequelize-nya (`Stock`) sengaja didefinisikan dengan `timestamps: false` — artinya Sequelize **tidak otomatis mengisi** kolom ini saat `.create()`, beda dengan kebanyakan model lain di project ini yang isi timestamp-nya manual di setiap pemanggilan `.create()` (pola ini sudah konsisten dipakai untuk `StockMovement.create()` di seluruh codebase).

Masalahnya: ada **5 titik** di backend yang memanggil `Stock.create()` untuk bikin baris stok baru (saat pertama kali sebuah produk/varian/cabang belum punya baris stok sama sekali), dan **semuanya lupa** isi `created_at`/`updated_at`. Begitu MySQL coba INSERT tanpa nilai untuk kolom NOT NULL tanpa default → error persis seperti di screenshot.

Skenario di screenshot: Adjust Stok untuk varian "M" di cabang GP Distro yang **belum pernah punya baris stok sebelumnya** (stok 0 → 5) — jadi kode masuk ke jalur `Stock.create()` yang bermasalah.

## Titik yang Diperbaiki

| File | Fungsi | Konteks |
|---|---|---|
| `variantController.js` | `adjustVariantStock` | **Sumber error di screenshot** — Adjust Stok per varian |
| `masterController.js` | `adjustStock` | Adjust Stok produk biasa (non-varian) |
| `purchaseController.js` | `receivePurchase` | Penerimaan barang dari PO ke produk yang belum punya stok |
| `purchaseController.js` | `submitStockOpname` | Submit hasil stok opname (termasuk baris varian) |
| `returnController.js` | `confirmReturn` | Restock saat retur dikonfirmasi |

Semua di-patch dengan menambahkan `created_at: new Date(), updated_at: new Date()` ke payload `Stock.create()` — mengikuti pola yang sudah dipakai di seluruh codebase untuk model dengan `timestamps:false`.

## 🛡️ Perbaikan Tambahan di Level Database (Defense-in-Depth)

Selain patch kode, disertakan juga migrasi SQL (`003_fix_erp_stock_timestamp_default.sql`) yang menambahkan `DEFAULT CURRENT_TIMESTAMP` ke kolom `created_at`/`updated_at` di tabel `erp_stock`. Ini **jaring pengaman tingkat database** — kalau suatu saat ada kode baru (ditulis manual atau oleh AI) yang lupa lagi isi timestamp manual saat `Stock.create()`, MySQL akan otomatis isi sendiri, bukannya crash. Bug class ini sudah muncul 5 kali di file berbeda, jadi root-cause fix di level schema lebih aman daripada cuma andalkan disiplin di setiap titik kode.

---

## 🚀 Deployment

### Langkah 1 — Jalankan migrasi SQL DULU (lewat Railway DB console)
```sql
ALTER TABLE erp_stock
  MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE erp_stock
  MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
```
Aman dijalankan walau sudah pernah dijalankan sebelumnya (idempotent — `MODIFY COLUMN` bukan `ADD COLUMN`).

### Langkah 2 — Deploy kode
Extract zip, drop 4 file ke root repo:
- `backend/controllers/erp/masterController.js`
- `backend/controllers/erp/purchaseController.js`
- `backend/controllers/erp/returnController.js`
- `backend/controllers/erp/variantController.js`

```
git add . && git commit -m "fix(erp): Stock.create() missing timestamp causing crash on adjust stock" && git push
```
Tunggu Railway redeploy backend.

## ✅ Testing

1. Ulangi skenario di screenshot: buka Edit Produk yang punya varian → tab Foto & Varian → klik Adjust Stok pada varian yang **belum pernah disentuh stoknya di cabang tertentu** (kombinasi produk+varian+cabang baru) → isi qty → Adjust Stok → harus **berhasil**, tidak ada lagi error "doesn't have a default value".
2. Test Adjust Stok produk biasa (non-varian, via InventoryPage atau halaman produk) untuk produk+cabang yang juga belum pernah punya baris stok.
3. Test terima barang PO (Purchase → Terima) untuk produk yang belum pernah ada stoknya di cabang tujuan.
4. Test submit Stok Opname untuk baris varian yang stok sistemnya masih 0/belum ada baris Stock sama sekali.
5. Test konfirmasi Retur dengan opsi restock untuk produk yang belum punya baris stok di cabang tujuan retur.

## 🔧 Troubleshooting

**Q: Sudah deploy kode tapi masih error yang sama?**
A: Cek apakah Step 1 (migrasi SQL) sudah dijalankan — keduanya saling melengkapi tapi kalau lupa jalankan SQL dan ada baris kode lain (di luar 5 titik ini) yang masih punya bug serupa, jaring pengaman database-nya yang akan menyelamatkan.

**Q: Migrasi SQL gagal dengan error syntax?**
A: Pastikan dijalankan persis seperti di atas (2 statement terpisah), bukan digabung jadi satu. Kalau Railway MySQL versi sangat lama tidak terima `ON UPDATE CURRENT_TIMESTAMP` di kolom kedua, jalankan dulu statement pertama saja — itu sudah menyelesaikan akar masalah utamanya (`created_at`).
