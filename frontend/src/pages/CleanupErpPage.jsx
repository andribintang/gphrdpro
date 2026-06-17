import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const SECRET = 'HAPUS-DATA-GPDISTRO-2024';

export default function CleanupErpPage() {
  const [counts,   setCounts]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [confirm,  setConfirm]  = useState(null);
  const [running,  setRunning]  = useState(false);
  const [results,  setResults]  = useState([]);
  const [confirmText, setConfirmText] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/cleanup-erp/summary');
      setCounts(r.data.data?.counts);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const del = (path) => api.delete(path, {
    data: { secret: SECRET },
    headers: { 'x-cleanup-secret': SECRET },
  });

  const ACTIONS = [
    {
      id: 'orders',
      label: 'Transaksi Order',
      icon: '🛒',
      color: 'border-blue-400',
      desc: 'Hapus semua order, item, pembayaran, pengiriman & retur (produk tetap)',
      count: counts ? parseInt(counts.orders || 0) : '—',
      countLabel: 'order',
      action: () => del('/cleanup-erp/orders'),
    },
    {
      id: 'products',
      label: 'Produk & Stok',
      icon: '📦',
      color: 'border-purple-400',
      desc: 'Hapus semua produk, stok, dan riwayat mutasi stok',
      count: counts ? parseInt(counts.products || 0) : '—',
      countLabel: 'produk',
      action: () => del('/cleanup-erp/products'),
    },
    {
      id: 'stock-movements',
      label: 'Riwayat Mutasi Stok',
      icon: '🔄',
      color: 'border-cyan-400',
      desc: 'Hanya hapus riwayat mutasi — produk & stok saat ini tetap',
      count: counts ? parseInt(counts.stock_movements || 0) : '—',
      countLabel: 'mutasi',
      action: () => del('/cleanup-erp/stock-movements'),
    },
    {
      id: 'customers',
      label: 'Pelanggan',
      icon: '👥',
      color: 'border-emerald-400',
      desc: 'Hapus semua data pelanggan ERP',
      count: counts ? parseInt(counts.customers || 0) : '—',
      countLabel: 'pelanggan',
      action: () => del('/cleanup-erp/customers'),
    },
    {
      id: 'import-logs',
      label: 'Log Import',
      icon: '📥',
      color: 'border-gray-400',
      desc: 'Hapus riwayat log import data',
      count: counts ? parseInt(counts.import_logs || 0) : '—',
      countLabel: 'log',
      action: () => del('/cleanup-erp/import-logs'),
    },
    {
      id: 'channel-targets',
      label: 'Target Sales Channel',
      icon: '🎯',
      color: 'border-amber-400',
      desc: 'Hapus semua target penjualan per channel',
      count: counts ? parseInt(counts.channel_targets || 0) : '—',
      countLabel: 'target',
      action: () => del('/cleanup-erp/channel-targets'),
    },
    {
      id: 'store',
      label: 'Transaksi Toko Online',
      icon: '🏬',
      color: 'border-pink-400',
      desc: 'Hapus cart, order, pembayaran & review toko online (produk/kategori tetap)',
      count: counts ? parseInt(counts.store_orders || 0) : '—',
      countLabel: 'order toko',
      action: () => del('/cleanup-erp/store'),
    },
    {
      id: 'all',
      label: 'SEMUA Data ERP',
      icon: '🗑️',
      color: 'border-red-500',
      desc: 'Hapus SEMUA data ERP & Toko Online — produk, order, stok, pelanggan, semuanya',
      count: counts ? (
        parseInt(counts.orders||0) + parseInt(counts.products||0) +
        parseInt(counts.customers||0) + parseInt(counts.store_orders||0)
      ) : '—',
      countLabel: 'total record',
      action: () => del('/cleanup-erp/all'),
      isDangerous: true,
    },
  ];

  const handleConfirm = async () => {
    const action = ACTIONS.find(a => a.id === confirm);
    if (!action) return;
    if (confirmText !== 'HAPUS') { toast.error('Ketik HAPUS untuk konfirmasi'); return; }
    setRunning(true);
    try {
      const r = await action.action();
      const msg = r.data.message || 'Berhasil';
      setResults(prev => [{ id: confirm, label: action.label, msg, success: true, time: new Date().toLocaleTimeString('id-ID') }, ...prev]);
      toast.success(msg);
      setConfirm(null);
      setConfirmText('');
      load();
    } catch(e) {
      const msg = e.response?.data?.message || 'Gagal';
      setResults(prev => [{ id: confirm, label: action.label, msg, success: false, time: new Date().toLocaleTimeString('id-ID') }, ...prev]);
      toast.error(msg);
    } finally { setRunning(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Warning header */}
      <div className="table-wrapper p-5 border-l-4 border-red-500 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertTriangle size={22} className="text-red-500 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-black text-base text-red-700">⚠️ Data Cleanup ERP — Hati-hati!</p>
            <p className="text-sm text-red-600 mt-1">
              Halaman ini menghapus data ERP <strong>secara permanen</strong> dari database.
              Tidak bisa di-undo. Gunakan hanya untuk menghapus data testing/percobaan.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">🧹 Data Cleanup ERP</h1>
          <p className="page-subtitle">Hapus data testing modul ERP & Toko Online</p>
        </div>
        <button onClick={load} className="btn-icon"><RefreshCw size={15} className={loading?'animate-spin':''}/></button>
      </div>

      {/* Summary counts */}
      {!loading && counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l:'Order ERP',      v: parseInt(counts.orders||0),         c:'text-blue-600' },
            { l:'Produk',         v: parseInt(counts.products||0),       c:'text-purple-600' },
            { l:'Pelanggan',      v: parseInt(counts.customers||0),      c:'text-emerald-600' },
            { l:'Order Toko',     v: parseInt(counts.store_orders||0),   c:'text-pink-600' },
          ].map(s => (
            <div key={s.l} className="table-wrapper p-3 text-center">
              <p className={`text-2xl font-black ${s.c}`}>{s.v}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{s.l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ACTIONS.map(action => (
          <div key={action.id}
            className={`table-wrapper border-l-4 ${action.color} ${action.isDangerous ? 'border-2 border-red-400' : ''}`}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{action.icon}</span>
                    <p className="font-bold text-sm">{action.label}</p>
                    {action.isDangerous && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">BAHAYA</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{action.desc}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xl font-black ${action.isDangerous ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
                    {loading ? '—' : action.count}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">{action.countLabel}</p>
                </div>
              </div>
              <button
                onClick={() => { setConfirm(action.id); setConfirmText(''); }}
                disabled={(!loading && action.count === 0) || running}
                className={`w-full mt-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                  ${action.isDangerous
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'border border-red-300 text-red-500 hover:bg-red-50'}`}>
                <Trash2 size={13}/> Hapus {action.label}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-2xl border-2 border-red-400 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} className="text-red-500"/>
              </div>
              <div>
                <p className="font-black text-base text-red-600">Konfirmasi Penghapusan</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {ACTIONS.find(a=>a.id===confirm)?.label} — <strong>{ACTIONS.find(a=>a.id===confirm)?.count} {ACTIONS.find(a=>a.id===confirm)?.countLabel}</strong>
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
              Data yang dihapus <strong>tidak bisa dikembalikan</strong>. Pastikan ini benar-benar data testing.
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
                Ketik <strong className="text-red-500">HAPUS</strong> untuk konfirmasi
              </label>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                placeholder="Ketik: HAPUS"
                autoFocus
                className={`input-base w-full text-center font-bold text-lg tracking-widest ${confirmText === 'HAPUS' ? 'border-red-400' : ''}`}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setConfirm(null); setConfirmText(''); }}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-muted)]">
                Batal
              </button>
              <button onClick={handleConfirm} disabled={running || confirmText !== 'HAPUS'}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {running ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                {running ? 'Menghapus...' : 'Ya, Hapus!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results log */}
      {results.length > 0 && (
        <div className="table-wrapper overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Log Penghapusan</p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                {r.success
                  ? <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0"/>
                  : <AlertTriangle size={16} className="text-red-500 flex-shrink-0"/>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{r.label}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{r.msg}</p>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{r.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
