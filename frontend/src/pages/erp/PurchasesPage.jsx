import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Plus, ChevronRight, RefreshCw,
  Loader2, X, CheckCircle2, Trash2, Search,
  Package, ChevronLeft, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRp, toRpShort, PURCHASE_STATUS } from '../../utils/erp/erpService';

// ── New PO Modal ──────────────────────────────────────────────
const NewPoModal = ({ onClose, onSuccess }) => {
  const [branch, setBranch]     = useState(1);
  const [supplier, setSupplier] = useState({ name:'', phone:'' });
  const [items, setItems]       = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [shippingCost, setShipping] = useState(0);
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);


  useEffect(() => {
    if (!prodSearch.trim()) { setProdResults([]); return; }
    const t = setTimeout(async () => {
      const res = await erpService.getProducts({ search: prodSearch, branch_id: branch, limit: 6 });
      setProdResults(res.data.data.products);
    }, 300);
    return () => clearTimeout(t);
  }, [prodSearch, branch]);

  const addProduct = (p) => {
    setItems(prev => {
      const ex = prev.find(i => i.product_id === p.id);
      if (ex) return prev.map(i => i.product_id === p.id ? {...i, qty: i.qty+1} : i);
      return [...prev, { product_id: p.id, product_name: p.name, qty: 1, buy_price: parseFloat(p.buy_price)||0 }];
    });
    setProdSearch(''); setProdResults([]);
  };

  const subtotal    = items.reduce((s,i) => s + (i.buy_price * i.qty), 0);
  const totalAmount = subtotal + parseFloat(shippingCost||0);

  const handle = async () => {
    if (!items.length) { toast.error('Tambahkan minimal 1 produk'); return; }
    setSaving(true);
    try {
      await erpService.createPurchase({
        branch_id: branch, supplier_name: supplier.name||null,
        supplier_phone: supplier.phone||null,
        order_date: new Date().toISOString().split('T')[0],
        items: items.map(i => ({ product_id: i.product_id, qty: i.qty, buy_price: i.buy_price })),
        shipping_cost: parseFloat(shippingCost||0), notes,
      });
      toast.success('PO berhasil dibuat');
      onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-lg bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Buat Purchase Order</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {/* Branch */}
          <div className="grid grid-cols-2 gap-2">
            {[{id:1,name:'GP Racing'},{id:2,name:'GP Distro'}].map(b => (
              <button key={b.id} onClick={() => { setBranch(b.id); setItems([]); }}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${branch===b.id ? 'bg-brand-500 text-white border-brand-500' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                {b.name}
              </button>
            ))}
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <label className="field-label">Supplier</label>
            <input value={supplier.name} onChange={e => setSupplier(s=>({...s,name:e.target.value}))}
              placeholder="Nama supplier" className="input-base text-sm" />
            <input value={supplier.phone} onChange={e => setSupplier(s=>({...s,phone:e.target.value}))}
              placeholder="No. HP supplier" className="input-base text-sm" />
          </div>

          {/* Products */}
          <div>
            <label className="field-label">Produk</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                placeholder="Cari produk..." className="input-base pl-9 text-sm" />
            </div>
            {prodResults.length > 0 && (
              <div className="mt-1 border border-[var(--border)] rounded-xl overflow-hidden">
                {prodResults.map(p => (
                  <button key={p.id} onClick={() => addProduct(p)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--bg-secondary)] text-left border-b border-[var(--border-subtle)] last:border-0">
                    <Package className="w-4 h-4 text-[var(--text-muted)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{p.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">HPP: {toRp(p.buy_price)} · Stok: {p.stock?.qty||0}</p>
                    </div>
                    <Plus className="w-4 h-4 text-brand-500" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.product_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="number" value={item.qty} min={1}
                        onChange={e => setItems(p => p.map((i,n) => n===idx ? {...i,qty:parseInt(e.target.value)||1} : i))}
                        className="input-base text-xs h-7 w-16 text-center" />
                      <span className="text-xs text-[var(--text-muted)]">×</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">Rp</span>
                        <input type="number" value={item.buy_price}
                          onChange={e => setItems(p => p.map((i,n) => n===idx ? {...i,buy_price:parseFloat(e.target.value)||0} : i))}
                          className="input-base pl-6 text-xs h-7 w-28" />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{toRp(item.buy_price * item.qty)}</p>
                    <button onClick={() => setItems(p => p.filter((_,n) => n!==idx))}
                      className="text-[10px] text-red-500 hover:underline">hapus</button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)]">
                <span className="text-xs text-[var(--text-secondary)]">Ongkir</span>
                <div className="relative w-32">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">Rp</span>
                  <input type="number" value={shippingCost} onChange={e => setShipping(e.target.value)}
                    className="input-base pl-7 text-xs h-8 w-full text-right" />
                </div>
              </div>
              <div className="flex justify-between font-bold p-2">
                <span className="text-sm text-[var(--text-primary)]">Total</span>
                <span className="text-base text-brand-600 dark:text-brand-400">{toRp(totalAmount)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="field-label">Catatan</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input-base text-sm resize-none" />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--border)] flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 h-11 text-sm">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1 h-11 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Buat PO
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Receive PO Modal ──────────────────────────────────────────
const ReceivePoModal = ({ po, onClose, onSuccess }) => {
  const [received, setReceived] = useState(
    po.items.map(i => ({ item_id: i.id, qty_received: i.qty_ordered - i.qty_received, product_name: i.product_name, qty_ordered: i.qty_ordered, qty_received_before: i.qty_received }))
  );
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    setSaving(true);
    try {
      await erpService.receivePurchase(po.id, { received_items: received });
      toast.success('Barang diterima — stok bertambah!');
      onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Terima Barang</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">PO: {po.po_no} — {po.supplier_name}</p>
        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto scrollbar-thin">
          {received.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.product_name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Dipesan: {item.qty_ordered} · Sudah terima: {item.qty_received_before}</p>
              </div>
              <div>
                <label className="field-label text-center">Terima</label>
                <input type="number" value={item.qty_received} min={0} max={item.qty_ordered - item.qty_received_before}
                  onChange={e => setReceived(p => p.map((r,n) => n===idx ? {...r,qty_received:parseInt(e.target.value)||0} : r))}
                  className="input-base text-sm h-9 w-20 text-center" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 h-10 text-sm">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1 h-10 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Konfirmasi Terima
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [receivePo, setReceive]   = useState(null);
  const [statusFilter, setSF]     = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpService.getPurchases({ status: statusFilter||undefined, limit:50 });
      setPurchases(res.data.data.purchases);
    } catch { toast.error('Gagal memuat PO'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Pembelian</h1>
          <p className="text-sm text-[var(--text-secondary)]">Purchase Order</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowNew(true)} className="btn-primary h-9 px-3 text-sm"><Plus className="w-4 h-4" /> Buat PO</button>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[{v:'',l:'Semua'},...Object.entries(PURCHASE_STATUS).map(([v,c])=>({v,l:c.label}))].map(f => (
          <button key={f.v} onClick={() => setSF(f.v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${statusFilter===f.v ? 'bg-brand-500 text-white border-brand-500' : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)]'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-14">
          <ShoppingBag className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada purchase order</p>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-4 px-6 text-sm">Buat PO Pertama</button>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
          {purchases.map(po => {
            const st = PURCHASE_STATUS[po.status] || PURCHASE_STATUS.draft;
            return (
              <div key={po.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${st.bg}`}>
                  <ShoppingBag className={`w-4.5 h-4.5 ${st.color}`} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{po.po_no}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${st.bg} ${st.color}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{po.supplier_name || 'Tanpa supplier'} · {po.order_date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{toRpShort(po.total_amount)}</p>
                  {['draft','ordered','partial'].includes(po.status) && (
                    <button onClick={async () => {
                      const res = await erpService.getPurchase(po.id);
                      setReceive(res.data.data.purchase);
                    }} className="text-[10px] text-brand-500 hover:underline font-semibold">Terima Barang</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && <NewPoModal onClose={() => setShowNew(false)} onSuccess={fetch} />}
      {receivePo && <ReceivePoModal po={receivePo} onClose={() => setReceive(null)} onSuccess={fetch} />}
    </div>
  );
}
