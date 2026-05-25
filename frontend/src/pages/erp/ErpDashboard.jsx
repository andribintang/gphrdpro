import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, DollarSign, TrendingUp, Package, Users, RefreshCw, Plus, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import PeriodFilter from '../../components/PeriodFilter';
import { erpService, toRp, toRpShort, CHANNELS, ORDER_STATUS } from '../../utils/erp/erpService';

const STATUS_COLORS = {
  draft:'bg-slate-100 text-slate-600', confirmed:'bg-blue-100 text-blue-700',
  processing:'bg-amber-100 text-amber-700', shipped:'bg-purple-100 text-purple-700',
  completed:'bg-emerald-100 text-emerald-700', cancelled:'bg-red-100 text-red-700',
  returned:'bg-orange-100 text-orange-700',
};

export default function ErpDashboard() {
  const navigate = useNavigate();
  const [stats, setStats]   = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoad]  = useState(true);
  const [branch, setBranch] = useState('');
  const [dateRange, setDate]= useState(() => {
    const n = new Date();
    return { from:`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`, to:n.toISOString().split('T')[0] };
  });

  const fetch = useCallback(async () => {
    setLoad(true);
    try {
      const [sRes, oRes] = await Promise.all([
        erpService.getSalesReport({ date_from:dateRange.from, date_to:dateRange.to, branch_id:branch||undefined }),
        erpService.getOrders({ limit:8, branch_id:branch||undefined }),
      ]);
      setStats(sRes.data.data.summary);
      setOrders(oRes.data.data.orders||[]);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoad(false); }
  }, [branch, dateRange]);

  useEffect(() => { fetch(); }, [fetch]);

  const STAT_CARDS = stats ? [
    { label:'Total Order',  value:stats.total_orders,   fmt:false, icon:ShoppingCart, color:'text-red-500',    bg:'bg-red-50 dark:bg-red-950' },
    { label:'Total Omzet',  value:stats.total_revenue,  fmt:true,  icon:DollarSign,   color:'text-emerald-600',bg:'bg-emerald-50 dark:bg-emerald-950' },
    { label:'Total Profit', value:stats.total_profit,   fmt:true,  icon:TrendingUp,   color:'text-amber-500',  bg:'bg-amber-50 dark:bg-amber-950' },
    { label:'By Channel',   value:`${stats.by_channel?.wa?.orders||0}W · ${stats.by_channel?.marketplace?.orders||0}M · ${stats.by_channel?.direct?.orders||0}L`, fmt:false, icon:Package, color:'text-purple-500', bg:'bg-purple-50 dark:bg-purple-950', sub:'WA · Marketplace · Langsung' },
  ] : [];

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Dashboard ERP</h1><p className="body-sm text-[var(--text-muted)]">GPDISTRO Racing ID</p></div>
        <div className="flex items-center gap-2">
          <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm min-w-36">
            <option value="">Semua Cabang</option><option value="1">GP Racing</option><option value="2">GP Distro</option>
          </select>
          <button onClick={fetch} disabled={loading} className="btn-icon"><RefreshCw size={16} className={loading?'animate-spin':''}/></button>
          <button onClick={()=>navigate('/erp/orders/new')} className="btn-primary"><Plus size={16}/> Order Baru</button>
        </div>
      </div>

      {/* Period Filter */}
      <div className="card-sm mb-5">
        <PeriodFilter value={dateRange} onChange={r=>{setDate(r);}} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? [...Array(4)].map((_,i)=><div key={i} className="skeleton h-28"/>) :
          STAT_CARDS.map(s=>(
            <div key={s.label} className="card p-5">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><s.icon size={18} className={s.color}/></div>
              <p className="text-xl font-black text-[var(--text-primary)]">{s.fmt?toRpShort(s.value):s.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
              {s.sub && <p className="text-[10px] text-[var(--text-muted)]">{s.sub}</p>}
            </div>
          ))
        }
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {l:'Buat Order',  icon:ShoppingCart, color:'bg-red-500 hover:bg-red-600',    to:'/erp/orders/new'},
          {l:'Produk',      icon:Package,      color:'bg-emerald-500 hover:bg-emerald-600', to:'/erp/products'},
          {l:'Pelanggan',   icon:Users,        color:'bg-blue-500 hover:bg-blue-600',   to:'/erp/customers'},
          {l:'Laporan Sales',icon:TrendingUp,  color:'bg-amber-500 hover:bg-amber-600', to:'/erp/reports'},
        ].map(a=>(
          <button key={a.l} onClick={()=>navigate(a.to)}
            className={`${a.color} text-white rounded-2xl p-4 flex items-center gap-3 font-semibold text-sm transition-all active:scale-95`}>
            <a.icon size={20}/>{a.l}
          </button>
        ))}
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">Order Terbaru</h2>
          <button onClick={()=>navigate('/erp/orders')} className="text-xs text-[var(--brand-600)] font-semibold hover:underline flex items-center gap-1">Lihat semua <ArrowRight size={12}/></button>
        </div>
        <div className="card overflow-hidden">
          {loading ? (
            <div className="divide-y">{[...Array(3)].map((_,i)=><div key={i} className="skeleton h-14 m-4 rounded-xl"/>)}</div>
          ) : orders.length===0 ? (
            <div className="text-center py-12">
              <ShoppingCart size={32} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30"/>
              <p className="text-sm text-[var(--text-muted)]">Belum ada order</p>
              <button onClick={()=>navigate('/erp/orders/new')} className="btn-primary mt-3">Buat Order Pertama</button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {orders.map(o=>{
                const ch=CHANNELS[o.channel]||CHANNELS.direct;
                const st=ORDER_STATUS[o.status]||ORDER_STATUS.draft;
                return (
                  <div key={o.id} onClick={()=>navigate(`/erp/orders/${o.id}`)}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors">
                    <div className={`w-9 h-9 rounded-xl ${ch.bg} flex items-center justify-center flex-shrink-0`}><ShoppingCart size={15} className={ch.color}/></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold font-mono">{o.order_no}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[o.status]||'bg-slate-100 text-slate-600'}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">{o.customer_name||'—'} · {ch.label}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold">{toRpShort(o.total_amount)}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{o.order_date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
