import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, CheckCircle2, X, Truck, CreditCard,
  Package, User, MapPin, Phone, Loader2, Edit3,
  AlertTriangle, RefreshCw, Copy, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  erpService, toRp, toRpShort,
  ORDER_STATUS, CHANNELS, PAYMENT_METHODS, COURIERS
} from '../../utils/erp/erpService';

// ── Payment Modal ─────────────────────────────────────────────
const PaymentModal = ({ orderId, totalAmount, onClose, onSuccess }) => {
  const [method, setMethod] = useState('transfer');
  const [bankName, setBankName] = useState('');
  const [refNo, setRefNo]   = useState('');
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    setSaving(true);
    try {
      await erpService.addPayment(orderId, {
        method, bank_name: bankName || null, ref_no: refNo || null,
        amount: totalAmount, status: 'pending',
      });
      toast.success('Pembayaran ditambahkan');
      onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Tambah Pembayaran</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PAYMENT_METHODS).map(([k,v]) => (
              <button key={k} onClick={() => setMethod(k)}
                className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${method===k ? 'bg-brand-500 text-white border-brand-500' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
          {method === 'transfer' && (
            <div>
              <label className="field-label">Bank</label>
              <select value={bankName} onChange={e => setBankName(e.target.value)} className="input-base text-sm">
                <option value="">Pilih bank</option>
                {['BCA','BRI','Mandiri','BNI','BSI','BTN','CIMB Niaga'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="field-label">No. Referensi / Bukti Transfer</label>
            <input value={refNo} onChange={e => setRefNo(e.target.value)}
              placeholder="No. rekening / kode transaksi"
              className="input-base text-sm" />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-[var(--border)]">
            <span className="text-sm text-[var(--text-secondary)]">Jumlah</span>
            <span className="text-base font-black text-[var(--text-primary)]">{toRp(totalAmount)}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1 h-10 text-sm">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1 h-10 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Shipment Modal ────────────────────────────────────────────
const ShipmentModal = ({ orderId, items, onClose, onSuccess }) => {
  const [form, setForm] = useState({ courier:'JNE', service:'REG', tracking_no:'', weight:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => setForm(f => ({...f,[k]:v}));

  const totalWeight = items.reduce((s, i) => s + ((i.product?.weight||100) * i.qty), 0);

  const handle = async () => {
    if (!form.tracking_no.trim()) { toast.error('Nomor resi wajib diisi'); return; }
    setSaving(true);
    try {
      await erpService.addShipment(orderId, {
        ...form, weight: parseFloat(form.weight || totalWeight/1000),
        shipped_at: new Date().toISOString(), status: 'shipped',
      });
      toast.success(`Resi ${form.tracking_no} ditambahkan`);
      onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Input Resi Pengiriman</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Ekspedisi</label>
              <select value={form.courier} onChange={e => sf('courier', e.target.value)} className="input-base text-sm">
                {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Layanan</label>
              <select value={form.service} onChange={e => sf('service', e.target.value)} className="input-base text-sm">
                {['REG','YES','OKE','EXPRESS','CARGO','SAME DAY'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Nomor Resi <span className="text-red-500">*</span></label>
            <input value={form.tracking_no} onChange={e => sf('tracking_no', e.target.value.toUpperCase())}
              placeholder="JD0001234567890"
              className="input-base text-sm font-mono" autoFocus />
          </div>
          <div>
            <label className="field-label">Berat (kg)</label>
            <input type="number" step="0.1" value={form.weight}
              onChange={e => sf('weight', e.target.value)}
              placeholder={`${(totalWeight/1000).toFixed(2)} (estimasi)`}
              className="input-base text-sm" />
          </div>
          <div>
            <label className="field-label">Catatan</label>
            <input value={form.notes} onChange={e => sf('notes', e.target.value)}
              placeholder="Catatan pengiriman" className="input-base text-sm" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1 h-10 text-sm">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1 h-10 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
            Simpan Resi
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// ORDER DETAIL PAGE
// ════════════════════════════════════════════════════════════════
export default function OrderDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [order, setOrder]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(false);
  const [showPayment, setShowPay]  = useState(false);
  const [showShipment, setShowShip]= useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await erpService.getOrder(id);
      setOrder(res.data.data.order);
    } catch { toast.error('Gagal memuat order'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [id]);

  const doAction = async (action, label) => {
    if (!confirm(`${label}?`)) return;
    setActing(true);
    try {
      if (action === 'confirm')  await erpService.confirmOrder(id);
      if (action === 'complete') await erpService.completeOrder(id);
      if (action === 'cancel')   await erpService.cancelOrder(id);
      toast.success(`Order ${label}`);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setActing(false); }
  };

  const verifyPay = async (payId) => {
    setActing(true);
    try {
      await erpService.verifyPayment(id, payId);
      toast.success('Pembayaran diverifikasi');
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setActing(false); }
  };

  const copyResi = (resi) => {
    navigator.clipboard.writeText(resi);
    toast.success('Nomor resi disalin');
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
    </div>
  );
  if (!order) return null;

  const st  = ORDER_STATUS[order.status] || ORDER_STATUS.draft;
  const ch  = CHANNELS[order.channel]   || CHANNELS.direct;
  const profit = order.items?.reduce((s,i) => s + parseFloat(i.profit||0), 0) || 0;

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/erp/orders')}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold text-[var(--text-primary)]">{order.order_no}</h1>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${st.bg} ${st.color}`}>{st.label}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${ch.bg} ${ch.color}`}>{ch.label}</span>
            {order.is_synced_incentive && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                ✓ Insentif
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)]">{order.order_date}</p>
        </div>
        <button onClick={fetch} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop 2-col */}
      <div className="lg:grid lg:grid-cols-5 lg:gap-5 space-y-4 lg:space-y-0">

        {/* LEFT — main info */}
        <div className="lg:col-span-3 space-y-4">

          {/* Order items */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text-primary)]">Produk ({order.items?.length})</p>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {order.items?.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.product_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {item.qty} × {toRp(item.sell_price)}
                      {item.discount_pct > 0 && ` (disc ${item.discount_pct}%)`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{toRp(item.subtotal)}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">+{toRp(item.profit)}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Totals */}
            <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)] space-y-1.5">
              {[
                { l:'Subtotal', v: order.subtotal },
                ...(parseFloat(order.discount_amount) > 0 ? [{ l:'Diskon', v: -order.discount_amount, c:'text-red-500' }] : []),
                ...(parseFloat(order.shipping_cost) > 0   ? [{ l:'Ongkir', v: order.shipping_cost }]   : []),
              ].map((row,i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">{row.l}</span>
                  <span className={`font-semibold ${row.c||'text-[var(--text-primary)]'}`}>{toRp(Math.abs(row.v))}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold border-t border-[var(--border)] pt-1.5">
                <span className="text-sm text-[var(--text-primary)]">Total</span>
                <span className="text-base text-brand-600 dark:text-brand-400">{toRp(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Estimasi Profit</span>
                <span className={`font-semibold ${profit>=0?'text-emerald-600':'text-red-500'}`}>{toRp(profit)}</span>
              </div>
            </div>
          </div>

          {/* Shipment */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center justify-between">
              <p className="text-xs font-bold text-[var(--text-primary)]">Pengiriman</p>
              {!order.shipment && ['confirmed','processing'].includes(order.status) && (
                <button onClick={() => setShowShip(true)}
                  className="text-xs text-brand-500 font-semibold hover:underline flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Input Resi
                </button>
              )}
            </div>
            {order.shipment ? (
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {order.shipment.courier} — {order.shipment.service}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">
                        {order.shipment.tracking_no}
                      </p>
                      <button onClick={() => copyResi(order.shipment.tracking_no)}
                        className="w-6 h-6 rounded hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    order.shipment.status==='delivered' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' :
                    order.shipment.status==='shipped'   ? 'bg-purple-100 dark:bg-purple-950 text-purple-600' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {order.shipment.status}
                  </span>
                </div>
                {order.shipment.status === 'shipped' && (
                  <button
                    onClick={async () => {
                      await erpService.updateShipment(id, order.shipment.id, { status:'delivered', delivered_at: new Date().toISOString() });
                      toast.success('Status: Terkirim'); fetch();
                    }}
                    className="w-full py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white">
                    Tandai Terkirim
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 text-center">
                <Truck className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
                <p className="text-xs text-[var(--text-muted)]">Belum ada resi pengiriman</p>
              </div>
            )}
          </div>

          {/* Payments */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center justify-between">
              <p className="text-xs font-bold text-[var(--text-primary)]">Pembayaran</p>
              {order.status !== 'cancelled' && (
                <button onClick={() => setShowPay(true)} className="text-xs text-brand-500 font-semibold hover:underline flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Tambah
                </button>
              )}
            </div>
            {order.payments?.length === 0 ? (
              <div className="p-4 text-center">
                <CreditCard className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
                <p className="text-xs text-[var(--text-muted)]">Belum ada pembayaran</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {order.payments?.map(pay => (
                  <div key={pay.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {PAYMENT_METHODS[pay.method]?.icon} {PAYMENT_METHODS[pay.method]?.label}
                        {pay.bank_name && ` — ${pay.bank_name}`}
                      </p>
                      {pay.ref_no && <p className="text-xs font-mono text-[var(--text-muted)]">{pay.ref_no}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{toRp(pay.amount)}</p>
                      {pay.status === 'pending' ? (
                        <button onClick={() => verifyPay(pay.id)} disabled={acting}
                          className="text-[10px] text-amber-600 hover:underline font-semibold">Verifikasi</button>
                      ) : (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ Verified</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — sidebar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Actions */}
          <div className="card p-4 space-y-2">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Aksi</p>
            {order.status === 'draft' && (
              <button onClick={() => doAction('confirm','Dikonfirmasi')} disabled={acting}
                className="btn-primary w-full h-10 text-sm">
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Konfirmasi Order
              </button>
            )}
            {['confirmed','processing','shipped'].includes(order.status) && (
              <button onClick={() => doAction('complete','Diselesaikan')} disabled={acting}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all">
                <CheckCircle2 className="w-4 h-4" /> Selesaikan Order
              </button>
            )}
            {!['completed','cancelled'].includes(order.status) && (
              <button onClick={() => doAction('cancel','Dibatalkan')} disabled={acting}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-all">
                <X className="w-4 h-4" /> Batalkan Order
              </button>
            )}
          </div>

          {/* Customer info */}
          <div className="card p-4">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Pelanggan</p>
            {order.customer_name ? (
              <div className="space-y-2">
                {[
                  { icon: User,    v: order.customer_name },
                  { icon: Phone,   v: order.customer_phone },
                  { icon: MapPin,  v: order.customer_address },
                ].filter(r => r.v).map((r, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <r.icon className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[var(--text-primary)]">{r.v}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Tanpa pelanggan</p>
            )}
          </div>

          {/* Order info */}
          <div className="card p-4 space-y-2">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Info Order</p>
            {[
              { l:'No. Order',    v: order.order_no },
              { l:'Tanggal',      v: order.order_date },
              { l:'Channel',      v: ch.label + (order.marketplace_name ? ` (${order.marketplace_name})` : '') },
              { l:'Cabang',       v: order.branch_id === 1 ? 'GP Racing' : 'GP Distro' },
              { l:'Dibuat oleh',  v: order.created_by || '—' },
            ].map((r,i) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <span className="text-xs text-[var(--text-muted)] flex-shrink-0">{r.l}</span>
                <span className="text-xs font-semibold text-[var(--text-primary)] text-right">{r.v}</span>
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="card p-4">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Catatan</p>
              <p className="text-sm text-[var(--text-primary)]">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {showPayment && <PaymentModal orderId={id} totalAmount={order.total_amount} onClose={() => setShowPay(false)} onSuccess={fetch} />}
      {showShipment && <ShipmentModal orderId={id} items={order.items||[]} onClose={() => setShowShip(false)} onSuccess={fetch} />}
    </div>
  );
}
