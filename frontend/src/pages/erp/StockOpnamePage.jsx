import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, CheckCircle2, AlertTriangle, RefreshCw, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService } from '../../utils/erp/erpService';

export default function StockOpnamePage() {
  const [products, setProducts] = useState([]);
  const [opname, setOpname]     = useState({});  // { product_id: actual_qty }
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [branch, setBranch]     = useState('1');
  const [search, setSearch]     = useState('');
  const [submitted, setSubmitted] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpService.getStockOpname({ branch_id: branch });
      const prods = res.data.data.products;
      setProducts(prods);
      // Pre-fill with system qty
      const initial = {};
      prods.forEach(p => { initial[p.id] = p.stock?.qty || 0; });
      setOpname(initial);
      setSubmitted(false);
    } catch { toast.error('Gagal memuat data stok'); }
    finally { setLoading(false); }
  }, [branch]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSubmit = async () => {
    const items = Object.entries(opname)
      .map(([product_id, actual_qty]) => ({ product_id: parseInt(product_id), actual_qty: parseInt(actual_qty)||0 }))
      .filter(i => {
        const p = products.find(p => p.id === i.product_id);
        return p && i.actual_qty !== (p.stock?.qty || 0);
      });

    if (items.length === 0) { toast('Tidak ada perubahan stok', { icon:'ℹ️' }); return; }
    if (!confirm(`Simpan penyesuaian stok untuk ${items.length} produk?`)) return;

    setSaving(true);
    try {
      const res = await erpService.submitStockOpname({ branch_id: parseInt(branch), items, notes: `Stok opname ${new Date().toLocaleDateString('id-ID')}` });
      toast.success(res.data.message);
      setSubmitted(true);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const differences = Object.entries(opname).filter(([id, qty]) => {
    const p = products.find(p => p.id === parseInt(id));
    return p && parseInt(qty) !== (p.stock?.qty || 0);
  }).length;

  return (
    <div className="section animate-fade-in">
      {/* ERP Breadcrumb */}
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>ERP</span><span>›</span>
        <span>Inventory</span><span>›</span>
        <span className="font-semibold text-[var(--text-primary)]">Stok Opname</span>
      </nav>

      <div className="page-header">
        <div>
          <h1 className="page-title">Stok Opname</h1>
          <p className="body-sm text-[var(--text-secondary)]">Hitung & sesuaikan stok fisik</p>
        </div>
        <button onClick={fetch} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Branch + search */}
      <div className="card p-4 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[{id:'1',n:'GP Racing'},{id:'2',n:'GP Distro'}].map(b => (
            <button key={b.id} onClick={() => setBranch(b.id)}
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${branch===b.id ? 'bg-brand-500 text-white border-brand-500' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
              {b.n}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari produk..." className="input-base pl-9 text-sm" />
        </div>
      </div>

      {/* Differences alert */}
      {differences > 0 && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl mb-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{differences} produk berbeda dari stok sistem</p>
        </div>
      )}

      {/* Product list */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_,i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : (
        <>
          <div className="card overflow-hidden mb-4">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <div className="col-span-5">Produk</div>
              <div className="col-span-2 text-center">Sistem</div>
              <div className="col-span-3 text-center">Fisik</div>
              <div className="col-span-2 text-center">Selisih</div>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] max-h-[60vh] overflow-y-auto scrollbar-thin">
              {filtered.map(p => {
                const systemQty  = p.stock?.qty || 0;
                const actualQty  = parseInt(opname[p.id] ?? systemQty);
                const diff       = actualQty - systemQty;
                const hasDiff    = diff !== 0;
                return (
                  <div key={p.id} className={`grid grid-cols-12 gap-2 items-center px-4 py-2.5 ${hasDiff ? 'bg-amber-50 dark:bg-amber-950/30' : ''}`}>
                    <div className="col-span-5 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{p.name}</p>
                      {p.sku && <p className="text-[10px] font-mono text-[var(--text-muted)]">{p.sku}</p>}
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="text-sm font-bold text-[var(--text-secondary)]">{systemQty}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{p.unit}</p>
                    </div>
                    <div className="col-span-3 text-center">
                      <input type="number" value={opname[p.id] ?? systemQty} min={0}
                        onChange={e => setOpname(o => ({...o,[p.id]: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)||0)}))}
                        className={`input-base text-sm h-9 w-full text-center ${hasDiff ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950' : ''}`} />
                    </div>
                    <div className="col-span-2 text-center">
                      {hasDiff ? (
                        <span className={`text-xs font-bold ${diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center py-10">
                  <ClipboardList className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-[var(--text-muted)]">Tidak ada produk</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={saving || differences === 0}
            className="btn-primary w-full h-12 text-sm font-bold disabled:opacity-50">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                    : <><CheckCircle2 className="w-4 h-4" /> Simpan Penyesuaian Stok ({differences} produk)</>}
          </button>
          {differences === 0 && !submitted && (
            <p className="text-xs text-center text-[var(--text-muted)] mt-2">Ubah jumlah fisik untuk mulai penyesuaian</p>
          )}
        </>
      )}
    </div>
  );
}
