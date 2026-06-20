# 🛒 Fitur Baru: Import Order Marketplace dari Excel (Prioritas #4)

Bagian dari rencana 4 perbaikan untuk menangani 100+ order/hari, dikerjakan sesuai urutan yang diminta: **#4 dulu** (fitur ini), lalu #3 (bulk action), #1 (bulk resi), #2 (row locking) menyusul di delivery berikutnya.

## Apa yang Bisa Dilakukan Sekarang

Halaman **Import Data** punya tab baru **🛒 Order**. Staff bisa download laporan order dari dashboard seller marketplace (Tokopedia/Shopee/dll, biasanya tersedia sebagai export Excel/CSV di sana), susun ulang ke format template yang disediakan, lalu upload sekali jalan — alih-alih mengetik ulang satu-satu lewat "Buat Order Baru".

### Format Template

**1 baris = 1 produk dalam order.** Order yang isinya beberapa produk berarti beberapa baris dengan **No. Order yang sama persis** — sistem otomatis mengelompokkan baris-baris itu jadi 1 order.

Kolom: No. Order Marketplace*, Nama Pembeli*, No. HP, Alamat, Kota, SKU Produk*, Varian, Qty*, Harga Jual (opsional), Ongkir, Diskon, Tanggal Order, Catatan. Kolom Ongkir/Diskon cukup diisi di baris PERTAMA tiap order (nilai per-order, bukan per-produk). Template & panduan lengkap ada di sheet "Panduan" pada file yang didownload.

### Aturan Penting

- **SKU harus persis sama** dengan SKU di Master Produk sistem ini (bukan SKU marketplace).
- **Varian wajib diisi** kalau produknya punya varian aktif (mis. "Merah, L") — sama persis dengan nama varian di sistem. Ini konsisten dengan pengaman yang sudah ada di "Buat Order Baru": tidak bisa membuat order untuk produk bervarian tanpa pilih variannya.
- **Semua order hasil import masuk sebagai Draft** — belum memotong stok sama sekali. Staff tetap perlu cek & konfirmasi sebelum stok benar-benar terpotong. Ini sengaja, supaya kesalahan mapping SKU/harga bisa dikoreksi dulu sebelum berdampak ke stok riil.
- **Anti-duplikat otomatis**: kalau No. Order yang sama diupload lagi (misal tidak sengaja upload file yang sama dua kali), baris itu dilewati dan dilaporkan sebagai "Dilewati (Duplikat)" — tidak akan membuat order ganda.
- Pilih **Cabang** dan **Toko Marketplace** (dari Master Data → Sub Channel) sekali untuk seluruh file yang diupload.

## Perubahan Teknis

**Backend** — Logic pembuatan order (validasi varian, cek & reservasi stok, hitung harga/profit) **diekstrak** dari `createOrder` jadi fungsi `buildOrder()` yang dipakai bareng oleh order manual (1 order) maupun import (banyak order sekaligus). Ini supaya kedua jalur selalu konsisten — perbaikan/pengaman yang sudah ada di alur order manual (mis. wajib pilih varian) otomatis berlaku juga di import, tidak perlu ditulis ulang dan berisiko beda perilaku.

- `backend/controllers/erp/orderController.js` — ekstrak `buildOrder()`, di-export.
- `backend/controllers/erp/masterController.js` — fungsi baru `importOrders` (kelompokkan baris per No. Order, match SKU/varian, panggil `buildOrder()` per order dalam transaksi terpisah — 1 order gagal tidak menggagalkan order lain dalam batch).
- `backend/models/erp/index.js` — tambah kolom `external_ref` ke model Order (simpan No. Order marketplace, dipakai cek duplikat).
- `backend/server.js` — 2 statement baru di `/run-alter`: tambah kolom `external_ref` + index.
- `backend/routes/erp/index.js` — route baru `POST /import/orders`.
- `frontend/src/utils/erp/erpService.js` — method baru `importOrders`.
- `frontend/src/pages/erp/ImportPage.jsx` — tab Order baru lengkap (kolom, template+panduan, selector cabang & toko marketplace, preview pengelompokan order, hasil import).

**Catatan**: `ImportPage.jsx` di repo ternyata sudah lebih maju dari draft yang sempat saya pegang sebelumnya (sudah ada kolom store_active_gpr/gpd terpisah dll) — saya pakai versi LIVE terbaru sebagai basis, jadi semua fitur produk/pelanggan yang sudah ada tidak tersentuh sama sekali (sudah dicek tidak ada fungsi yang hilang).

## Yang TIDAK Berubah

Import Produk dan Import Pelanggan — tidak disentuh sama sekali, sudah dicek byte-level tidak ada perubahan di luar penambahan tab Order. Alur "Buat Order Baru" manual juga tidak berubah perilakunya — `createOrder` sekarang cuma pemanggil tipis ke `buildOrder()`, logicnya identik dengan sebelumnya.

---

## 🚀 Deployment

### Langkah 1 — Deploy kode
Extract zip, drop ke root repo (7 file):
- `backend/controllers/erp/orderController.js`
- `backend/controllers/erp/masterController.js`
- `backend/models/erp/index.js`
- `backend/server.js`
- `backend/routes/erp/index.js`
- `frontend/src/utils/erp/erpService.js`
- `frontend/src/pages/erp/ImportPage.jsx`

```
git add . && git commit -m "feat(erp): import order marketplace dari Excel (batch)" && git push
```
Tunggu Railway selesai redeploy backend & frontend.

### Langkah 2 — Jalankan `/run-alter` via Postman
```
POST https://backend-gphrdpro.up.railway.app/run-alter
Header: x-migrate-secret: hrd2024migrateNow!
```
Cek response ada baris `OK: ALTER TABLE erp_orders ADD COLUMN external_ref...`.

## ✅ Testing

1. Pastikan minimal ada 1 **Toko Marketplace** terdaftar di Master Data ERP → Sub Channel (kalau belum ada, tambah dulu, mis. "Tokopedia GP Distro #1").
2. Buka **Import Data → tab 🛒 Order** → Download Template → isi 1-2 contoh order (boleh pakai contoh bawaan di template, sudah berisi 1 order 2 produk) → pilih Cabang & Toko Marketplace → Upload.
3. Cek preview menunjukkan jumlah "order unik" yang benar (mis. file 5 baris dari 2 order berbeda → harus tampil "2 order unik").
4. Klik Import → cek hasil: "Order Dibuat" sesuai jumlah order unik, ada daftar No. Order → No. Order Sistem yang baru dibuat.
5. Buka halaman **Order** → order hasil import harus muncul dengan status **Draft**, channel **Marketplace**, nama toko sesuai yang dipilih.
6. Upload **file yang sama lagi** → kali ini harus muncul di "Dilewati (Duplikat)", bukan membuat order baru.
7. Test produk bervarian: buat baris dengan SKU produk yang punya varian tapi kolom Varian dikosongkan → import → order itu harus gagal dengan pesan jelas "kolom Varian wajib diisi".
8. Test SKU salah ketik / tidak ada di sistem → harus gagal dengan pesan jelas menyebutkan SKU mana yang bermasalah, bukan error generik.
9. Konfirmasi salah satu order hasil import (klik manual di halaman Order) → cek stok produk terkait berkurang dengan benar sesuai qty yang diimport.

## 🔧 Troubleshooting

**Q: Semua order gagal dengan pesan terkait varian padahal produknya tidak ada variannya?**
A: Cek lagi SKU yang dipakai — kemungkinan SKU tersebut salah cocok ke produk lain yang justru punya varian. Pastikan SKU di file Excel benar-benar SKU produk yang dimaksud.

**Q: Dropdown Toko Marketplace kosong?**
A: Belum ada Sub Channel dengan channel marketplace terdaftar — tambah dulu di Master Data ERP, sama seperti yang dipakai di "Buat Order Baru".

**Q: Order hasil import statusnya Draft terus, kapan stok kepotong?**
A: Memang sengaja — stok baru terpotong saat order di-**konfirmasi** (manual atau nanti lewat fitur bulk-confirm yang menyusul di Prioritas #3). Ini jeda aman untuk staff sempat cek dulu hasil import sebelum berdampak ke stok riil.
