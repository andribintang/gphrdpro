import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Package, Truck, Check, X, ChevronDown, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStoreOrders, updateStoreOrderStatus } from '../../utils/storeService';

const BRAND_LABEL = { gpdistro: 'GPDISTRO', gpracing: 'GP RACING' };

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'pending',    label: 'Pending Bayar' },
  { value: 'paid',       label: 'Dibayar' },
  { value: 'processing', label: 'Diproses' },
  { value: 'shipped',    label: 'Dikirim' },
  { value: 'delivered',  label: 'Diterima' },
  { value: 'cancelled',  label: 'Dibatalkan' },
];

const STATUS_COLORS = {
  pending:    'bg-yellow-100 text-yellow-700',
  paid:       'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
  refunded:   'bg-gray-100 text-gray-600',
};

const fmt = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

// ── Order Detail Modal ────────────────────────────────────────
function OrderDetailModal({ order, onClose, onUpdated }) {
  const [status,   setStatus]   = useState(order.status);
  const [tracking, setTracking] = useState(order.tracking_number || '');
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateStoreOrderStatus(order.id, { status, tracking_number: tracking || undefined });
      toast.success('Status order diupdate');
      onUpdated();
    } catch { toast.error('Gagal update'); }
    finally { setSaving(false); }
  };

  const NEXT_STATUSES = {
    pending: ['paid', 'cancelled'],
    paid:    ['processing', 'cancelled'],
    processing: ['shipped'],
    shipped: ['delivered'],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[var(--bg-card)] w-full max-w-xl my-8 border border-[var(--border)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="font-semibold">Detail Order</h2>
            <p className="text-sm text-[var(--text-muted)] font-mono">{order.order_number}</p>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Customer */}
          <div className="bg-[var(--bg)] p-4 rounded">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Pemesan</p>
            <p className="font-semibold">{order.customer_name}</p>
            <p className="text-sm text-[var(--text-muted)]">{order.customer_phone} · {order.customer_email}</p>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Produk</p>
            <div className="space-y-2">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm border border-[var(--border)] p-3">
                  <div className="flex items-center gap-3">
                    {item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 object-cover" />}
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      {item.variant && Object.keys(item.variant).length > 0 && (
                        <p className="text-xs text-[var(--text-muted)]">{Object.entries(item.variant).map(([k,v]) => `${k}: ${v}`).join(' · ')}</p>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold whitespace-nowrap">{item.quantity}× {fmt(item.price)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-[var(--bg)] p-4 rounded">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Pengiriman</p>
            <p className="text-sm">{order.shipping_address}</p>
            <p className="text-sm text-[var(--text-muted)]">{order.shipping_city}, {order.shipping_province}</p>
            <p className="text-sm font-semibold mt-2 uppercase">{order.shipping_courier} {order.shipping_service}</p>
            {order.tracking_number && (
              <p className="text-sm font-mono text-[var(--brand-600)] mt-1">Resi: {order.tracking_number}</p>
            )}
          </div>

          {/* Totals */}
          <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
            {[
              { label: 'Subtotal', value: fmt(order.subtotal) },
              { label: `Ongkir (${order.shipping_courier} ${order.shipping_service})`, value: fmt(order.shipping_cost) },
              order.discount > 0 ? { label: `Diskon ${order.voucher_code || ''}`, value: `− ${fmt(order.discount)}`, green: true } : null,
              { label: 'TOTAL', value: fmt(order.total), bold: true },
            ].filter(Boolean).map(row => (
              <div key={row.label} className={`flex justify-between px-4 py-2.5 text-sm ${row.bold ? 'font-bold' : ''} ${row.green ? 'text-green-600' : ''}`}>
                <span className={row.bold ? '' : 'text-[var(--text-muted)]'}>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Update status */}
          {NEXT_STATUSES[order.status] && (
            <div className="border-t border-[var(--border)] pt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Update Status</p>
              <div className="relative">
                <select value={status} onChange={e => setStatus(e.target.value)} className="input appearance-none pr-8">
                  <option value={order.status}>{STATUS_OPTIONS.find(s => s.value === order.status)?.label || order.status} (sekarang)</option>
                  {NEXT_STATUSES[order.status]?.map(s => (
                    <option key={s} value={s}>{STATUS_OPTIONS.find(o => o.value === s)?.label || s}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
              </div>
              {(status === 'shipped' || order.status === 'shipped') && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">No. Resi</label>
                  <input value={tracking} onChange={e => setTracking(e.target.value)}
                    className="input" placeholder="JNE123456789" />
                </div>
              )}
              <button onClick={handleSave} disabled={saving}
                className="btn-primary w-full py-3 gap-2 disabled:opacity-60">
                <Check size={16} /> {saving ? 'Menyimpan...' : 'Update Status'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Orders Page ──────────────────────────────────────────
export default function StoreOrdersPage() {
  const { brand } = useParams();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [detail,  setDetail]  = useState(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getStoreOrders({ brand, search, status, page, limit: LIMIT });
      setOrders(r.data.data.orders);
      setTotal(r.data.data.total);
    } catch { } finally { setLoading(false); }
  }, [brand, search, status, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="w-full animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Order — {BRAND_LABEL[brand] || brand}</h1>
          <p className="body-sm text-[var(--text-muted)]">{total} order total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="No. order, nama, email..." className="input pl-9" />
        </div>
        <div className="relative">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="input w-48 appearance-none pr-8">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                {['No. Order','Pemesan','Produk','Total','Status Bayar','Status','Aksi'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-[var(--bg)] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)]">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Belum ada order masuk</p>
                  </td>
                </tr>
              ) : orders.map(o => (
                <tr key={o.id} className="hover:bg-[var(--bg)] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--brand-600)]">{o.order_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{o.customer_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{o.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {o.items?.[0]?.product_name?.slice(0, 30)}{o.items?.length > 1 ? ` +${o.items.length - 1}` : ''}
                  </td>
                  <td className="px-4 py-3 font-bold">{fmt(o.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {o.payment_status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_OPTIONS.find(s => s.value === o.status)?.label || o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDetail(o)} className="btn-icon" title="Detail">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > LIMIT && (
          <div className="border-t border-[var(--border)] px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">{(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} dari {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-outline py-1.5 px-3 text-xs disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(p => p+1)} disabled={page*LIMIT>=total} className="btn-outline py-1.5 px-3 text-xs disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <OrderDetailModal
          order={detail}
          onClose={() => setDetail(null)}
          onUpdated={() => { setDetail(null); load(); }}
        />
      )}
    </div>
  );
}
