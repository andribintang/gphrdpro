import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users, Plus, Edit3, X, Loader2, CheckCircle2, Phone, MapPin,
  MessageCircle, Trash2, AlertTriangle, TrendingUp, ShoppingCart,
  Star, Heart, AlertCircle, Sparkles, Crown, Cake, Tag, Filter,
  ChevronRight, Mail, FileText, Package, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import WilayahPicker from '../../components/WilayahPicker';
import { erpService, toRp, toRpShort, CHANNELS, ORDER_STATUS } from '../../utils/erp/erpService';

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
const PREDEFINED_TAGS = ['VIP', 'Reseller', 'Dropshipper', 'Member', 'Bermasalah'];
const SOURCES = [
  { key: 'wa',           label: 'WhatsApp',    icon: '💬' },
  { key: 'instagram',    label: 'Instagram',   icon: '📷' },
  { key: 'marketplace',  label: 'Marketplace', icon: '🛒' },
  { key: 'walkin',       label: 'Walk-in',     icon: '🚶' },
  { key: 'referral',     label: 'Referral',    icon: '🤝' },
  { key: 'other',        label: 'Lainnya',     icon: '❔' },
];

// Hash nama → warna konsisten
const hashColor = (name) => {
  const COLORS = [
    'from-red-500 to-red-700', 'from-orange-500 to-orange-700',
    'from-amber-500 to-amber-700', 'from-emerald-500 to-emerald-700',
    'from-teal-500 to-teal-700', 'from-cyan-500 to-cyan-700',
    'from-blue-500 to-blue-700', 'from-indigo-500 to-indigo-700',
    'from-violet-500 to-violet-700', 'from-purple-500 to-purple-700',
    'from-fuchsia-500 to-fuchsia-700', 'from-pink-500 to-pink-700',
  ];
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = ((h << 5) - h) + name.charCodeAt(i);
  return COLORS[Math.abs(h) % COLORS.length];
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Normalisasi nomor untuk wa.me (628xxx)
const toWaNumber = (phone) => {
  if (!phone) return null;
  let p = String(phone).replace(/[\s\-()+]/g, '');
  if (p.startsWith('08')) p = '628' + p.slice(2);
  else if (p.startsWith('8') && p.length >= 9) p = '62' + p;
  else if (p.startsWith('+62')) p = p.slice(1);
  return /^62\d{8,15}$/.test(p) ? p : null;
};

// Segmentasi RFM
const getSegment = (customer) => {
  const totalOrders = customer.total_orders || 0;
  const totalSpent  = customer.total_spent || 0;
  const lastDate    = customer.last_order_date;

  if (totalOrders === 0 || !lastDate) {
    return { key: 'new', label: 'Baru', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300', icon: Sparkles };
  }

  const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));

  if (days > 180) {
    return { key: 'lost', label: 'Hilang', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', icon: AlertCircle };
  }
  if (days > 60) {
    return { key: 'at_risk', label: 'Berisiko', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', icon: AlertTriangle };
  }
  if (totalOrders >= 5 && totalSpent >= 5_000_000) {
    return { key: 'champion', label: 'Champion', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', icon: Crown };
  }
  if (totalOrders >= 3) {
    return { key: 'loyal', label: 'Loyal', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', icon: Heart };
  }
  return { key: 'new', label: 'Baru', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', icon: Sparkles };
};

// Format relative date
const relativeDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hari ini';
  if (days === 1) return 'Kemarin';
  if (days < 7)  return `${days} hari lalu`;
  if (days < 30) return `${Math.floor(days/7)} minggu lalu`;
  if (days < 365) return `${Math.floor(days/30)} bulan lalu`;
  return `${Math.floor(days/365)} tahun lalu`;
};

// ════════════════════════════════════════════════════════════════════
// Avatar component
// ════════════════════════════════════════════════════════════════════
const Avatar = ({ name, size = 'md' }) => {
  const sizeClass = size === 'lg' ? 'w-14 h-14 text-base'
                  : size === 'sm' ? 'w-7 h-7 text-[10px]'
                  : 'w-9 h-9 text-xs';
  return (
    <div className={`${sizeClass} rounded-xl bg-gradient-to-br ${hashColor(name)} flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm`}>
      {getInitials(name)}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// Tag chip input
// ════════════════════════════════════════════════════════════════════
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
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition ${
              tags.includes(t)
                ? 'bg-[var(--brand-600)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg)] border border-[var(--border)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {/* Custom tags */}
      {tags.filter(t => !PREDEFINED_TAGS.includes(t)).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.filter(t => !PREDEFINED_TAGS.includes(t)).map(t => (
            <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
              {t}
              <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-purple-900">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Tambah tag custom..."
          className="input-base text-xs flex-1 h-8"
        />
        <button type="button" onClick={addCustom} className="btn-secondary h-8 text-xs px-3">+ Tambah</button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// CustomerModal — Add / Edit with WilayahPicker + duplicate detection
// ════════════════════════════════════════════════════════════════════
const CustomerModal = ({ customer, onClose, onSuccess }) => {
  const isEdit = !!customer;
  const [form, setForm] = useState({
    name:          customer?.name || '',
    phone:         customer?.phone || '',
    email:         customer?.email || '',
    source:        customer?.source || '',
    birthday:      customer?.birthday || '',
    tags:          customer?.tags || [],
    address:       customer?.address || '',
    province:      customer?.province || '',
    province_code: customer?.province_code || '',
    city:          customer?.city || '',
    city_code:     customer?.city_code || '',
    district:      customer?.district || '',
    district_code: customer?.district_code || '',
    village:       customer?.village || '',
    village_code:  customer?.village_code || '',
    postal_code:   customer?.postal_code || '',
    notes:         customer?.notes || '',
  });
  const [saving, setSaving]       = useState(false);
  const [duplicates, setDupes]    = useState([]);
  const [activeTab, setActiveTab] = useState('info'); // info | address
  const debounceRef = useRef(null);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Duplicate detection — debounced
  useEffect(() => {
    if (isEdit) return; // skip on edit
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
        if (isEdit) params.exclude_id = customer.id;
        const res = await erpService.checkDuplicate(params);
        setDupes(res.data?.data?.matches || []);
      } catch { setDupes([]); }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [form.name, form.phone, isEdit, customer?.id]);

  const handle = async () => {
    if (!form.name.trim()) { toast.error('Nama wajib diisi'); return; }
    setSaving(true);
    try {
      if (isEdit) await erpService.updateCustomer(customer.id, form);
      else        await erpService.createCustomer(form);
      toast.success(isEdit ? 'Pelanggan diperbarui' : 'Pelanggan ditambahkan');
      onSuccess?.();
      onClose();
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === 'DUPLICATE_PHONE') {
        toast.error(e.response.data.message);
      } else {
        toast.error(e.response?.data?.message || 'Gagal menyimpan');
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop" />
      <div className="modal-box max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="text-sm font-bold">{isEdit ? 'Edit' : 'Tambah'} Pelanggan</h3>
            {isEdit && <p className="text-[11px] text-[var(--text-muted)]">{customer.name}</p>}
          </div>
          <button onClick={onClose} className="btn-icon-sm"><X size={14} /></button>
        </div>

        {/* Tabs */}
        <div className="px-5 border-b border-[var(--border)] flex gap-1">
          {[
            { k: 'info',    l: 'Info Dasar' },
            { k: 'address', l: 'Alamat' },
          ].map(t => (
            <button
              key={t.k}
              onClick={() => setActiveTab(t.k)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
                activeTab === t.k
                  ? 'border-[var(--brand-600)] text-[var(--brand-600)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
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
                  <input value={form.name} onChange={e => sf('name', e.target.value)} className="input-base" autoFocus />
                </div>
                <div>
                  <label className="field-label">No. HP / WhatsApp</label>
                  <input type="tel" value={form.phone} onChange={e => sf('phone', e.target.value)} className="input-base" placeholder="08xxxxxxxxxx" />
                </div>
              </div>

              {/* Duplicate detection alert */}
              {!isEdit && duplicates.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Sepertinya pelanggan ini sudah terdaftar:
                  </p>
                  <div className="space-y-1">
                    {duplicates.slice(0, 3).map(d => (
                      <div key={d.id} className="text-[11px] text-amber-800 dark:text-amber-200 flex items-center justify-between">
                        <span><strong>{d.name}</strong> · {d.phone || 'tanpa HP'} · {d.city || '—'}</span>
                        <span className="text-[10px] bg-amber-200 dark:bg-amber-800 px-1.5 rounded-full">{d.total_orders}x order</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Email</label>
                  <input type="email" value={form.email} onChange={e => sf('email', e.target.value)} className="input-base" />
                </div>
                <div>
                  <label className="field-label flex items-center gap-1"><Cake size={11} /> Tanggal Lahir</label>
                  <input type="date" value={form.birthday || ''} onChange={e => sf('birthday', e.target.value)} className="input-base" />
                </div>
              </div>

              <div>
                <label className="field-label">Sumber / Channel Akuisisi</label>
                <div className="flex flex-wrap gap-1.5">
                  {SOURCES.map(s => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => sf('source', form.source === s.key ? '' : s.key)}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition ${
                        form.source === s.key
                          ? 'bg-[var(--brand-600)] text-white'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg)] border border-[var(--border)]'
                      }`}
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <TagInput value={form.tags} onChange={(t) => sf('tags', t)} />

              <div>
                <label className="field-label">Catatan</label>
                <textarea value={form.notes} onChange={e => sf('notes', e.target.value)} rows={3} className="input-base resize-none" />
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
                    placeholder="Nama jalan, no. rumah, RT/RW..."
                    className="input-base resize-none" />
                </div>
                <div>
                  <label className="field-label">Kode Pos</label>
                  <input type="text" maxLength={5} value={form.postal_code} onChange={e => sf('postal_code', e.target.value.replace(/\D/g,''))} className="input-base" />
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
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            {isEdit ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// Customer Detail Drawer (slide from right)
// ════════════════════════════════════════════════════════════════════
const CustomerDrawer = ({ customerId, onClose, onEdit }) => {
  const [data, setData]       = useState(null);
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('orders'); // orders | favorites | info

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    Promise.all([
      erpService.getCustomerDetail(customerId),
      erpService.getCustomerOrders(customerId, { limit: 20 }),
    ])
      .then(([dRes, oRes]) => {
        setData(dRes.data?.data?.customer || null);
        setOrders(oRes.data?.data?.orders || []);
      })
      .catch(() => toast.error('Gagal memuat detail'))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (!customerId) return null;

  const segment = data ? getSegment(data) : null;
  const SegmentIcon = segment?.icon || Sparkles;

  const waNum = data?.phone ? toWaNumber(data.phone) : null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-[var(--bg-card)] shadow-2xl overflow-y-auto animate-slide-in-right">
        {loading ? (
          <div className="p-6 space-y-3">
            <div className="skeleton h-20 rounded-2xl" />
            <div className="skeleton h-16 rounded-xl" />
            <div className="skeleton h-32 rounded-xl" />
          </div>
        ) : !data ? (
          <div className="p-10 text-center">
            <p className="text-sm text-[var(--text-muted)]">Tidak dapat memuat detail.</p>
            <button onClick={onClose} className="btn-primary mt-4">Tutup</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={`bg-gradient-to-br ${hashColor(data.name)} text-white p-5 relative`}>
              <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={14} />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={data.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold leading-tight">{data.name}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {segment && (
                      <span className="text-[10px] bg-white/25 backdrop-blur px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <SegmentIcon size={10} /> {segment.label}
                      </span>
                    )}
                    {data.source && (
                      <span className="text-[10px] bg-white/20 backdrop-blur px-2 py-0.5 rounded-full">
                        {SOURCES.find(s => s.key === data.source)?.icon} {SOURCES.find(s => s.key === data.source)?.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {data.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {data.tags.map(t => (
                    <span key={t} className="text-[10px] bg-white/25 backdrop-blur px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <Tag size={9} /> {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Quick actions */}
              <div className="flex gap-2">
                {waNum && (
                  <a
                    href={`https://wa.me/${waNum}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <MessageCircle size={13} /> Chat WhatsApp
                  </a>
                )}
                <button
                  onClick={() => onEdit?.(data)}
                  className="bg-white/20 backdrop-blur hover:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <Edit3 size={13} /> Edit
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 p-4 border-b border-[var(--border)]">
              {[
                { l: 'Total Order',    v: data.stats?.order_count || 0,                   fmt: false, icon: ShoppingCart, c: 'text-blue-600' },
                { l: 'Total Belanja',  v: data.stats?.total_spent || 0,                   fmt: true,  icon: TrendingUp,   c: 'text-emerald-600' },
                { l: 'Rata-rata Order',v: data.stats?.avg_order_value || 0,               fmt: true,  icon: Star,         c: 'text-amber-600' },
                { l: 'Order Terakhir', v: relativeDate(data.stats?.last_order_date),      fmt: 'rel', icon: AlertCircle,  c: 'text-purple-600' },
              ].map(s => (
                <div key={s.l} className="bg-[var(--bg-secondary)] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon size={11} className={s.c} />
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{s.l}</span>
                  </div>
                  <p className="text-sm font-black text-[var(--text-primary)]">
                    {s.fmt === true ? toRpShort(s.v) : s.fmt === 'rel' ? s.v : (s.v || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-[var(--border)] flex">
              {[
                { k: 'orders',    l: `Order (${orders.length})` },
                { k: 'favorites', l: 'Produk Favorit' },
                { k: 'info',      l: 'Info & Alamat' },
              ].map(t => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={`flex-1 text-xs font-semibold py-3 border-b-2 transition ${
                    tab === t.k
                      ? 'border-[var(--brand-600)] text-[var(--brand-600)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-4">
              {tab === 'orders' && (
                orders.length === 0 ? (
                  <div className="text-center py-10 text-[var(--text-muted)]">
                    <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Belum ada riwayat order</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orders.map(o => {
                      const ch = CHANNELS[o.channel] || CHANNELS.direct;
                      const st = ORDER_STATUS[o.status] || ORDER_STATUS.draft;
                      return (
                        <a key={o.id} href={`/erp/orders/${o.id}`}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--border)] hover:border-[var(--brand-500)] hover:bg-[var(--bg-secondary)] transition group">
                          <div className={`w-8 h-8 rounded-lg ${ch.bg} flex items-center justify-center flex-shrink-0`}>
                            <ShoppingCart size={13} className={ch.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono font-semibold">{o.order_no}</span>
                              <span className="text-[9px] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-full">{st.label}</span>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)]">{o.order_date} · {ch.label}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold">{toRpShort(o.total_amount)}</p>
                          </div>
                          <ChevronRight size={12} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition" />
                        </a>
                      );
                    })}
                  </div>
                )
              )}

              {tab === 'favorites' && (
                data.stats?.favorite_products?.length === 0 ? (
                  <div className="text-center py-10 text-[var(--text-muted)]">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Belum ada data produk favorit</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.stats?.favorite_products?.map((p, i) => (
                      <div key={p.product_name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--border)]">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-[10px] font-bold text-amber-700 dark:text-amber-300 flex-shrink-0">
                          #{i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{p.product_name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{p.total_qty} unit · {toRpShort(p.total_value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === 'info' && (
                <div className="space-y-3 text-xs">
                  {[
                    { l: 'Email',    v: data.email,    icon: Mail },
                    { l: 'HP',       v: data.phone,    icon: Phone },
                    { l: 'Ulang Tahun', v: data.birthday ? new Date(data.birthday).toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}) : null, icon: Cake },
                  ].filter(f => f.v).map(f => (
                    <div key={f.l} className="flex items-start gap-2">
                      <f.icon size={12} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{f.l}</p>
                        <p className="text-xs text-[var(--text-primary)]">{f.v}</p>
                      </div>
                    </div>
                  ))}
                  {[data.address, data.village, data.district, data.city, data.province].filter(Boolean).length > 0 && (
                    <div className="flex items-start gap-2">
                      <MapPin size={12} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Alamat</p>
                        <p className="text-xs text-[var(--text-primary)]">
                          {[data.address, data.village, data.district, data.city, data.province, data.postal_code].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                  {data.notes && (
                    <div className="flex items-start gap-2">
                      <FileText size={12} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Catatan</p>
                        <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap">{data.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════
export default function CustomersPage() {
  const [customers, setCust]    = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [editCust, setEdit]     = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [filters, setFilters]   = useState({ source: '', segment: '', has_phone: '' });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpService.getCustomers({ limit: 1000 });
      setCust(res.data?.data?.customers || []);
    } catch { toast.error('Gagal memuat pelanggan'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Apply client-side filter (server already handles search via DataTable)
  const filtered = useMemo(() => {
    return customers.filter(c => {
      if (filters.source && c.source !== filters.source) return false;
      if (filters.segment && getSegment(c).key !== filters.segment) return false;
      if (filters.has_phone === 'yes' && !c.phone) return false;
      if (filters.has_phone === 'no' && c.phone)  return false;
      return true;
    });
  }, [customers, filters]);

  // KPI computations
  const kpi = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const activeMonth = customers.filter(c =>
      c.last_order_date && new Date(c.last_order_date) >= monthStart
    ).length;

    const avgCLV = customers.length
      ? customers.reduce((s, c) => s + (c.total_spent || 0), 0) / customers.length
      : 0;

    const topSpender = [...customers].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))[0];

    return {
      total: customers.length,
      activeMonth,
      avgCLV,
      topSpender,
    };
  }, [customers]);

  // Active filter chips count
  const activeFilters = Object.entries(filters).filter(([_, v]) => v).length;

  const handleDelete = async (cust) => {
    if (!confirm(`Hapus pelanggan "${cust.name}"?\n\nTindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await erpService.deleteCustomer(cust.id);
      toast.success('Pelanggan dihapus');
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal hapus');
    }
  };

  // Table columns
  const columns = [
    {
      key: 'name', label: 'Pelanggan', sortable: true,
      render: (v, row) => {
        const seg = getSegment(row);
        const SegIcon = seg.icon;
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={v} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold truncate">{v}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${seg.color}`}>
                  <SegIcon size={8} /> {seg.label}
                </span>
              </div>
              {row.tags?.length > 0 && (
                <div className="flex gap-1 mt-0.5">
                  {row.tags.slice(0, 3).map(t => (
                    <span key={t} className="text-[9px] bg-[var(--bg-secondary)] text-[var(--text-muted)] px-1.5 py-0 rounded">{t}</span>
                  ))}
                  {row.tags.length > 3 && <span className="text-[9px] text-[var(--text-muted)]">+{row.tags.length - 3}</span>}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'phone', label: 'Kontak', nowrap: true,
      render: (v) => {
        if (!v) return <span className="text-[var(--text-muted)]">—</span>;
        const wa = toWaNumber(v);
        return (
          <div className="flex items-center gap-1.5">
            <Phone size={11} className="text-[var(--text-muted)]" />
            <span className="text-[11px] text-[var(--text-secondary)] font-mono">{v}</span>
            {wa && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-emerald-500 hover:text-emerald-600 transition" title="Chat WhatsApp">
                <MessageCircle size={12} />
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: 'city', label: 'Kota',
      render: (v, row) => v
        ? <span className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]"><MapPin size={10} />{v}</span>
        : <span className="text-[var(--text-muted)]">—</span>,
    },
    {
      key: 'last_order_date', label: 'Order Terakhir', sortable: true, nowrap: true,
      render: (v) => <span className="text-[11px] text-[var(--text-secondary)]">{relativeDate(v)}</span>,
    },
    {
      key: 'total_orders', label: 'Order', sortable: true, align: 'center', nowrap: true,
      render: (v) => <span className="font-semibold">{v || 0}x</span>,
    },
    {
      key: 'total_spent', label: 'Total Belanja', sortable: true, align: 'right', nowrap: true,
      render: (v) => v > 0
        ? <span className="font-semibold text-emerald-600 dark:text-emerald-400">{toRpShort(v)}</span>
        : <span className="text-[var(--text-muted)]">—</span>,
    },
  ];

  return (
    <div className="section animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pelanggan</h1>
          <p className="body-sm text-[var(--text-muted)]">
            {customers.length} pelanggan · {kpi.activeMonth} aktif bulan ini
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Tambah Pelanggan
        </button>
      </div>

      {/* KPI Cards — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {loading ? [...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />) : [
          {
            label: 'Total Pelanggan', value: kpi.total,
            icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950',
            sub: '',
          },
          {
            label: 'Aktif Bulan Ini', value: kpi.activeMonth,
            icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950',
            sub: kpi.total > 0 ? `${Math.round(kpi.activeMonth / kpi.total * 100)}% dari total` : '',
          },
          {
            label: 'Rata-rata CLV', value: toRpShort(kpi.avgCLV),
            icon: Star, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950',
            sub: 'per pelanggan',
            asString: true,
          },
          {
            label: 'Top Spender', value: kpi.topSpender?.name || '—',
            icon: Crown, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950',
            sub: kpi.topSpender ? toRpShort(kpi.topSpender.total_spent) : '',
            asString: true,
            onClick: () => kpi.topSpender && setDetailId(kpi.topSpender.id),
          },
        ].map(c => (
          <button key={c.label} onClick={c.onClick} disabled={!c.onClick}
            className={`card p-4 text-left transition ${c.onClick ? 'hover:shadow-md cursor-pointer' : ''}`}>
            <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-2`}>
              <c.icon size={16} className={c.color} />
            </div>
            <p className="text-lg font-black text-[var(--text-primary)] leading-tight truncate">
              {c.asString ? c.value : (c.value || 0).toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{c.label}</p>
            {c.sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{c.sub}</p>}
          </button>
        ))}
      </div>

      {/* Filter chips */}
      <div className="card-sm mb-4 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mr-1">
          <Filter size={12} /> Filter:
        </div>

        {/* Segment filter */}
        <select value={filters.segment} onChange={e => setFilters(f => ({ ...f, segment: e.target.value }))}
          className="input-base h-7 text-[11px] py-0 min-w-28">
          <option value="">Semua Segmen</option>
          <option value="champion">🏆 Champion</option>
          <option value="loyal">💚 Loyal</option>
          <option value="at_risk">⚠️ Berisiko</option>
          <option value="lost">❌ Hilang</option>
          <option value="new">✨ Baru</option>
        </select>

        {/* Source filter */}
        <select value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}
          className="input-base h-7 text-[11px] py-0 min-w-28">
          <option value="">Semua Sumber</option>
          {SOURCES.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
        </select>

        {/* Has phone filter */}
        <select value={filters.has_phone} onChange={e => setFilters(f => ({ ...f, has_phone: e.target.value }))}
          className="input-base h-7 text-[11px] py-0 min-w-24">
          <option value="">HP Apa saja</option>
          <option value="yes">Ada HP</option>
          <option value="no">Tanpa HP</option>
        </select>

        {activeFilters > 0 && (
          <button onClick={() => setFilters({ source: '', segment: '', has_phone: '' })}
            className="text-[11px] text-[var(--brand-600)] font-semibold hover:underline flex items-center gap-0.5">
            <X size={11} /> Reset ({activeFilters})
          </button>
        )}

        <div className="ml-auto text-[11px] text-[var(--text-muted)]">
          {filtered.length} dari {customers.length}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchKeys={['name', 'phone', 'email', 'city']}
        searchPlaceholder="Cari nama, HP, email, kota..."
        emptyIcon={<Users size={40} />}
        emptyText={activeFilters > 0 ? 'Tidak ada yang cocok dengan filter' : 'Belum ada pelanggan'}
        emptyAction={
          activeFilters > 0
            ? <button onClick={() => setFilters({ source: '', segment: '', has_phone: '' })} className="btn-secondary">Reset Filter</button>
            : <button onClick={() => setShowAdd(true)} className="btn-primary">Tambah Pelanggan Pertama</button>
        }
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); setDetailId(row.id); }}
              className="btn-icon-sm" title="Detail">
              <ExternalLink size={12} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setEdit(row); }}
              className="btn-icon-sm" title="Edit">
              <Edit3 size={12} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
              className="btn-icon-sm hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" title="Hapus">
              <Trash2 size={12} />
            </button>
          </div>
        )}
        onRowClick={(row) => setDetailId(row.id)}
        pageSize={25}
        zebra
      />

      {/* Modals */}
      {showAdd && <CustomerModal onClose={() => setShowAdd(false)} onSuccess={fetch} />}
      {editCust && (
        <CustomerModal
          customer={editCust}
          onClose={() => setEdit(null)}
          onSuccess={() => { fetch(); if (detailId === editCust.id) setDetailId(null); }}
        />
      )}
      {detailId && (
        <CustomerDrawer
          customerId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(cust) => { setDetailId(null); setEdit(cust); }}
        />
      )}
    </div>
  );
}
