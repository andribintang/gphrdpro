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

## 🐛 Bug Kedua (Ditemukan dari Laporan Error Baru): Legacy Unique Constraint

Setelah fix timestamp di atas terpasang, INSERT baris stok baru jadi bisa lolos lewat validasi kolom — tapi langsung kena masalah berikutnya: tabel `erp_stock` ternyata masih punya **UNIQUE KEY lama** bernama `erp_stock_product_id_branch_id` (dari sebelum fitur varian ada), yang memaksa **hanya boleh 1 baris stok per kombinasi produk+cabang**.

Dulu itu benar (1 produk = 1 baris stok per cabang). Tapi sekarang dengan varian, **1 produk+cabang butuh banyak baris stok** — 1 baris per varian. Begitu sistem coba simpan baris stok untuk varian KEDUA dari produk yang sama di cabang yang sama, MySQL menolak dengan error *"Duplicate entry ... for key 'erp_stock_product_id_branch_id'"* karena bentrok constraint lama itu — inilah error baru yang dilaporkan.

**Fix**: drop constraint lama ini. Tidak perlu diganti unique key baru yang menyertakan `variant_id`, karena:
1. Index `idx_stock_lookup (product_id, variant_id, branch_id)` untuk performa query sudah ada dari migrasi Phase 1 sebelumnya.
2. Uniqueness yang benar (per varian) sudah dijamin di level aplikasi — setiap titik `Stock.create()` di codebase ini selalu didahului `Stock.findOne()` untuk cek apakah baris sudah ada (pola yang konsisten dipakai di 5 titik yang sudah diperbaiki sebelumnya).
3. Menambah unique key baru yang menyertakan kolom nullable (`variant_id`) punya jebakan tersendiri di MySQL (NULL dianggap selalu "beda" di unique index, jadi tidak benar-benar mencegah duplikat untuk produk tanpa varian) — drop saja lebih aman dan sederhana.

Statement yang ditambahkan ke `alters`:
```js
`ALTER TABLE erp_stock DROP INDEX erp_stock_product_id_branch_id`,
```

Logic SKIP di handler `/run-alter` juga diperluas supaya statement ini **aman dipanggil ulang** — kalau index-nya sudah pernah ke-drop sebelumnya, error "check that column/key exists" sekarang dianggap SKIP (bukan error sungguhan), bukan cuma "Duplicate column"/"already exists"/"Duplicate key name" seperti sebelumnya.



Selain patch kode, ditambahkan juga 2 statement `ALTER TABLE` baru ke array `alters` di `backend/server.js` (handler `/run-alter`) yang menambahkan `DEFAULT CURRENT_TIMESTAMP` ke kolom `created_at`/`updated_at` di tabel `erp_stock`. Ini **jaring pengaman tingkat database** — kalau suatu saat ada kode baru (ditulis manual atau oleh AI) yang lupa lagi isi timestamp manual saat `Stock.create()`, MySQL akan otomatis isi sendiri, bukannya crash. Bug class ini sudah muncul 5 kali di file berbeda, jadi root-cause fix di level schema lebih aman daripada cuma andalkan disiplin di setiap titik kode.

Statement yang ditambahkan ke `alters` (dieksekusi via `/run-alter`, bukan SQL manual):
```js
`ALTER TABLE erp_stock MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
`ALTER TABLE erp_stock MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
```
Aman dipanggil berkali-kali — `MODIFY COLUMN` bukan `ADD COLUMN`, tidak akan error walau `/run-alter` sudah pernah dipanggil sebelumnya.

---

## 🚀 Deployment

### Langkah 1 — Deploy kode
Extract zip, drop 5 file ke root repo:
- `backend/server.js`
- `backend/controllers/erp/masterController.js`
- `backend/controllers/erp/purchaseController.js`
- `backend/controllers/erp/returnController.js`
- `backend/controllers/erp/variantController.js`

```
git add . && git commit -m "fix(erp): Stock.create() missing timestamp causing crash on adjust stock" && git push
```
Tunggu Railway selesai redeploy backend.

### Langkah 2 — Jalankan `/run-alter` via Postman (SETELAH deploy selesai)
```
POST https://backend-gphrdpro.up.railway.app/run-alter
Header: x-migrate-secret: hrd2024migrateNow!
```
Cek response — pastikan ada baris `OK: ALTER TABLE erp_stock MODIFY COLUMN created_at...` (atau `SKIP` kalau sebelumnya sudah pernah jalan, tetap aman).

## ✅ Testing

1. Ulangi skenario di screenshot pertama: buka Edit Produk yang punya varian → tab Foto & Varian → klik Adjust Stok pada varian yang **belum pernah disentuh stoknya di cabang tertentu** → isi qty → Adjust Stok → harus **berhasil**.
2. **Skenario error baru**: lanjutkan dengan Adjust Stok untuk **varian LAIN dari produk yang sama, di cabang yang sama** (mis. setelah berhasil isi stok varian "M", coba isi stok varian "L" di cabang yang sama) → harus **berhasil juga**, tidak lagi kena error "erp_stock_product_id_branch_id already exists".
3. Test Adjust Stok produk biasa (non-varian, via InventoryPage atau halaman produk) untuk produk+cabang yang juga belum pernah punya baris stok.
4. Test terima barang PO (Purchase → Terima) untuk produk yang belum pernah ada stoknya di cabang tujuan.
5. Test submit Stok Opname untuk baris varian yang stok sistemnya masih 0/belum ada baris Stock sama sekali.
6. Test konfirmasi Retur dengan opsi restock untuk produk yang belum punya baris stok di cabang tujuan retur.
7. Panggil `/run-alter` **dua kali berturut-turut** → panggilan kedua harus tetap sukses (semua entri terkait fix ini muncul sebagai `SKIP`, bukan `ERR`).

## 🔧 Troubleshooting

**Q: Sudah deploy kode tapi masih error yang sama?**
A: Cek apakah Step 2 (`/run-alter` via Postman) sudah dipanggil **setelah** Railway selesai redeploy — keduanya saling melengkapi tapi kalau lupa panggil `/run-alter`, jaring pengaman database belum aktif (patch kode di 5 titik tetap jalan duluan kok, jadi tetap aman, tapi lebih solid kalau dua-duanya jalan).

**Q: Response `/run-alter` menunjukkan `ERR` untuk statement MODIFY COLUMN ini?**
A: Kemungkinan Railway MySQL versi sangat lama tidak terima `ON UPDATE CURRENT_TIMESTAMP` di statement kedua (`updated_at`). Statement pertama (`created_at`) sudah cukup untuk menyelesaikan akar masalah utama di screenshot — kalau hanya statement kedua yang error, tetap aman dilanjutkan.
