# 🎯 GPDISTRO — Upgrade Tabel ERP ke Format SaaS Profesional

Upgrade `DataTable.jsx` (komponen reusable) + migrasi/penambahan fitur di 8 halaman ERP. **Pure frontend — tidak ada perubahan database/migration untuk paket ini.**

---

## 📦 Isi Paket (9 file)

```
frontend/src/
├── components/
│   └── DataTable.jsx          ← UPGRADE (komponen inti)
└── pages/erp/
    ├── ProductsPage.jsx       ← + Sort kolom (basis: live repo terbaru, sudah termasuk Variant Manager)
    ├── ExpensesPage.jsx       ← + Filter kategori, bulk-select, export CSV
    ├── ShipmentsPage.jsx      ← FIX BUG search + export CSV
    ├── ReturnsPage.jsx        ← + Export CSV (filter pill existing dipertahankan)
    ├── StockOpnamePage.jsx    ← MIGRASI penuh ke DataTable + bulk reset
    ├── InventoryPage.jsx      ← MIGRASI tab Reorder Alert + bulk action
    ├── SalesTargetPage.jsx    ← MIGRASI tab Set Target + filter channel
    └── SalesReportPage.jsx    ← MIGRASI (FIX: sebelumnya 0 pagination)
```

---

## 🚀 Upgrade `DataTable.jsx` — 3 Fitur Baru

| Fitur | Prop | Keterangan |
|---|---|---|
| **Bulk Select + Aksi Massal** | `selectable`, `bulkActions` | Checkbox per baris + "Pilih semua di halaman ini" / "Pilih semua N hasil". `bulkActions` adalah render-prop yang terima `(selectedRows, clearSelection)` — Anda render toolbar aksi sendiri (delete, reset, dll) |
| **Export CSV** | `exportable`, `exportFilename` | Tombol export yang hormat filter/search aktif (cuma export apa yang sedang tampil di filter, bukan semua data mentah). Per-kolom bisa override dengan `exportValue`/`exportLabel` di definisi kolom |
| **Page Size Selector** | `pageSizeOptions` | Dropdown 10/25/50/100 baris per halaman, menggantikan `pageSize` tetap |

**100% backward compatible** — semua page yang sudah pakai `DataTable` sebelumnya (OrdersPage, PurchasesPage, CustomersPage) **tidak perlu diubah**, tetap jalan normal tanpa fitur baru kecuali Anda tambahkan prop-nya.

### Contoh Penggunaan Bulk Action

```jsx
<DataTable
  columns={columns}
  data={expenses}
  selectable
  bulkActions={(selected, clear) => (
    <div className="flex gap-2">
      <span className="text-xs">{selected.length} dipilih</span>
      <button onClick={() => handleBulkDelete(selected, clear)} className="btn-danger-sm">
        Hapus {selected.length}
      </button>
    </div>
  )}
  exportable
  exportFilename="pengeluaran"
  pageSizeOptions={[10,25,50,100]}
  ...
/>
```

---

## 📋 Detail Per Halaman

### ProductsPage — Sort Kolom
Tabel produk **tetap custom** (bulk-select, expand-row variant, action menu yang sudah ada **TIDAK dibongkar**) — cuma ditambah klik-header untuk sort: Nama, SKU, Qty Stok, Harga Beli, Harga Jual, Harga Toko. Klik sekali = ascending, klik lagi = descending, ada indikator panah.

> ⚠️ File ini dibangun di atas versi **live repo Anda yang TERBARU** (sudah termasuk fitur Variant Manager dari fix sebelumnya) — bukan versi lama. Aman langsung replace.

### ExpensesPage — Filter + Bulk + Export
- Filter dropdown kategori (baru)
- Bulk-select + bulk-delete pengeluaran
- Export CSV (menghormati filter kategori & search aktif)

### ShipmentsPage — Bug Fix + Export
**Bug nyata ditemukan & diperbaiki**: prop lama `customFilter` **tidak pernah benar-benar didukung** oleh `DataTable` (silently diabaikan) — artinya search by nama customer **selama ini tidak pernah berfungsi**. Diganti ke `searchFn` (prop yang benar-benar didukung). Plus tambah export CSV.

### ReturnsPage — Export Ditambahkan
Filter pill status (Pending/Approved/dst) yang sudah ada **dipertahankan** karena UX-nya sudah bagus — cuma ditambah export CSV.

### StockOpnamePage — Migrasi Penuh
Dari `<table>` manual ke `DataTable`. Input "Stok Aktual" yang bisa diedit langsung **tetap berfungsi** (pakai `render` prop yang terhubung ke state eksternal). Tambahan: search nama/SKU, sort kolom, toggle "tampilkan yang berubah saja", bulk-select dengan aksi "Reset ke Stok Sistem".

### InventoryPage — Migrasi Tab Reorder Alert
**Hanya tab "🔔 Reorder Alert"** yang dimigrasi (Dashboard/Mutasi Stok/Nilai Stok **tidak disentuh** — sudah cukup baik / pagination server-side). Bulk-select lama diganti pakai mekanisme `DataTable`, tambah filter urgensi & sort kolom.

### SalesTargetPage — Migrasi Tab Set Target
Input target_revenue/target_orders/notes yang editable **tetap berfungsi**. Tambah search nama sub-channel, filter channel (WA/Marketplace/Langsung), export CSV. Tab Dashboard & History (pivot dinamis) **tidak disentuh** — by design, karena strukturnya pivot bukan list.

### SalesReportPage — Migrasi (Fix Kritis)
**Sebelumnya tabel order detail render SEMUA baris sekaligus tanpa pagination** — kalau sebulan ada ratusan order, browser bisa lemot. Sekarang dipaginasi, sortable (tanggal/subtotal/total), filter channel, export CSV.

---

## ❌ Yang SENGAJA Tidak Disentuh (Sesuai Hasil Review)

| Halaman | Alasan |
|---|---|
| **DailyReportPage** | Pivot tanggal×channel dengan sticky kolom kompleks — bukan kandidat DataTable generik |
| **ChannelReportPage** | Grouped header (rowSpan/colSpan) — sama, perlu treatment beda |
| **ProfitLossPage** | Bukan tabel — laporan laba-rugi gaya statement |
| **ImportPage** | Tabel preview transient (maks 50 baris in-memory), bukan entity list persisten |
| **MasterDataPage** | Pakai card grid, bukan tabel sama sekali |
| **OrdersPage, PurchasesPage, CustomersPage** | Sudah cukup lengkap (search+sort+filter+pagination), tidak diubah di paket ini |

---

## 🚀 Deployment

1. Extract zip, drop folder `frontend/` ke root repo (auto-replace 9 file)
2. **Tidak ada migrasi database** — pure frontend
3. `git add . && git commit -m "feat(erp): upgrade tables to professional SaaS format (sort, filter, bulk, export, pagination)" && git push`
4. Tunggu Railway redeploy frontend
5. Hard refresh browser (Ctrl+Shift+R)

---

## ✅ Testing Checklist

- [ ] **ProductsPage**: klik header "Nama Produk" / "Harga Jual" dll → urut naik/turun, indikator panah muncul
- [ ] **ExpensesPage**: pilih beberapa baris (checkbox) → tombol "Hapus N" muncul → test hapus massal. Filter kategori jalan. Export CSV download file
- [ ] **ShipmentsPage**: search nama customer di kotak pencarian → **harus filter hasil** (sebelumnya bug, tidak jalan). Export CSV jalan
- [ ] **ReturnsPage**: filter pill status masih jalan seperti biasa. Export CSV jalan
- [ ] **StockOpnamePage**: input "Stok Aktual" masih bisa diedit & tersimpan. Search produk jalan. Sort kolom jalan. Bulk-select → "Reset ke Stok Sistem" jalan
- [ ] **InventoryPage**: tab "Reorder Alert" — filter urgensi, sort kolom, bulk-select "Saran Reorder" jalan. Tab lain (Dashboard/Mutasi/Nilai) **tidak berubah**
- [ ] **SalesTargetPage**: tab "Set Target" — input target masih bisa diedit. Filter channel jalan. Export CSV jalan
- [ ] **SalesReportPage**: order detail sekarang ada pagination (cek kalau data >20 baris). Sort tanggal/total jalan
- [ ] Semua halaman: dropdown "10/25/50/100 per halaman" muncul di pagination dan berfungsi

---

## 🔧 Troubleshooting

**Q: Export CSV file kosong / cuma header?**
A: Pastikan ada data yang ter-load & filter tidak menyembunyikan semua baris. Export ikut filter aktif.

**Q: Bulk action button tidak muncul walau sudah pilih baris?**
A: Cek apakah `bulkActions` prop di-pass ke `<DataTable>`. Untuk Returns/Shipments memang sengaja tidak ada bulk action (lihat alasan di README halaman tersebut).

**Q: ProductsPage hilang fitur Variant Manager setelah update?**
A: Tidak seharusnya — file ini dibangun di atas versi live terbaru. Kalau hilang, kemungkinan Anda meng-overwrite dengan versi lama dari paket lain. Cek `git diff` sebelum commit.

---

**Project:** GPDISTRO RACING ID
**Scope:** Frontend table standardization (Grup A + Grup B + ProductsPage sort)
**Tidak termasuk:** Grup C (report/pivot pages — export CSV bisa jadi paket terpisah kalau dibutuhkan)
