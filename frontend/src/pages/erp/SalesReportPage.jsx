import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, ShoppingCart,
  RefreshCw, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRp, toRpShort, CHANNELS } from '../../utils/erp/erpService';

const Bar = ({ data, max, color='bg-brand-500' }) => {
  const pct = max > 0 ? (data / max) * 100 : 0;
  return (
    <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.max(pct, data > 0 ? 2 : 0)}%` }} />
    </div>
  );
};

export default function SalesReportPage() {
  const [report, setReport]     = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [branch, setBranch]     = useState('');
  const [tab, setTab]           = useState('sales'); // sales | shipments
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const to   = now.toISOString().split('T')[0];
    return { from, to };
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, rRes] = await Promise.all([
        erpService.getSalesReport({ branch_id: branch||undefined, date_from: dateRange.from, date_to: dateRange.to }),
        erpService.getShipmentReport({ branch_id: branch||undefined, date_from: dateRange.from, date_to: dateRange.to }),
      ]);
      setReport(sRes.data.data);
      setShipments(rRes.data.data.shipments);
    } catch { toast.error('Gagal memuat laporan'); }
    finally { setLoading(false); }
  }, [branch, dateRange]);

  useEffect(() => { fetch(); }, [fetch]);

  const setThisMonth = () => {
    const now = new Date();
    setDateRange({
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      to:   now.toISOString().split('T')[0],
    });
  };

  const setToday = () => {
    const t = new Date().toISOString().split('T')[0];
    setDateRange({ from: t, to: t });
  };

  const setLastMonth = () => {
    const now  = new Date();
    const from = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().split('T')[0];
    const to   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    setDateRange({ from, to });
  };

  const byChannel = report?.summary?.by_channel || {};
  const maxRevenue = Math.max(...Object.values(byChannel).map(c => c.revenue||0), 1);

  return (
    <div className="max-w-lg lg:max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Laporan Penjualan</h1>
          <p className="text-sm text-[var(--text-secondary)]">GPDISTRO Racing ID</p>
        </div>
        <button onClick={fetch} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { label:'Hari Ini',    fn: setToday },
            { label:'Bulan Ini',   fn: setThisMonth },
            { label:'Bulan Lalu',  fn: setLastMonth },
          ].map(q => (
            <button key={q.label} onClick={q.fn}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-brand-50 dark:hover:bg-brand-950 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-300 transition-all">
              {q.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={dateRange.from} onChange={e => setDateRange(r => ({...r, from: e.target.value}))}
            className="input-base text-sm h-9 flex-1 min-w-28" />
          <span className="text-xs text-[var(--text-muted)]">s/d</span>
          <input type="date" value={dateRange.to} onChange={e => setDateRange(r => ({...r, to: e.target.value}))}
            className="input-base text-sm h-9 flex-1 min-w-28" />
          <select value={branch} onChange={e => setBranch(e.target.value)} className="input-base text-sm h-9">
            <option value="">Semua Cabang</option>
            <option value="1">GP Racing</option>
            <option value="2">GP Distro</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[{k:'sales',l:'Penjualan'},{k:'shipments',l:'Resi Pengiriman'}].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab===t.k ? 'bg-brand-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : tab === 'sales' ? (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon:ShoppingCart, label:'Total Order',   value: report?.summary?.total_orders || 0,                  color:'text-brand-600 dark:text-brand-400', bg:'bg-brand-100 dark:bg-brand-950' },
              { icon:DollarSign,   label:'Total Omzet',   value: toRpShort(report?.summary?.total_revenue),           color:'text-emerald-600 dark:text-emerald-400', bg:'bg-emerald-100 dark:bg-emerald-950' },
              { icon:TrendingUp,   label:'Total Profit',  value: toRpShort(report?.summary?.total_profit),            color:'text-amber-600 dark:text-amber-400', bg:'bg-amber-100 dark:bg-amber-950' },
              { icon:BarChart3,    label:'Margin Rata-rata',
                value: report?.summary?.total_revenue > 0
                  ? `${((report.summary.total_profit/report.summary.total_revenue)*100).toFixed(1)}%`
                  : '0%',
                color:'text-purple-600 dark:text-purple-400', bg:'bg-purple-100 dark:bg-purple-950' },
            ].map((s,i) => (
              <div key={i} className="card p-4">
                <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} size={16} />
                </div>
                <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* By channel */}
          <div className="card p-4">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Omzet per Channel</p>
            <div className="space-y-4">
              {Object.entries(byChannel).map(([k,v]) => {
                const ch = CHANNELS[k] || CHANNELS.direct;
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${ch.bg} ${ch.color}`}>{ch.label}</span>
                        <span className="text-xs text-[var(--text-muted)]">{v.orders} order</span>
                      </div>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{toRpShort(v.revenue)}</span>
                    </div>
                    <Bar data={v.revenue} max={maxRevenue} color={
                      k==='wa' ? 'bg-emerald-500' : k==='marketplace' ? 'bg-orange-500' : 'bg-blue-500'
                    } />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order list */}
          {report?.orders?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                <p className="text-xs font-bold text-[var(--text-primary)]">Daftar Order ({report.orders.length})</p>
              </div>
              <div className="divide-y divide-[var(--border-subtle)] max-h-96 overflow-y-auto scrollbar-thin">
                {report.orders.map(o => {
                  const ch = CHANNELS[o.channel] || CHANNELS.direct;
                  const profit = o.items?.reduce((s,i) => s+(parseFloat(i.profit)||0), 0) || 0;
                  return (
                    <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">{o.order_date}</p>
                        <span className={`text-[10px] font-semibold ${ch.color}`}>{ch.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[var(--text-primary)]">{toRpShort(o.total_amount)}</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">+{toRpShort(profit)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Shipments tab
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--text-primary)]">Resi Pengiriman ({shipments.length})</p>
          </div>
          {shipments.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-[var(--text-muted)]">Tidak ada data pengiriman</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {shipments.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{s.order?.order_no}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        s.status==='delivered'?'bg-emerald-100 dark:bg-emerald-950 text-emerald-600':
                        'bg-purple-100 dark:bg-purple-950 text-purple-600'}`}>{s.status}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{s.order?.customer_name}</p>
                    <p className="text-xs font-mono font-semibold text-brand-600 dark:text-brand-400">
                      {s.courier} — {s.tracking_no}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{toRpShort(s.order?.total_amount)}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{s.shipped_at?.split('T')[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
