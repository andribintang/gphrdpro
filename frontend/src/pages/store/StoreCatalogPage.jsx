import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Edit2, X, Save, Tag, Info, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getStoreCategories,
  getStoreVouchers, createStoreVoucher, updateStoreVoucher,
} from '../../utils/storeService';

const BRAND_LABEL = { gpdistro: 'GPDISTRO', gpracing: 'GP RACING' };

// ── Voucher Modal ─────────────────────────────────────────────
const EMPTY_VOUCHER = {
  type: 'percent', value: '', min_purchase: '', max_discount: '',
  quota: 0, valid_from: '', valid_until: '', description: '', is_active: true,
};

function VoucherModal({ brand, item, onClose, onSaved }) {
  const [form, setForm] = useState(item ? { ...EMPTY_VOUCHER, ...item } : { ...EMPTY_VOUCHER, brand, code: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.code || !form.value || !form.valid_from || !form.valid_until) {
      toast.error('Kode, nilai, dan tanggal berlaku wajib diisi'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form, brand, code: form.code.toUpperCase(),
        value:        parseFloat(form.value),
        min_purchase: parseFloat(form.min_purchase) || 0,
        max_discount: parseFloat(form.max_discount) || 0,
      };
      if (item?.id) await updateStoreVoucher(item.id, payload);
      else await createStoreVoucher(payload);
      toast.success(item ? 'Voucher diupdate' : 'Voucher ditambahkan');
      onSaved();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-backdrop"/>
      <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="font-semibold text-sm">{item ? 'Edit Voucher' : 'Buat Voucher Baru'}</h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body space-y-3">
          <div>
            <label className="field-label">Kode Voucher *</label>
            <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
              className="input-base mt-1 font-mono uppercase tracking-widest" placeholder="HEMAT50"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Tipe Diskon</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className="input-base mt-1">
                <option value="percent">Persen (%)</option>
                <option value="fixed">Nominal (Rp)</option>
                <option value="free_ongkir">Gratis Ongkir</option>
              </select>
            </div>
            <div>
              <label className="field-label">
                {form.type === 'percent' ? 'Besar (%)' : form.type === 'fixed' ? 'Nominal (Rp)' : 'Nilai'}
              </label>
              <input type="number" value={form.value} onChange={e => set('value', e.target.value)}
                className="input-base mt-1" placeholder={form.type === 'percent' ? '10' : '50000'}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Min. Pembelian (Rp)</label>
              <input type="number" value={form.min_purchase} onChange={e => set('min_purchase', e.target.value)}
                className="input-base mt-1" placeholder="100000"/>
            </div>
            {form.type === 'percent' && (
              <div>
                <label className="field-label">Maks. Diskon (Rp)</label>
                <input type="number" value={form.max_discount} onChange={e => set('max_discount', e.target.value)}
                  className="input-base mt-1" placeholder="50000"/>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Berlaku Dari *</label>
              <input type="datetime-local" value={form.valid_from} onChange={e => set('valid_from', e.target.value)}
                className="input-base mt-1"/>
            </div>
            <div>
              <label className="field-label">Berlaku Sampai *</label>
              <input type="datetime-local" value={form.valid_until} onChange={e => set('valid_until', e.target.value)}
                className="input-base mt-1"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Kuota (0 = unlimited)</label>
              <input type="number" value={form.quota} onChange={e => set('quota', parseInt(e.target.value))}
                className="input-base mt-1"/>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => set('is_active', e.target.checked)} className="w-4 h-4"/>
                <span className="text-sm">Aktif</span>
              </label>
            </div>
          </div>
          <div>
            <label className="field-label">Keterangan</label>
            <input value={form.description || ''} onChange={e => set('description', e.target.value)}
              className="input-base mt-1" placeholder="Promo Hari Kemerdekaan"/>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Batal</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary gap-2 disabled:opacity-60">
            <Save size={15}/> {saving ? 'Menyimpan...' : 'Simpan Voucher'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function StoreCatalogPage() {
  const { brand } = useParams();
  const [tab,        setTab]        = useState('categories');
  const [categories, setCategories] = useState([]);
  const [vouchers,   setVouchers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);

  const branchId  = brand === 'gpdistro' ? 2 : 1;
  const branchName= brand === 'gpdistro' ? 'GP Distro' : 'GP Racing';

  const loadCats = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getStoreCategories(brand);
      setCategories(r.data.data.categories || []);
    } catch { } finally { setLoading(false); }
  }, [brand]);

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getStoreVouchers(brand);
      setVouchers(r.data.data.vouchers || []);
    } catch { } finally { setLoading(false); }
  }, [brand]);

  useEffect(() => {
    if (tab === 'categories') loadCats();
    else loadVouchers();
  }, [tab, loadCats, loadVouchers]);

  const fmt = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="w-full animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Katalog — {BRAND_LABEL[brand] || brand}</h1>
          <p className="body-sm text-[var(--text-muted)]">Kategori & Voucher</p>
        </div>
        {tab === 'vouchers' && (
          <button onClick={() => setModal('add')} className="btn-primary gap-2">
            <Plus size={16}/> Tambah Voucher
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {[
          { id: 'categories', label: 'Kategori' },
          { id: 'vouchers',   label: 'Voucher & Promo' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-[var(--brand-600)] text-[var(--brand-600)]'
                : 'border-transparent text-[var(--text-muted)]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Categories — read-only from ERP ──────────────── */}
      {tab === 'categories' && (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5"/>
            <div className="text-sm text-blue-700">
              <p className="font-semibold mb-0.5">Kategori sinkron otomatis dari ERP</p>
              <p className="text-xs">
                Kategori toko diambil langsung dari <strong>ERP → Master Data → Kategori</strong> (Cabang: {branchName}).
                Untuk tambah atau edit kategori, lakukan di Master Data ERP.
              </p>
              <Link to="/erp/master" className="inline-flex items-center gap-1 text-xs font-semibold mt-2 text-blue-700 hover:text-blue-900">
                Buka Master Data ERP <ArrowRight size={12}/>
              </Link>
            </div>
          </div>

          {/* Category list */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                  {['Nama Kategori', 'Slug (auto)', 'Urutan', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-[var(--bg)] rounded animate-pulse"/>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-[var(--text-muted)]">
                      <p className="mb-2">Belum ada kategori untuk cabang {branchName}</p>
                      <Link to="/erp/master" className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1">
                        Tambah di ERP Master Data <ArrowRight size={12}/>
                      </Link>
                    </td>
                  </tr>
                ) : categories.map(c => (
                  <tr key={c.id} className="hover:bg-[var(--bg)] transition-colors">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{c.slug}</td>
                    <td className="px-4 py-3 text-center text-[var(--text-muted)]">{c.sort_order}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Vouchers ──────────────────────────────────────── */}
      {tab === 'vouchers' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                {['Kode','Tipe','Nilai','Min. Beli','Berlaku','Penggunaan','Status','Aksi'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-[var(--bg)] rounded animate-pulse"/>
                      </td>
                    ))}
                  </tr>
                ))
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[var(--text-muted)]">
                    <Tag size={32} className="mx-auto mb-2 opacity-30"/>
                    <p>Belum ada voucher</p>
                    <button onClick={() => setModal('add')} className="btn-primary mt-3 text-xs py-2 px-4">
                      + Buat Voucher Pertama
                    </button>
                  </td>
                </tr>
              ) : vouchers.map(v => (
                <tr key={v.id} className="hover:bg-[var(--bg)] transition-colors">
                  <td className="px-4 py-3 font-mono font-bold tracking-widest text-[var(--brand-600)]">{v.code}</td>
                  <td className="px-4 py-3 text-xs uppercase">
                    {v.type === 'percent' ? 'Persen' : v.type === 'fixed' ? 'Nominal' : 'Free Ongkir'}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {v.type === 'percent' ? `${v.value}%` : fmt(v.value)}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{fmt(v.min_purchase)}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {fmtDate(v.valid_from)} – {fmtDate(v.valid_until)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono">{v.used_count}</span>
                    {v.quota > 0 && <span className="text-[var(--text-muted)]">/{v.quota}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {v.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setModal(v)} className="btn-icon-sm">
                      <Edit2 size={13}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Voucher Modal */}
      {modal && tab === 'vouchers' && (
        <VoucherModal
          brand={brand}
          item={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadVouchers(); }}
        />
      )}
    </div>
  );
}
