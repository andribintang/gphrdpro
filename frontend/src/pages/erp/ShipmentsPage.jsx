import { useState, useEffect, useCallback } from 'react';
import { Truck, Package, RefreshCw, Check, Copy, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable, { StatusBadge } from '../../components/DataTable';
import { erpService, toRpShort, CHANNELS } from '../../utils/erp/erpService';

const COURIERS = ['JNE','J&T','SICEPAT','ANTERAJA','POS','TIKI','NINJA','LION','SAP'];
const SHIPMENT_STATUS = {
  pending:   { label:'Belum Kirim', color:'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
  packed:    { label:'Packing',     color:'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  shipped:   { label:'Dikirim',     color:'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  delivered: { label:'Terkirim',    color:'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  returned:  { label:'Return',      color:'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
};

const ResiModal = ({ order, onClose, onSuccess }) => {
  const [form, setForm] = useState({ courier:'JNE', service:'REG', tracking_no:'', weight:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  const handle = async () => {
    if (!form.tracking_no.trim()) { toast.error('Nomor resi wajib'); return; }
    setSaving(true);
    try {
      await erpService.addShipment(order.id, { ...form, shipped_at: new Date().toISOString(), status:'shipped' });
      toast.success('Resi disimpan'); onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message||'Gagal'); }
    finally { setSaving(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop" />
      <div className="modal-box max-w-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div><h3 className="text-sm font-bold">Input Resi</h3><p className="text-xs text-[var(--text-muted)]">{order.order_no}</p></div>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Ekspedisi</label>
              <select value={form.courier} onChange={e=>sf('courier',e.target.value)} className="input-base text-sm">
                {COURIERS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="field-label">Layanan</label>
              <select value={form.service} onChange={e=>sf('service',e.target.value)} className="input-base text-sm">
                {['REG','YES','OKE','EXPRESS','CARGO','SAME DAY'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label className="field-label">Nomor Resi *</label>
            <input value={form.tracking_no} onChange={e=>sf('tracking_no',e.target.value.toUpperCase())} placeholder="JD0001234567890" className="input-base font-mono" autoFocus />
          </div>
          <div><label className="field-label">Berat (kg)</label>
            <input type="number" step="0.1" value={form.weight} onChange={e=>sf('weight',e.target.value)} placeholder="1.0" className="input-base" />
          </div>
          <div><label className="field-label">Catatan</label>
            <input value={form.notes} onChange={e=>sf('notes',e.target.value)} className="input-base" />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 size={15} className="animate-spin"/> : <Truck size={15}/>} Simpan Resi
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [pendingOrders, setPending] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('pending');
  const [resiOrder, setResiOrder] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [shipRes, orderRes] = await Promise.all([
        erpService.getShipmentReport({}),
        erpService.getOrders({ status:'confirmed', limit:200 }),
      ]);
      setShipments(shipRes.data.data.shipments || []);
      const orders = orderRes.data.data.orders || [];
      setPending(orders.filter(o => (o.channel==='marketplace'||o.channel==='wa') && !o.shipment));
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const copyResi = (resi) => { navigator.clipboard.writeText(resi); toast.success('Resi disalin!'); };

  const markDelivered = async (shipmentId, orderId) => {
    try {
      await erpService.updateShipment(orderId, shipmentId, { status:'delivered', delivered_at: new Date().toISOString() });
      toast.success('Status: Terkirim'); fetch();
    } catch { toast.error('Gagal'); }
  };

  const pendingCols = [
    { key:'order_no', label:'No. Order', nowrap:true, render: v => <span className="font-mono text-xs font-semibold">{v}</span> },
    { key:'order_date', label:'Tanggal', nowrap:true, render: v => <span className="text-[var(--text-secondary)]">{v}</span> },
    { key:'customer_name', label:'Pelanggan', render: v => <span className="font-medium">{v||'—'}</span> },
    { key:'channel', label:'Channel', nowrap:true, render: v => { const ch=CHANNELS[v]||CHANNELS.direct; return <StatusBadge label={ch.label} color={`${ch.bg} ${ch.color} border-transparent`}/>; } },
    { key:'total_amount', label:'Total', align:'right', nowrap:true, render: v => <span className="font-semibold">{toRpShort(v)}</span> },
  ];

  const shipCols = [
    { key:'order', label:'Order', nowrap:true, render: v => <span className="font-mono text-xs font-semibold">{v?.order_no||'—'}</span> },
    { key:'order', label:'Pelanggan', render: v => <span className="font-medium">{v?.customer_name||'—'}</span> },
    { key:'courier', label:'Ekspedisi', nowrap:true, render: (v,row) => <span className="font-semibold">{v} {row.service}</span> },
    { key:'tracking_no', label:'Nomor Resi', nowrap:true, render: v => v ? (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold text-[var(--brand-600)]">{v}</span>
        <button onClick={()=>copyResi(v)} className="btn-icon-sm"><Copy size={12}/></button>
      </div>
    ) : <span className="text-[var(--text-muted)]">—</span> },
    { key:'status', label:'Status', nowrap:true, render: v => { const st=SHIPMENT_STATUS[v]||SHIPMENT_STATUS.pending; return <StatusBadge label={st.label} color={st.color}/>; } },
  ];

  const pendingCount = pendingOrders.length;

  return (
    <div className="section animate-fade-in">
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>ERP</span><span>›</span><span className="font-semibold text-[var(--text-primary)]">Pengiriman</span>
      </nav>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengiriman & Resi</h1>
          <p className="body-sm text-[var(--text-muted)]">Kelola resi pengiriman marketplace & WA</p>
        </div>
        <button onClick={fetch} className="btn-icon"><RefreshCw size={16}/></button>
      </div>
      <div className="flex gap-2 mb-5">
        {[{k:'pending',l:'Perlu Resi'},{k:'all',l:'Semua Pengiriman'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2 ${tab===t.k?'bg-[var(--brand-600)] text-white border-[var(--brand-600)]':'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]'}`}>
            {t.l}
            {t.k==='pending' && pendingCount>0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab==='pending'?'bg-white/20':'bg-red-500 text-white'}`}>{pendingCount}</span>}
          </button>
        ))}
      </div>
      {tab==='pending' ? (
        <DataTable columns={pendingCols} data={pendingOrders} loading={loading}
          searchKeys={['order_no','customer_name']} searchPlaceholder="Cari order..."
          emptyIcon={<Package size={40}/>} emptyText="Semua order sudah memiliki resi"
          actions={(row) => <button onClick={()=>setResiOrder(row)} className="btn-primary text-xs px-3 h-7 gap-1.5"><Truck size={12}/> Input Resi</button>}
          pageSize={25} zebra />
      ) : (
        <DataTable columns={shipCols} data={shipments} loading={loading}
          searchKeys={['tracking_no']} searchPlaceholder="Cari nomor resi..."
          emptyIcon={<Truck size={40}/>} emptyText="Belum ada pengiriman"
          actions={(row) => row.status==='shipped' ? (
            <button onClick={()=>markDelivered(row.id,row.order_id)} className="btn-secondary text-xs px-2.5 h-7 gap-1"><Check size={12}/> Terkirim</button>
          ) : null}
          pageSize={25} zebra />
      )}
      {resiOrder && <ResiModal order={resiOrder} onClose={()=>setResiOrder(null)} onSuccess={fetch}/>}
    </div>
  );
}
