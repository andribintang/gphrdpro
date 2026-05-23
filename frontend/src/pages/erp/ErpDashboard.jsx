import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, DollarSign, TrendingUp, Package, Users, RefreshCw, Plus, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRp, toRpShort, CHANNELS, ORDER_STATUS } from '../../utils/erp/erpService';

export default function ErpDashboard() {
  const navigate = useNavigate();
  const [stats, setStats]     = useState(null);
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch]   = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [sRes, oRes] = await Promise.all([
        erpService.getSalesReport({ date_from: today, date_to: today, branch_id: branch||undefined }),
        erpService.getOrders({ limit: 5, branch_id: branch||undefined }),
      ]);
      setStats(sRes.data.data.summary);
      setOrders(oRes.data.data.orders || []);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, [branch]);

  useEffect(() => { fetch(); }, [fetch]);

  const STATUS_COLORS = {
    draft:'bg-slate-100 text-slate-600', confirmed:'bg-blue-100 text-blue-700',
    processing:'bg-amber-100 text-amber-700', shipped:'bg-purple-100 text-purple-700',
    completed:'bg-emerald-100 text-emerald-700', cancelled:'bg-red-100 text-red-700',
  };

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard ERP</h1>
          <p className="body-sm text-[var(--text-muted)]">GPDISTRO Racing ID</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm min-w-36">
            <option value="">Semua Cabang</option>
            <option value="1">GP Racing</option>
            <option value="2">GP Distro</option>
          </select>
          <button onClick={fetch} className="btn-icon"><RefreshCw size={16}/></button>
          <button onClick={()=>navigate('/erp/orders/new')} className="btn-primary"><Plus size={16}/> Order Baru</button>
        </div>
      </div>

      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
        HARI INI — {new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'}).toUpperCase()}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Order', value: stats?.total_orders||0, sub:'Order masuk hari ini', icon:ShoppingCart, color:'text-red-500', bg:'bg-red-50 dark:bg-red-950' },
          { label:'Total Omzet', value: toRpShort(stats?.total_revenue||0), sub:'Revenue hari ini', icon:DollarSign, color:'text-emerald-600', bg:'bg-emerald-50 dark:bg-emerald-950' },
          { label:'Total Profit', value: toRpShort(stats?.total_profit||0), sub:'Laba kotor hari ini', icon:TrendingUp, color:'text-amber-500', bg:'bg-amber-50 dark:bg-amber-950' },
          { label:'By Channel', value: `${stats?.by_channel?.wa?.orders||0}W · ${stats?.by_channel?.marketplace?.orders||0}M · ${stats?.by_channel?.direct?.orders||0}L`, sub:'WA · Marketplace · Langsung', icon:Package, color:'text-purple-500', bg:'bg-purple-50 dark:bg-purple-950' },
        ].map(s=>(
          <div key={s.label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={18} className={s.color}/>
              </div>
            </div>
            <p className="text-xl font-black text-[var(--text-primary)]">{loading?'—':s.value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {l:'Buat Order',icon:ShoppingCart,color:'bg-red-500 hover:bg-red-600',to:'/erp/orders/new'},
          {l:'Produk',    icon:Package,     color:'bg-emerald-500 hover:bg-emerald-600',to:'/erp/products'},
          {l:'Pelanggan', icon:Users,       color:'bg-blue-500 hover:bg-blue-600',to:'/erp/customers'},
          {l:'Laporan Sales',icon:TrendingUp,color:'bg-amber-500 hover:bg-amber-600',to:'/erp/reports'},
        ].map(a=>(
          <button key={a.l} onClick={()=>navigate(a.to)}
            className={`${a.color} text-white rounded-2xl p-4 flex items-center gap-3 font-semibold text-sm transition-all active:scale-95`}>
            <a.icon size={20}/> {a.l}
          </button>
        ))}
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Order Terbaru</h2>
          <button onClick={()=>navigate('/erp/orders')} className="text-xs text-[var(--brand-600)] font-semibold hover:underline flex items-center gap-1">Lihat semua <ArrowRight size={12}/></button>
        </div>
        <div className="card overflow-hidden">
          {loading ? (
            <div className="divide-y divide-[var(--border-subtle)]">{[...Array(3)].map((_,i)=><div key={i} className="skeleton h-14 m-4 rounded-xl"/>)}</div>
          ) : orders.length === 0 ? (
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
                    <div className={`w-9 h-9 rounded-xl ${ch.bg} flex items-center justify-center flex-shrink-0`}>
                      <ShoppingCart size={15} className={ch.color}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--text-primary)] font-mono">{o.order_no}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[o.status]||'bg-slate-100 text-slate-600'}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">{o.customer_name||'—'} · {ch.label}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{toRpShort(o.total_amount)}</p>
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
