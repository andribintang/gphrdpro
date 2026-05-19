import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardList, CheckCircle2, AlertTriangle,
  RefreshCw, Loader2, Search, Download, Upload,
  FileSpreadsheet, X, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRp } from '../../utils/erp/erpService';

// ── Download template with current system stock ───────────────
const downloadTemplate = async (branch, products) => {
  try {
    const XLSX = await import('xlsx');
    const date = new Date().toLocaleDateString('id-ID');

    const rows = [
      // Header row
      ['product_id','sku','name','category','unit','system_qty','actual_qty','notes'],
      // Data rows — actual_qty pre-filled with system qty for convenience
      ...products.map(p => [
        p.id,
        p.sku || '',
        p.name,
        p.category?.name || '',
        p.unit || 'pcs',
        p.stock?.qty || 0,
        p.stock?.qty || 0,  // user will edit this column
        '',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
      { wch:10 }, { wch:14 }, { wch:30 }, { wch:16 },
      { wch:8  }, { wch:12 }, { wch:12 }, { wch:20 },
    ];

    // Lock columns A-F, only G (actual_qty) and H (notes) editable
    // Style header
    const headerStyle = { font:{ bold:true }, fill:{ fgColor:{ rgb:'F3F4F6' } } };
    ['A1','B1','C1','D1','E1','F1','G1','H1'].forEach(cell => {
      if (ws[cell]) ws[cell].s = headerStyle;
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Opname');

    const branchName = branch === '1' ? 'GPRacing' : 'GPDistro';
    const dateStr    = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `template_stok_opname_${branchName}_${dateStr}.xlsx`);
    toast.success('Template didownload! Edit kolom actual_qty lalu import kembali.');
  } catch (e) {
    toast.error('Gagal download template');
  }
};

// ── Parse imported Excel ──────────────────────────────────────
const parseImport = async (file) => {
  const XLSX = await import('xlsx');
  const data  = await file.arrayBuffer();
  const wb    = XLSX.read(data);
  const ws    = wb.Sheets[wb.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(ws, { defval:'' });
  return rows;
};

export default function StockOpnamePage() {
  const [products, setProducts]   = useState([]);
  const [opname, setOpname]       = useState({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [branch, setBranch]       = useState('1');
  const [search, setSearch]       = useState('');
  const [mode, setMode]           = useState('manual'); // manual | import
  const [importRows, setImportRows] = useState([]);
  const [importFile, setImportFile] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpService.getStockOpname({ branch_id: branch });
      const prods = res.data.data.products;
      setProducts(prods);
      const init = {};
      prods.forEach(p => { init[p.id] = p.stock?.qty || 0; });
      setOpname(init);
      setImportRows([]);
      setImportFile('');
    } catch { toast.error('Gagal memuat data stok'); }
    finally { setLoading(false); }
  }, [branch]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── Manual submit ──────────────────────────────────────────
  const handleSubmit = async () => {
    const items = Object.entries(opname)
      .map(([id, qty]) => ({ product_id:parseInt(id), actual_qty:parseInt(qty)||0 }))
      .filter(i => {
        const p = products.find(p => p.id === i.product_id);
        return p && i.actual_qty !== (p.stock?.qty || 0);
      });

    if (!items.length) { toast('Tidak ada perubahan stok', { icon:'ℹ️' }); return; }
    if (!confirm(`Simpan penyesuaian untuk ${items.length} produk?`)) return;

    setSaving(true);
    try {
      const res = await erpService.submitStockOpname({
        branch_id: parseInt(branch), items,
        notes: `Stok opname manual — ${new Date().toLocaleDateString('id-ID')}`,
      });
      toast.success(res.data.message);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  // ── Import file handler ────────────────────────────────────
  const handleFileImport = async (file) => {
    if (!file) return;
    setImportFile(file.name);
    try {
      const rows = await parseImport(file);
      // Validate rows
      const valid = rows.filter(r => r.product_id && r.actual_qty !== '');
      setImportRows(valid);
      toast.success(`${valid.length} baris siap diimport`);
    } catch { toast.error('Gagal membaca file'); }
  };

  const handleImportSubmit = async () => {
    if (!importRows.length) { toast.error('Tidak ada data'); return; }

    const items = importRows.map(r => ({
      product_id: parseInt(r.product_id),
      actual_qty: parseInt(r.actual_qty) || 0,
    })).filter(i => {
      const p = products.find(p => p.id === i.product_id);
      return p && i.actual_qty !== (p.stock?.qty || 0);
    });

    if (!items.length) { toast('Semua stok sama dengan sistem', { icon:'ℹ️' }); return; }
    if (!confirm(`Import penyesuaian untuk ${items.length} produk?`)) return;

    setImporting(true);
    try {
      const res = await erpService.submitStockOpname({
        branch_id: parseInt(branch), items,
        notes: `Stok opname import — ${importFile} — ${new Date().toLocaleDateString('id-ID')}`,
      });
      toast.success(res.data.message);
      setImportRows([]);
      setImportFile('');
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setImporting(false); }
  };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  const manualDiffs = Object.entries(opname).filter(([id, qty]) => {
    const p = products.find(p => p.id === parseInt(id));
    return p && parseInt(qty) !== (p.stock?.qty || 0);
  }).length;

  const importDiffs = importRows.filter(r => {
    const p = products.find(p => p.id === parseInt(r.product_id));
    return p && parseInt(r.actual_qty) !== (p.stock?.qty || 0);
  }).length;

  return (
    <div className="section animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>ERP</span><span>›</span>
        <span>Inventory</span><span>›</span>
        <span className="font-semibold text-[var(--text-primary)]">Stok Opname</span>
      </nav>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Stok Opname</h1>
          <p className="body-sm text-[var(--text-muted)]">Hitung & sesuaikan stok fisik vs sistem</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="btn-icon"><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* Branch + Mode selector */}
      <div className="card-sm mb-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[{id:'1',n:'GP Racing'},{id:'2',n:'GP Distro'}].map(b => (
            <button key={b.id} onClick={() => setBranch(b.id)}
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                branch===b.id ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)]'
                              : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
              {b.n}
            </button>
          ))}
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 border-b border-[var(--border)] pb-3">
          {[{k:'manual',l:'Input Manual'},{k:'import',l:'Import Excel'}].map(m => (
            <button key={m.k} onClick={() => setMode(m.k)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                mode===m.k ? 'bg-[var(--brand-600)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
              {m.k === 'import' && <Upload size={13} className="inline mr-1.5 -mt-0.5" />}
              {m.l}
            </button>
          ))}
        </div>

        {/* Import mode UI */}
        {mode === 'import' && (
          <div className="space-y-3">
            {/* Step 1: Download template */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Download Template</p>
                <p className="text-xs text-[var(--text-muted)] mb-2">Template berisi data stok sistem saat ini. Edit kolom <code className="bg-[var(--bg-tertiary)] px-1 rounded">actual_qty</code> sesuai hitungan fisik.</p>
                <button onClick={() => downloadTemplate(branch, products)} disabled={loading || !products.length}
                  className="btn-secondary text-xs h-8 px-3">
                  <Download size={13} /> Download Template ({products.length} produk)
                </button>
              </div>
            </div>

            {/* Step 2: Upload hasil */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
              <div className="w-6 h-6 rounded-full bg-[var(--text-muted)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Upload Hasil Opname</p>
                <p className="text-xs text-[var(--text-muted)] mb-2">Upload kembali file yang sudah diisi kolom actual_qty</p>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    importFile ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'border-[var(--border)] hover:border-[var(--brand-600)] hover:bg-[var(--bg-tertiary)]'}`}>
                  {importFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileSpreadsheet size={18} className="text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{importFile}</span>
                      <span className="text-xs text-[var(--text-muted)]">({importRows.length} baris)</span>
                    </div>
                  ) : (
                    <div>
                      <Upload size={20} className="mx-auto mb-1 text-[var(--text-muted)] opacity-50" />
                      <p className="text-xs text-[var(--text-muted)]">Klik atau drag file .xlsx</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => e.target.files[0] && handleFileImport(e.target.files[0])} />
              </div>
            </div>

            {/* Import preview */}
            {importRows.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center justify-between">
                  <p className="text-xs font-bold text-[var(--text-primary)]">Preview — {importDiffs} perubahan</p>
                  <button onClick={() => { setImportRows([]); setImportFile(''); }}
                    className="btn-icon-sm"><X size={12} /></button>
                </div>
                <div className="max-h-48 overflow-y-auto scrollbar-thin divide-y divide-[var(--border-subtle)]">
                  {importRows.filter(r => {
                    const p = products.find(p => p.id === parseInt(r.product_id));
                    return p && parseInt(r.actual_qty) !== (p.stock?.qty || 0);
                  }).slice(0, 10).map((r, i) => {
                    const p = products.find(p => p.id === parseInt(r.product_id));
                    const diff = parseInt(r.actual_qty) - (p?.stock?.qty || 0);
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{r.name || p?.name}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs flex-shrink-0">
                          <span className="text-[var(--text-muted)]">Sistem: {p?.stock?.qty || 0}</span>
                          <span className="text-[var(--text-muted)]">→</span>
                          <span className="font-bold text-[var(--text-primary)]">Fisik: {r.actual_qty}</span>
                          <span className={`font-bold ${diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            ({diff > 0 ? '+' : ''}{diff})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {importRows.length > 0 && (
              <button onClick={handleImportSubmit} disabled={importing || !importDiffs}
                className="btn-primary w-full h-11 text-sm font-bold disabled:opacity-50">
                {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                           : <><CheckCircle2 size={16} /> Simpan Penyesuaian ({importDiffs} produk)</>}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Manual mode */}
      {mode === 'manual' && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari produk atau SKU..."
              className="input-base pl-10 w-full" />
          </div>

          {manualDiffs > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{manualDiffs} produk berbeda dari stok sistem</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">{[...Array(6)].map((_,i) => <div key={i} className="skeleton h-14" />)}</div>
          ) : (
            <>
              <div className="table-wrapper mb-4">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider sticky top-0">
                  <div className="col-span-5">Produk</div>
                  <div className="col-span-2 text-center">Sistem</div>
                  <div className="col-span-3 text-center">Fisik (edit)</div>
                  <div className="col-span-2 text-center">Selisih</div>
                </div>
                <div className="divide-y divide-[var(--border-subtle)] max-h-[50vh] overflow-y-auto scrollbar-thin">
                  {filtered.map(p => {
                    const sysQty    = p.stock?.qty || 0;
                    const actualQty = parseInt(opname[p.id] ?? sysQty);
                    const diff      = actualQty - sysQty;
                    const hasDiff   = diff !== 0;
                    return (
                      <div key={p.id} className={`grid grid-cols-12 gap-2 items-center px-4 py-3 transition-colors ${hasDiff ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'hover:bg-[var(--bg-secondary)]'}`}>
                        <div className="col-span-5 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.name}</p>
                          {p.sku && <p className="text-[10px] font-mono text-[var(--text-muted)]">{p.sku}</p>}
                        </div>
                        <div className="col-span-2 text-center">
                          <p className="text-sm font-semibold text-[var(--text-secondary)]">{sysQty}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{p.unit}</p>
                        </div>
                        <div className="col-span-3 flex justify-center">
                          <input type="number" value={opname[p.id] ?? sysQty} min={0}
                            onChange={e => {
                              const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)||0);
                              setOpname(o => ({...o, [p.id]: val}));
                            }}
                            className={`input-base text-sm h-9 w-24 text-center ${hasDiff ? 'border-amber-400 dark:border-amber-600' : ''}`} />
                        </div>
                        <div className="col-span-2 text-center">
                          {hasDiff ? (
                            <span className={`text-sm font-bold ${diff>0?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>
                              {diff>0?'+':''}{diff}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div className="text-center py-12">
                      <ClipboardList size={32} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30" />
                      <p className="text-sm text-[var(--text-muted)]">Tidak ada produk</p>
                    </div>
                  )}
                </div>
              </div>

              <button onClick={handleSubmit} disabled={saving || manualDiffs === 0}
                className="btn-primary w-full h-11 text-sm font-bold disabled:opacity-50">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</>
                        : <><CheckCircle2 size={16} /> Simpan Penyesuaian ({manualDiffs} produk)</>}
              </button>
              {manualDiffs === 0 && (
                <p className="text-xs text-center text-[var(--text-muted)] mt-2">Edit kolom Fisik untuk mulai penyesuaian</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
