import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClipboardList, RefreshCw, Save, Loader2, Download, Upload, RotateCcw, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import { erpService } from '../../utils/erp/erpService';

// Key komposit unik per baris opname (produk biasa ATAU varian spesifik)
const rowKey = (item) => `${item.product_id}:${item.variant_id || 0}`;

export default function StockOpnamePage() {
  const [items, setItems]       = useState([]);   // flat list dari backend (produk / varian)
  const [opname, setOpname]     = useState({});    // { [rowKey]: actual_qty }
  const [loading, setLoad]      = useState(true);
  const [saving, setSave]       = useState(false);
  const [importing, setImport]  = useState(false);
  const [branch, setBranch]     = useState('1');
  const [showChangedOnly, setShowChangedOnly] = useState(false);

  const fetch = useCallback(async () => {
    setLoad(true);
    try {
      const res = await erpService.getStockOpname({ branch_id: branch });
      const list = res.data.data.items || [];
      setItems(list);
      const init = {};
      list.forEach(it => { init[rowKey(it)] = it.stock_qty || 0; });
      setOpname(init);
    } catch { toast.error('Gagal memuat data stok opname'); }
    finally { setLoad(false); }
  }, [branch]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── Download Excel dengan data stok saat ini ──────────────────
  const downloadExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const headers = ['row_key','product_id','variant_id','sku','nama_produk','varian','stok_sistem','stok_aktual'];
      const rows = items.map(it => [
        rowKey(it),
        it.product_id,
        it.variant_id || '',
        it.sku || '',
        it.name,
        it.variant_name || '',
        it.stock_qty || 0,
        it.stock_qty || 0, // user akan edit kolom ini
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [
        { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 40 }, { wch: 20 }, { wch: 12 }, { wch: 12 }
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
        // Cocokkan via row_key (paling akurat). Fallback ke product_id (tanpa varian) untuk file lama.
        const key = String(row.row_key || `${row.product_id}:0`).trim();
        const aktual = parseInt(row.stok_aktual) || 0;
        if (newOpname.hasOwnProperty(key)) {
          newOpname[key] = aktual;
          matched++;
        }
      });
      setOpname(newOpname);
      toast.success(`${matched} baris diimport dari Excel — cek perubahan lalu klik Simpan`);
    } catch { toast.error('Gagal baca file Excel'); }
    finally { setImport(false); e.target.value = ''; }
  };

  // ── Submit stok opname ────────────────────────────────────────
  const handleSubmit = async () => {
    const changes = items.filter(it => parseInt(opname[rowKey(it)] ?? 0) !== (it.stock_qty || 0));
    if (!changes.length) { toast('Tidak ada perubahan stok'); return; }
    if (!confirm(`Update stok untuk ${changes.length} item?`)) return;
    setSave(true);
    try {
      await erpService.submitStockOpname({
        branch_id: parseInt(branch),
        items: changes.map(it => ({
          product_id: it.product_id,
          variant_id: it.variant_id || null,
          actual_qty: parseInt(opname[rowKey(it)] ?? 0),
        })),
      });
      toast.success(`${changes.length} item stok diperbarui`);
      fetch();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSave(false); }
  };

  // ── Bulk reset ke stok sistem untuk baris terpilih ─────────────
  const bulkResetToSystem = (rows, clearSelection) => {
    const next = { ...opname };
    rows.forEach(it => { next[rowKey(it)] = it.stock_qty || 0; });
    setOpname(next);
    clearSelection();
    toast.success(`${rows.length} item direset ke stok sistem`);
  };

  const changesCount = items.filter(it => parseInt(opname[rowKey(it)] ?? 0) !== (it.stock_qty || 0)).length;
  const variantRowCount = items.filter(it => it.has_variants).length;

  // ── Data untuk DataTable: tambah field turunan agar bisa dipakai render/filter/sort ──
  const tableData = useMemo(() => {
    return items
      .map(it => {
        const key    = rowKey(it);
        const sistem = it.stock_qty || 0;
        const aktual = parseInt(opname[key] ?? sistem);
        return { ...it, _key: key, _sistem: sistem, _aktual: aktual, _diff: aktual - sistem, _changed: aktual !== sistem };
      })
      .filter(it => !showChangedOnly || it._changed);
  }, [items, opname, showChangedOnly]);

  const columns = [
    {
      key: 'name', label: 'Produk', sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-medium truncate max-w-xs">{v}</p>
          {row.variant_name && (
            <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold text-[var(--brand-600)] bg-[var(--brand-600)]/8 px-1.5 py-0.5 rounded-full">
              <Tag size={9}/>{row.variant_name}
            </span>
          )}
        </div>
      ),
    },
    { key: 'sku', label: 'SKU', sortable: true, nowrap: true, render: v => <span className="font-mono text-xs text-[var(--text-muted)]">{v || '—'}</span> },
    { key: '_sistem', label: 'Stok Sistem', sortable: true, align: 'center', nowrap: true, render: v => <span className="font-bold">{v}</span> },
    {
      key: '_aktual', label: 'Stok Aktual', align: 'center', nowrap: true,
      exportValue: row => row._aktual,
      render: (v, row) => (
        <input type="number" min={0} value={row._aktual}
          onClick={e => e.stopPropagation()}
          onChange={e => setOpname(prev => ({ ...prev, [row._key]: parseInt(e.target.value) || 0 }))}
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
          <p className="body-sm text-[var(--text-muted)]">
            Update stok aktual vs sistem
            {variantRowCount > 0 && <span className="ml-1">· {variantRowCount} baris varian</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm">
            <option value="1">GP Racing</option><option value="2">GP Distro</option>
          </select>
          <button onClick={fetch} className="btn-icon"><RefreshCw size={16}/></button>

          {/* Download Excel */}
          <button onClick={downloadExcel} disabled={loading||!items.length} className="btn-secondary gap-2">
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
          <li>Klik <strong>Download Excel</strong> — file berisi data stok saat ini (termasuk per-varian)</li>
          <li>Edit kolom <strong>stok_aktual</strong> sesuai hasil penghitungan fisik</li>
          <li>Klik <strong>Import Excel</strong> — data akan diload ke tabel</li>
          <li>Klik <strong>Simpan</strong> untuk mengupdate stok di sistem</li>
        </ol>
        {variantRowCount > 0 && (
          <p className="text-xs text-blue-600 dark:text-blue-500 mt-1.5">
            🏷️ Produk dengan varian ditampilkan <strong>per kombinasi varian</strong> (baris terpisah untuk tiap Ukuran/Warna dst), bukan total gabungan.
          </p>
        )}
      </div>

      {changesCount > 0 && (
        <div className="card-sm mb-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-semibold">⚠ {changesCount} item memiliki perubahan stok — klik Simpan untuk update</p>
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
        rowKey="_key"
        searchKeys={['name','sku','variant_name']}
        searchPlaceholder="Cari nama produk, SKU, varian..."
        emptyIcon={<ClipboardList size={40}/>}
        emptyText={showChangedOnly ? 'Tidak ada item yang berubah' : 'Belum ada produk'}
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
