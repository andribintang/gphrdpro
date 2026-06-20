import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, TrendingDown, TrendingUp, RefreshCw,
  BarChart3, ArrowDown, ArrowUp, Sliders, Download, Bell, CheckCircle2,
  ChevronLeft, ChevronRight, Filter, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import DataTable, { StatusBadge } from '../../components/DataTable';

const API = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
const auth = () => ({ Authorization: 'Bearer ' + localStorage.getItem('accessToken') });

const toRp = (v) => {
  const n = parseFloat(v) || 0;
  if (n >= 1_000_000) return 'Rp ' + (n/1_000_000).toFixed(1) + ' jt';
  if (n >= 1_000)     return 'Rp ' + (n/1_000).toFixed(0) + ' rb';
  return 'Rp ' + n.toLocaleString('id-ID');
};

const MOVEMENT_LABELS = { in: 'Masuk', out: 'Keluar', adjustment: 'Opname' };
const MOVEMENT_COLORS = { in: 'text-emerald-600', out: 'text-red-500', adjustment: 'text-blue-600' };
const MOVEMENT_BG     = { in: 'bg-emerald-50', out: 'bg-red-50', adjustment: 'bg-blue-50' };
const REF_LABELS      = { purchase: 'Pembelian', order: 'Penjualan', opname: 'Stock Opname', manual: 'Manual', adjustment: 'Adjustment' };

export default function InventoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [branch,    setBranch]    = useState('');

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard',    },
    { id: 'alerts',    label: '🔔 Reorder Alert', },
    { id: 'movements', label: '📋 Mutasi Stok',   },
    { id: 'value',     label: '💰 Nilai Stok',    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Intelligence</h1>
          <p className="page-subtitle">Monitor stok, mutasi, dan reorder otomatis</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={branch} onChange={e => setBranch(e.target.value)}
            className="input-base h-9 text-sm w-36">
            <option value="">Semua Cabang</option>
            <option value="1">GP Racing</option>
            <option value="2">GP Distro</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0
              ${activeTab===t.id ? 'border-[var(--brand-600)] text-[var(--brand-600)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard'  && <DashboardTab  branch={branch}/>}
      {activeTab === 'alerts'     && <AlertsTab     branch={branch} onNavigate={navigate}/>}
      {activeTab === 'movements'  && <MovementsTab  branch={branch}/>}
      {activeTab === 'value'      && <ValueTab      branch={branch}/>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ════════════════════════════════════════════════════════════════
const DashboardTab = ({ branch }) => {
  const [data,    setData]    = useState(null);
  const [trend,   setTrend]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = branch ? `?branch_id=${branch}` : '';
      const [sumRes, trendRes] = await Promise.all([
        fetch(`${API}/erp/inventory/summary${params}`, { headers: auth() }).then(r=>r.json()),
        fetch(`${API}/erp/inventory/movement-trend${params}&days=30`, { headers: auth() }).then(r=>r.json()),
      ]);
      setData(sumRes.data);

      // Process trend data — merge in/out by date
      const tMap = {};
      (trendRes.data?.trend || []).forEach(r => {
        if (!tMap[r.date]) tMap[r.date] = { date: r.date, in: 0, out: 0, adjustment: 0 };
        tMap[r.date][r.type] = parseInt(r.total_qty) || 0;
      });
      setTrend(Object.values(tMap).slice(-14)); // last 14 days
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, [branch]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin"/></div>;
  if (!data)   return null;

  const { summary, byCategory } = data;

  const STAT_CARDS = [
    { label:'Total SKU',    value: summary.totalSKU,         icon:'📦', color:'text-blue-600',    bg:'bg-blue-50' },
    { label:'Stok Sehat',   value: summary.healthy,          icon:'✅', color:'text-emerald-600', bg:'bg-emerald-50' },
    { label:'Stok Menipis', value: summary.lowStock,         icon:'⚠️', color:'text-amber-600',  bg:'bg-amber-50' },
    { label:'Stok Habis',   value: summary.outOfStock,       icon:'🚨', color:'text-red-600',     bg:'bg-red-50' },
    { label:'Nilai Modal',  value: toRp(summary.totalValue), icon:'💰', color:'text-purple-600',  bg:'bg-purple-50' },
    { label:'Nilai Jual',   value: toRp(summary.sellValue),  icon:'📈', color:'text-[var(--brand-600)]', bg:'bg-[var(--brand-600)]/5' },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map(s => (
          <div key={s.label} className="table-wrapper p-3.5 text-center">
            <p className="text-xl mb-1">{s.icon}</p>
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Stock health bar */}
      <div className="table-wrapper p-4">
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Kesehatan Stok</p>
        <div className="flex rounded-full overflow-hidden h-4 gap-0.5">
          {summary.healthy > 0 && (
            <div className="bg-emerald-500 flex items-center justify-center text-[9px] text-white font-bold transition-all"
              style={{ width: `${(summary.healthy/summary.totalSKU*100).toFixed(1)}%` }}>
              {summary.healthy > 2 ? summary.healthy : ''}
            </div>
          )}
          {summary.lowStock > 0 && (
            <div className="bg-amber-400 flex items-center justify-center text-[9px] text-white font-bold"
              style={{ width: `${(summary.lowStock/summary.totalSKU*100).toFixed(1)}%` }}>
              {summary.lowStock > 2 ? summary.lowStock : ''}
            </div>
          )}
          {summary.outOfStock > 0 && (
            <div className="bg-red-500 flex items-center justify-center text-[9px] text-white font-bold"
              style={{ width: `${(summary.outOfStock/summary.totalSKU*100).toFixed(1)}%` }}>
              {summary.outOfStock > 2 ? summary.outOfStock : ''}
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-2">
          {[['Sehat','bg-emerald-500',summary.healthy],['Menipis','bg-amber-400',summary.lowStock],['Habis','bg-red-500',summary.outOfStock]].map(([l,bg,v]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${bg}`}/>
              <span className="text-xs text-[var(--text-muted)]">{l}: <b>{v}</b></span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Movement trend chart */}
        {trend.length > 0 && (
          <div className="table-wrapper p-4">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Mutasi Stok 14 Hari Terakhir</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--text-muted)' }} tickFormatter={v=>v.slice(5)} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} width={25}/>
                <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, fontSize:12 }}/>
                <Area type="monotone" dataKey="in"  name="Masuk"  stroke="#10b981" fill="#10b98120" strokeWidth={2}/>
                <Area type="monotone" dataKey="out" name="Keluar" stroke="#ef4444" fill="#ef444420" strokeWidth={2}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category breakdown */}
        {byCategory?.length > 0 && (
          <div className="table-wrapper p-4">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Nilai Stok per Kategori</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byCategory.slice(0,8)} layout="vertical">
                <XAxis type="number" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v=>toRp(v)}/>
                <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} width={90}/>
                <Tooltip formatter={v=>toRp(v)} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, fontSize:12 }}/>
                <Bar dataKey="value" name="Nilai Modal" fill="var(--brand-600)" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// ALERTS TAB — Reorder Alert
// ════════════════════════════════════════════════════════════════
const AlertsTab = ({ branch, onNavigate }) => {
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [suggest,  setSuggest]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = branch ? `?branch_id=${branch}` : '';
      const r = await fetch(`${API}/erp/inventory/summary${params}`, { headers: auth() });
      const d = await r.json();
      setAlerts(d.data?.reorderAlerts || []);
    } catch { toast.error('Gagal memuat alerts'); }
    finally { setLoading(false); }
  }, [branch]);

  useEffect(() => { load(); }, [load]);

  const handleSuggest = async (rows, clearSelection) => {
    if (!rows.length) { toast.error('Pilih produk dulu'); return; }
    try {
      const r = await fetch(`${API}/erp/inventory/reorder`, {
        method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: rows.map(a => a.id), branch_id: branch || 1 }),
      });
      const d = await r.json();
      setSuggest(d.data);
    } catch { toast.error('Gagal generate saran'); }
  };

  const critical = alerts.filter(a => a.urgency === 'critical');
  const high     = alerts.filter(a => a.urgency === 'high');
  const medium   = alerts.filter(a => a.urgency === 'medium');

  const URGENCY_STYLE = {
    critical: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    high:     'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    medium:   'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  };
  const URGENCY_LABEL = { critical:'🚨 Kritis', high:'🔴 Tinggi', medium:'⚠️ Sedang' };

  const columns = [
    { key: 'name', label: 'Produk', sortable: true, render: (v, row) => (
      <div>
        <p className="font-semibold text-[var(--text-primary)]">{v}</p>
        <p className="text-[11px] text-[var(--text-muted)] font-mono">{row.sku || '—'} · {row.category || '—'}</p>
      </div>
    )},
    { key: 'qty', label: 'Stok Saat Ini', sortable: true, align: 'center', nowrap: true, render: (v) => (
      <span className={`inline-flex items-center justify-center w-10 h-7 rounded-lg font-bold text-sm
        ${v <= 0 ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'}`}>
        {v}
      </span>
    )},
    { key: 'stock_min', label: 'Minimum', sortable: true, align: 'center', nowrap: true, render: (v) => <span className="text-[var(--text-muted)]">{v}</span> },
    { key: '_status', label: 'Status', align: 'center', nowrap: true,
      exportValue: row => row.qty <= 0 ? 'Habis' : 'Menipis',
      render: (v, row) => (
        <StatusBadge label={row.qty <= 0 ? '🚨 Habis' : '⚠️ Menipis'}
          color={row.qty <= 0 ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'} />
      )},
    { key: 'urgency', label: 'Urgensi', sortable: true, align: 'center', nowrap: true,
      exportValue: row => URGENCY_LABEL[row.urgency]?.replace(/[^\w\s]/g,'').trim() || row.urgency,
      render: (v) => <StatusBadge label={URGENCY_LABEL[v]} color={URGENCY_STYLE[v]} /> },
  ];

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="grid grid-cols-3 gap-3">
        {[['🚨 Stok Habis', critical.length,'red'],['🔴 Menipis Kritis', high.length,'orange'],['⚠️ Menipis', medium.length,'amber']].map(([l,v,c]) => (
          <div key={l} className={`table-wrapper p-3 text-center border-l-4 border-${c}-500`}>
            <p className={`text-2xl font-black text-${c}-600`}>{v}</p>
            <p className="text-xs text-[var(--text-muted)]">{l}</p>
          </div>
        ))}
      </div>

      {alerts.length === 0 ? (
        <div className="table-wrapper p-12 text-center">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500"/>
          <p className="font-semibold">Semua stok dalam kondisi aman! 🎉</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={alerts}
            loading={loading}
            searchKeys={['name','sku','category']}
            searchPlaceholder="Cari produk, SKU, kategori..."
            filters={[
              { key:'urgency', label:'Urgensi', options:[
                { value:'critical', label:'🚨 Kritis' },
                { value:'high',     label:'🔴 Tinggi' },
                { value:'medium',   label:'⚠️ Sedang' },
              ]},
            ]}
            selectable
            bulkActions={(rows, clear) => (
              <button onClick={() => handleSuggest(rows, clear)} className="btn-primary h-8 text-xs px-3 gap-1.5">
                <BarChart3 size={13}/> Saran Reorder ({rows.length})
              </button>
            )}
            exportable exportFilename="reorder_alert"
            pageSizeOptions={[25,50,100]}
            pageSize={25}
            zebra
          />

          {/* Reorder suggestion modal */}
          {suggest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setSuggest(null)}>
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                  <div>
                    <h3 className="font-bold">Saran Reorder</h3>
                    <p className="text-xs text-[var(--text-muted)]">Estimasi total: {toRp(suggest.total_estimate)}</p>
                  </div>
                  <button onClick={() => setSuggest(null)} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center">✕</button>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {suggest.suggestions.map(s => (
                    <div key={s.product_id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{s.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">Stok: {s.current_qty} · Min: {s.stock_min}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[var(--brand-600)]">Order: {s.suggested_order} pcs</p>
                        <p className="text-xs text-[var(--text-muted)]">≈ {toRp(s.estimated_cost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-[var(--border)]">
                  <button onClick={() => { setSuggest(null); onNavigate('/erp/purchases'); }}
                    className="btn-primary w-full gap-2">
                    Buat Purchase Order →
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MOVEMENTS TAB
// ════════════════════════════════════════════════════════════════
const MovementsTab = ({ branch }) => {
  const [movements, setMovements] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filterType, setFilterType] = useState('');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: LIMIT, page });
      if (branch)     p.set('branch_id', branch);
      if (filterType) p.set('type', filterType);
      if (dateFrom)   p.set('date_from', dateFrom);
      if (dateTo)     p.set('date_to', dateTo);
      const r = await fetch(`${API}/erp/inventory/movements?${p}`, { headers: auth() });
      const d = await r.json();
      setMovements(d.data?.movements || []);
      setTotal(d.data?.pagination?.total || 0);
    } catch { toast.error('Gagal memuat mutasi'); }
    finally { setLoading(false); }
  }, [branch, filterType, dateFrom, dateTo, page]);

  useEffect(() => { setPage(1); }, [branch, filterType, dateFrom, dateTo]);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="input-base h-9 text-sm w-36">
          <option value="">Semua Tipe</option>
          <option value="in">Masuk</option>
          <option value="out">Keluar</option>
          <option value="adjustment">Opname</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="input-base h-9 text-sm w-36"/>
        <span className="text-[var(--text-muted)] text-sm">s/d</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="input-base h-9 text-sm w-36"/>
        {(filterType || dateFrom || dateTo) && (
          <button onClick={() => { setFilterType(''); setDateFrom(''); setDateTo(''); }}
            className="text-xs text-[var(--text-muted)] hover:text-red-500 flex items-center gap-1">
            <X size={13}/> Reset
          </button>
        )}
        <span className="ml-auto text-xs text-[var(--text-muted)]">{total} mutasi</span>
      </div>

      {/* Table */}
      <div className="table-wrapper overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-5 h-5 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin"/></div>
        ) : movements.length === 0 ? (
          <div className="p-10 text-center text-[var(--text-muted)]">
            <Package size={32} className="mx-auto mb-2 opacity-30"/>
            <p className="text-sm">Belum ada mutasi stok</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                  {['Tanggal','Produk','Tipe','Qty','Sebelum','Sesudah','Referensi','Catatan'].map(h => (
                    <th key={h} className="px-3 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-3 py-2.5 text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}
                      <br/><span className="text-[10px]">{new Date(m.created_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</span>
                    </td>
                    <td className="px-3 py-2.5 max-w-[160px]">
                      <p className="font-semibold truncate">{m.product?.name || '—'}</p>
                      <p className="text-[11px] text-[var(--text-muted)] font-mono">{m.product?.sku || ''}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${MOVEMENT_BG[m.type]} ${MOVEMENT_COLORS[m.type]}`}>
                        {m.type === 'in' ? '↑' : m.type === 'out' ? '↓' : '⇄'} {MOVEMENT_LABELS[m.type]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`font-bold text-sm ${MOVEMENT_COLORS[m.type]}`}>
                        {m.type === 'out' ? '-' : '+'}{Math.abs(m.qty)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[var(--text-muted)]">{m.qty_before}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold">{m.qty_after}</td>
                    <td className="px-3 py-2.5 text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {REF_LABELS[m.ref_type] || m.ref_type || '—'}
                      {m.ref_id ? ` #${m.ref_id}` : ''}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[var(--text-muted)] max-w-[120px] truncate">
                      {m.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)]">Halaman {page} dari {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-secondary)] disabled:opacity-30">
                <ChevronLeft size={13}/>
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-secondary)] disabled:opacity-30">
                <ChevronRight size={13}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// VALUE TAB — Nilai Stok per Kategori
// ════════════════════════════════════════════════════════════════
const ValueTab = ({ branch }) => {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = branch ? `?branch_id=${branch}` : '';
    fetch(`${API}/erp/inventory/stock-value${params}`, { headers: auth() })
      .then(r => r.json())
      .then(d => setData(d.data?.breakdown || []))
      .catch(() => toast.error('Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [branch]);

  const totalBuy  = data.reduce((s,r) => s + parseFloat(r.buy_value||0), 0);
  const totalSell = data.reduce((s,r) => s + parseFloat(r.sell_value||0), 0);
  const potential = totalSell - totalBuy;

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label:'Total Nilai Modal', value: toRp(totalBuy),  sub:'Harga beli × stok', color:'text-purple-600', bg:'bg-purple-50' },
          { label:'Total Nilai Jual',  value: toRp(totalSell), sub:'Harga jual × stok', color:'text-blue-600',   bg:'bg-blue-50' },
          { label:'Potensi Profit',    value: toRp(potential), sub:'Selisih jual – modal', color:'text-emerald-600', bg:'bg-emerald-50' },
        ].map(c => (
          <div key={c.label} className="table-wrapper p-4 text-center">
            <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">{c.label}</p>
            <p className="text-xs text-[var(--text-muted)]">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown table */}
      <div className="table-wrapper overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg)]">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Breakdown per Kategori</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                {['Kategori','SKU','Total Qty','Nilai Modal','Nilai Jual','Potensi Profit','% dari Total'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => {
                const buyV  = parseFloat(r.buy_value||0);
                const sellV = parseFloat(r.sell_value||0);
                const profit = sellV - buyV;
                const pct   = totalBuy > 0 ? (buyV / totalBuy * 100).toFixed(1) : 0;
                return (
                  <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]">
                    <td className="px-4 py-3 font-semibold">{r.category || 'Tanpa Kategori'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{r.sku_count}</td>
                    <td className="px-4 py-3 font-semibold">{parseInt(r.total_qty||0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 font-semibold text-purple-600">{toRp(buyV)}</td>
                    <td className="px-4 py-3 font-semibold text-blue-600">{toRp(sellV)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{toRp(profit)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--brand-600)] rounded-full" style={{ width: `${pct}%` }}/>
                        </div>
                        <span className="text-xs text-[var(--text-muted)] w-8">{pct}%</span>
                      </div>
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
};
