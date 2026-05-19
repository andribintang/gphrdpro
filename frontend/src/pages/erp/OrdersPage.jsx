import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable, { StatusBadge } from '../../components/DataTable';
import { erpService, toRpShort, ORDER_STATUS, CHANNELS } from '../../utils/erp/erpService';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpService.getOrders({ limit: 200 });
      setOrders(res.data.data.orders);
    } catch { toast.error('Gagal memuat order'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const STATUS_COLORS = {
    draft:      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    confirmed:  'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    processing: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    shipped:    'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    completed:  'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    cancelled:  'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  };

  const columns = [
    {
      key:'order_no', label:'No. Order', sortable:true, nowrap:true,
      render: (v) => <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">{v}</span>,
    },
    {
      key:'order_date', label:'Tanggal', sortable:true, nowrap:true,
      render: (v) => <span className="text-[var(--text-secondary)]">{v}</span>,
    },
    {
      key:'customer_name', label:'Pelanggan',
      render: (v) => <span className="font-medium">{v || <span className="text-[var(--text-muted)]">—</span>}</span>,
    },
    {
      key:'channel', label:'Channel', nowrap:true,
      render: (v) => {
        const ch = CHANNELS[v] || CHANNELS.direct;
        return <StatusBadge label={ch.label} color={`${ch.bg} ${ch.color} border-transparent`} dot={ch.dot} />;
      },
    },
    {
      key:'status', label:'Status', nowrap:true,
      render: (v) => {
        const st = ORDER_STATUS[v] || ORDER_STATUS.draft;
        return <StatusBadge label={st.label} color={STATUS_COLORS[v] || STATUS_COLORS.draft} />;
      },
    },
    {
      key:'total_amount', label:'Total', sortable:true, align:'right', nowrap:true,
      render: (v) => <span className="font-semibold text-[var(--text-primary)]">{toRpShort(v)}</span>,
    },
    {
      key:'is_synced_incentive', label:'Insentif', align:'center', nowrap:true,
      render: (v) => v
        ? <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ Sync</span>
        : <span className="text-xs text-[var(--text-muted)]">—</span>,
    },
  ];

  return (
    <div className="section animate-fade-in">
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>ERP</span><span>›</span><span>Penjualan</span><span>›</span>
        <span className="font-semibold text-[var(--text-primary)]">Order</span>
      </nav>

      <div className="page-header">
        <div>
          <h1 className="page-title">Penjualan</h1>
          <p className="body-sm text-[var(--text-muted)]">{orders.length} total order</p>
        </div>
        <button onClick={() => navigate('/erp/orders/new')} className="btn-primary">
          <Plus size={16} /> Buat Order
        </button>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        searchKeys={['order_no','customer_name','customer_phone']}
        searchPlaceholder="Cari no. order, pelanggan..."
        filters={[
          { key:'status',  label:'Status',  options: Object.entries(ORDER_STATUS).map(([k,v]) => ({value:k,label:v.label})) },
          { key:'channel', label:'Channel', options: Object.entries(CHANNELS).map(([k,v]) => ({value:k,label:v.label})) },
          { key:'branch_id', label:'Cabang', options: [{value:'1',label:'GP Racing'},{value:'2',label:'GP Distro'}] },
        ]}
        onRowClick={(row) => navigate(`/erp/orders/${row.id}`)}
        emptyIcon={<ShoppingCart size={40} />}
        emptyText="Belum ada order"
        emptyAction={<button onClick={() => navigate('/erp/orders/new')} className="btn-primary">Buat Order Pertama</button>}
        actions={(row) => (
          <button onClick={() => navigate(`/erp/orders/${row.id}`)}
            className="btn-icon-sm" title="Lihat detail">
            <Eye size={14} />
          </button>
        )}
        pageSize={25}
        zebra
      />
    </div>
  );
}
