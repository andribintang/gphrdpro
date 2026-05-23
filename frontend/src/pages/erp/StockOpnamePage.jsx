import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, RefreshCw, Save, Loader2, Download, Upload, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRpShort } from '../../utils/erp/erpService';

export default function StockOpnamePage() {
  const [products, setProducts] = useState([]);
  const [opname, setOpname]     = useState({});
  const [loading, setLoad]      = useState(true);
  const [saving, setSave]       = useState(false);
  const [importing, setImport]  = useState(false);
  const [branch, setBranch]     = useState('1');

  const fetch = useCallback(async () => {
    setLoad(true);
    try {
      const res = await erpService.getProducts({ branch_id: branch, limit: 500 });
      const prods = res.data.data.products || [];
      setProducts(prods);
      const init = {};
      prods.forEach(p => { init[p.id] = p.stock?.qty || 0; });
      setOpname(init);
    } catch { toast.error('Gagal memuat produk'); }
    finally { setLoad(false); }
  }, [branch]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── Download Excel dengan data stok saat ini ──────────────────
  const downloadExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const headers = ['product_id','sku','name','stok_sistem','stok_aktual'];
      const rows = products.map(p => [
        p.id,
        p.sku || '',
        p.name,
        p.stock?.qty || 0,
        p.stock?.qty || 0, // user akan edit kolom ini
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [
        { wch: 10 }, { wch: 20 }, { wch: 45 }, { wch: 14 }, { wch: 14 }
      ];
      // Protect stok_sistem column (visual hint - bold header)
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stok Opname');
      const branchName = branch === '1' ? 'GPRacing' : 'GPDistro';
      XLSX.writeFile(wb, `stok_opname_${branchName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel didownload! Edit kolom stok_aktual lalu upload kembali.');
    } catch { toast.error('Gagal download'); }
  };

  // ── Import dari Excel ─────────────────────────────────────────
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImport(true);
    try {
      const XLSX = await import('xlsx');
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: 0 });

      const newOpname = { ...opname };
      let matched = 0;
      rows.forEach(row => {
        const pid = parseInt(row.product_id);
        const aktual = parseInt(row.stok_aktual) || 0;
        if (pid && newOpname.hasOwnProperty(pid)) {
          newOpname[pid] = aktual;
          matched++;
        }
      });
      setOpname(newOpname);
      toast.success(`${matched} produk diimport dari Excel — cek perubahan lalu klik Simpan`);
    } catch { toast.error('Gagal baca file Excel'); }
    finally { setImport(false); e.target.value = ''; }
  };

  // ── Submit stok opname ────────────────────────────────────────
  const handleSubmit = async () => {
    const changes = products.filter(p => parseInt(opname[p.id] ?? 0) !== (p.stock?.qty || 0));
    if (!changes.length) { toast('Tidak ada perubahan stok'); return; }
    if (!confirm(`Update stok untuk ${changes.length} produk?`)) return;
    setSave(true);
    try {
      await erpService.submitStockOpname({
        branch_id: parseInt(branch),
        items: changes.map(p => ({ product_id: p.id, actual_qty: parseInt(opname[p.id] ?? 0) })),
      });
      toast.success(`${changes.length} produk stok diperbarui`);
      fetch();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSave(false); }
  };

  const changesCount = products.filter(p => parseInt(opname[p.id] ?? 0) !== (p.stock?.qty || 0)).length;

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stok Opname</h1>
          <p className="body-sm text-[var(--text-muted)]">Update stok aktual vs sistem</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm">
            <option value="1">GP Racing</option><option value="2">GP Distro</option>
          </select>
          <button onClick={fetch} className="btn-icon"><RefreshCw size={16}/></button>

          {/* Download Excel */}
          <button onClick={downloadExcel} disabled={loading||!products.length} className="btn-secondary gap-2">
            <Download size={15}/> Download Excel
          </button>

          {/* Import Excel */}
          <label className={`btn-secondary gap-2 cursor-pointer ${importing?'opacity-50 pointer-events-none':''}`}>
            <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden"/>
            {importing?<Loader2 size={15} className="animate-spin"/>:<Upload size={15}/>}
            Import Excel
          </label>

          {changesCount > 0 && (
            <button onClick={handleSubmit} disabled={saving} className="btn-primary gap-2">
              {saving?<Loader2 size={15} className="animate-spin"/>:<Save size={15}/>}
              Simpan ({changesCount})
            </button>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="card-sm mb-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold">📊 Cara Import Excel:</p>
        <ol className="text-xs text-blue-600 dark:text-blue-500 list-decimal list-inside mt-1 space-y-0.5">
          <li>Klik <strong>Download Excel</strong> — file berisi data stok saat ini</li>
          <li>Edit kolom <strong>stok_aktual</strong> sesuai hasil penghitungan fisik</li>
          <li>Klik <strong>Import Excel</strong> — data akan diload ke tabel</li>
          <li>Klik <strong>Simpan</strong> untuk mengupdate stok di sistem</li>
        </ol>
      </div>

      {changesCount > 0 && (
        <div className="card-sm mb-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-semibold">⚠ {changesCount} produk memiliki perubahan stok — klik Simpan untuk update</p>
        </div>
      )}

      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)] sticky top-0 z-10">
              <tr>
                {['Produk','SKU','Stok Sistem','Stok Aktual','Selisih'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {loading ? [...Array(5)].map((_,i)=>(
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="skeleton h-8"/></td></tr>
              )) : products.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-[var(--text-muted)]">Belum ada produk</td></tr>
              ) : products.map(p => {
                const sistem = p.stock?.qty || 0;
                const aktual = parseInt(opname[p.id] ?? sistem);
                const diff   = aktual - sistem;
                const changed = aktual !== sistem;
                return (
                  <tr key={p.id} className={`hover:bg-[var(--bg-secondary)] transition-colors ${changed?'bg-amber-50/50 dark:bg-amber-950/20':''}`}>
                    <td className="px-4 py-3 font-medium max-w-xs">
                      <p className="truncate">{p.name}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">{p.sku||'—'}</td>
                    <td className="px-4 py-3 text-center font-bold">{sistem}</td>
                    <td className="px-4 py-3">
                      <input type="number" min={0} value={aktual}
                        onChange={e=>setOpname(prev=>({...prev,[p.id]:parseInt(e.target.value)||0}))}
                        className={`input-base h-8 text-center w-24 text-sm ${changed?'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30':''}`}/>
                    </td>
                    <td className={`px-4 py-3 text-center font-bold ${diff>0?'text-emerald-600':diff<0?'text-red-600':'text-[var(--text-muted)]'}`}>
                      {diff===0?'—':(diff>0?'+':'')+diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
