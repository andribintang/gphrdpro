import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Zap, Tag, Trash2, CheckCircle2, AlertCircle,
  Loader2, Package, FolderOpen, ArrowRight, Shirt, Wrench,
  BarChart3, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService } from '../../utils/erp/erpService';

const BRAND = {
  gpdistro: { id: 2, label: 'GPDISTRO', icon: Shirt,  color: '#db2777', bg: 'bg-pink-50 dark:bg-pink-950/20', border: 'border-pink-200 dark:border-pink-800', text: 'text-pink-700 dark:text-pink-300' },
  gpracing: { id: 1, label: 'GP RACING', icon: Wrench, color: '#2563eb', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
};

// ── Panel satu cabang ─────────────────────────────────────────
function BrandSyncPanel({ brandKey }) {
  const b = BRAND[brandKey];
  const Icon = b.icon;

  const [status,    setStatus]    = useState(null); // { summary, items }
  const [debug,     setDebug]     = useState(null); // { distribution, wrong_brand }
  const [loading,   setLoading]   = useState(false);
  const [syncing,   setSyncing]   = useState('');   // 'cat' | 'prod' | 'clear' | ''
  const [log,       setLog]       = useState([]);

  const addLog = (msg, type = 'info') => setLog(prev => [{ msg, type, t: new Date().toLocaleTimeString('id') }, ...prev].slice(0, 20));

  // ── Load status ────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, dr] = await Promise.all([
        erpService.storeGetSyncStatus(brandKey).catch(() => null),
        erpService.storeGetDebug().catch(() => null),
      ]);
      if (sr?.data?.data) setStatus(sr.data.data);
      if (dr?.data?.data) setDebug(dr.data.data);
    } catch (e) {
      addLog('Gagal memuat status: ' + e.message, 'error');
    } finally { setLoading(false); }
  }, [brandKey]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // ── Sync kategori ───────────────────────────────────────────
  const syncCategories = async () => {
    setSyncing('cat');
    addLog(`Memulai sync kategori ${b.label}...`);
    try {
      const r = await erpService.storeSyncCategories({ brand: brandKey });
      const { synced, errors } = r.data.data;
      addLog(`✓ ${synced} kategori disync`, 'success');
      if (errors?.length) errors.forEach(e => addLog(`⚠ ${e}`, 'warn'));
      toast.success(r.data.message);
      await loadStatus();
    } catch (e) {
      addLog('✗ Gagal sync kategori: ' + (e.response?.data?.message || e.message), 'error');
      toast.error('Gagal sync kategori');
    } finally { setSyncing(''); }
  };

  // ── Sync produk ─────────────────────────────────────────────
  const syncProducts = async () => {
    setSyncing('prod');
    addLog(`Memulai sync produk ${b.label}...`);
    try {
      const r = await erpService.storeSyncFromERP({ brand: brandKey, mode: 'full' });
      const { synced, skipped, errors } = r.data.data;
      addLog(`✓ ${synced} produk disync${skipped ? `, ${skipped} dilewati` : ''}`, 'success');
      if (errors?.length) errors.slice(0, 3).forEach(e => addLog(`⚠ ${e}`, 'warn'));
      toast.success(r.data.message);
      await loadStatus();
    } catch (e) {
      addLog('✗ Gagal sync produk: ' + (e.response?.data?.message || e.message), 'error');
      toast.error('Gagal sync produk');
    } finally { setSyncing(''); }
  };

  // ── Clear & Resync ─────────────────────────────────────────
  const clearResync = async () => {
    if (!confirm(`HAPUS SEMUA produk ${b.label} di toko lalu sync ulang dari ERP?\nProses ini tidak bisa dibatalkan.`)) return;
    setSyncing('clear');
    addLog(`Memulai Clear & Resync ${b.label}...`);
    try {
      const r = await erpService.storeClearResync({ brand: brandKey });
      const { deleted, synced, errors } = r.data.data;
      addLog(`✓ Hapus ${deleted} lama → sync ${synced} baru`, 'success');
      if (errors?.length) errors.slice(0, 3).forEach(e => addLog(`⚠ ${e}`, 'warn'));
      toast.success(r.data.message);
      await loadStatus();
    } catch (e) {
      addLog('✗ Gagal: ' + (e.response?.data?.message || e.message), 'error');
      toast.error('Gagal clear & resync');
    } finally { setSyncing(''); }
  };

  // ── Sync stok ──────────────────────────────────────────────
  const syncStock = async () => {
    setSyncing('stock');
    addLog(`Update stok ${b.label}...`);
    try {
      const r = await erpService.storeSyncStock({ brand: brandKey });
      addLog(`✓ ${r.data.data.updated} stok diperbarui`, 'success');
      toast.success(r.data.message);
    } catch (e) {
      addLog('✗ Gagal sync stok: ' + e.message, 'error');
    } finally { setSyncing(''); }
  };

  const summary   = status?.summary || {};
  const wrongData = debug?.wrong_brand?.find(w => w.brand === brandKey);
  const isBusy    = syncing !== '';

  // Produk yang ada di toko untuk brand ini
  const distRow = debug?.distribution?.find(d => d.brand === brandKey && d.branch_id == b.id);

  return (
    <div className="table-wrapper overflow-hidden">
      {/* Header cabang */}
      <div className={`px-5 py-3.5 ${b.bg} border-b ${b.border} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${b.color}20` }}>
            <Icon size={16} style={{ color: b.color }}/>
          </div>
          <div>
            <p className={`font-black text-sm ${b.text}`}>{b.label}</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {loading ? 'Memuat...' : `${summary.total || 0} produk di ERP · ${distRow?.count || 0} di toko`}
            </p>
          </div>
        </div>
        <button onClick={loadStatus} disabled={loading} className="btn-icon">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Status cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l: 'Total ERP',     v: summary.total     || 0, c: 'text-[var(--text-primary)]',  bg: 'bg-[var(--bg-secondary)]' },
            { l: 'Tersync',       v: summary.synced    || 0, c: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { l: 'Outdated',      v: summary.outdated  || 0, c: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-950/30' },
            { l: 'Belum Sync',    v: summary.not_synced|| 0, c: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-950/30' },
          ].map(({ l, v, c, bg }) => (
            <div key={l} className={`${bg} rounded-xl p-3 text-center`}>
              <p className={`text-xl font-black ${c}`}>{loading ? '—' : v}</p>
              <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        {/* Warning jika ada produk salah brand */}
        {wrongData?.count > 0 && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-start gap-2">
            <AlertCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-red-700 dark:text-red-400">
              <strong>{wrongData.count} produk dari cabang lain</strong> terdeteksi di toko {b.label}.
              Gunakan <strong>Clear & Resync</strong> untuk membersihkan.
            </p>
          </div>
        )}

        {/* Produk outdated/belum sync */}
        {status?.items && status.items.filter(i => i.status !== 'synced').length > 0 && (
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Produk Perlu Sync ({status.items.filter(i => i.status !== 'synced').length})
            </p>
            <div className="max-h-36 overflow-y-auto space-y-1 scrollbar-thin">
              {status.items.filter(i => i.status !== 'synced').map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-[var(--bg-secondary)]">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.status === 'not_synced' ? 'bg-red-500' : 'bg-amber-500'}`}/>
                  <span className="flex-1 truncate font-medium">{item.name}</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">{item.sku || '—'}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    item.status === 'not_synced' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                  }`}>{item.status === 'not_synced' ? 'BELUM' : 'LAMA'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tombol sync */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button onClick={syncCategories} disabled={isBusy}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 transition-colors text-center">
            {syncing === 'cat' ? <Loader2 size={16} className="animate-spin text-[var(--brand-600)]"/> : <Tag size={16} className="text-[var(--brand-600)]"/>}
            <span className="text-[11px] font-semibold">Sync Kategori</span>
          </button>

          <button onClick={syncProducts} disabled={isBusy}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 transition-colors text-center">
            {syncing === 'prod' ? <Loader2 size={16} className="animate-spin text-emerald-600"/> : <Package size={16} className="text-emerald-600"/>}
            <span className="text-[11px] font-semibold">Sync Produk</span>
          </button>

          <button onClick={syncStock} disabled={isBusy}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 transition-colors text-center">
            {syncing === 'stock' ? <Loader2 size={16} className="animate-spin text-purple-600"/> : <BarChart3 size={16} className="text-purple-600"/>}
            <span className="text-[11px] font-semibold">Sync Stok</span>
          </button>

          <button onClick={clearResync} disabled={isBusy}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 transition-colors text-center">
            {syncing === 'clear' ? <Loader2 size={16} className="animate-spin text-red-600"/> : <Trash2 size={16} className="text-red-600"/>}
            <span className="text-[11px] font-semibold text-red-600">Clear & Resync</span>
          </button>
        </div>

        {/* Log aktivitas */}
        {log.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Log Aktivitas</p>
              <button onClick={() => setLog([])} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={11}/>
              </button>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-xl p-3 max-h-32 overflow-y-auto space-y-0.5 font-mono text-[11px]">
              {log.map((entry, i) => (
                <div key={i} className={`flex gap-2 ${
                  entry.type === 'error' ? 'text-red-600' : entry.type === 'success' ? 'text-emerald-600' : entry.type === 'warn' ? 'text-amber-600' : 'text-[var(--text-muted)]'
                }`}>
                  <span className="text-[var(--text-muted)] flex-shrink-0">{entry.t}</span>
                  <span>{entry.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
export default function StoreSyncPage() {
  const [syncingAll, setSyncingAll] = useState(false);
  const [allLog,     setAllLog]     = useState([]);

  const syncAll = async () => {
    if (!confirm('Sync kategori + produk untuk SEMUA cabang sekaligus?\nProses ini bisa memakan waktu beberapa menit.')) return;
    setSyncingAll(true);
    const logs = [];
    const add = (msg) => { logs.push(msg); setAllLog([...logs]); };

    try {
      for (const brandKey of ['gpdistro', 'gpracing']) {
        const b = BRAND[brandKey];
        add(`[${b.label}] Sync kategori...`);
        const cr = await erpService.storeSyncCategories({ brand: brandKey }).catch(e => ({ data: { message: e.message } }));
        add(`[${b.label}] ${cr.data.message || 'Kategori selesai'}`);

        add(`[${b.label}] Clear & Resync produk...`);
        const pr = await erpService.storeClearResync({ brand: brandKey }).catch(e => ({ data: { message: e.message } }));
        add(`[${b.label}] ${pr.data.message || 'Produk selesai'}`);
      }
      add('✅ Sinkronisasi semua cabang selesai');
      toast.success('Sinkronisasi semua cabang berhasil');
    } catch (e) {
      add('❌ Error: ' + e.message);
      toast.error('Ada error saat sync');
    } finally { setSyncingAll(false); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sinkronisasi ERP → Toko Online</h1>
          <p className="page-subtitle">Sinkronkan kategori dan produk dari ERP ke toko GPDISTRO & GP RACING</p>
        </div>
        <button onClick={syncAll} disabled={syncingAll}
          className="btn-primary gap-2 disabled:opacity-50">
          {syncingAll ? <Loader2 size={15} className="animate-spin"/> : <Zap size={15}/>}
          Sync Semua Cabang
        </button>
      </div>

      {/* Alur kerja */}
      <div className="table-wrapper p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">Alur Sinkronisasi</p>
        <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--text-muted)]">
          {[
            { icon: FolderOpen, label: '1. Sync Kategori', desc: 'Copy erp_categories → store_categories', c: 'text-blue-600' },
            { icon: ArrowRight, label: '', desc: '', c: '' },
            { icon: Package, label: '2. Sync Produk', desc: 'Copy erp_products → store_products', c: 'text-emerald-600' },
            { icon: ArrowRight, label: '', desc: '', c: '' },
            { icon: BarChart3, label: '3. Sync Stok', desc: 'Update stok dari erp_stock', c: 'text-purple-600' },
          ].map(({ icon: Icon, label, desc, c }, i) => (
            Icon === ArrowRight
              ? <ArrowRight key={i} size={14} className="text-[var(--text-muted)] flex-shrink-0"/>
              : (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] flex-shrink-0`}>
                  <Icon size={14} className={c}/>
                  <div>
                    <p className={`font-semibold text-xs ${c}`}>{label}</p>
                    <p className="text-[10px]">{desc}</p>
                  </div>
                </div>
              )
          ))}
          <div className="ml-auto text-[10px] text-[var(--text-muted)] space-y-0.5">
            <p>💡 <strong>Clear & Resync</strong>: hapus semua lalu sync ulang (fix data salah brand)</p>
            <p>💡 <strong>Sync Produk</strong>: upsert tanpa hapus (lebih cepat, aman)</p>
          </div>
        </div>
      </div>

      {/* Log sync semua */}
      {allLog.length > 0 && (
        <div className="table-wrapper p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Log Sync Semua Cabang</p>
            <button onClick={() => setAllLog([])} className="btn-icon-sm"><X size={12}/></button>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-xl p-3 max-h-40 overflow-y-auto font-mono text-[11px] space-y-0.5">
            {allLog.map((msg, i) => (
              <p key={i} className={msg.startsWith('✅') ? 'text-emerald-600' : msg.startsWith('❌') ? 'text-red-600' : 'text-[var(--text-muted)]'}>{msg}</p>
            ))}
            {syncingAll && <p className="text-[var(--brand-600)] animate-pulse">Sedang memproses...</p>}
          </div>
        </div>
      )}

      {/* Panel per cabang */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {Object.keys(BRAND).map(key => (
          <BrandSyncPanel key={key} brandKey={key}/>
        ))}
      </div>
    </div>
  );
}
