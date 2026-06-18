import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, DollarSign, TrendingUp, Package, Users, RefreshCw, Plus, ArrowRight,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Truck, ShoppingBag, Receipt,
  Boxes, Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import PeriodFilter from '../../components/PeriodFilter';
import { erpService, toRp, toRpShort, CHANNELS, ORDER_STATUS } from '../../utils/erp/erpService';

const STATUS_COLORS = {
  draft:'bg-slate-100 text-slate-600', confirmed:'bg-blue-100 text-blue-700',
  processing:'bg-amber-100 text-amber-700', shipped:'bg-purple-100 text-purple-700',
  completed:'bg-emerald-100 text-emerald-700', cancelled:'bg-red-100 text-red-700',
  returned:'bg-orange-100 text-orange-700',
};

// ── Helper: Sparkline mini SVG (tanpa lib) ────────────────────
const Sparkline = ({ data = [], color = 'var(--brand-600)', width = 80, height = 24 }) => {
  if (!data.length) return <div className="opacity-30" style={{ width, height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" points={points} />
      <polyline
        fill={color} fillOpacity="0.12" stroke="none"
        points={`0,${height} ${points} ${width},${height}`}
      />
    </svg>
  );
};

// ── Helper: Delta indicator (% naik/turun) ────────────────────
const Delta = ({ value, suffix = '%' }) => {
  if (value === null || value === undefined || !isFinite(value)) {
    return <span className="text-[10px] text-[var(--text-muted)]">—</span>;
  }
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      <Icon size={10} strokeWidth={2.5} />
      {up ? '+' : ''}{Math.round(value)}{suffix}
    </span>
  );
};

// ── Helper: format tanggal ke "DD MMM" ────────────────────────
const fmtShortDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
};

export default function ErpDashboard() {
  const navigate = useNavigate();
  const [stats, setStats]         = useState(null);
  const [orders, setOrders]       = useState([]);
  const [dailyData, setDailyData] = useState(null); // { dates, rows, grand_total }
  const [chReport, setChReport]   = useState(null); // { rows, meta }
  const [lowStock, setLowStock]   = useState([]);
  const [loading, setLoad]        = useState(true);
  const [branch, setBranch]       = useState('');
  const [chartTab, setChartTab]   = useState('daily'); // daily | cumulative

  const [dateRange, setDate] = useState(() => {
    const n = new Date();
    return {
      from: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`,
      to: n.toISOString().split('T')[0],
    };
  });

  const fetch = useCallback(async () => {
    setLoad(true);
    try {
      const params = { date_from: dateRange.from, date_to: dateRange.to, branch_id: branch || undefined };
      const [sRes, oRes, dRes, cRes, pRes] = await Promise.all([
        erpService.getSalesReport(params),
        erpService.getOrders({ limit: 8, branch_id: branch || undefined }),
        erpService.getDailyReport(params),
        erpService.getChannelReport({ branch_id: branch || undefined }),
        erpService.getProducts({ low_stock: 'true', limit: 100, branch_id: branch || undefined }),
      ]);
      setStats(sRes.data.data.summary);
      setOrders(oRes.data.data.orders || []);
      setDailyData(dRes.data.data);
      setChReport(cRes.data.data);
      setLowStock(pRes.data.data.products || []);
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoad(false);
    }
  }, [branch, dateRange]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── Compute: Daily sales chart data ─────────────────────────
  const chartData = useMemo(() => {
    if (!dailyData?.dates) return [];
    const { dates, rows } = dailyData;
    const dataRows = rows.filter(r => !r.is_subtotal && !r.is_grand_total);
    let cumWA = 0, cumMP = 0, cumDR = 0;
    return dates.map(d => {
      const wa = dataRows.filter(r => r.channel === 'wa').reduce((s, r) => s + (r.by_date?.[d] || 0), 0);
      const mp = dataRows.filter(r => r.channel === 'marketplace').reduce((s, r) => s + (r.by_date?.[d] || 0), 0);
      const dr = dataRows.filter(r => r.channel === 'direct').reduce((s, r) => s + (r.by_date?.[d] || 0), 0);
      cumWA += wa; cumMP += mp; cumDR += dr;
      return {
        date: d,
        label: fmtShortDate(d),
        wa, marketplace: mp, direct: dr, total: wa + mp + dr,
        cumWA, cumMP, cumDR, cumTotal: cumWA + cumMP + cumDR,
      };
    });
  }, [dailyData]);

  // ── Compute: Sparkline data per metric (7 hari terakhir) ────
  const sparkData = useMemo(() => {
    const last7 = chartData.slice(-7);
    return {
      orders: last7.map(d => (d.total > 0 ? 1 : 0)), // rough proxy
      revenue: last7.map(d => d.total),
      profit: last7.map(d => d.total * 0.25), // approx 25% margin if no detail
    };
  }, [chartData]);

  // ── Compute: MTD vs Previous Month from chReport ─────────────
  const mtdComparison = useMemo(() => {
    if (!chReport?.rows) return null;
    const grand = chReport.rows.find(r => r.is_grand_total);
    if (!grand) return null;
    const deltaVsPrev = grand.prev > 0 ? ((grand.mtd - grand.prev) / grand.prev) * 100 : null;
    const deltaForecastVsPrev = grand.prev > 0 ? ((grand.forecast - grand.prev) / grand.prev) * 100 : null;
    const forecastProgress = grand.forecast > 0 ? (grand.mtd / grand.forecast) * 100 : 0;
    return {
      mtd: grand.mtd, prev: grand.prev, today: grand.today,
      forecast: grand.forecast, retMtd: grand.ret_total, retToday: grand.ret_today,
      deltaVsPrev, deltaForecastVsPrev, forecastProgress,
      meta: chReport.meta,
    };
  }, [chReport]);

  // ── Compute: Channel breakdown today vs MTD ──────────────────
  const channelBreakdown = useMemo(() => {
    if (!chReport?.rows) return [];
    return chReport.rows
      .filter(r => r.is_subtotal)
      .map(r => ({
        channel: r.channel,
        label: r.label,
        today: r.today, mtd: r.mtd, prev: r.prev, forecast: r.forecast,
        delta: r.prev > 0 ? ((r.mtd - r.prev) / r.prev) * 100 : null,
      }));
  }, [chReport]);

  // ── Compute: Low stock dengan severity ──────────────────────
  const lowStockSorted = useMemo(() => {
    return lowStock
      .map(p => {
        const qty = p.stock?.qty || 0;
        const min = p.stock_min || 0;
        const ratio = min > 0 ? qty / min : (qty === 0 ? 0 : 999);
        const severity = qty === 0 ? 'out' : (ratio < 0.5 ? 'critical' : 'low');
        return { ...p, _qty: qty, _min: min, _ratio: ratio, _severity: severity };
      })
      .sort((a, b) => a._ratio - b._ratio)
      .slice(0, 8);
  }, [lowStock]);

  // ── KPI Cards ───────────────────────────────────────────────
  const KPI_CARDS = stats ? [
    {
      label: 'Total Order', value: stats.total_orders, fmt: false,
      icon: ShoppingCart, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950',
      spark: sparkData.orders, sparkColor: '#ef4444',
      delta: null,
    },
    {
      label: 'Total Omzet', value: stats.total_revenue, fmt: true,
      icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950',
      spark: sparkData.revenue, sparkColor: '#10b981',
      delta: mtdComparison?.deltaVsPrev,
    },
    {
      label: 'Total Profit', value: stats.total_profit, fmt: true,
      icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950',
      spark: sparkData.profit, sparkColor: '#f59e0b',
      delta: null,
    },
    {
      label: 'Penjualan Hari Ini', value: mtdComparison?.today || 0, fmt: true,
      icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950',
      spark: chartData.slice(-7).map(d => d.total), sparkColor: '#3b82f6',
      delta: null,
      sub: mtdComparison?.retToday > 0 ? `Retur hari ini: ${toRpShort(mtdComparison.retToday)}` : 'Belum ada retur hari ini',
    },
    {
      label: 'Forecast Bulan', value: mtdComparison?.forecast || 0, fmt: true,
      icon: Package, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950',
      spark: null, sparkColor: '#8b5cf6',
      delta: mtdComparison?.deltaForecastVsPrev,
      sub: `vs ${mtdComparison?.meta?.prev_month || ''}`,
    },
  ] : [];

  return (
    <div className="section animate-fade-in">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard ERP</h1>
          <p className="body-sm text-[var(--text-muted)]">
            GPDISTRO Racing ID
            {mtdComparison?.meta?.report_date && (
              <span className="ml-2 text-[var(--text-muted)]">· {mtdComparison.meta.report_date}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={branch} onChange={e => setBranch(e.target.value)} className="input-base h-9 text-sm min-w-36">
            <option value="">Semua Cabang</option>
            <option value="1">GP Racing</option>
            <option value="2">GP Distro</option>
          </select>
          <button onClick={fetch} disabled={loading} className="btn-icon" title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => navigate('/erp/orders/new')} className="btn-primary">
            <Plus size={16} /> Order Baru
          </button>
        </div>
      </div>

      {/* PERIOD FILTER */}
      <div className="card-sm mb-4">
        <PeriodFilter value={dateRange} onChange={r => setDate(r)} />
      </div>

      {/* KPI CARDS — 5 col desktop, 2 col mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {loading
          ? [...Array(5)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)
          : KPI_CARDS.map(s => (
            <div key={s.label} className="card p-4 relative overflow-hidden">
              <div className="flex items-start justify-between mb-2">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon size={16} className={s.color} />
                </div>
                {s.delta !== null && s.delta !== undefined && <Delta value={s.delta} />}
              </div>
              <p className="text-xl font-black text-[var(--text-primary)] leading-tight">
                {s.fmt ? toRpShort(s.value) : (s.value || 0).toLocaleString('id-ID')}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{s.label}</p>
              {s.sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{s.sub}</p>}
              {s.spark && s.spark.length > 1 && (
                <div className="mt-1.5 -mx-1">
                  <Sparkline data={s.spark} color={s.sparkColor} width={120} height={20} />
                </div>
              )}
            </div>
          ))}
      </div>

      {/* MAIN GRID — Chart (2 col) + Side panels (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* SALES CHART — lg:col-span-2 */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold">Tren Penjualan</h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                {fmtShortDate(dateRange.from)} — {fmtShortDate(dateRange.to)} · per channel
              </p>
            </div>
            <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-lg p-0.5">
              {[
                { k: 'daily', l: 'Harian' },
                { k: 'cumulative', l: 'Kumulatif' },
              ].map(t => (
                <button
                  key={t.k}
                  onClick={() => setChartTab(t.k)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                    chartTab === t.k
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2" style={{ height: 290 }}>
            {loading ? (
              <div className="skeleton h-full w-full rounded-xl" />
            ) : chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                <Activity size={32} className="opacity-30 mb-2" />
                <p className="text-xs">Belum ada data penjualan</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gWa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gMp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => toRpShort(v).replace('Rp', '').trim()}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 10, fontSize: 11,
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    formatter={(v, n) => [toRp(v), n]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconType="circle" />
                  <Area
                    type="monotone"
                    name="WhatsApp"
                    dataKey={chartTab === 'daily' ? 'wa' : 'cumWA'}
                    stroke="#10b981" strokeWidth={2}
                    fill="url(#gWa)"
                  />
                  <Area
                    type="monotone"
                    name="Marketplace"
                    dataKey={chartTab === 'daily' ? 'marketplace' : 'cumMP'}
                    stroke="#8b5cf6" strokeWidth={2}
                    fill="url(#gMp)"
                  />
                  <Area
                    type="monotone"
                    name="Langsung"
                    dataKey={chartTab === 'daily' ? 'direct' : 'cumDR'}
                    stroke="#f59e0b" strokeWidth={2}
                    fill="url(#gDr)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* SIDE PANELS */}
        <div className="space-y-4">
          {/* MTD COMPARISON CARD */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Bulan Ini vs Bulan Lalu
              </h3>
              {mtdComparison?.meta?.days_passed && (
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  Hari {mtdComparison.meta.days_passed}/{mtdComparison.meta.days_in_month}
                </span>
              )}
            </div>

            {loading ? (
              <div className="skeleton h-24 rounded-lg" />
            ) : mtdComparison ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{mtdComparison.meta.curr_month}</p>
                    <p className="text-base font-bold text-[var(--text-primary)]">{toRpShort(mtdComparison.mtd)}</p>
                    <Delta value={mtdComparison.deltaVsPrev} />
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{mtdComparison.meta.prev_month}</p>
                    <p className="text-base font-bold text-[var(--text-muted)]">{toRpShort(mtdComparison.prev)}</p>
                  </div>
                </div>

                {/* Forecast progress */}
                <div className="pt-3 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Forecast Akhir Bulan</span>
                    <Delta value={mtdComparison.deltaForecastVsPrev} />
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{toRpShort(mtdComparison.forecast)}</p>
                  <div className="mt-1.5 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--brand-500)] to-[var(--brand-700)] transition-all"
                      style={{ width: `${Math.min(100, mtdComparison.forecastProgress)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    {Math.round(mtdComparison.forecastProgress)}% tercapai
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">Tidak ada data</p>
            )}
          </div>

          {/* INVENTORY ALERT */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Stok Menipis
                </h3>
                {lowStockSorted.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {lowStock.length}
                  </span>
                )}
              </div>
              <button onClick={() => navigate('/erp/products?filter=low_stock')} className="text-[10px] text-[var(--brand-600)] font-semibold hover:underline">
                Semua →
              </button>
            </div>
            {loading ? (
              <div className="p-3 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
            ) : lowStockSorted.length === 0 ? (
              <div className="text-center py-6 text-[var(--text-muted)]">
                <Boxes size={24} className="mx-auto mb-1 opacity-30" />
                <p className="text-[11px]">Semua stok aman</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] max-h-[280px] overflow-y-auto">
                {lowStockSorted.map(p => {
                  const sevColor = p._severity === 'out' ? 'bg-red-500' : p._severity === 'critical' ? 'bg-orange-500' : 'bg-amber-500';
                  const sevText  = p._severity === 'out' ? 'text-red-600 dark:text-red-400' : p._severity === 'critical' ? 'text-orange-600 dark:text-orange-400' : 'text-amber-600 dark:text-amber-400';
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/erp/products`)}
                      className="px-4 py-2.5 flex items-center gap-2.5 hover:bg-[var(--bg-secondary)] cursor-pointer"
                    >
                      <span className={`w-1 h-7 ${sevColor} rounded-full flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate text-[var(--text-primary)]">{p.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-mono">{p.sku || '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-black ${sevText}`}>{p._qty}</p>
                        <p className="text-[9px] text-[var(--text-muted)]">min: {p._min}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS — 8 buttons compact */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2.5 mb-5">
        {[
          { l: 'Buat Order',  icon: ShoppingCart, color: 'bg-red-500 hover:bg-red-600',         to: '/erp/orders/new' },
          { l: 'Produk',      icon: Package,      color: 'bg-emerald-500 hover:bg-emerald-600', to: '/erp/products' },
          { l: 'Pelanggan',   icon: Users,        color: 'bg-blue-500 hover:bg-blue-600',       to: '/erp/customers' },
          { l: 'Lap. Sales',  icon: TrendingUp,   color: 'bg-amber-500 hover:bg-amber-600',     to: '/erp/reports' },
          { l: 'Inventory',   icon: Boxes,        color: 'bg-cyan-500 hover:bg-cyan-600',       to: '/erp/inventory' },
          { l: 'Shipment',    icon: Truck,        color: 'bg-purple-500 hover:bg-purple-600',   to: '/erp/shipments' },
          { l: 'Pembelian',   icon: ShoppingBag,  color: 'bg-pink-500 hover:bg-pink-600',       to: '/erp/purchases' },
          { l: 'Pengeluaran', icon: Receipt,      color: 'bg-slate-600 hover:bg-slate-700',     to: '/erp/expenses' },
        ].map(a => (
          <button
            key={a.l}
            onClick={() => navigate(a.to)}
            className={`${a.color} text-white rounded-xl px-3 py-3 flex flex-col items-center justify-center gap-1.5 font-semibold text-[11px] transition-all active:scale-95 shadow-sm`}
          >
            <a.icon size={18} />
            {a.l}
          </button>
        ))}
      </div>

      {/* RECENT ORDERS + CHANNEL BREAKDOWN — 2 col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold">Order Terbaru</h2>
            <button onClick={() => navigate('/erp/orders')} className="text-xs text-[var(--brand-600)] font-semibold hover:underline flex items-center gap-1">
              Lihat semua <ArrowRight size={12} />
            </button>
          </div>
          <div className="card overflow-hidden">
            {loading ? (
              <div className="divide-y">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-14 m-4 rounded-xl" />)}</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10">
                <ShoppingCart size={28} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30" />
                <p className="text-xs text-[var(--text-muted)]">Belum ada order</p>
                <button onClick={() => navigate('/erp/orders/new')} className="btn-primary mt-3">Buat Order Pertama</button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {orders.map(o => {
                  const ch = CHANNELS[o.channel] || CHANNELS.direct;
                  const st = ORDER_STATUS[o.status] || ORDER_STATUS.draft;
                  return (
                    <div
                      key={o.id}
                      onClick={() => navigate(`/erp/orders/${o.id}`)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg ${ch.bg} flex items-center justify-center flex-shrink-0`}>
                        <ShoppingCart size={13} className={ch.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold font-mono">{o.order_no}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-600'}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">{o.customer_name || '—'} · {ch.label}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold">{toRpShort(o.total_amount)}</p>
                        <p className="text-[9px] text-[var(--text-muted)]">{o.order_date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Channel Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold">Breakdown per Channel</h2>
            <button onClick={() => navigate('/erp/channel-report')} className="text-xs text-[var(--brand-600)] font-semibold hover:underline flex items-center gap-1">
              Detail <ArrowRight size={12} />
            </button>
          </div>
          <div className="card p-4">
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
            ) : channelBreakdown.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <Package size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Belum ada penjualan bulan ini</p>
              </div>
            ) : (
              <div className="space-y-4">
                {channelBreakdown.map(c => {
                  const ch = CHANNELS[c.channel] || CHANNELS.direct;
                  const maxValue = Math.max(...channelBreakdown.map(x => x.mtd), 1);
                  const widthMtd = (c.mtd / maxValue) * 100;
                  const widthPrev = (c.prev / maxValue) * 100;
                  return (
                    <div key={c.channel}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${ch.bg}`} />
                          <span className="text-xs font-bold text-[var(--text-primary)]">{ch.label}</span>
                          <Delta value={c.delta} />
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{toRpShort(c.mtd)}</span>
                          {c.today > 0 && (
                            <span className="text-[10px] text-emerald-600 font-bold ml-1.5">+{toRpShort(c.today)}</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="relative h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 ${ch.bg} opacity-100`}
                            style={{ width: `${widthMtd}%` }}
                          />
                        </div>
                        <div className="relative h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-[var(--text-muted)] opacity-40"
                            style={{ width: `${widthPrev}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[9px] text-[var(--text-muted)]">Bulan ini</span>
                        <span className="text-[9px] text-[var(--text-muted)]">Bulan lalu: {toRpShort(c.prev)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
