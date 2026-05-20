import { useState, useEffect, useCallback } from 'react';
import { Truck, Package, Search, Filter, RefreshCw, Check, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable, { StatusBadge } from '../../components/DataTable';
import { erpService, toRpShort, CHANNELS, COURIERS } from '../../utils/erp/erpService';

const SHIPMENT_STATUS = {
  pending:   { label:'Belum Kirim', color:'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
  packed:    { label:'Packing',     color:'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  shipped:   { label:'Dikirim',     color:'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  delivered: { label:'Terkirim',    color:'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  returned:  { label:'Return',      color:'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
};

// ── Input Resi Modal ──────────────────────────────────────────
const ResiModal = ({ order, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    courier:'JNE', service:'REG', tracking_no:'', weight:'', notes:''
  });
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));

  const handle = async () => {
    if (!form.tracking_no.trim()) { toast.error('Nomor resi wajib diisi'); return; }
    setSaving(true);
    try {
      await erpService.addShipment(order.id, {
        ...form, shipped_at: new Date().toISOString(), status:'shipped',
      });
      toast.success(`Resi ${form.tracking_no} disimpan`);
      onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message||'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop" />
      <div className="modal-box max-w-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Input Resi</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{order.order_no} · {order.customer_name||'—'}</p>
          </div>
          <button onClick={onClose} className="btn-icon-sm">✕</button>
        </div>
        <div className="modal-body">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Ekspedisi</label>
              <select value={form.courier} onChange={e=>sf('courier',e.target.value)} className="input-base text-sm">
                {COURIERS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Layanan</label>
              <select value={form.service} onChange={e=>sf('service',e.target.value)} className="input-base text-sm">
                {['REG','YES','OKE','EXPRESS','CARGO','SAME DAY'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Nomor Resi *</label>
            <input value={form.tracking_no} onChange={e=>sf('tracking_no',e.target.value.toUpperCase())}
              placeholder="JD0001234567890" className="input-base font-mono" autoFocus />
          </div>
          <div>
            <label className="field-label">Berat (kg)</label>
            <input type="number" step="0.1" value={form.weight} onChange={e=>sf('weight',e.target.value)}
              placeholder="1.0" className="input-base" />
          </div>
          <div>
            <label className="field-label">Catatan</label>
            <input value={form.notes} onChange={e=>sf('notes',e.target.value)}
              placeholder="Catatan pengiriman" className="input-base" />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1">
            <Truck size={15} /> {saving ? 'Menyimpan...' : 'Simpan Resi'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ShipmentsPage() {
  const [shipments, setShipments]   = useState([]);
  const [pendingOrders, setPending] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('pending'); // pending | all
  const [resiOrder, setResiOrder]   = useState(null);
  const [dateRange, setDate]        = useState(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      to:   now.toISOString().split('T')[0],
    };
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [shipRes, orderRes] = await Promise.all([
        erpService.getShipmentReport({ date_from: dateRange.from, date_to: dateRange.to }),
        // Orders confirmed/processing without shipment — need resi
        erpService.getOrders({ status:'confirmed', limit:200 }),
      ]);
      setShipments(shipRes.data.data.shipments || []);
      // Filter: marketplace orders that need resi
      const orders = orderRes.data.data.orders || [];
      setPending(orders.filter(o =>
        (o.channel === 'marketplace' || o.channel === 'wa') && !o.shipment
      ));
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, [dateRange]);

  useEffect(() => { fetch(); }, [fetch]);

  const copyResi = (resi) => {
    navigator.clipboard.writeText(resi);
    toast.success('Resi disalin!');
  };

  const markDelivered = async (shipmentId, orderId) => {
    try {
      await erpService.updateShipment(orderId, shipmentId, {
        status:'delivered', delivered_at: new Date().toISOString()
      });
      toast.success('Status diupdate: Terkirim');
      fetch();
    } catch (e) { toast.error('Gagal'); }
  };

  // ── Pending orders columns ──────────────────────────────────
  const pendingColumns = [
    {
      key:'order_no', label:'No. Order', nowrap:true,
      render: v => <span className="font-mono text-xs font-semibold">{v}</span>,
    },
    {
      key:'order_date', label:'Tanggal', nowrap:true,
      render: v => <span className="text-[var(--text-secondary)]">{v}</span>,
    },
    {
      key:'customer_name', label:'Pelanggan',
      render: v => <span className="font-medium">{v||'—'}</span>,
    },
    {
      key:'customer_city', label:'Kota',
      render: v => <span className="text-[var(--text-secondary)]">{v||'—'}</span>,
    },
    {
      key:'channel', label:'Channel', nowrap:true,
      render: v => {
        const ch = CHANNELS[v]||CHANNELS.direct;
        return <StatusBadge label={ch.label} color={`${ch.bg} ${ch.color} border-transparent`} />;
      },
    },
    {
      key:'total_amount', label:'Total', align:'right', nowrap:true,
      render: v => <span className="font-semibold">{toRpShort(v)}</span>,
    },
  ];

  // ── All shipments columns ───────────────────────────────────
  const shipmentColumns = [
    {
      key:'order', label:'Order', nowrap:true,
      render: (v) => <span className="font-mono text-xs font-semibold">{v?.order_no||'—'}</span>,
    },
    {
      key:'order', label:'Pelanggan',
      render: (v) => <span className="font-medium">{v?.customer_name||'—'}</span>,
    },
    {
      key:'courier', label:'Ekspedisi', nowrap:true,
      render: (v, row) => <span className="font-semibold">{v} {row.service}</span>,
    },
    {
      key:'tracking_no', label:'Nomor Resi', nowrap:true,
      render: (v) => v ? (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-[var(--brand-600)] dark:text-[var(--brand-500)]">{v}</span>
          <button onClick={() => copyResi(v)} className="btn-icon-sm" title="Salin resi">
            <Copy size={12} />
          </button>
        </div>
      ) : <span className="text-[var(--text-muted)]">—</span>,
    },
    {
      key:'shipped_at', label:'Tgl Kirim', nowrap:true,
      render: v => <span className="text-[var(--text-secondary)]">{v?.split('T')[0]||'—'}</span>,
    },
    {
      key:'status', label:'Status', nowrap:true,
      render: v => {
        const st = SHIPMENT_STATUS[v]||SHIPMENT_STATUS.pending;
        return <StatusBadge label={st.label} color={st.color} />;
      },
    },
  ];

  return (
    <div className="section animate-fade-in">
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>ERP</span><span>›</span>
        <span className="font-semibold text-[var(--text-primary)]">Pengiriman</span>
      </nav>

      <div className="page-header">
        <div>
          <h1 className="page-title">Pengiriman & Resi</h1>
          <p className="body-sm text-[var(--text-muted)]">Kelola resi pengiriman marketplace & WA</p>
        </div>
        <button onClick={fetch} className="btn-icon"><RefreshCw size={16} /></button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { k:'pending', l:'Perlu Resi', count: pendingOrders.length },
          { k:'all',     l:'Semua Pengiriman' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              tab===t.k ? 'bg-[var(--brand-600)] text-white' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
            {t.l}
            {t.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab===t.k ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'pending' ? (
        <DataTable
          columns={pendingColumns}
          data={pendingOrders}
          loading={loading}
          searchKeys={['order_no','customer_name','customer_city']}
          searchPlaceholder="Cari order, pelanggan, kota..."
          emptyIcon={<Package size={40} />}
          emptyText="Semua order sudah memiliki resi"
          actions={(row) => (
            <button onClick={() => setResiOrder(row)}
              className="btn-primary text-xs px-3 h-7 gap-1.5">
              <Truck size={12} /> Input Resi
            </button>
          )}
          pageSize={25}
          zebra
        />
      ) : (
        <>
          {/* Date filter for all shipments */}
          <div className="card-sm mb-4 flex items-center gap-3 flex-wrap">
            <input type="date" value={dateRange.from} onChange={e=>setDate(r=>({...r,from:e.target.value}))}
              className="input-base h-9 text-sm flex-1 min-w-28" />
            <span className="text-xs text-[var(--text-muted)]">s/d</span>
            <input type="date" value={dateRange.to} onChange={e=>setDate(r=>({...r,to:e.target.value}))}
              className="input-base h-9 text-sm flex-1 min-w-28" />
          </div>

          <DataTable
            columns={shipmentColumns}
            data={shipments}
            loading={loading}
            searchKeys={['tracking_no']}
            searchPlaceholder="Cari nomor resi..."
            filters={[
              { key:'status', label:'Status', options: Object.entries(SHIPMENT_STATUS).map(([k,v])=>({value:k,label:v.label})) },
              { key:'courier', label:'Ekspedisi', options: COURIERS.map(c=>({value:c,label:c})) },
            ]}
            emptyIcon={<Truck size={40} />}
            emptyText="Belum ada data pengiriman"
            actions={(row) => row.status === 'shipped' ? (
              <button onClick={() => markDelivered(row.id, row.order_id)}
                className="btn-secondary text-xs px-2.5 h-7 gap-1">
                <Check size={12} /> Terkirim
              </button>
            ) : null}
            pageSize={25}
            zebra
          />
        </>
      )}

      {resiOrder && <ResiModal order={resiOrder} onClose={() => setResiOrder(null)} onSuccess={fetch} />}
    </div>
  );
}
