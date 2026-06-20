# 🎨 Order Module: UI Beda per Cabang + Order Bisa Pilih Varian

## Latar Belakang

Sebelumnya halaman "Buat Order Baru" terlihat **identik** untuk GP Racing maupun GP Distro — cuma beda warna highlight tipis di kartu pemilihan cabang. Begitu staff scroll ke bawah (pelanggan, produk, ringkasan), tidak ada penanda visual lagi sedang input order untuk cabang yang mana. Ditambah satu masalah fungsional yang lebih serius: **produk dengan varian (Ukuran/Warna) sama sekali tidak bisa dipilih variannya saat dibuatkan order** — order langsung mengambil produk mentah tanpa tahu varian mana, sehingga stok yang terpotong nanti salah/asal.

## Yang Dikerjakan

### 1. Identitas visual penuh per cabang (bukan cuma kartu pemilihan)

| | GP Racing | GP Distro |
|---|---|---|
| Warna | Merah racing `#dc2626` → `#7f1d1d` | Navy-magenta `#1a1a2e` → `#db2777` |
| Ikon | 🔧 Wrench | 👕 Shirt |
| Label divisi | DIVISI SPARE PART | DIVISI FASHION & APPAREL |
| Pola aksen | Garis diagonal (motif racing) | Titik-titik (motif label baju) |

Warna ini sekarang konsisten diterapkan ke: **pita identitas cabang** di paling atas (selalu terlihat, ikut menampilkan jumlah produk di keranjang), kartu pemilihan cabang, tombol channel & metode pembayaran terpilih, ikon + placeholder kolom cari produk, badge varian di keranjang, border atas panel Ringkasan, warna teks Total, dan tombol "Konfirmasi Order" — supaya warna cabang terasa di **seluruh halaman**, bukan cuma di satu tempat yang gampang kelewat saat scroll.

### 2. Pengaman ganti cabang dengan keranjang terisi

Kalau staff sudah menambahkan produk lalu klak-klik pindah ke cabang lain, sekarang muncul konfirmasi: *"Anda sudah menambahkan N produk untuk GP Racing. Ganti ke GP Distro akan MENGOSONGKAN keranjang..."*. Mencegah order kecampur produk dua cabang secara tidak sengaja.

### 3. 🎯 Perbaikan fungsional inti: Order sekarang variant-aware

Ini akar masalah paling kritis untuk "user tidak salah input data" di GP Distro:

- Saat staff klik produk hasil pencarian, sistem **otomatis cek** apakah produk itu punya varian aktif (Ukuran/Warna dst).
- Kalau **punya varian** → muncul modal wajib pilih varian (kartu per varian, ada badge stok merah/kuning/hijau, varian yang stoknya 0 otomatis tidak bisa diklik) — **staff tidak bisa lanjut tanpa memilih varian**.
- Kalau **tidak punya varian** (mayoritas sparepart GP Racing) → langsung masuk keranjang seperti biasa, tanpa langkah tambahan.
- Backend (`orderController.js`) sekarang juga **menolak order** kalau ada produk yang punya varian aktif tapi `variant_id` tidak disertakan — jadi pengamanan tetap berlaku walau ada yang coba lewat API langsung, bukan cuma di UI.
- Pemotongan stok saat order dikonfirmasi sekarang **tepat ke baris stok varian yang benar** (bukan ke produk agregat), demikian juga saat order dibatalkan (restock kembali ke varian yang tepat).

### 🐛 Bonus bug fix yang ditemukan saat investigasi

Order **draft** yang dibatalkan sebelumnya **tidak pernah melepas reservasi stok** (`qty_reserved`) — hanya order berstatus confirmed/processing yang dilepas. Akibatnya stok yang "tertahan" oleh draft yang dibatalkan tidak pernah kembali tersedia sampai ada intervensi manual. Sudah diperbaiki di `cancelOrder`.

## File yang Diubah

```
backend/controllers/erp/orderController.js   ← createOrder, confirmOrder, cancelOrder: variant-aware
frontend/src/pages/erp/NewOrderPage.jsx      ← UI beda per cabang + variant picker
```

**Tidak ada migrasi database baru** — kolom `variant_id` di `erp_order_items`/`erp_stock`/`erp_stock_movements` sudah ada dari Phase 1 variant migration sebelumnya.

## Yang TIDAK Berubah

`AddCustomerModal`, `TagInput`, deteksi pelanggan duplikat, `WilayahPicker`, pencarian pelanggan, sub-channel marketplace/langsung, sinkronisasi insentif — semua persis sama seperti sebelumnya, tidak disentuh sama sekali.

---

## 🚀 Deployment

1. Extract zip, drop ke root repo (2 file ter-replace):
   - `backend/controllers/erp/orderController.js`
   - `frontend/src/pages/erp/NewOrderPage.jsx`
2. **Tidak ada migrasi database** — langsung deploy
3. `git add . && git commit -m "feat(erp): branch-differentiated order UI + variant-aware order flow" && git push`
4. Tunggu Railway redeploy backend & frontend
5. Hard refresh browser

## ✅ Testing

1. **Visual**: Buka Buat Order Baru → pilih GP Racing → seluruh halaman (pita atas, tombol channel, total, tombol konfirmasi) berwarna merah dengan ikon kunci pas. Ganti ke GP Distro → semua berubah jadi navy-magenta dengan ikon baju, label "DIVISI FASHION & APPAREL".
2. **Ganti cabang dengan keranjang terisi**: Tambah 1 produk → coba klik cabang lain → harus muncul dialog konfirmasi peringatan keranjang akan kosong.
3. **Produk tanpa varian** (mayoritas GP Racing): klik hasil pencarian → langsung masuk keranjang, tidak ada modal tambahan, persis seperti sebelumnya.
4. **Produk dengan varian** (GP Distro, mis. "Kaos GP Racing"): klik hasil pencarian → modal "Pilih Varian" wajib muncul → pilih salah satu (mis. "Merah / L") → masuk keranjang dengan badge nama varian terlihat di baris produk.
5. **Stok habis di varian tertentu**: kartu varian yang stoknya 0 harus tampak pudar dan tidak bisa diklik.
6. **Submit order dengan item varian** → Konfirmasi Order & Kurangi Stok → cek di ProductsPage tab Varian bahwa stok yang terpotong adalah **varian yang dipilih**, bukan total produk.
7. **Reject tanpa variant_id**: (opsional, test API langsung) kirim order dengan produk yang punya varian aktif tapi `variant_id: null` → harus ditolak dengan pesan "Pilih varian untuk produk...".
8. **Cancel draft order**: buat order draft dengan beberapa item → batalkan → cek `qty_reserved` produk tersebut di database sudah turun kembali (sebelumnya tidak pernah turun).

## 🔧 Troubleshooting

**Q: Modal varian tidak pernah muncul sama sekali walau produk punya varian?**
A: Pastikan backend sudah ter-redeploy dengan fix `ProductVariant` model sebelumnya (dari sesi sebelumnya — `fix-models-erp-productvariant.zip`). Endpoint `GET /products/:id/variants` butuh model itu untuk berfungsi.

**Q: Warna tidak berubah saat ganti cabang?**
A: Hard refresh / clear cache browser — pastikan file `NewOrderPage.jsx` yang ter-deploy adalah versi baru (cek timestamp di Railway build log).

**Q: Order dengan varian gagal terus dengan pesan "Pilih varian untuk produk..."?**
A: Itu memang perilaku yang disengaja kalau produk punya varian aktif tapi `variant_id` tidak terkirim — cek apakah modal varian sempat ke-skip (mis. karena error jaringan saat cek varian, sistem fail-open dan menambahkan produk tanpa varian). Coba ulangi pencarian produk.
