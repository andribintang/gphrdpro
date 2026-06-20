# 🎯 Fix: Stok Opname Belum Tampilkan Varian Produk

## Akar Masalah

`StockOpnamePage` selama ini memanggil endpoint generik `/products` dan baca `p.stock?.qty` — yang di backend pakai relasi `Product.hasOne(Stock, {as:'stock'})`. Untuk produk **dengan varian**, satu produk punya **banyak baris Stock** (satu per kombinasi varian per cabang), jadi `hasOne` cuma ambil **satu baris secara acak/tidak tepat** — bukan breakdown per varian. Hasilnya: produk dengan varian di opname cuma kelihatan sebagai 1 baris dengan angka stok yang tidak mewakili kondisi sebenarnya, dan varian-nya sendiri **tidak muncul sama sekali**.

Sudah ada endpoint khusus `/stock-opname` (`getStockOpname`/`submitStockOpname`) yang dibuat sebelumnya, tapi **frontend tidak pernah memakainya** dan endpoint itu sendiri **juga belum variant-aware**.

## Yang Diperbaiki

### Backend — `purchaseController.js`

**`getStockOpname`** sekarang mengembalikan **flat list per "unit hitung"**:
- Produk **tanpa varian** → 1 baris (sama seperti sebelumnya)
- Produk **dengan varian** → 1 baris **per kombinasi varian aktif**, masing-masing dengan stok sendiri-sendiri dari tabel `erp_stock` yang sudah difilter `variant_id` yang tepat

```json
{
  "items": [
    { "row_id": "p12", "product_id": 12, "variant_id": null, "name": "Helm Polos", "variant_name": null, "stock_qty": 8, "has_variants": false },
    { "row_id": "v45", "product_id": 20, "variant_id": 45, "name": "Kaos GP Racing", "variant_name": "Merah / L", "stock_qty": 12, "has_variants": true },
    { "row_id": "v46", "product_id": 20, "variant_id": 46, "name": "Kaos GP Racing", "variant_name": "Merah / XL", "stock_qty": 5, "has_variants": true }
  ]
}
```

**`submitStockOpname`** sekarang terima `variant_id` opsional per item, dan update baris `Stock` yang tepat (`product_id + variant_id + branch_id`), bukan asal product_id saja.

### Frontend — `StockOpnamePage.jsx`

- Ganti sumber data dari `erpService.getProducts()` → `erpService.getStockOpname()` (endpoint yang memang dibuat untuk ini)
- Key opname diganti dari `product.id` jadi **key komposit** `product_id:variant_id` — supaya tidak tabrakan saat satu produk punya banyak baris varian
- Kolom "Produk" sekarang tampilkan **badge nama varian** di bawah nama produk (mis. "Kaos GP Racing" + badge "Merah / L")
- Search sekarang juga bisa cari berdasarkan nama varian
- Excel export/import disesuaikan — kolom baru `variant_id`, `varian`, dan `row_key` (dipakai untuk matching saat import supaya akurat per-varian)
- Info banner otomatis kasih tahu kalau ada produk dengan varian di cabang yang dipilih

## Yang TIDAK Berubah

- Bulk-select, bulk reset ke stok sistem, filter "tampilkan yang berubah saja", sort kolom, pagination — semua fitur dari upgrade SaaS table sebelumnya **tetap jalan persis sama**
- Produk tanpa varian tampil & berfungsi exactly seperti sebelumnya

---

## 🚀 Deployment

1. Extract zip, drop ke root repo (2 file ter-replace):
   - `backend/controllers/erp/purchaseController.js`
   - `frontend/src/pages/erp/StockOpnamePage.jsx`
2. **Tidak ada migrasi database baru** — semua kolom (`variant_id` di `erp_stock`/`erp_stock_movements`) sudah ada dari Phase 1 variant migration sebelumnya
3. `git add . && git commit -m "fix(erp): stock opname now shows variant rows separately" && git push`
4. Tunggu Railway redeploy backend & frontend
5. Hard refresh browser

## ✅ Testing

1. Buka **Stok Opname** → pilih cabang yang punya produk dengan varian (mis. GP Distro)
2. Produk dengan varian (mis. "Kaos GP Racing") sekarang muncul sebagai **beberapa baris terpisah** — satu per kombinasi (Merah/S, Merah/M, Hitam/S, dst), masing-masing dengan badge nama varian
3. Edit "Stok Aktual" salah satu baris varian → Simpan → cek di **ProductsPage → tab Foto & Varian → Kombinasi Varian** bahwa stok varian tersebut benar ter-update
4. Coba search nama varian (mis. ketik "Merah") di kotak pencarian → harus filter baris yang sesuai
5. Test Download Excel → Edit beberapa baris (termasuk baris varian) → Import kembali → pastikan matching benar (cek kolom `row_key` di file Excel)
6. Bulk-select beberapa baris (campur produk biasa + varian) → "Reset ke Stok Sistem" → pastikan reset tepat per baris

## 🔧 Troubleshooting

**Q: Setelah deploy, varian masih tidak muncul?**
A: Cek dulu apakah produk tersebut memang sudah punya kombinasi varian yang **di-generate dan aktif** (buka ProductsPage → edit produk → tab Foto & Varian → harus ada baris di "Kombinasi Varian", dan status bukan "Nonaktif").

**Q: Submit opname error / stok tidak berubah untuk baris varian?**
A: Pastikan backend sudah ke-redeploy (cek Railway logs ada perubahan terbaru). Endpoint `/stock-opname` butuh `ProductVariant` model yang sudah ter-export dari fix sebelumnya — kalau itu belum ter-deploy, error akan muncul di response.

**Q: Produk tanpa varian jadi hilang/berubah perilakunya?**
A: Tidak seharusnya — produk tanpa varian tetap 1 baris seperti biasa, hanya sumber datanya pindah ke endpoint yang lebih akurat.
