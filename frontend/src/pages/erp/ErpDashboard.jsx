import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Package, Users, TrendingUp,
  Plus, ArrowUpRight, RefreshCw, AlertTriangle,
  CheckCircle2, Clock, Truck, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRp, toRpShort, ORDER_STATUS, CHANNELS } from '../../utils/erp/erpService';
import { useAuth } from '../../context/AuthContext';

const StatCard = ({ icon: Icon, label, value, sub, color, bg, onClick }) => (
  <button onClick={onClick}
    className={`card p-4 text-left transition-all ${onClick ? 'hover:border-brand-300 active:scale-[0.98]' : 'cursor-default'}`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
      </div>
      {onClick && <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)]" />}
    </div>
    <p className="text-xl font-black text-[var(--text-primary)]">{value ?? '—'}</p>
    <p className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">{label}</p>
    {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
  </button>
);

export default function ErpDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats]     = useState(null);
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBF] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, reportRes] = await Promise.all([
        erpService.getOrders({ limit: 8, page: 1, ...(branchFilter ? { branch_id: branchFilter } : {}) }),
        erpService.getSalesReport({
          date_from: today, date_to: today,
          ...(branchFilter ? { branch_id: branchFilter } : {}),
        }),
      ]);
      setOrders(ordersRes.data.data.orders);
      setStats(reportRes.data.data.summary);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, [branchFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[var(--text-primary)]">Dashboard ERP</h1>
          <p className="text-sm text-[var(--text-secondary)]">GPDISTRO Racing ID</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={branchFilter} onChange={e => setBF(e.target.value)}
            className="input-base text-sm h-9 pr-8">
            <option value="">Semua Cabang</option>
            <option value="1">GP Racing</option>
            <option value="2">GP Distro</option>
          </select>
          <button onClick={fetch}
            className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/erp/orders/new')} className="btn-primary h-9 px-3 text-sm">
            <Plus className="w-4 h-4" /> Order Baru
          </button>
        </div>
      </div>

      {/* Stats hari ini */}
      <div>
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Hari Ini — {new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' })}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={ShoppingCart} label="Total Order"
            value={stats?.total_orders ?? 0} sub="Order masuk hari ini"
            color="text-brand-600 dark:text-brand-400" bg="bg-brand-100 dark:bg-brand-950"
            onClick={() => navigate('/erp/orders')} />
          <StatCard icon={DollarSign} label="Total Omzet"
            value={toRpShort(stats?.total_revenue)} sub="Revenue hari ini"
            color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-950" />
          <StatCard icon={TrendingUp} label="Total Profit"
            value={toRpShort(stats?.total_profit)} sub="Laba kotor hari ini"
            color="text-amber-600 dark:text-amber-400" bg="bg-amber-100 dark:bg-amber-950" />
          <StatCard icon={Package} label="By Channel"
            value={stats ? `${stats.by_channel?.wa?.orders||0}W · ${stats.by_channel?.marketplace?.orders||0}M · ${stats.by_channel?.direct?.orders||0}L` : '—'}
            sub="WA · Marketplace · Langsung"
            color="text-purple-600 dark:text-purple-400" bg="bg-purple-100 dark:bg-purple-950" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label:'Buat Order',    icon:ShoppingCart, to:'/erp/orders/new',    color:'bg-brand-500 hover:bg-brand-600 text-white' },
          { label:'Produk',        icon:Package,       to:'/erp/products',      color:'bg-emerald-500 hover:bg-emerald-600 text-white' },
          { label:'Pelanggan',     icon:Users,         to:'/erp/customers',     color:'bg-blue-500 hover:bg-blue-600 text-white' },
          { label:'Laporan Sales', icon:TrendingUp,    to:'/erp/reports',       color:'bg-amber-500 hover:bg-amber-600 text-white' },
        ].map((a, i) => (
          <button key={i} onClick={() => navigate(a.to)}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${a.color}`}>
            <a.icon className="w-4 h-4 flex-shrink-0" />
            {a.label}
          </button>
        ))}
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Order Terbaru</h3>
          <button onClick={() => navigate('/erp/orders')}
            className="text-xs text-brand-500 font-semibold hover:underline">Lihat semua →</button>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
        ) : orders.length === 0 ? (
          <div className="card p-8 text-center">
            <ShoppingCart className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
            <p className="text-sm text-[var(--text-muted)]">Belum ada order</p>
            <button onClick={() => navigate('/erp/orders/new')} className="btn-primary mt-4 px-6 text-sm">
              Buat Order Pertama
            </button>
          </div>
        ) : (
          <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
            {orders.map(o => {
              const st = ORDER_STATUS[o.status] || ORDER_STATUS.draft;
              const ch = CHANNELS[o.channel]   || CHANNELS.direct;
              return (
                <button key={o.id} onClick={() => navigate(`/erp/orders/${o.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors text-left">
                  <div className={`w-9 h-9 ${ch.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <ShoppingCart className={`w-4 h-4 ${ch.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{o.order_no}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${st.bg} ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {o.customer_name || 'Tanpa pelanggan'} · {ch.label}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{toRpShort(o.total_amount)}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{o.order_date}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
