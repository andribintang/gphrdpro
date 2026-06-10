import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Plus, Eye, RefreshCw, TrendingUp,
  Package, Clock, CheckCircle2, XCircle, Truck,
  Download, Filter, BarChart3, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import DataTable, { StatusBadge } from '../../components/DataTable';
import { erpService, toRpShort, toRupiah, ORDER_STATUS, CHANNELS } from '../../utils/erp/erpService';

const STATUS_COLORS = {
  draft:      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200',
  confirmed:  'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200',
  processing: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200',
  shipped:    'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200',
  completed:  'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200',
  cancelled:  'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200',
  returned:   'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200',
};

const STATUS_ICON = {
  draft: Clock, confirmed: CheckCircle2, processing: Package,
  shipped: Truck, completed: CheckCircle2, cancelled: XCircle, returned: RefreshCw,
};

export default function OrdersPage() {
  const navigate  = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState('table'); // table | kanban

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpService.getOrders({ limit: 500 });
      setOrders(res.data.data.orders || []);
    } catch { toast.error('Gagal memuat order'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // ── Summary stats ─────────────────────────────────────────
  const stats = {
    total:      orders.length,
    pending:    orders.filter(o => ['draft','confirmed','processing'].includes(o.status)).length,
    shipped:    orders.filter(o => o.status === 'shipped').length,
    completed:  orders.filter(o => o.status === 'completed').length,
    cancelled:  orders.filter(o => o.status === 'cancelled').length,
    revenue:    orders.filter(o => o.status === 'completed').reduce((s,o) => s + parseFloat(o.total_amount||0), 0),
    today:      orders.filter(o => o.order_date === new Date().toISOString().split('T')[0]).length,
  };

  // ── Export Excel ──────────────────────────────────────────
  const handleExport = () => {
    const rows = orders.map(o => ({
      'No. Order':     o.order_no,
      'Tanggal':       o.order_date,
      'Pelanggan':     o.customer_name || '—',
      'No. HP':        o.customer_phone || '—',
      'Kota':          o.customer_city || '—',
      'Channel':       CHANNELS[o.channel]?.label || o.channel,
      'Sub Channel':   o.sub_channel_name || '—',
      'Status':        ORDER_STATUS[o.status]?.label || o.status,
      'Total':         parseFloat(o.total_amount||0),
      'Catatan':       o.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch:16 },{ wch:12 },{ wch:20 },{ wch:14 },{ wch:14 },{ wch:12 },{ wch:16 },{ wch:12 },{ wch:14 },{ wch:20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Order');
    XLSX.writeFile(wb, `orders_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`${rows.length} order diexport ke Excel`);
  };

  // ── Quick status update ───────────────────────────────────
  const handleStatusChange = async (orderId, newStatus, e) => {
    e.stopPropagation();
    try {
      await erpService.updateOrderStatus(orderId, { status: newStatus });
      toast.success('Status diperbarui');
      loadOrders();
    } catch { toast.error('Gagal update status'); }
  };

  // ── Columns ───────────────────────────────────────────────
  const columns = [
    { key:'order_no', label:'No. Order', sortable:true, nowrap:true,
      render: v => <span className="font-mono text-xs font-bold text-[var(--brand-600)]">{v}</span> },
    { key:'order_date', label:'Tanggal', sortable:true, nowrap:true,
      render: v => {
        const today = new Date().toISOString().split('T')[0];
        const isToday = v === today;
        return (
          <div>
            <span className={`text-xs ${isToday ? 'text-[var(--brand-600)] font-bold' : 'text-[var(--text-secondary)]'}`}>
              {isToday ? '🔴 Hari Ini' : v}
            </span>
          </div>
        );
      }
    },
    { key:'customer_name', label:'Pelanggan',
      render: (v, row) => (
        <div>
          <p className="font-semibold text-sm">{v||'—'}</p>
          {row.customer_city && <p className="text-[11px] text-[var(--text-muted)]">📍 {row.customer_city}</p>}
        </div>
      )
    },
    { key:'channel', label:'Channel', nowrap:true,
      render: v => { const ch = CHANNELS[v]||CHANNELS.direct; return <StatusBadge label={ch.label} color={`${ch.bg} ${ch.color} border-transparent`} dot={ch.dot}/>; }
    },
    { key:'status', label:'Status', nowrap:true,
      render: (v, row) => {
        const st = ORDER_STATUS[v]||ORDER_STATUS.draft;
        const Icon = STATUS_ICON[v] || Clock;
        // Next status options
        const NEXT = { draft:['confirmed','cancelled'], confirmed:['processing','cancelled'], processing:['shipped','cancelled'], shipped:['completed','returned'] };
        const nexts = NEXT[v] || [];
        return (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border ${STATUS_COLORS[v]||STATUS_COLORS.draft}`}>
              <Icon size={10}/> {st.label}
            </span>
            {nexts.length > 0 && (
              <div className="relative group">
                <button className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                  <ChevronDown size={11}/>
                </button>
                <div className="absolute left-0 top-6 z-20 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl py-1 min-w-[130px] hidden group-hover:block">
                  {nexts.map(ns => (
                    <button key={ns} onClick={e => handleStatusChange(row.id, ns, e)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)] flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[ns]?.includes('emerald') ? 'bg-emerald-500' : STATUS_COLORS[ns]?.includes('blue') ? 'bg-blue-500' : STATUS_COLORS[ns]?.includes('red') ? 'bg-red-500' : 'bg-amber-500'}`}/>
                      {ORDER_STATUS[ns]?.label || ns}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }
    },
    { key:'sub_channel_name', label:'Sub Channel', nowrap:true,
      render: v => v ? <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">{v}</span> : '—'
    },
    { key:'total_amount', label:'Total', sortable:true, align:'right', nowrap:true,
      render: v => <span className="font-bold text-[var(--brand-600)]">{toRpShort(v)}</span>
    },
  ];

  const STAT_CARDS = [
    { label:'Total Order',  value: stats.total,     color:'text-blue-600',    bg:'bg-blue-50',    icon:'🛒' },
    { label:'Hari Ini',     value: stats.today,     color:'text-orange-600',  bg:'bg-orange-50',  icon:'🔴' },
    { label:'Pending',      value: stats.pending,   color:'text-amber-600',   bg:'bg-amber-50',   icon:'⏳' },
    { label:'Dikirim',      value: stats.shipped,   color:'text-purple-600',  bg:'bg-purple-50',  icon:'🚚' },
    { label:'Selesai',      value: stats.completed, color:'text-emerald-600', bg:'bg-emerald-50', icon:'✅' },
    { label:'Revenue',      value: toRpShort(stats.revenue), color:'text-[var(--brand-600)]', bg:'bg-[var(--brand-600)]/5', icon:'💰' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Penjualan</h1>
          <p className="page-subtitle">{orders.length} order · {new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'})}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadOrders}
            className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
            <RefreshCw size={15}/>
          </button>
          <button onClick={handleExport}
            className="btn-secondary gap-2 h-9 text-sm">
            <Download size={15}/> Export Excel
          </button>
          <button onClick={() => navigate('/erp/orders/new')}
            className="btn-primary gap-2">
            <Plus size={16}/> Buat Order
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map(s => (
          <div key={s.label} className="table-wrapper p-3 text-center">
            <p className="text-xl mb-0.5">{s.icon}</p>
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[var(--text-muted)] font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Status pipeline */}
      <div className="grid grid-cols-5 gap-2">
        {['draft','confirmed','processing','shipped','completed'].map(status => {
          const count = orders.filter(o => o.status === status).length;
          const st = ORDER_STATUS[status] || {};
          const Icon = STATUS_ICON[status] || Clock;
          return (
            <div key={status} className={`table-wrapper p-3 text-center border-t-2 ${
              status==='completed' ? 'border-emerald-500' :
              status==='shipped'   ? 'border-purple-500' :
              status==='processing'? 'border-amber-500' :
              status==='confirmed' ? 'border-blue-500' : 'border-slate-400'
            }`}>
              <Icon size={16} className="mx-auto mb-1 text-[var(--text-muted)]"/>
              <p className="text-xl font-black">{count}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{st.label||status}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        searchKeys={['order_no','customer_name','customer_phone','sub_channel_name']}
        searchPlaceholder="Cari no. order, pelanggan, channel..."
        filters={[
          { key:'status',    label:'Status',  options: Object.entries(ORDER_STATUS).map(([k,v])=>({value:k,label:v.label})) },
          { key:'channel',   label:'Channel', options: Object.entries(CHANNELS).map(([k,v])=>({value:k,label:v.label})) },
          { key:'branch_id', label:'Cabang',  options: [{value:'1',label:'GP Racing'},{value:'2',label:'GP Distro'}] },
          { key:'order_date',label:'Hari Ini',options: [{value:new Date().toISOString().split('T')[0],label:'Hari Ini'}] },
        ]}
        onRowClick={row => navigate(`/erp/orders/${row.id}`)}
        emptyIcon={<ShoppingCart size={40}/>}
        emptyText="Belum ada order"
        emptyAction={<button onClick={()=>navigate('/erp/orders/new')} className="btn-primary mt-3">Buat Order Pertama</button>}
        actions={row => (
          <button onClick={() => navigate(`/erp/orders/${row.id}`)} className="btn-icon-sm" title="Lihat Detail">
            <Eye size={14}/>
          </button>
        )}
        pageSize={25}
        zebra
      />
    </div>
  );
}
