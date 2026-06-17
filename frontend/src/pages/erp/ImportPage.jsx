import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { erpService } from '../../utils/erp/erpService';
import { FileSpreadsheet, Download, Upload, Check, AlertTriangle, Loader2, X } from 'lucide-react';

export default function ImportPage() {
  const [tab,      setTab]      = useState('products');
  const [branch,   setBranch]   = useState('1');
  const [rows,     setRows]     = useState([]);
  const [errors,   setErrors]   = useState([]);
  const [step,     setStep]     = useState('upload'); // upload|preview|result
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);

  // ── Column definitions ──────────────────────────────────────
  const PRODUCT_COLS = [
    { key: 'name',               label: 'Nama Produk *',        required: true  },
    { key: 'sku',                label: 'SKU',                  required: false },
    { key: 'barcode',            label: 'Barcode',              required: false },
    { key: 'category_id',        label: 'Kategori (Nama/ID)',   required: false },
    { key: 'unit',               label: 'Satuan',              required: false },
    { key: 'buy_price',          label: 'Harga Beli (Rp)',     required: false },
    { key: 'sell_price',         label: 'Harga Jual (Rp) *',   required: true  },
    { key: 'sell_price_mp',      label: 'Harga Marketplace',   required: false },
    { key: 'sell_price_wa',      label: 'Harga WA/Reseller',   required: false },
    { key: 'weight',             label: 'Berat (kg)',           required: false },
    { key: 'stock_min',          label: 'Stok Minimum',        required: false },
    { key: 'initial_stock',      label: 'Stok Awal',           required: false },
    { key: 'store_price',        label: 'Harga Toko Online',   required: false },
    { key: 'store_price_compare',label: 'Harga Coret (Diskon)',required: false },
    { key: 'store_active_gpr',   label: 'Aktif di Toko GP Racing (1/0)', required: false },
    { key: 'store_active_gpd',   label: 'Aktif di Toko GP Distro (1/0)', required: false },
    { key: 'store_short_desc',   label: 'Deskripsi Singkat',   required: false },
    { key: 'store_description',  label: 'Deskripsi Lengkap',   required: false },
    { key: 'store_tags',         label: 'Tags (pisah koma)',   required: false },
    { key: 'store_featured',     label: 'Produk Unggulan (1/0)', required: false },
    { key: 'store_meta_title',   label: 'Meta Title (SEO)',    required: false },
    { key: 'store_meta_desc',    label: 'Meta Deskripsi (SEO)',required: false },
    { key: 'notes',              label: 'Catatan',             required: false },
  ];

  const CUSTOMER_COLS = [
    { key: 'name',        label: 'Nama *',          required: true  },
    { key: 'phone',       label: 'No. HP',          required: false },
    { key: 'email',       label: 'Email',           required: false },
    { key: 'address',     label: 'Alamat',          required: false },
    { key: 'city',        label: 'Kota',            required: false },
    { key: 'province',    label: 'Provinsi',        required: false },
    { key: 'postal_code', label: 'Kode Pos',        required: false },
    { key: 'notes',       label: 'Catatan',         required: false },
  ];

  const COLS = tab === 'products' ? PRODUCT_COLS : CUSTOMER_COLS;

  // ── Download template ───────────────────────────────────────
  const downloadTemplate = () => {
    try {
      const headers = COLS.map(c => c.key);
      const labels  = COLS.map(c => c.label);
      const example = tab === 'products'
        ? ['Contoh Produk A', 'SKU001', '1234567890', 'Spare Part', 'pcs', 50000, 100000, 95000, 90000, 0.5, 5, 10, 100000, '', 1, 0, 'Deskripsi singkat produk', 'Deskripsi lengkap untuk halaman produk', 'racing, sparepart, motor', 0, 'Spare Part Racing Original', 'Beli spare part racing original dengan harga terbaik', '']
        : ['Budi Santoso', '08123456789', 'budi@email.com', 'Jl. Contoh No.1', 'Jakarta', 'DKI Jakarta', '12345', ''];
      const ws = XLSX.utils.aoa_to_sheet([labels, headers, example]);
      ws['!cols'] = headers.map(() => ({ wch: 22 }));

      // Freeze header rows
      ws['!freeze'] = { xSplit: 0, ySplit: 2 };

      // Guide sheet
      const guide = [
        ['PANDUAN IMPORT ' + (tab === 'products' ? 'PRODUK' : 'PELANGGAN'), ''],
        ['', ''],
        ['PENTING:', ''],
        ['- Baris 1 (label) dan baris 2 (key) adalah header — jangan diubah', ''],
        ['- Data diisi mulai baris ke-3', ''],
        ['- Kolom bertanda * wajib diisi', ''],
        ['', ''],
        ...(tab === 'products' ? [
          ['CATATAN KOLOM:', ''],
          ['category_id', 'Isi NAMA kategori (mis. "Spare Part") — otomatis dibuat jika belum ada. Bisa juga isi ID angka jika sudah tahu.'],
          ['unit', 'Satuan: pcs, kg, liter, set, pasang, dll'],
          ['sell_price', 'Harga jual utama (wajib)'],
          ['sell_price_mp', 'Harga untuk marketplace (opsional)'],
          ['store_price', 'Harga tampil di toko online (opsional, default ikut harga marketplace/jual)'],
          ['store_price_compare', 'Harga coret untuk efek diskon di toko online (opsional)'],
          ['store_active_gpr', '1 = tampilkan di toko GP Racing, 0 = tidak'],
          ['store_active_gpd', '1 = tampilkan di toko GP Distro, 0 = tidak'],
          ['store_tags', 'Tag pencarian, pisahkan dengan koma, mis: racing,sparepart,motor'],
          ['store_featured', '1 = tampilkan sebagai produk unggulan di toko, 0 = tidak'],
          ['store_meta_title / store_meta_desc', 'Untuk SEO halaman produk di toko online (opsional)'],
          ['initial_stock', 'Stok awal saat import (hanya untuk produk baru)'],
        ] : []),
      ];
      const wsGuide = XLSX.utils.aoa_to_sheet(guide);
      wsGuide['!cols'] = [{ wch: 30 }, { wch: 60 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws,      tab === 'products' ? 'Import Produk' : 'Import Pelanggan');
      XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan');
      XLSX.writeFile(wb, `template_import_${tab}.xlsx`);
      toast.success('Template didownload');
    } catch { toast.error('Gagal download template'); }
  };

  // ── Parse file ──────────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type: 'array', raw: false });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Row 0 = labels, Row 1 = keys, Row 2+ = data
        if (raw.length < 3) { toast.error('File kosong atau format salah'); return; }
        const keys = raw[1].map(k => String(k).trim().toLowerCase());
        const data = raw.slice(2).filter(r => r.some(v => v !== ''));

        const errs = [];
        const cleaned = data.map((row, i) => {
          const obj = {};
          keys.forEach((k, j) => { obj[k] = String(row[j] ?? '').trim(); });
          // Validate required
          COLS.forEach(col => {
            if (col.required && !obj[col.key]) {
              errs.push(`Baris ${i+3}: kolom "${col.label}" wajib diisi`);
            }
          });
          return obj;
        });

        setErrors(errs);
        setRows(cleaned);
        setStep('preview');
      } catch(err) { toast.error('Gagal baca file: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // ── Import ──────────────────────────────────────────────────
  const handleImport = async () => {
    if (errors.length) { toast.error('Perbaiki error dulu'); return; }
    setLoading(true);
    try {
      const payload = { branch_id: parseInt(branch), rows, filename: `import_${tab}.xlsx` };
      const r = tab === 'products'
        ? await erpService.importProducts(payload)
        : await erpService.importCustomers(payload);
      setResult(r.data.data);
      setStep('result');
    } catch(e) {
      toast.error(e.response?.data?.message || 'Gagal import');
    } finally { setLoading(false); }
  };

  const reset = () => { setRows([]); setErrors([]); setStep('upload'); setResult(null); };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Import Data</h1>
          <p className="page-subtitle">Upload file Excel untuk import data massal</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[{k:'products',l:'📦 Produk'},{k:'customers',l:'👥 Pelanggan'}].map(t => (
          <button key={t.k} onClick={() => { setTab(t.k); reset(); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t.k ? 'bg-[var(--brand-600)] text-white shadow-sm' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Steps */}
        <div className="space-y-4">
          {/* Branch selector */}
          {tab === 'products' && (
            <div className="table-wrapper p-4">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Cabang</label>
              <select value={branch} onChange={e => setBranch(e.target.value)} className="input-base text-sm">
                <option value="1">GP Racing Store</option>
                <option value="2">GP Distro</option>
              </select>
            </div>
          )}

          {/* Template download */}
          <div className="table-wrapper p-4 space-y-3">
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Step 1 — Download Template</p>
            <p className="text-xs text-[var(--text-muted)]">
              Template sudah berisi kolom yang sesuai dengan sistem. Isi data mulai baris ke-3.
            </p>
            <button onClick={downloadTemplate}
              className="btn-secondary w-full h-10 text-sm gap-2">
              <Download size={15}/> Download Template Excel
            </button>
          </div>

          {/* Column guide */}
          <div className="table-wrapper p-4">
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Kolom Template</p>
            <div className="space-y-1.5">
              {COLS.map(col => (
                <div key={col.key} className="flex items-start gap-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 mt-0.5 ${
                    col.required ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {col.required ? 'WAJIB' : 'OPS'}
                  </span>
                  <div>
                    <p className="text-[10px] font-mono text-[var(--brand-600)]">{col.key}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{col.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Upload/Preview/Result */}
        <div className="lg:col-span-2 space-y-4">
          {/* Upload */}
          {step === 'upload' && (
            <div className="table-wrapper p-6">
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Step 2 — Upload File</p>
              <label className="block border-2 border-dashed border-[var(--border)] rounded-xl p-12 text-center cursor-pointer hover:border-[var(--brand-500)] hover:bg-[var(--brand-500)]/5 transition-colors">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FileSpreadsheet size={28} className="text-blue-600"/>
                </div>
                <p className="font-semibold text-sm mb-1">Klik atau drag & drop file Excel</p>
                <p className="text-xs text-[var(--text-muted)]">Format: .xlsx — Gunakan template yang sudah didownload</p>
                <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={handleFile}/>
              </label>
            </div>
          )}

          {/* Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="table-wrapper p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{rows.length}</p>
                  <p className="text-xs text-[var(--text-muted)]">Total Baris</p>
                </div>
                <div className={`table-wrapper p-4 text-center ${errors.length ? 'border-red-200' : ''}`}>
                  <p className={`text-2xl font-bold ${errors.length ? 'text-red-600' : 'text-blue-600'}`}>
                    {errors.length || '✓'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{errors.length ? 'Error' : 'Siap Import'}</p>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                  <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
                    <AlertTriangle size={13}/> Perbaiki file dan upload ulang
                  </p>
                  {errors.map((e,i) => <p key={i} className="text-xs text-red-600 mb-0.5">• {e}</p>)}
                </div>
              )}

              {/* Preview table */}
              <div className="table-wrapper overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg)] flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Preview Data (50 baris pertama)</span>
                  <button onClick={reset} className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-600)]">← Ganti File</button>
                </div>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                        <th className="px-3 py-2 text-left font-bold text-[var(--text-muted)] uppercase tracking-wide">#</th>
                        {COLS.slice(0,6).map(col => (
                          <th key={col.key} className="px-3 py-2 text-left font-bold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">
                            {col.key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {rows.slice(0,50).map((row,i) => (
                        <tr key={i} className="hover:bg-[var(--bg)]">
                          <td className="px-3 py-2 text-[var(--text-muted)]">{i+1}</td>
                          {COLS.slice(0,6).map(col => (
                            <td key={col.key} className="px-3 py-2 max-w-[140px] truncate">{row[col.key] || '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={reset} className="btn-secondary flex-1 h-11 text-sm">Batal</button>
                {errors.length === 0 && (
                  <button onClick={handleImport} disabled={loading}
                    className="btn-primary flex-1 h-11 text-sm gap-2 disabled:opacity-60">
                    {loading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                    {loading ? `Mengimport ${rows.length} data...` : `Import ${rows.length} Data`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Result */}
          {step === 'result' && result && (
            <div className="table-wrapper p-6 space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={32} className="text-green-600"/>
                </div>
                <h3 className="font-bold text-lg">Import Selesai!</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:'Berhasil', value: result.success, c:'green' },
                  { label:'Diperbarui', value: result.updated || 0, c:'blue' },
                  { label:'Gagal', value: result.failed, c:'red' },
                ].map(({ label, value, c }) => (
                  <div key={label} className={`bg-${c}-50 border border-${c}-200 rounded-xl p-4 text-center`}>
                    <p className={`text-3xl font-bold text-${c}-700`}>{value}</p>
                    <p className={`text-xs text-${c}-600 mt-1`}>{label}</p>
                  </div>
                ))}
              </div>
              {result.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                  <p className="text-xs font-bold text-red-700 mb-2">Detail Error:</p>
                  {result.errors.map((e,i) => <p key={i} className="text-xs text-red-600 mb-0.5">• {e}</p>)}
                </div>
              )}
              <button onClick={reset} className="btn-primary w-full h-11 text-sm">Import Data Lagi</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
