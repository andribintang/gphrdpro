import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Search, Plus, Minus, Trash2,
  User, ChevronLeft, CheckCircle2, Loader2,
  Package, X, Barcode, Cake, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRp, toRpShort, CHANNELS, PAYMENT_METHODS } from '../../utils/erp/erpService';
import WilayahPicker from '../../components/WilayahPicker';

// ── Constants for AddCustomerModal ────────────────────────────
const PREDEFINED_TAGS = ['VIP', 'Reseller', 'Dropshipper', 'Member', 'Bermasalah'];
const SOURCES = [
  { key: 'wa',           label: 'WhatsApp',    icon: '💬' },
  { key: 'instagram',    label: 'Instagram',   icon: '📷' },
  { key: 'marketplace',  label: 'Marketplace', icon: '🛒' },
  { key: 'walkin',       label: 'Walk-in',     icon: '🚶' },
  { key: 'referral',     label: 'Referral',    icon: '🤝' },
  { key: 'other',        label: 'Lainnya',     icon: '❔' },
];

// ── Tag chip input ────────────────────────────────────────────
const TagInput = ({ value = [], onChange }) => {
  const [custom, setCustom] = useState('');
  const tags = Array.isArray(value) ? value : [];
  const toggle = (t) => onChange(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t]);
  const addCustom = () => {
    const v = custom.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setCustom('');
  };
  return (
    <div>
      <label className="field-label">Label / Tag</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {PREDEFINED_TAGS.map(t => (
          <button key={t} type="button" onClick={() => toggle(t)}
            className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition ${
              tags.includes(t)
                ? 'bg-[var(--brand-600)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg)] border border-[var(--border)]'
            }`}>{t}</button>
        ))}
      </div>
      {tags.filter(t => !PREDEFINED_TAGS.includes(t)).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.filter(t => !PREDEFINED_TAGS.includes(t)).map(t => (
            <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
              {t}
              <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-purple-900">
                <X size={10}/>
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Tambah tag custom..." className="input-base text-xs flex-1 h-8"/>
        <button type="button" onClick={addCustom} className="btn-secondary h-8 text-xs px-3">+ Tambah</button>
      </div>
    </div>
  );
};

// ── Add Customer Modal (sinkron dengan CustomersPage) ─────────
const AddCustomerModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({
    name:'', phone:'', email:'', source:'', birthday:'',
    tags: [], address:'', province:'', province_code:'',
    city:'', city_code:'', district:'', district_code:'',
    village:'', village_code:'', postal_code:'', notes:'',
  });
  const [saving, setSaving]    = useState(false);
  const [duplicates, setDupes] = useState([]);
  const [activeTab, setTab]    = useState('info');
  const debounceRef = useRef(null);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Duplicate detection — debounced
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!form.phone && (!form.name || form.name.trim().length < 3)) {
      setDupes([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const params = {};
        if (form.phone) params.phone = form.phone;
        if (form.name?.trim().length >= 3) params.name = form.name.trim();
        const res = await erpService.checkDuplicate(params);
        setDupes(res.data?.data?.matches || []);
      } catch { setDupes([]); }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [form.name, form.phone]);

  const handle = async () => {
    if (!form.name.trim()) { toast.error('Nama wajib diisi'); return; }
    setSaving(true);
    try {
      const res = await erpService.createCustomer(form);
      toast.success('Pelanggan ditambahkan');
      onAdd(res.data.data.customer);
      onClose();
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === 'DUPLICATE_PHONE') {
        toast.error(e.response.data.message);
      } else {
        toast.error(e.response?.data?.message || 'Gagal menambah pelanggan');
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-sm font-bold">Tambah Pelanggan Baru</h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>

        {/* Tabs */}
        <div className="px-5 border-b border-[var(--border)] flex gap-1">
          {[{ k: 'info', l: 'Info Dasar' }, { k: 'address', l: 'Alamat' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
                activeTab === t.k
                  ? 'border-[var(--brand-600)] text-[var(--brand-600)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}>
              {t.l}
            </button>
          ))}
        </div>

        <div className="modal-body space-y-4">
          {activeTab === 'info' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Nama Lengkap *</label>
                  <input value={form.name} onChange={e => sf('name', e.target.value)} className="input-base" autoFocus/>
                </div>
                <div>
                  <label className="field-label">No. HP / WhatsApp</label>
                  <input type="tel" value={form.phone} onChange={e => sf('phone', e.target.value)} className="input-base" placeholder="08xxxxxxxxxx"/>
                </div>
              </div>

              {/* Duplicate detection */}
              {duplicates.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                    <AlertTriangle size={12}/> Sepertinya pelanggan ini sudah terdaftar:
                  </p>
                  <div className="space-y-1">
                    {duplicates.slice(0, 3).map(d => (
                      <div key={d.id} className="text-[11px] text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
                        <span><strong>{d.name}</strong> · {d.phone || 'tanpa HP'} · {d.city || '—'}</span>
                        <button type="button" onClick={() => { onAdd(d); onClose(); }}
                          className="text-[10px] bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded-full hover:bg-amber-300 font-bold">
                          Pakai
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Email</label>
                  <input type="email" value={form.email} onChange={e => sf('email', e.target.value)} className="input-base"/>
                </div>
                <div>
                  <label className="field-label flex items-center gap-1"><Cake size={11}/> Tanggal Lahir</label>
                  <input type="date" value={form.birthday || ''} onChange={e => sf('birthday', e.target.value)} className="input-base"/>
                </div>
              </div>

              <div>
                <label className="field-label">Sumber / Channel Akuisisi</label>
                <div className="flex flex-wrap gap-1.5">
                  {SOURCES.map(s => (
                    <button key={s.key} type="button"
                      onClick={() => sf('source', form.source === s.key ? '' : s.key)}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition ${
                        form.source === s.key
                          ? 'bg-[var(--brand-600)] text-white'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg)] border border-[var(--border)]'
                      }`}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <TagInput value={form.tags} onChange={(t) => sf('tags', t)}/>

              <div>
                <label className="field-label">Catatan</label>
                <textarea value={form.notes} onChange={e => sf('notes', e.target.value)} rows={3} className="input-base resize-none"/>
              </div>
            </>
          )}

          {activeTab === 'address' && (
            <>
              <WilayahPicker
                value={{
                  province_code: form.province_code,
                  province_name: form.province,
                  city_code: form.city_code,
                  city_name: form.city,
                  district_code: form.district_code,
                  district_name: form.district,
                  village_code: form.village_code,
                  village_name: form.village,
                }}
                onChange={(val) => setForm(f => ({ ...f, ...val }))}
              />
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="field-label">Alamat Lengkap</label>
                  <textarea value={form.address} onChange={e => sf('address', e.target.value)} rows={2}
                    placeholder="Nama jalan, no. rumah, RT/RW..." className="input-base resize-none"/>
                </div>
                <div>
                  <label className="field-label">Kode Pos</label>
                  <input type="text" maxLength={5} value={form.postal_code}
                    onChange={e => sf('postal_code', e.target.value.replace(/\D/g,''))}
                    className="input-base"/>
                </div>
              </div>
              {(form.province || form.city) && (
                <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">Preview Alamat</p>
                  <p className="text-xs text-[var(--text-primary)]">
                    {[form.address, form.village, form.district, form.city, form.province, form.postal_code].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 size={15} className="animate-spin"/> : <CheckCircle2 size={15}/>}
            Tambah Pelanggan
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
export default function NewOrderPage() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────
  const [branch, setBranch]           = useState(1);
  const [channel, setChannel]         = useState('wa');
  const [subChannelId, setSubChId]    = useState('');
  const [subChannelName, setSubChName]= useState('');
  const [employees, setEmployees]     = useState([]);
  const [subChannels, setSubChannels] = useState([]);
  const [customer, setCustomer]       = useState(null);
  const [custSearch, setCustSearch]   = useState('');
  const [custResults, setCustResults] = useState([]);
  const [prodSearch, setProdSearch]   = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [items, setItems]             = useState([]);
  const [discount, setDiscount]       = useState(0);
  const [shipping, setShipping]       = useState(0);
  const [adminFee, setAdminFee]       = useState(0);
  const [paymentMethod, setPayMethod] = useState('cash');
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [showAddCust, setAddCust]     = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const barcodeRef = useRef(null);

  // ── Load employees for WA ────────────────────────────────────
  useEffect(() => {
    setLoadingEmps(true);
    erpService.getEmployees()
      .then(r => {
        const emps = r.data?.data?.employees || [];
        setEmployees(emps);
      })
      .catch(e => {
        console.error('Load employees error:', e.message);
        setEmployees([]);
      })
      .finally(() => setLoadingEmps(false));
  }, []);

  // ── Load sub channels when channel changes ───────────────────
  useEffect(() => {
    setSubChId('');
    setSubChName('');
    setSubChannels([]);
    if (channel === 'wa') return; // WA uses employees
    erpService.getSubChannels({ channel })
      .then(r => setSubChannels(r.data?.data?.sub_channels || []))
      .catch(() => {});
  }, [channel]);

  // ── Reset sub channel when branch changes ────────────────────
  useEffect(() => {
    setSubChId('');
    setSubChName('');
    setChannel('wa');
  }, [branch]);

  // ── Customer search ──────────────────────────────────────────
  const searchCustomers = useCallback(async (q) => {
    if (!q.trim()) { setCustResults([]); return; }
    try {
      const res = await erpService.getCustomers({ search: q, limit: 10 });
      setCustResults(res.data.data.customers || []);
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(custSearch), 300);
    return () => clearTimeout(t);
  }, [custSearch, searchCustomers]);

  // ── Product search ───────────────────────────────────────────
  const searchProducts = useCallback(async (q) => {
    if (!q.trim()) { setProdResults([]); return; }
    try {
      const res = await erpService.getProducts({ search: q, branch_id: branch, limit: 10 });
      setProdResults(res.data.data.products || []);
    } catch {}
  }, [branch]);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(prodSearch), 300);
    return () => clearTimeout(t);
  }, [prodSearch, searchProducts]);

  // ── Barcode scan ─────────────────────────────────────────────
  const handleBarcode = async (code) => {
    if (!code.trim()) return;
    try {
      const res = await erpService.getByBarcode(code.trim());
      addProduct(res.data.data.product);
      setProdSearch('');
    } catch { toast.error('Produk tidak ditemukan'); }
  };

  // ── Add product to cart ──────────────────────────────────────
  const addProduct = (product) => {
    const sellPrice = channel === 'marketplace'
      ? parseFloat(product.sell_price_mp || product.sell_price)
      : channel === 'wa'
      ? parseFloat(product.sell_price_wa || product.sell_price)
      : parseFloat(product.sell_price);

    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, {
        product_id: product.id, product_name: product.name, product_sku: product.sku,
        sell_price: sellPrice, buy_price: parseFloat(product.buy_price || 0), orig_buy_price: parseFloat(product.buy_price || 0),
        discount_pct: 0, qty: 1,
        stock_qty: product.stock?.qty || 0, unit: product.unit || 'pcs',
      }];
    });
    setProdSearch('');
    setProdResults([]);
  };

  const updateQty      = (id, delta) => setItems(p => p.map(i => i.product_id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  const updateBuyPrice = (id, val)   => setItems(p => p.map(i => i.product_id === id ? { ...i, buy_price: parseFloat(val) || 0 } : i));
  const updatePrice= (id, val)   => setItems(p => p.map(i => i.product_id === id ? { ...i, sell_price: parseFloat(val) || 0 } : i));
  const removeItem = (id)        => setItems(p => p.filter(i => i.product_id !== id));

  // ── Calculations ─────────────────────────────────────────────
  const subtotal   = items.reduce((s, i) => s + (i.sell_price * i.qty), 0);
  const adminAmt   = channel === 'marketplace' ? parseFloat(adminFee) || 0 : 0;
  const total      = subtotal - (parseFloat(discount) || 0) + (parseFloat(shipping) || 0) + adminAmt;
  const estProfit  = items.reduce((s, i) => s + ((i.sell_price - i.buy_price) * i.qty), 0) - adminAmt;

  // ── Submit order ─────────────────────────────────────────────
  const handleSubmit = async (status = 'confirmed') => {
    if (!items.length)   { toast.error('Tambahkan minimal 1 produk'); return; }
    if (channel === 'wa' && !subChannelId)   { toast.error('Pilih karyawan WA'); return; }
    if (channel !== 'wa' && !subChannelId)   { toast.error(`Pilih ${channel === 'marketplace' ? 'toko marketplace' : 'metode langsung'}`); return; }

    setSaving(true);
    try {
      const payload = {
        branch_id: branch,
        customer_id: customer?.id || null,
        customer_name: customer?.name || '',
        customer_phone: customer?.phone || '',
        customer_city: customer?.city || '',
        channel,
        sub_channel_id: subChannelId ? parseInt(subChannelId) : null,
        sub_channel_name: subChannelName || null,
        // For WA: salesperson_id = employee id
        salesperson_id: channel === 'wa' ? parseInt(subChannelId) : null,
        items: items.map(i => ({
          product_id: i.product_id,
          qty: i.qty,
          sell_price: i.sell_price,
          buy_price: i.buy_price,
          discount_pct: i.discount_pct || 0,
        })),
        discount_amount: parseFloat(discount) || 0,
        shipping_cost:   parseFloat(shipping) || 0,
        admin_fee:       adminAmt,
        payment_method:  paymentMethod,
        notes,
        order_date: new Date().toISOString().split('T')[0],
      };

      const res = await erpService.createOrder(payload);
      const orderId = res.data.data.order.id;

      // Auto confirm if not draft
      if (status === 'confirmed') {
        await erpService.confirmOrder(orderId);
      }

      toast.success(`Order ${res.data.data.order.order_no} berhasil!`);
      navigate(`/erp/orders/${orderId}`);
    } catch(e) {
      toast.error(e.response?.data?.message || 'Gagal membuat order');
    } finally {
      setSaving(false);
    }
  };

  const BRANCH_OPTIONS = [
    { id: 1, name: 'GP Racing',  sub: 'Spare Part' },
    { id: 2, name: 'GP Distro',  sub: 'Fashion' },
  ];
  const CHANNEL_OPTS = ['wa', 'marketplace', 'direct'];
  const CHANNEL_LABEL = { wa: 'WhatsApp', marketplace: 'Marketplace', direct: 'Langsung' };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/erp/orders')} className="btn-icon"><ChevronLeft size={18}/></button>
        <div>
          <h1 className="text-xl font-bold">Buat Order Baru</h1>
          <p className="text-xs text-[var(--text-muted)]">GPDISTRO Racing ID</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── LEFT COLUMN ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Cabang & Channel */}
          <div className="card p-5">
            <p className="field-label mb-3">CABANG & CHANNEL</p>

            {/* Branch selector */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {BRANCH_OPTIONS.map(b => (
                <button key={b.id} onClick={() => setBranch(b.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${branch===b.id ? 'border-[var(--brand-600)] bg-[var(--brand-50)] dark:bg-[var(--brand-100)]' : 'border-[var(--border)] hover:border-[var(--brand-600)]/50'}`}>
                  <p className={`font-bold text-sm ${branch===b.id ? 'text-[var(--brand-600)]' : 'text-[var(--text-primary)]'}`}>{b.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{b.sub}</p>
                </button>
              ))}
            </div>

            {/* Channel selector */}
            <div className="grid grid-cols-3 gap-2">
              {CHANNEL_OPTS.map(ch => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${channel===ch ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                  {CHANNEL_LABEL[ch]}
                </button>
              ))}
            </div>

            {/* ── WA: Employee selector ── */}
            {channel === 'wa' && (
              <div className="mt-4">
                <label className="field-label">SALES / KARYAWAN WA</label>
                {loadingEmps ? (
                  <div className="input-base flex items-center gap-2 text-[var(--text-muted)]">
                    <Loader2 size={14} className="animate-spin"/> Memuat daftar karyawan...
                  </div>
                ) : employees.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
                    <p className="text-xs text-amber-700 dark:text-amber-400">⚠ Belum ada karyawan terdaftar di sistem insentif</p>
                  </div>
                ) : (
                  <select value={subChannelId}
                    onChange={e => {
                      const emp = employees.find(em => em.id == e.target.value);
                      setSubChId(e.target.value);
                      setSubChName(emp?.name || '');
                    }}
                    className="input-base">
                    <option value="">Pilih karyawan...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}{emp.branch ? ` — ${emp.branch.name}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {subChannelName && (
                  <p className="text-xs text-emerald-600 mt-1 font-semibold">✓ Sales: {subChannelName}</p>
                )}
              </div>
            )}

            {/* ── Marketplace: Sub channel selector ── */}
            {channel === 'marketplace' && (
              <div className="mt-4">
                <label className="field-label">TOKO MARKETPLACE</label>
                <select value={subChannelId}
                  onChange={e => {
                    const sc = subChannels.find(s => s.id == e.target.value);
                    setSubChId(e.target.value);
                    setSubChName(sc?.name || '');
                  }}
                  className="input-base">
                  <option value="">Pilih toko...</option>
                  {subChannels.map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
                {subChannels.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠ Belum ada sub channel marketplace. Tambah di Master Data ERP.</p>
                )}
              </div>
            )}

            {/* ── Direct: Sub channel selector ── */}
            {channel === 'direct' && (
              <div className="mt-4">
                <label className="field-label">METODE LANGSUNG</label>
                <select value={subChannelId}
                  onChange={e => {
                    const sc = subChannels.find(s => s.id == e.target.value);
                    setSubChId(e.target.value);
                    setSubChName(sc?.name || '');
                  }}
                  className="input-base">
                  <option value="">Pilih metode...</option>
                  {subChannels.map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Pelanggan */}
          <div className="card p-5">
            <p className="field-label mb-3">PELANGGAN</p>
            {customer ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {customer.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{customer.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{customer.phone} {customer.city ? `· ${customer.city}` : ''}</p>
                </div>
                <button onClick={() => { setCustomer(null); setCustSearch(''); }} className="btn-icon-sm"><X size={14}/></button>
              </div>
            ) : (
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
                <input value={custSearch} onChange={e => setCustSearch(e.target.value)}
                  placeholder="Cari nama / no. HP pelanggan..."
                  className="input-base pl-9"/>
                {custResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
                    {custResults.map(c => (
                      <button key={c.id} onClick={() => { setCustomer(c); setCustSearch(''); setCustResults([]); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors text-left">
                        <User size={14} className="text-[var(--text-muted)] flex-shrink-0"/>
                        <div>
                          <p className="text-sm font-semibold">{c.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{c.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!customer && (
              <button onClick={() => setAddCust(true)} className="text-xs text-[var(--brand-600)] font-semibold mt-2 hover:underline">
                + Tambah pelanggan baru
              </button>
            )}
          </div>

          {/* Produk */}
          <div className="card p-5">
            <p className="field-label mb-3">PRODUK</p>
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
              <input value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                placeholder="Cari produk / scan barcode..."
                className="input-base pl-9 pr-10"
                ref={barcodeRef}
                onKeyDown={e => e.key === 'Enter' && handleBarcode(prodSearch)}/>
              <Barcode size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
              {prodResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto scrollbar-thin">
                  {prodResults.map(p => (
                    <button key={p.id} onClick={() => addProduct(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors text-left">
                      <Package size={14} className="text-[var(--text-muted)] flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">Stok: {p.stock?.qty || 0} · {toRp(p.sell_price)}</p>
                      </div>
                      <span className="text-xs font-bold text-[var(--brand-600)] flex-shrink-0">{toRpShort(p.sell_price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <Package size={32} className="mx-auto mb-2 opacity-30"/>
                <p className="text-sm">Belum ada produk ditambahkan</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.product_id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.product_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[var(--text-muted)]">Jual</span>
                          <input type="number" value={item.sell_price}
                            onChange={e => updatePrice(item.product_id, e.target.value)}
                            className="input-base h-7 w-24 text-xs text-right"
                            min={0}/>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[var(--text-muted)]">Beli</span>
                          <input type="number" value={item.buy_price}
                            onChange={e => updateBuyPrice(item.product_id, e.target.value)}
                            className="input-base h-7 w-24 text-xs text-right text-blue-600"
                            min={0}/>
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">× {item.qty}</span>
                        <span className="text-xs font-bold text-[var(--brand-600)]">{toRpShort(item.sell_price * item.qty)}</span>
                        {item.sell_price > item.buy_price && (
                          <span className="text-[10px] text-emerald-600">+{toRpShort((item.sell_price-item.buy_price)*item.qty)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => updateQty(item.product_id, -1)} className="btn-icon-sm"><Minus size={12}/></button>
                      <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                      <button onClick={() => updateQty(item.product_id, 1)}
                        disabled={item.qty >= item.stock_qty}
                        className="btn-icon-sm disabled:opacity-30"><Plus size={12}/></button>
                      <button onClick={() => removeItem(item.product_id)} className="btn-icon-sm text-red-500 ml-1"><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ──────────────────────────────────── */}
        <div className="space-y-4">
          {/* Ringkasan */}
          <div className="card p-5">
            <p className="field-label mb-3">RINGKASAN</p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">Subtotal ({items.length} produk)</span><span className="font-semibold">{toRp(subtotal)}</span></div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--text-muted)] flex-shrink-0">Diskon</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--text-muted)]">Rp</span>
                  <input type="number" value={discount} onChange={e=>setDiscount(e.target.value)} min={0} className="input-base h-8 w-28 text-sm text-right"/>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--text-muted)] flex-shrink-0">Ongkir</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--text-muted)]">Rp</span>
                  <input type="number" value={shipping} onChange={e=>setShipping(e.target.value)} min={0} className="input-base h-8 w-28 text-sm text-right"/>
                </div>
              </div>

              {channel === 'marketplace' && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[var(--text-muted)] flex-shrink-0">Biaya Admin<br/><span className="text-[10px]">Fee marketplace</span></span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[var(--text-muted)]">Rp</span>
                    <input type="number" value={adminFee} onChange={e=>setAdminFee(e.target.value)} min={0} className="input-base h-8 w-28 text-sm text-right"/>
                  </div>
                </div>
              )}

              <div className="border-t border-[var(--border)] pt-3">
                <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-[var(--brand-600)]">{toRp(total)}</span></div>
                <div className="flex justify-between text-xs text-emerald-600 mt-1"><span>Estimasi Profit</span><span>{toRp(estProfit)}</span></div>
              </div>
            </div>
          </div>

          {/* Pembayaran */}
          <div className="card p-5">
            <p className="field-label mb-3">PEMBAYARAN</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PAYMENT_METHODS).map(([k,v]) => (
                <button key={k} onClick={() => setPayMethod(k)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${paymentMethod===k ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                  <span>{v.icon}</span> {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan */}
          <div className="card p-5">
            <p className="field-label mb-2">CATATAN ORDER</p>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Catatan tambahan..."
              rows={3} className="input-base resize-none text-sm"/>
          </div>

          {/* Actions */}
          <button onClick={() => handleSubmit('confirmed')} disabled={saving || !items.length}
            className="btn-primary w-full h-12 text-base gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>}
            Konfirmasi Order & Kurangi Stok
          </button>
          <button onClick={() => handleSubmit('draft')} disabled={saving || !items.length}
            className="btn-ghost w-full text-sm text-[var(--text-muted)] disabled:opacity-50">
            Simpan sebagai Draft
          </button>
          {channel === 'wa' && subChannelName && (
            <p className="text-xs text-center text-emerald-600 font-semibold">
              ✓ Order akan otomatis sync ke sistem insentif · {subChannelName}
            </p>
          )}
        </div>
      </div>

      {showAddCust && (
        <AddCustomerModal onClose={() => setAddCust(false)} onAdd={c => { setCustomer(c); setCustSearch(''); }}/>
      )}
    </div>
  );
}
