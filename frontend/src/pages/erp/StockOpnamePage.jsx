import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClipboardList, RefreshCw, Save, Loader2, Download, Upload, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import { erpService, toRpShort } from '../../utils/erp/erpService';

export default function StockOpnamePage() {
  const [products, setProducts] = useState([]);
  const [opname, setOpname]     = useState({});
  const [loading, setLoad]      = useState(true);
  const [saving, setSave]       = useState(false);
  const [importing, setImport]  = useState(false);
  const [branch, setBranch]     = useState('1');
  const [showChangedOnly, setShowChangedOnly] = useState(false);

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

  // ── Bulk reset ke stok sistem untuk baris terpilih ─────────────
  const bulkResetToSystem = (rows, clearSelection) => {
    const next = { ...opname };
    rows.forEach(p => { next[p.id] = p.stock?.qty || 0; });
    setOpname(next);
    clearSelection();
    toast.success(`${rows.length} produk direset ke stok sistem`);
  };

  const changesCount = products.filter(p => parseInt(opname[p.id] ?? 0) !== (p.stock?.qty || 0)).length;

  // ── Data untuk DataTable: tambah field _diff & _changed agar bisa dipakai render/filter ──
  const tableData = useMemo(() => {
    return products
      .map(p => {
        const sistem = p.stock?.qty || 0;
        const aktual = parseInt(opname[p.id] ?? sistem);
        return { ...p, _sistem: sistem, _aktual: aktual, _diff: aktual - sistem, _changed: aktual !== sistem };
      })
      .filter(p => !showChangedOnly || p._changed);
  }, [products, opname, showChangedOnly]);

  const columns = [
    { key: 'name', label: 'Produk', sortable: true, render: (v) => <p className="font-medium truncate max-w-xs">{v}</p> },
    { key: 'sku', label: 'SKU', sortable: true, nowrap: true, render: v => <span className="font-mono text-xs text-[var(--text-muted)]">{v || '—'}</span> },
    { key: '_sistem', label: 'Stok Sistem', sortable: true, align: 'center', nowrap: true, render: v => <span className="font-bold">{v}</span> },
    {
      key: '_aktual', label: 'Stok Aktual', align: 'center', nowrap: true,
      exportValue: row => row._aktual,
      render: (v, row) => (
        <input type="number" min={0} value={row._aktual}
          onClick={e => e.stopPropagation()}
          onChange={e => setOpname(prev => ({ ...prev, [row.id]: parseInt(e.target.value) || 0 }))}
          className={`input-base h-8 text-center w-24 text-sm mx-auto block ${row._changed ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30' : ''}`} />
      ),
    },
    {
      key: '_diff', label: 'Selisih', sortable: true, align: 'center', nowrap: true,
      render: (v) => (
        <span className={`font-bold ${v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-600' : 'text-[var(--text-muted)]'}`}>
          {v === 0 ? '—' : (v > 0 ? '+' : '') + v}
        </span>
      ),
    },
  ];

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
        <div className="card-sm mb-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-semibold">⚠ {changesCount} produk memiliki perubahan stok — klik Simpan untuk update</p>
          <label className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 cursor-pointer select-none">
            <input type="checkbox" checked={showChangedOnly} onChange={e=>setShowChangedOnly(e.target.checked)} className="w-3.5 h-3.5 rounded"/>
            Tampilkan yang berubah saja
          </label>
        </div>
      )}

      <DataTable
        columns={columns}
        data={tableData}
        loading={loading}
        searchKeys={['name','sku']}
        searchPlaceholder="Cari nama produk, SKU..."
        emptyIcon={<ClipboardList size={40}/>}
        emptyText={showChangedOnly ? 'Tidak ada produk yang berubah' : 'Belum ada produk'}
        selectable
        bulkActions={(rows, clear) => (
          <button onClick={() => bulkResetToSystem(rows, clear)} className="btn-secondary h-8 text-xs px-3 gap-1.5">
            <RotateCcw size={13}/> Reset {rows.length} ke Stok Sistem
          </button>
        )}
        pageSizeOptions={[25,50,100,250]}
        pageSize={50}
        zebra
      />
    </div>
  );
}
