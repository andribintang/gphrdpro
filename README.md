# 🐛 Fix: Produk Bervarian Muncul Berkali-kali (Duplikat) di Daftar Produk

## Jawaban Singkat

**Bukan, itu bukan perilaku yang seharusnya.** "Batik Honda One Heart Hitam 2022" yang muncul 5 kali dengan stok berbeda-beda (1, 5, 5, 5, 5) itu **bug nyata di query backend**, bukan data ganda di database. Setelah fix ini, produk tersebut akan tampil **1 baris saja**, dengan stok total = jumlah semua variannya.

## Akar Masalah

Query `getProducts` (dipakai di halaman Produk, dan juga oleh pencarian produk di Buat Order Baru) melakukan:
```sql
LEFT JOIN erp_stock s ON s.product_id = ep.id AND s.branch_id = ep.branch_id
```

Dulu (sebelum fitur varian ada), ini aman — 1 produk + 1 cabang = 1 baris stok, jadi JOIN-nya selalu 1-ke-1. Tapi sekarang produk dengan varian punya **banyak baris stok** (1 per kombinasi varian, mis. M/L/XL = 3 baris). JOIN tanpa agregasi ini jadi **fan-out**: 1 produk dengan 4 varian → query menghasilkan 4-5 baris SQL (1 per baris stok yang cocok), dan setiap baris itu dirender sebagai "produk" terpisah di halaman — persis seperti di screenshot. Angka stok yang beda-beda di tiap baris duplikat itu sebenarnya adalah stok dari **varian yang berbeda-beda** (4 baris dari 4 varian + kemungkinan 1 baris sisa dari sebelum produk ini punya varian).

Ini adalah gap yang sama persis dengan yang sudah ditemukan sebelumnya di Stok Opname (`getStockOpname`) dan Adjust Stok — bagian dari rangkaian tempat yang perlu disesuaikan setelah fitur varian ditambahkan, yang ternyata masih ada beberapa titik tersisa.

## Yang Diperbaiki

Semua JOIN yang berpotensi fan-out diganti pakai **subquery teragregasi** (`SUM(qty) GROUP BY product_id, branch_id`), supaya hasilnya tetap maksimal 1 baris per produk+cabang — stok yang ditampilkan jadi **total dari semua varian**, bukan baris terpisah per varian.

| File | Fungsi | Dampak Sebelum Fix |
|---|---|---|
| `masterController.js` | `getProducts` (query utama + fallback) | **Halaman Produk** & **pencarian produk di Buat Order Baru** menampilkan produk bervarian berkali-kali |
| `masterController.js` | `getProductByBarcode` | Scan barcode produk bervarian mengambil stok dari **varian acak** (bukan total) — diganti pakai agregat manual, bukan `include` Sequelize yang tidak reliable untuk produk multi-baris stok |
| `inventoryController.js` | `getSummary` | **Dashboard ERP** & tab **Reorder Alert** di Inventory menampilkan produk bervarian berkali-kali, bikin total SKU/nilai stok jadi salah hitung |
| `inventoryController.js` | `createReorderSuggestion` | Saran pemesanan ulang untuk produk bervarian akan duplikat dengan qty yang salah |

**Tidak perlu diubah** (sudah aman, sempat dicek): `getStockValue` (sudah `GROUP BY` kategori + `COUNT(DISTINCT)`) dan `getMovementTrend` (tidak JOIN ke `erp_stock` sama sekali).

## Yang TIDAK Berubah

Semua fungsi lain di kedua file ini (create/update/delete produk, semua endpoint inventory lainnya) **tidak disentuh sama sekali** — sudah dicek daftar fungsinya identik sebelum/sesudah patch.

---

## 🚀 Deployment

1. Extract zip, drop 2 file ke root repo:
   - `backend/controllers/erp/masterController.js`
   - `backend/controllers/erp/inventoryController.js`
2. **Tidak ada migrasi database** — ini murni perbaikan query, langsung deploy.
3. `git add . && git commit -m "fix(erp): product list duplicates for variant products due to unaggregated stock join" && git push`
4. Tunggu Railway redeploy backend.

## ✅ Testing

1. Buka halaman **Produk** → cari "Batik Honda One Heart Hitam 2022" → harus muncul **1 baris saja**, dengan angka stok = total semua variannya (bukan 1/5/5/5/5 yang terpisah).
2. Buka **Dashboard ERP** → cek total SKU & nilai stok masuk akal (tidak lagi menghitung produk bervarian berkali-kali).
3. Buka **Inventory → tab Reorder Alert** → produk bervarian harus muncul 1 baris.
4. Buat order baru → cari produk yang punya varian di kolom pencarian produk → harus muncul **1 hasil saja** per produk (sebelumnya mungkin juga duplikat di sini, sekarang dengan modal pilih varian dari fix sebelumnya akan jalan normal).
5. Scan barcode produk bervarian (kalau barcode-nya ada di level produk, bukan per-varian) → stok yang ditampilkan sekarang adalah total, bukan dari varian acak.
6. Cek produk yang **tidak** punya varian — pastikan masih tampil & berfungsi normal seperti sebelumnya, tidak ada regresi.

## 🔧 Troubleshooting

**Q: Masih ada produk yang muncul dobel setelah deploy?**
A: Hard refresh / clear cache browser dulu. Kalau masih terjadi, kemungkinan ada titik lain yang belum ketemu saat audit — kirim screenshot produk mana yang masih dobel, saya cek lagi dari endpoint API yang dipakai halaman tersebut.

**Q: Total stok di halaman Produk sekarang beda dari sebelumnya untuk produk bervarian?**
A: Itu memang yang diharapkan — sekarang angkanya benar (total dari semua varian), sebelumnya angka yang tampil di tiap baris duplikat itu cuma stok dari satu varian saja, bukan total.
