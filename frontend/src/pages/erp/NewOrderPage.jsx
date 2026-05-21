// v2.1 — sub channel selector fix
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Search, Plus, Minus, Trash2,
  User, ChevronLeft, CheckCircle2, Loader2,
  Package, X, Barcode
} from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRp, toRpShort, CHANNELS, PAYMENT_METHODS } from '../../utils/erp/erpService';
import { useAuth } from '../../context/AuthContext';

export default function NewOrderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [branch, setBranch]       = useState(1);
  const [channel, setChannel]     = useState('direct');
  const [mpName, setMpName]       = useState('');
  const [customer, setCustomer]   = useState(null);
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [items, setItems]         = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [discount, setDiscount]   = useState(0);
  const [shippingCost, setShipping] = useState(0);
  const [adminFee, setAdminFee]       = useState(0);
  const [subChannels, setSubChannels] = useState([]);
  const [subChannelId, setSubChId]    = useState('');
  const [subChannelName, setSubChName]= useState('');
  const [employees, setEmployees]     = useState([]);
  const [payMethod, setPay]       = useState('cash');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [showCustForm, setShowCustForm] = useState(false);
  const [newCust, setNewCust]     = useState({ name:'', phone:'', city:'' });
  const searchTimeout = useRef(null); // single ref for both product and customer search

  const BRANCHES = [{ id:1, name:'GP Racing', type:'Spare Part' },{ id:2, name:'GP Distro', type:'Fashion' }];
  const MP_LIST  = ['Shopee','TikTok Shop','Tokopedia','Lazada','Bukalapak'];

  // ── Search products ───────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    if (!prodSearch.trim()) { setProdResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await erpService.getProducts({ search: prodSearch, branch_id: branch, limit: 8 });
        setProdResults(res.data.data.products);
      } catch {}
    }, 300);
  }, [prodSearch, branch]);

  // ── Search customers ──────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    if (!custSearch.trim()) { setCustResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await erpService.getCustomers({ search: custSearch, limit: 6 });
        setCustResults(res.data.data.customers);
      } catch {}
    }, 300);
  }, [custSearch]);

  // ── Load employees for WA channel ────────────────────────
  useEffect(() => {
    erpService.getEmployees()
      .then(r => setEmployees(r.data.data.employees || []))
      .catch(() => {});
  }, []);

  // ── Load sub channels ─────────────────────────────────────
  useEffect(() => {
    if (channel === 'wa') {
      setSubChannels([]);
      return;
    }
    setSubChId('');
    setSubChName('');
    erpService.getSubChannels({ channel })
      .then(r => {
        const list = r.data?.data?.sub_channels || [];
        setSubChannels(list);
      })
      .catch(e => console.error('Sub channel fetch error:', e));
  }, [channel]);

  // ── Barcode scan ──────────────────────────────────────────
  const handleBarcode = async (code) => {
    if (!code.trim()) return;
    try {
      const res = await erpService.getByBarcode(code.trim());
      addProduct(res.data.data.product);
      setProdSearch('');
    } catch { toast.error('Produk tidak ditemukan'); }
  };

  // ── Add/update item ───────────────────────────────────────
  const addProduct = (product) => {
    const price = channel === 'marketplace' && product.sell_price_mp ? product.sell_price_mp
                : channel === 'wa'          && product.sell_price_wa ? product.sell_price_wa
                : product.sell_price;
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product_id: product.id, product_name: product.name, sku: product.sku, unit: product.unit, buy_price: product.buy_price, sell_price: parseFloat(price), qty: 1, discount_pct: 0, stock: product.stock?.qty || 0 }];
    });
    setProdSearch(''); setProdResults([]);
    toast.success(`${product.name} ditambahkan`);
  };

  const updateQty  = (idx, v) => setItems(p => p.map((i,n) => n===idx ? { ...i, qty: Math.max(1, v) } : i));
  const updatePrice= (idx, v) => setItems(p => p.map((i,n) => n===idx ? { ...i, sell_price: parseFloat(v)||0 } : i));
  const removeItem = (idx)    => setItems(p => p.filter((_,n) => n!==idx));

  // ── Calculations ──────────────────────────────────────────
  const subtotal    = items.reduce((s, i) => s + (i.sell_price * i.qty * (1 - i.discount_pct/100)), 0);
  const adminFeeAmt = channel === 'marketplace' ? parseFloat(adminFee||0) : 0;
  const totalAmount = subtotal - parseFloat(discount||0) + parseFloat(shippingCost||0) + adminFeeAmt;
  const totalProfit = items.reduce((s,i) => s + ((i.sell_price - i.buy_price) * i.qty), 0) - parseFloat(discount||0) - adminFeeAmt;

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (autoConfirm = false) => {
    if (items.length === 0) { toast.error('Tambahkan minimal 1 produk'); return; }
    setSaving(true);
    try {
      const res = await erpService.createOrder({
        branch_id:       branch,
        channel,
        marketplace_name: channel === 'marketplace' ? mpName : undefined,
        customer_id:      customer?.id || null,
        customer_name:    customer?.name || custSearch || null,
        customer_phone:   customer?.phone || null,
        customer_city:    customer?.city  || null,
        items:            items.map(i => ({ product_id: i.product_id, qty: i.qty, sell_price: i.sell_price, discount_pct: i.discount_pct })),
        discount_amount:  parseFloat(discount||0),
        shipping_cost:    parseFloat(shippingCost||0),
        admin_fee:        channel === 'marketplace' ? parseFloat(adminFee||0) : 0,
        sub_channel_id:   subChannelId ? parseInt(subChannelId) : null,
        sub_channel_name: subChannelName || null,
        payment_method:   payMethod,
        notes,
        order_date:       new Date().toISOString().split('T')[0],
      });
      const orderId = res.data.data.order.id;

      if (autoConfirm) {
        await erpService.confirmOrder(orderId);
        toast.success('Order dikonfirmasi & stok berkurang!');
      } else {
        toast.success(`Order ${res.data.data.order.order_no} dibuat!`);
      }
      navigate(`/erp/orders/${orderId}`);
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal membuat order'); }
    finally { setSaving(false); }
  };

  const handleNewCustomer = async () => {
    if (!newCust.name.trim()) { toast.error('Nama pelanggan wajib'); return; }
    try {
      const res = await erpService.createCustomer({ ...newCust, branch_id: branch });
      setCustomer(res.data.data.customer);
      setShowCustForm(false);
      toast.success(`Pelanggan ${newCust.name} ditambahkan`);
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  return (
    <div className="section animate-fade-in">
      {/* ERP Breadcrumb */}
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>ERP</span><span>›</span>
        <span>Penjualan</span><span>›</span>
        <span className="font-semibold text-[var(--text-primary)]">Buat Order</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/erp/orders')}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-bold text-[var(--text-primary)]">Buat Order Baru</h1>
          <p className="text-xs text-[var(--text-muted)]">GPDISTRO Racing ID</p>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-5 lg:gap-5 space-y-4 lg:space-y-0">
        {/* LEFT — order details */}
        <div className="lg:col-span-3 space-y-4">
          {/* Branch + Channel */}
          <div className="card-sm space-y-3">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Cabang & Channel</p>
            <div className="grid grid-cols-2 gap-2">
              {BRANCHES.map(b => (
                <button key={b.id} onClick={() => { setBranch(b.id); setItems([]); }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${branch===b.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-950' : 'border-[var(--border)] hover:bg-[var(--bg-secondary)]'}`}>
                  <p className={`text-sm font-bold ${branch===b.id ? 'text-brand-600 dark:text-brand-400' : 'text-[var(--text-primary)]'}`}>{b.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{b.type}</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CHANNELS).map(([k,v]) => (
                <button key={k} onClick={() => setChannel(k)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${channel===k ? `${v.bg} ${v.color} border-current` : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                  {v.label}
                </button>
              ))}
            </div>
            {/* Sub channel / Sales selector */}
            {channel === 'wa' ? (
              <div>
                <label className="field-label">Sales / Karyawan WA</label>
                <select value={subChannelId}
                  onChange={e => {
                    setSubChId(e.target.value);
                    const emp = employees.find(em => em.id == e.target.value);
                    setSubChName(emp?.name || '');
                  }}
                  className="input-base text-sm">
                  <option value="">Pilih karyawan...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.branch?.name || emp.branch_name || ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="field-label">
                  {channel === 'marketplace' ? 'Toko Marketplace' : 'Metode Langsung'}
                </label>
                <select value={subChannelId}
                  onChange={e => {
                    setSubChId(e.target.value);
                    const sc = subChannels.find(s => s.id == e.target.value);
                    setSubChName(sc?.name || '');
                  }}
                  className="input-base text-sm">
                  <option value="">Pilih...</option>
                  {subChannels.map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
                {subChannels.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠ Belum ada sub channel. Tambah di Master Data ERP.</p>
                )}
              </div>
            )}
          </div>

          {/* Customer */}
          <div className="card-sm space-y-3">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Pelanggan</p>
            {customer ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-950 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{customer.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{customer.phone} · {customer.city}</p>
                </div>
                <button onClick={() => setCustomer(null)} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input value={custSearch} onChange={e => setCustSearch(e.target.value)}
                    placeholder="Cari nama / no. HP pelanggan..."
                    className="input-base pl-9 text-sm" />
                </div>
                {custResults.length > 0 && (
                  <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                    {custResults.map(c => (
                      <button key={c.id} onClick={() => { setCustomer(c); setCustSearch(''); setCustResults([]); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--bg-secondary)] text-left border-b border-[var(--border-subtle)] last:border-0">
                        <div>
                          <p className="text-xs font-semibold text-[var(--text-primary)]">{c.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{c.phone} · {c.city}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setShowCustForm(v => !v)}
                  className="text-xs text-brand-500 hover:underline font-semibold">
                  + Tambah pelanggan baru
                </button>
                {showCustForm && (
                  <div className="rounded-xl border border-[var(--border)] p-3 space-y-2 bg-[var(--bg-secondary)]">
                    {[{key:'name',ph:'Nama pelanggan *'},{key:'phone',ph:'No. HP'},{key:'city',ph:'Kota'}].map(f => (
                      <input key={f.key} value={newCust[f.key]} onChange={e => setNewCust(p => ({...p,[f.key]:e.target.value}))}
                        placeholder={f.ph} className="input-base text-sm block w-full" />
                    ))}
                    <button onClick={handleNewCustomer} className="btn-primary w-full h-9 text-sm">Simpan Pelanggan</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Products */}
          <div className="card-sm space-y-3">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Produk</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                placeholder="Cari produk / scan barcode..."
                onKeyDown={e => e.key === 'Enter' && prodSearch.length > 5 && handleBarcode(prodSearch)}
                className="input-base pl-9 pr-10 text-sm" />
              <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            </div>

            {prodResults.length > 0 && (
              <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                {prodResults.map(p => (
                  <button key={p.id} onClick={() => addProduct(p)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-secondary)] text-left border-b border-[var(--border-subtle)] last:border-0">
                    <Package className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{p.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Stok: {p.stock?.qty||0} · {toRp(p.sell_price)}</p>
                    </div>
                    <Plus className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Cart items */}
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.product_name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <button onClick={() => updateQty(idx, item.qty-1)}
                          className="w-6 h-6 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </button>
                        <input type="number" value={item.qty} min={1}
                          onChange={e => updateQty(idx, parseInt(e.target.value)||1)}
                          className="w-14 text-center input-base text-sm h-7 px-1" />
                        <button onClick={() => updateQty(idx, item.qty+1)}
                          className="w-6 h-6 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </button>
                        <span className="text-xs text-[var(--text-muted)]">{item.unit}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">Rp</span>
                        <input type="number" value={item.sell_price}
                          onChange={e => updatePrice(idx, e.target.value)}
                          className="input-base pl-7 text-xs h-7 w-28 text-right" />
                      </div>
                      <p className="text-xs font-bold text-brand-600 dark:text-brand-400 mt-1">
                        {toRp(item.sell_price * item.qty)}
                      </p>
                    </div>
                    <button onClick={() => removeItem(idx)}
                      className="w-6 h-6 rounded-lg hover:bg-red-100 dark:hover:bg-red-950 flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary */}
          <div className="card-sm space-y-3">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Ringkasan</p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Subtotal ({items.length} produk)</span>
                <span className="font-semibold">{toRp(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Diskon</span>
                <div className="relative w-28">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">Rp</span>
                  <input type="number" value={discount} onChange={e => setDiscount(e.target.value)}
                    className="input-base pl-7 text-xs h-7 w-full text-right" />
                </div>
              </div>
              {channel === 'marketplace' && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[var(--text-secondary)]">Biaya Admin</span>
                    <p className="text-[10px] text-[var(--text-muted)]">Fee marketplace</p>
                  </div>
                  <div className="relative w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">Rp</span>
                    <input type="number" value={adminFee} onChange={e => setAdminFee(e.target.value)}
                      placeholder="0" className="input-base pl-7 text-xs h-7 w-full text-right" />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Ongkir</span>
                <div className="relative w-28">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">Rp</span>
                  <input type="number" value={shippingCost} onChange={e => setShipping(e.target.value)}
                    className="input-base pl-7 text-xs h-7 w-full text-right" />
                </div>
              </div>
              <div className="border-t border-[var(--border)] pt-2 flex justify-between font-bold">
                <span className="text-[var(--text-primary)]">Total</span>
                <span className="text-brand-600 dark:text-brand-400 text-base">{toRp(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Estimasi Profit</span>
                <span className={`font-semibold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{toRp(totalProfit)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="card-sm space-y-3">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Pembayaran</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PAYMENT_METHODS).map(([k,v]) => (
                <button key={k} onClick={() => setPay(k)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${payMethod===k ? 'bg-brand-500 text-white border-brand-500' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="card-sm">
            <label className="field-label">Catatan Order</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Catatan tambahan..."
              className="input-base text-sm resize-none" />
          </div>

          {/* Submit buttons */}
          <div className="space-y-2">
            <button onClick={() => handleSubmit(true)} disabled={saving || !items.length}
              className="btn-primary w-full h-12 text-sm font-bold disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Konfirmasi Order & Kurangi Stok
            </button>
            <button onClick={() => handleSubmit(false)} disabled={saving || !items.length}
              className="btn-secondary w-full h-10 text-sm disabled:opacity-50">
              Simpan sebagai Draft
            </button>
          </div>

          {items.length > 0 && (
            <p className="text-[10px] text-[var(--text-muted)] text-center">
              {channel !== 'direct' ? '✓ Order akan otomatis sync ke sistem insentif' : 'Channel direct tidak sync ke insentif'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
