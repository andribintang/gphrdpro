import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Plus, Eye, RefreshCw, Package, Clock, CheckCircle2,
  XCircle, Truck, Download, ChevronDown, Loader2, Zap, Pencil,
  CalendarRange, Minus, Wrench, Shirt, Trash2, X, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import DataTable, { StatusBadge } from '../../components/DataTable';
import { erpService, toRpShort, toRp, ORDER_STATUS, CHANNELS } from '../../utils/erp/erpService';

// ── Branch identity ─────────────────────────────────────────
const BRANCH = {
  1: { name:'GP Racing', icon: Wrench, rowClass:'bg-blue-50/50 dark:bg-blue-950/15', dotClass:'bg-blue-500', color:'#2563eb' },
  2: { name:'GP Distro', icon: Shirt,  rowClass:'bg-rose-50/50 dark:bg-rose-950/15', dotClass:'bg-rose-400', color:'#db2777' },
};

// ── Status helpers ──────────────────────────────────────────
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
  draft:Clock, confirmed:CheckCircle2, processing:Package,
  shipped:Truck, completed:CheckCircle2, cancelled:XCircle, returned:RefreshCw,
};

// ── Date preset helpers ─────────────────────────────────────
const isoDate = (d) => d.toISOString().split('T')[0];
const today = () => { const d = new Date(); return isoDate(d); };
const calcDatePreset = (preset) => {
  const now = new Date();
  if (preset === 'today')      return { from: today(), to: today() };
  if (preset === 'yesterday')  { const d=new Date(now); d.setDate(d.getDate()-1); return { from:isoDate(d), to:isoDate(d) }; }
  if (preset === 'this_week')  { const d=new Date(now); d.setDate(d.getDate()-d.getDay()+1); return { from:isoDate(d), to:today() }; }
  if (preset === 'this_month') { const d=new Date(now.getFullYear(),now.getMonth(),1); return { from:isoDate(d), to:today() }; }
  if (preset === 'last_month') {
    const s=new Date(now.getFullYear(),now.getMonth()-1,1);
    const e=new Date(now.getFullYear(),now.getMonth(),0);
    return { from:isoDate(s), to:isoDate(e) };
  }
  return { from:'', to:'' }; // custom
};

const DATE_PRESETS = [
  { key:'',          label:'Semua Waktu' },
  { key:'today',     label:'Hari Ini' },
  { key:'yesterday', label:'Kemarin' },
  { key:'this_week', label:'Minggu Ini' },
  { key:'this_month',label:'Bulan Ini' },
  { key:'last_month',label:'Bulan Lalu' },
  { key:'custom',    label:'Pilih Tanggal...' },
];

// ── Edit Order Modal ────────────────────────────────────────
function EditOrderModal({ order, onClose, onSaved }) {
  const [form, setForm] = useState({
    customer_name:    order.customer_name || '',
    customer_phone:   order.customer_phone || '',
    customer_city:    order.customer_city  || '',
    customer_address: order.customer_address || '',
    discount_amount:  parseFloat(order.discount_amount) || 0,
    shipping_cost:    parseFloat(order.shipping_cost) || 0,
    admin_fee:        parseFloat(order.admin_fee) || 0,
    notes:            order.notes || '',
    order_date:       order.order_date || '',
  });
  const [items, setItems]   = useState(
    (order.items || []).map(i => ({
      ...i, _key: `${i.product_id}:${i.variant_id||0}`,
    }))
  );
  const [saving, setSaving] = useState(false);

  const setF = (k,v) => setForm(p => ({...p, [k]:v}));
  const setItem = (key, field, val) => setItems(p => p.map(i => i._key===key ? {...i, [field]: parseFloat(val)||0} : i));
  const removeItem = (key) => setItems(p => p.filter(i => i._key !== key));

  const subtotal = items.reduce((s,i) => s + i.sell_price * i.qty, 0);
  const total    = subtotal - (form.discount_amount||0) + (form.shipping_cost||0) + (form.admin_fee||0);

  const handleSave = async () => {
    if (!items.length) { toast.error('Minimal 1 produk'); return; }
    setSaving(true);
    try {
      await erpService.updateOrder(order.id, {
        ...form,
        items: items.map(i => ({
          product_id: i.product_id, variant_id: i.variant_id||null,
          qty: i.qty, sell_price: i.sell_price, buy_price: i.buy_price||0,
          discount_pct: i.discount_pct||0,
        })),
      });
      toast.success('Order berhasil diperbarui');
      onSaved();
      onClose();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="text-sm font-bold">Edit Order</h3>
            <p className="text-xs text-[var(--text-muted)] font-mono">{order.order_no}</p>
          </div>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Pelanggan */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Nama Pelanggan</label>
              <input value={form.customer_name} onChange={e=>setF('customer_name',e.target.value)} className="input-base"/></div>
            <div><label className="field-label">No. HP</label>
              <input value={form.customer_phone} onChange={e=>setF('customer_phone',e.target.value)} className="input-base"/></div>
            <div><label className="field-label">Kota</label>
              <input value={form.customer_city} onChange={e=>setF('customer_city',e.target.value)} className="input-base"/></div>
            <div><label className="field-label">Tanggal Order</label>
              <input type="date" value={form.order_date} onChange={e=>setF('order_date',e.target.value)} className="input-base"/></div>
          </div>
          <div><label className="field-label">Alamat</label>
            <textarea value={form.customer_address} onChange={e=>setF('customer_address',e.target.value)} rows={2} className="input-base resize-none"/></div>

          {/* Items */}
          <div>
            <p className="field-label mb-2">Produk ({items.length})</p>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item._key} className="p-3 rounded-xl bg-[var(--bg-secondary)] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.product_name}</p>
                      {item.variant_name && <span className="text-[10px] text-[var(--brand-600)]">{item.variant_name}</span>}
                    </div>
                    <button onClick={()=>removeItem(item._key)} className="btn-icon-sm text-red-500 flex-shrink-0"><Trash2 size={12}/></button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { l:'Qty',       f:'qty',         t:'number' },
                      { l:'Harga Jual',f:'sell_price',  t:'number' },
                      { l:'Harga Beli',f:'buy_price',   t:'number' },
                      { l:'Diskon %',  f:'discount_pct',t:'number' },
                    ].map(({l,f,t}) => (
                      <div key={f}><label className="text-[10px] text-[var(--text-muted)] font-bold uppercase">{l}</label>
                        <input type={t} value={item[f]||0} min={0}
                          onChange={e=>setItem(item._key, f, e.target.value)}
                          className="input-base h-8 text-xs text-right"/></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Biaya */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { l:'Diskon (Rp)', k:'discount_amount' },
              { l:'Ongkir (Rp)', k:'shipping_cost'   },
              { l:'Admin Fee',   k:'admin_fee'        },
            ].map(({l,k}) => (
              <div key={k}><label className="field-label">{l}</label>
                <input type="number" min={0} value={form[k]} onChange={e=>setF(k,parseFloat(e.target.value)||0)} className="input-base"/></div>
            ))}
          </div>

          {/* Total preview */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-xs text-[var(--text-muted)]"><span>Subtotal</span><span>{toRp(subtotal)}</span></div>
            {form.discount_amount > 0 && <div className="flex justify-between text-xs text-red-600"><span>Diskon</span><span>-{toRp(form.discount_amount)}</span></div>}
            {form.shipping_cost > 0 && <div className="flex justify-between text-xs text-[var(--text-muted)]"><span>Ongkir</span><span>+{toRp(form.shipping_cost)}</span></div>}
            {form.admin_fee > 0 && <div className="flex justify-between text-xs text-[var(--text-muted)]"><span>Admin Fee</span><span>+{toRp(form.admin_fee)}</span></div>}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-[var(--border)]"><span>Total</span><span className="text-[var(--brand-600)]">{toRp(total)}</span></div>
          </div>

          <div><label className="field-label">Catatan</label>
            <textarea value={form.notes} onChange={e=>setF('notes',e.target.value)} rows={2} className="input-base resize-none"/></div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 gap-2">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
export default function OrdersPage() {
  const navigate = useNavigate();

  // ── Filters state ─────────────────────────────────────────
  const [branchFilter, setBranchFilter] = useState('');      // '' | '1' | '2'
  const [datePreset,   setDatePreset]   = useState('');      // key dari DATE_PRESETS
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openDateDrop,  setOpenDateDrop]  = useState(false);
  const dateDdRef = useRef(null);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handler = (e) => {
      if (dateDdRef.current && !dateDdRef.current.contains(e.target)) {
        setOpenDateDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Data state ─────────────────────────────────────────────
  const [orders,       setOrders]       = useState([]);
  const [totalOrders,  setTotalOrders]  = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [editOrder,    setEditOrder]    = useState(null);   // order object untuk modal edit

  // ── Pagination — server-side ───────────────────────────────
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // ── Load orders ───────────────────────────────────────────
  const loadOrders = useCallback(async (pg = page, ps = pageSize) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: ps };
      if (branchFilter) params.branch_id = branchFilter;
      const { from, to } = datePreset && datePreset !== 'custom' ? calcDatePreset(datePreset) : { from: dateFrom, to: dateTo };
      if (from) params.date_from = from;
      if (to)   params.date_to   = to;

      const res = await erpService.getOrders(params);
      setOrders(res.data.data.orders || []);
      setTotalOrders(res.data.data.pagination?.total || 0);
    } catch { toast.error('Gagal memuat order'); }
    finally { setLoading(false); }
  }, [branchFilter, datePreset, dateFrom, dateTo, page, pageSize]);

  useEffect(() => { setPage(1); }, [branchFilter, datePreset, dateFrom, dateTo, pageSize]);
  useEffect(() => { loadOrders(page, pageSize); }, [page, pageSize, branchFilter, datePreset, dateFrom, dateTo]);

  // ── Stats — dari data yang sedang ditampilkan ──────────────
  const stats = {
    total:     totalOrders,
    draft:     orders.filter(o=>o.status==='draft').length,
    confirmed: orders.filter(o=>o.status==='confirmed').length,
    shipped:   orders.filter(o=>o.status==='shipped').length,
    completed: orders.filter(o=>o.status==='completed').length,
    revenue:   orders.filter(o=>o.status==='completed').reduce((s,o)=>s+parseFloat(o.total_amount||0),0),
    pending:   orders.filter(o=>['draft','confirmed','processing'].includes(o.status)).length,
  };

  // ── Date preset change ─────────────────────────────────────
  const handlePreset = (key) => {
    setDatePreset(key);
    if (key !== 'custom') { setShowDatePicker(false); setDateFrom(''); setDateTo(''); }
    else setShowDatePicker(true);
  };

  // ── Export ─────────────────────────────────────────────────
  const handleExport = () => {
    const rows = orders.map(o => ({
      'No. Order':   o.order_no,
      'Cabang':      BRANCH[o.branch_id]?.name || o.branch_id,
      'Tanggal':     o.order_date,
      'Pelanggan':   o.customer_name || '—',
      'No. HP':      o.customer_phone || '—',
      'Kota':        o.customer_city || '—',
      'Channel':     CHANNELS[o.channel]?.label || o.channel,
      'Sub Channel': o.sub_channel_name || '—',
      'Status':      ORDER_STATUS[o.status]?.label || o.status,
      'Total':       parseFloat(o.total_amount||0),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Array(10).fill({ wch:16 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Order');
    XLSX.writeFile(wb, `orders_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`${rows.length} order diexport`);
  };

  // ── Quick status change (optimistic) ──────────────────────
  const handleStatusChange = async (orderId, newStatus, e) => {
    e.stopPropagation();
    try {
      await erpService.updateOrderStatus(orderId, { status: newStatus });
      setOrders(prev => prev.map(o => o.id===orderId ? {...o, status:newStatus} : o));
      toast.success('Status diperbarui');
    } catch { toast.error('Gagal update status'); }
  };

  // ── Bulk status ────────────────────────────────────────────
  const STATUS_OPTIONS = [
    { value:'confirmed',  label:'✅ Konfirmasi', warn:true  },
    { value:'processing', label:'📦 Diproses',   warn:false },
    { value:'shipped',    label:'🚚 Dikirim',    warn:false },
    { value:'completed',  label:'🏁 Selesai',    warn:false },
    { value:'cancelled',  label:'❌ Batalkan',   warn:true  },
  ];

  const handleBulkStatus = async (rows, clearSelection, newStatus) => {
    const option = STATUS_OPTIONS.find(o=>o.value===newStatus);
    if (option?.warn) {
      const label = newStatus==='confirmed' ? `mengkonfirmasi ${rows.length} order (stok dipotong)` : `membatalkan ${rows.length} order`;
      if (!confirm(`Yakin ${label}?`)) return;
    }
    setBulkUpdating(true);
    try {
      const res = await erpService.bulkUpdateStatus({ order_ids:rows.map(r=>r.id), status:newStatus });
      const { updated } = res.data.data;
      setOrders(prev => {
        const ids = new Set(rows.map(r=>r.id));
        return prev.map(o => ids.has(o.id) ? {...o, status:newStatus} : o);
      });
      toast.success(`${updated} order → "${newStatus}"`);
      clearSelection();
    } catch(e) { toast.error(e.response?.data?.message||'Gagal bulk update'); }
    finally { setBulkUpdating(false); }
  };

  // ── Columns ────────────────────────────────────────────────
  const columns = [
    {
      key:'branch_id', label:'', nowrap:true, width:'32px',
      render: (v) => {
        const b = BRANCH[v];
        if (!b) return null;
        const Icon = b.icon;
        return <Icon size={13} style={{color:b.color}} title={b.name}/>;
      },
    },
    { key:'order_no', label:'No. Order', sortable:true, nowrap:true,
      render: v => <span className="font-mono text-xs font-bold text-[var(--brand-600)]">{v}</span> },
    { key:'order_date', label:'Tanggal', sortable:true, nowrap:true,
      render: v => {
        const t = today();
        const yesterday = isoDate(new Date(new Date().setDate(new Date().getDate()-1)));
        return (
          <span className={`text-xs ${v===t?'text-red-600 font-bold':v===yesterday?'text-amber-600 font-semibold':'text-[var(--text-secondary)]'}`}>
            {v===t?'🔴 Hari ini':v===yesterday?'🟡 Kemarin':v}
          </span>
        );
      },
    },
    { key:'customer_name', label:'Pelanggan',
      render:(v,row)=>(
        <div>
          <p className="font-semibold text-sm">{v||'—'}</p>
          {row.customer_city && <p className="text-[11px] text-[var(--text-muted)]">📍 {row.customer_city}</p>}
        </div>
      ),
    },
    { key:'channel', label:'Channel', nowrap:true,
      render: v => { const ch=CHANNELS[v]||CHANNELS.direct; return <StatusBadge label={ch.label} color={`${ch.bg} ${ch.color} border-transparent`} dot={ch.dot}/>; },
    },
    { key:'status', label:'Status', nowrap:true,
      render:(v,row) => {
        const st=ORDER_STATUS[v]||ORDER_STATUS.draft;
        const Icon=STATUS_ICON[v]||Clock;
        const NEXT={draft:['confirmed','cancelled'],confirmed:['processing','cancelled'],processing:['shipped','cancelled'],shipped:['completed','returned']};
        const nexts=NEXT[v]||[];
        return (
          <div className="flex items-center gap-1.5" onClick={e=>e.stopPropagation()}>
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border ${STATUS_COLORS[v]||STATUS_COLORS.draft}`}>
              <Icon size={10}/> {st.label}
            </span>
            {nexts.length>0 && (
              <div className="relative group">
                <button className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                  <ChevronDown size={11}/>
                </button>
                <div className="absolute left-0 top-6 z-20 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl py-1 min-w-[130px] hidden group-hover:block">
                  {nexts.map(ns=>(
                    <button key={ns} onClick={e=>handleStatusChange(row.id,ns,e)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)] flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[ns]?.includes('emerald')?'bg-emerald-500':STATUS_COLORS[ns]?.includes('blue')?'bg-blue-500':STATUS_COLORS[ns]?.includes('red')?'bg-red-500':'bg-amber-500'}`}/>
                      {ORDER_STATUS[ns]?.label||ns}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      },
    },
    { key:'sub_channel_name', label:'Sub Channel', nowrap:true,
      render: v => v ? <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">{v}</span> : '—',
    },
    { key:'total_amount', label:'Total', sortable:true, align:'right', nowrap:true,
      render: v => <span className="font-bold text-[var(--brand-600)]">{toRpShort(v)}</span>,
    },
  ];

  const dateLabel = datePreset && datePreset!=='custom'
    ? DATE_PRESETS.find(d=>d.key===datePreset)?.label
    : (dateFrom||dateTo) ? `${dateFrom||'…'} – ${dateTo||'…'}` : 'Semua Waktu';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Penjualan</h1>
          <p className="page-subtitle">
            {totalOrders} order
            {branchFilter ? ` · ${BRANCH[branchFilter]?.name}` : ''}
            {' · '}{dateLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={()=>loadOrders(page,pageSize)} className="btn-icon"><RefreshCw size={15}/></button>
          <button onClick={handleExport} className="btn-secondary gap-2 h-9 text-sm">
            <Download size={15}/> Export
          </button>
          <button onClick={()=>navigate('/erp/orders/new')} className="btn-primary gap-2">
            <Plus size={16}/> Buat Order
          </button>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Branch filter */}
        <div className="flex gap-1 bg-[var(--bg-secondary)] rounded-xl p-1 border border-[var(--border)]">
          <button onClick={()=>setBranchFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!branchFilter?'bg-[var(--bg-card)] shadow-sm text-[var(--text-primary)]':'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
            Semua
          </button>
          {Object.entries(BRANCH).map(([id,b])=>{
            const Icon=b.icon;
            return (
              <button key={id} onClick={()=>setBranchFilter(branchFilter===id?'':id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${branchFilter===id?'bg-[var(--bg-card)] shadow-sm':'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                style={branchFilter===id?{color:b.color}:{}}>
                <Icon size={12}/> {b.name}
              </button>
            );
          })}
        </div>

        {/* Date preset dropdown — click toggle + klik luar untuk tutup */}
        <div className="relative" ref={dateDdRef}>
          <button onClick={()=>setOpenDateDrop(o=>!o)}
            className={`flex items-center gap-2 h-9 px-3 rounded-xl border text-sm transition-colors ${openDateDrop?'border-[var(--brand-600)] bg-[var(--brand-600)]/5 text-[var(--brand-600)]':'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            <CalendarRange size={14}/>
            <span className="font-medium">{dateLabel}</span>
            <ChevronDown size={12} className={`transition-transform duration-150 ${openDateDrop?'rotate-180':''}`}/>
          </button>
          {openDateDrop && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl py-1 min-w-[180px]">
              {DATE_PRESETS.map(dp=>(
                <button key={dp.key} onClick={()=>{ handlePreset(dp.key); if(dp.key!=='custom') setOpenDateDrop(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-secondary)] flex items-center justify-between ${datePreset===dp.key?'text-[var(--brand-600)] font-semibold':'text-[var(--text-secondary)]'}`}>
                  {dp.label}
                  {datePreset===dp.key && <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-600)]"/>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom date range */}
        {(datePreset==='custom'||showDatePicker) && (
          <div className="flex items-center gap-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-2">
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
              className="input-base h-7 text-xs w-32"/>
            <Minus size={12} className="text-[var(--text-muted)] flex-shrink-0"/>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
              className="input-base h-7 text-xs w-32"/>
          </div>
        )}
      </div>

      {/* ── Score cards — compact 1 baris, berdasarkan filter ── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { l:'Total',      v:totalOrders,       c:'text-[var(--text-primary)]',  bg:'bg-[var(--bg-card)]' },
          { l:'Draft',      v:stats.draft,        c:'text-slate-600',              bg:'bg-slate-50 dark:bg-slate-900' },
          { l:'Konfirmasi', v:stats.confirmed,    c:'text-blue-600',               bg:'bg-blue-50 dark:bg-blue-950' },
          { l:'Dikirim',    v:stats.shipped,      c:'text-purple-600',             bg:'bg-purple-50 dark:bg-purple-950' },
          { l:'Selesai',    v:stats.completed,    c:'text-emerald-600',            bg:'bg-emerald-50 dark:bg-emerald-950' },
          { l:'Revenue',    v:toRpShort(stats.revenue), c:'text-[var(--brand-600)]', bg:'bg-[var(--brand-600)]/5' },
        ].map(({l,v,c,bg})=>(
          <div key={l} className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] ${bg} flex-shrink-0`}>
            <span className={`text-base font-black ${c}`}>{v}</span>
            <span className="text-[11px] text-[var(--text-muted)] font-medium">{l}</span>
          </div>
        ))}
        {/* Branch legend */}
        {!branchFilter && (
          <div className="flex items-center gap-3 ml-auto">
            {Object.entries(BRANCH).map(([id,b])=>{
              const Icon=b.icon;
              return (
                <div key={id} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <div className={`w-3 h-3 rounded-sm opacity-60`} style={{background:b.color}}/>
                  <Icon size={11}/> {b.name}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        searchKeys={['order_no','customer_name','customer_phone','sub_channel_name']}
        searchPlaceholder="Cari no. order, pelanggan, channel..."
        onRowClick={row=>navigate(`/erp/orders/${row.id}`)}
        rowClassName={(row)=>BRANCH[row.branch_id]?.rowClass||''}
        emptyIcon={<ShoppingCart size={40}/>}
        emptyText="Belum ada order"
        emptyAction={<button onClick={()=>navigate('/erp/orders/new')} className="btn-primary mt-3">Buat Order Pertama</button>}
        actions={row=>(
          <div className="flex items-center gap-1" onClick={e=>e.stopPropagation()}>
            {['draft','confirmed'].includes(row.status) && (
              <button onClick={async ()=>{
                  // Fetch detail order (termasuk items) sebelum buka modal
                  try {
                    const res = await erpService.getOrder(row.id);
                    setEditOrder(res.data.data.order);
                  } catch { toast.error('Gagal memuat detail order'); }
                }}
                className="btn-icon-sm text-amber-500 hover:text-amber-700" title="Edit Order">
                <Pencil size={13}/>
              </button>
            )}
            <button onClick={()=>navigate(`/erp/orders/${row.id}`)} className="btn-icon-sm" title="Lihat Detail">
              <Eye size={13}/>
            </button>
          </div>
        )}
        selectable
        bulkActions={(rows, clearSelection)=>(
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[var(--text-muted)] font-medium">{rows.length} order dipilih</span>
            {STATUS_OPTIONS.map(opt=>(
              <button key={opt.value} disabled={bulkUpdating}
                onClick={()=>handleBulkStatus(rows,clearSelection,opt.value)}
                className={`h-8 px-3 rounded-lg border text-xs font-semibold disabled:opacity-50 transition-colors ${
                  opt.value==='cancelled'?'border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30':
                  opt.value==='confirmed'?'border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30':
                  'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                {bulkUpdating?<Loader2 size={11} className="animate-spin inline mr-1"/>:null}
                {opt.label}
              </button>
            ))}
          </div>
        )}
        pageSize={pageSize}
        pageSizeOptions={[10,20,50,100]}
      />

      {/* Server-side pagination controls */}
      {totalOrders > pageSize && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>Baris per halaman:</span>
            {[10,20,50,100].map(ps=>(
              <button key={ps} onClick={()=>setPageSize(ps)}
                className={`w-8 h-7 rounded-lg border text-xs font-semibold transition-colors ${pageSize===ps?'bg-[var(--brand-600)] text-white border-[var(--brand-600)]':'border-[var(--border)] hover:bg-[var(--bg-secondary)]'}`}>
                {ps}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}
              className="btn-icon disabled:opacity-30 text-xs">‹</button>
            <span className="text-xs text-[var(--text-muted)] px-2">
              {page} / {Math.ceil(totalOrders/pageSize)}
            </span>
            <button disabled={page>=Math.ceil(totalOrders/pageSize)} onClick={()=>setPage(p=>p+1)}
              className="btn-icon disabled:opacity-30 text-xs">›</button>
          </div>
        </div>
      )}

      {/* ── Edit Order Modal ───────────────────────────────── */}
      {editOrder && (
        <EditOrderModal
          order={editOrder}
          onClose={()=>setEditOrder(null)}
          onSaved={()=>loadOrders(page,pageSize)}
        />
      )}
    </div>
  );
}
