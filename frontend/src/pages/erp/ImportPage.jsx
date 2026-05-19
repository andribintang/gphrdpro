import { useState, useRef } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Download, Loader2, X, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService } from '../../utils/erp/erpService';

export default function ImportPage() {
  const [type, setType]         = useState('products');
  const [branch, setBranch]     = useState(1);
  const [rows, setRows]         = useState([]);
  const [fileName, setFileName] = useState('');
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const fileRef = useRef(null);

  const TYPES = {
    products:  { label:'Produk',    desc:'Import data produk + stok awal',    cols:['name*','sku','barcode','category','unit','buy_price*','sell_price*','sell_price_mp','weight','stock_qty','stock_min'] },
    customers: { label:'Pelanggan', desc:'Import database pelanggan',          cols:['name*','phone','email','address','city','province','postal_code','code'] },
  };

  const parseFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) {
      toast.error('Format file harus .xlsx, .xls, atau .csv');
      return;
    }
    setFileName(file.name);
    setResult(null);

    try {
      const XLSX = await import('xlsx');
      const data  = await file.arrayBuffer();
      const wb    = XLSX.read(data);
      const ws    = wb.Sheets[wb.SheetNames[0]];
      const json  = XLSX.utils.sheet_to_json(ws, { defval:'' });
      setRows(json);
      toast.success(`${json.length} baris data siap diimport`);
    } catch { toast.error('Gagal membaca file'); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleImport = async () => {
    if (!rows.length) { toast.error('Belum ada data'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await erpService.importData({ type, branch_id: branch, rows });
      setResult(res.data);
      if (res.data.data.errors === 0) toast.success(`${res.data.data.success} data berhasil diimport!`);
      else toast(`${res.data.data.success} berhasil, ${res.data.data.errors} gagal`, { icon:'⚠️' });
    } catch (e) { toast.error(e.response?.data?.message || 'Import gagal'); }
    finally { setLoading(false); }
  };

  const downloadTemplate = () => {
    const cfg = TYPES[type];
    const data = [
      cfg.cols,
      type === 'products'
        ? ['Kampas Rem Honda Beat', 'KR-001', '8991234567', 'Spare Part', 'pcs', 15000, 25000, 27000, 100, 50, 5]
        : ['Budi Santoso', '08123456789', 'budi@email.com', 'Jl. Contoh No.1', 'Jakarta', 'DKI Jakarta', '12345', 'CUST-00001'],
    ];
    import('xlsx').then((XLSX) => {
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, `template_import_${type}.xlsx`);
    });
  };

  return (
    <div className="max-w-lg lg:max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Import Data</h1>
          <p className="text-sm text-[var(--text-secondary)]">Migrasi dari Excel / CSV</p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
          <Download className="w-4 h-4" /> Template
        </button>
      </div>

      {/* Step 1 — Type */}
      <div className="card p-5 mb-4">
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Langkah 1 — Pilih Tipe Data</p>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(TYPES).map(([k,v]) => (
            <button key={k} onClick={() => { setType(k); setRows([]); setFileName(''); setResult(null); }}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${type===k ? 'border-brand-500 bg-brand-50 dark:bg-brand-950' : 'border-[var(--border)] hover:bg-[var(--bg-secondary)]'}`}>
              <FileSpreadsheet className={`w-6 h-6 mb-2 ${type===k ? 'text-brand-500' : 'text-[var(--text-muted)]'}`} />
              <p className={`text-sm font-bold ${type===k ? 'text-brand-600 dark:text-brand-400' : 'text-[var(--text-primary)]'}`}>{v.label}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{v.desc}</p>
            </button>
          ))}
        </div>

        {/* Cabang selector */}
        {type === 'products' && (
          <div className="mt-3">
            <label className="field-label">Cabang</label>
            <div className="grid grid-cols-2 gap-2">
              {[{id:1,name:'GP Racing'},{id:2,name:'GP Distro'}].map(b => (
                <button key={b.id} onClick={() => setBranch(b.id)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${branch===b.id ? 'bg-brand-500 text-white border-brand-500' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Column info */}
        <div className="mt-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
          <p className="text-xs font-bold text-[var(--text-secondary)] mb-1.5">Kolom yang dibutuhkan:</p>
          <div className="flex flex-wrap gap-1.5">
            {TYPES[type].cols.map(col => (
              <span key={col} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${col.includes('*') ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
                {col}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5">* = wajib diisi · Download template untuk format yang benar</p>
        </div>
      </div>

      {/* Step 2 — Upload */}
      <div className="card p-5 mb-4">
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Langkah 2 — Upload File</p>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragOver ? 'border-brand-400 bg-brand-50 dark:bg-brand-950' : fileName ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950' : 'border-[var(--border)] hover:border-brand-300 hover:bg-[var(--bg-secondary)]'}`}>
          {fileName ? (
            <>
              <FileSpreadsheet className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fileName}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{rows.length} baris data siap diimport</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-[var(--text-secondary)]">
                {dragOver ? 'Lepaskan file di sini' : 'Klik atau drag & drop file Excel / CSV'}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">.xlsx, .xls, .csv · Maks 5MB</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => { if(e.target.files[0]) parseFile(e.target.files[0]); }} />

        {fileName && (
          <button onClick={() => { setFileName(''); setRows([]); setResult(null); }}
            className="mt-2 text-xs text-[var(--text-muted)] hover:text-red-500 flex items-center gap-1">
            <X className="w-3 h-3" /> Ganti file
          </button>
        )}
      </div>

      {/* Step 3 — Import */}
      {rows.length > 0 && (
        <div className="card p-5 mb-4">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Langkah 3 — Proses Import</p>

          {/* Preview */}
          <div className="mb-4 rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="px-3 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text-primary)]">Preview (5 baris pertama)</p>
            </div>
            <div className="overflow-x-auto max-h-40">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    {Object.keys(rows[0]||{}).slice(0,8).map(k => (
                      <th key={k} className="px-3 py-2 text-left font-bold text-[var(--text-secondary)] whitespace-nowrap">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0,5).map((r,i) => (
                    <tr key={i} className="border-t border-[var(--border-subtle)]">
                      {Object.values(r).slice(0,8).map((v,j) => (
                        <td key={j} className="px-3 py-2 text-[var(--text-primary)] truncate max-w-[120px]">{String(v||'')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={handleImport} disabled={loading}
            className="btn-primary w-full h-12 text-sm font-bold disabled:opacity-60">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengimport {rows.length} data...</>
                     : <><Upload className="w-4 h-4" /> Import {rows.length} {TYPES[type].label}</>}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`card p-5 border-l-4 ${result.data.errors === 0 ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
          <div className="flex items-center gap-3 mb-3">
            {result.data.errors === 0
              ? <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
              : <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />}
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">{result.message}</p>
              <div className="flex gap-3 mt-1 text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ {result.data.success} berhasil</span>
                {result.data.errors > 0 && <span className="text-red-600 dark:text-red-400 font-semibold">✗ {result.data.errors} gagal</span>}
              </div>
            </div>
          </div>

          {result.data.error_details?.length > 0 && (
            <div>
              <button onClick={() => setShowErrors(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline">
                {showErrors ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Lihat {result.data.error_details.length} error
              </button>
              {showErrors && (
                <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                  {result.data.error_details.map((e,i) => (
                    <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-red-50 dark:bg-red-950">
                      <span className="text-red-400 font-bold flex-shrink-0">Baris {e.row}:</span>
                      <span className="text-[var(--text-secondary)]">{e.data} — {e.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
