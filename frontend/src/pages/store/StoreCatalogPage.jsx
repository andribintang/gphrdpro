import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getStoreCategories, createStoreCategory, updateStoreCategory, deleteStoreCategory,
  getStoreVouchers, createStoreVoucher, updateStoreVoucher,
} from '../../utils/storeService';

const BRAND_LABEL = { gpdistro: 'GPDISTRO', gpracing: 'GP RACING' };

// ── Category Modal ────────────────────────────────────────────
function CategoryModal({ brand, item, onClose, onSaved }) {
  const [form, setForm] = useState(item || { brand, name: '', slug: '', description: '', sort_order: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Nama kategori wajib diisi'); return; }
    if (!form.slug) form.slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setSaving(true);
    try {
      if (item?.id) await updateStoreCategory(item.id, form);
      else await createStoreCategory({ ...form, brand });
      toast.success(item ? 'Kategori diupdate' : 'Kategori ditambahkan');
      onSaved();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--bg-card)] w-full max-w-md border border-[var(--border)] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-semibold">{item ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label-sm">Nama Kategori *</label>
            <input value={form.name} onChange={e => { set('name', e.target.value); if (!item) set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }}
              className="input mt-1" placeholder="Kaos & Tee" />
          </div>
          <div>
            <label className="label-sm">Slug URL</label>
            <input value={form.slug} onChange={e => set('slug', e.target.value)} className="input mt-1 font-mono text-sm" placeholder="kaos-tee" />
          </div>
          <div>
            <label className="label-sm">Deskripsi</label>
            <input value={form.description || ''} onChange={e => set('description', e.target.value)} className="input mt-1" placeholder="Deskripsi singkat (opsional)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-sm">Urutan</label>
              <input type="number" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value))} className="input mt-1" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Aktif</span>
              </label>
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-5 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline py-2 px-4">Batal</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary py-2 px-5 gap-2 disabled:opacity-60">
            <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Voucher Modal ─────────────────────────────────────────────
const EMPTY_VOUCHER = { type: 'percent', value: '', min_purchase: '', max_discount: '', quota: 0, valid_from: '', valid_until: '', description: '', is_active: true };

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
      const payload = { ...form, brand, code: form.code.toUpperCase(), value: parseFloat(form.value), min_purchase: parseFloat(form.min_purchase) || 0, max_discount: parseFloat(form.max_discount) || 0 };
      if (item?.id) await updateStoreVoucher(item.id, payload);
      else await createStoreVoucher(payload);
      toast.success(item ? 'Voucher diupdate' : 'Voucher ditambahkan');
      onSaved();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-[var(--bg-card)] w-full max-w-md my-8 border border-[var(--border)] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-semibold">{item ? 'Edit Voucher' : 'Buat Voucher Baru'}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label-sm">Kode Voucher *</label>
            <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
              className="input mt-1 font-mono uppercase tracking-widest" placeholder="HEMAT50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-sm">Tipe Diskon</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className="input mt-1">
                <option value="percent">Persen (%)</option>
                <option value="fixed">Nominal (Rp)</option>
                <option value="free_ongkir">Gratis Ongkir</option>
              </select>
            </div>
            <div>
              <label className="label-sm">{form.type === 'percent' ? 'Besar Diskon (%)' : form.type === 'fixed' ? 'Nominal (Rp)' : 'Nilai'}</label>
              <input type="number" value={form.value} onChange={e => set('value', e.target.value)} className="input mt-1" placeholder={form.type === 'percent' ? '10' : '50000'} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-sm">Min. Pembelian (Rp)</label>
              <input type="number" value={form.min_purchase} onChange={e => set('min_purchase', e.target.value)} className="input mt-1" placeholder="100000" />
            </div>
            {form.type === 'percent' && (
              <div>
                <label className="label-sm">Maks. Diskon (Rp)</label>
                <input type="number" value={form.max_discount} onChange={e => set('max_discount', e.target.value)} className="input mt-1" placeholder="50000" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-sm">Berlaku Dari *</label>
              <input type="datetime-local" value={form.valid_from} onChange={e => set('valid_from', e.target.value)} className="input mt-1" />
            </div>
            <div>
              <label className="label-sm">Berlaku Sampai *</label>
              <input type="datetime-local" value={form.valid_until} onChange={e => set('valid_until', e.target.value)} className="input mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-sm">Kuota (0 = tak terbatas)</label>
              <input type="number" value={form.quota} onChange={e => set('quota', parseInt(e.target.value))} className="input mt-1" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Aktif</span>
              </label>
            </div>
          </div>
          <div>
            <label className="label-sm">Keterangan</label>
            <input value={form.description || ''} onChange={e => set('description', e.target.value)} className="input mt-1" placeholder="Promo Hari Kemerdekaan" />
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-5 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline py-2 px-4">Batal</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary py-2 px-5 gap-2 disabled:opacity-60">
            <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Voucher'}
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

  const loadCats = useCallback(async () => {
    setLoading(true);
    try { const r = await getStoreCategories(brand); setCategories(r.data.data.categories || []); }
    catch { } finally { setLoading(false); }
  }, [brand]);

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    try { const r = await getStoreVouchers(brand); setVouchers(r.data.data.vouchers || []); }
    catch { } finally { setLoading(false); }
  }, [brand]);

  useEffect(() => { tab === 'categories' ? loadCats() : loadVouchers(); }, [tab, loadCats, loadVouchers]);

  const handleDeleteCat = async (id, name) => {
    if (!confirm(`Hapus kategori "${name}"?`)) return;
    try { await deleteStoreCategory(id); toast.success('Dihapus'); loadCats(); }
    catch { toast.error('Gagal'); }
  };

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="w-full animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Katalog — {BRAND_LABEL[brand] || brand}</h1>
          <p className="body-sm text-[var(--text-muted)]">Kategori & Voucher</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary gap-2">
          <Plus size={16} /> Tambah {tab === 'categories' ? 'Kategori' : 'Voucher'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {[{ id:'categories', label:'Kategori' }, { id:'vouchers', label:'Voucher & Promo' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-[var(--brand-600)] text-[var(--brand-600)]' : 'border-transparent text-[var(--text-muted)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Categories */}
      {tab === 'categories' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                {['Nama','Slug','Urutan','Status','Aksi'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? Array.from({length:3}).map((_,i) => (
                <tr key={i}>{Array.from({length:5}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-[var(--bg)] rounded animate-pulse" /></td>)}</tr>
              )) : categories.map(c => (
                <tr key={c.id} className="hover:bg-[var(--bg)] transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{c.slug}</td>
                  <td className="px-4 py-3 text-center">{c.sort_order}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setModal(c)} className="btn-icon"><Edit2 size={15} /></button>
                      <button onClick={() => handleDeleteCat(c.id, c.name)} className="btn-icon text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vouchers */}
      {tab === 'vouchers' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                {['Kode','Tipe','Nilai','Min. Beli','Berlaku','Penggunaan','Status','Aksi'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? Array.from({length:3}).map((_,i) => (
                <tr key={i}>{Array.from({length:8}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-[var(--bg)] rounded animate-pulse" /></td>)}</tr>
              )) : vouchers.map(v => (
                <tr key={v.id} className="hover:bg-[var(--bg)] transition-colors">
                  <td className="px-4 py-3 font-mono font-bold tracking-widest text-[var(--brand-600)]">{v.code}</td>
                  <td className="px-4 py-3 text-xs uppercase">{v.type === 'percent' ? 'Persen' : v.type === 'fixed' ? 'Nominal' : 'Gratis Ongkir'}</td>
                  <td className="px-4 py-3 font-semibold">{v.type === 'percent' ? `${v.value}%` : fmt(v.value)}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{fmt(v.min_purchase)}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {fmtDate(v.valid_from)} – {fmtDate(v.valid_until)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono">{v.used_count}</span>
                    {v.quota > 0 && <span className="text-[var(--text-muted)]">/{v.quota}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setModal(v)} className="btn-icon"><Edit2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {modal && tab === 'categories' && (
        <CategoryModal brand={brand} item={modal === 'add' ? null : modal}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); loadCats(); }} />
      )}
      {modal && tab === 'vouchers' && (
        <VoucherModal brand={brand} item={modal === 'add' ? null : modal}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); loadVouchers(); }} />
      )}
    </div>
  );
}
