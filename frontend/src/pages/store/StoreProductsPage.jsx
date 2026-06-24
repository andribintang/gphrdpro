import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, Package, X, Save, Upload, Eye, EyeOff, RefreshCw, Zap, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getStoreProducts, createStoreProduct, updateStoreProduct,
  deleteStoreProduct, getStoreCategories,
  getSyncStatus, syncFromERP, syncStock,
} from '../../utils/storeService';

const BRAND_LABEL = { gpdistro: 'GPDISTRO', gpracing: 'GP RACING' };
const fmt = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const EMPTY_FORM = {
  name: '', slug: '', sku: '', description: '', short_desc: '',
  price: '', price_compare: '', weight: 500, stock: 0,
  category_id: '', images: [], variants: {}, tags: [],
  is_featured: false, is_active: true,
};

// ── Image upload helper (Cloudinary or base64) ────────────────
async function uploadImage(file) {
  // Convert to base64 for now — swap with Cloudinary later
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Variant editor ────────────────────────────────────────────
function VariantEditor({ variants, onChange }) {
  const [key, setKey] = useState('');
  const [val, setVal] = useState('');

  const addOption = (k) => {
    if (!val.trim()) return;
    const curr = variants[k] || [];
    if (curr.includes(val.trim())) return;
    onChange({ ...variants, [k]: [...curr, val.trim()] });
    setVal('');
  };

  const removeOption = (k, v) => {
    const arr = (variants[k] || []).filter(x => x !== v);
    if (!arr.length) {
      const next = { ...variants };
      delete next[k];
      onChange(next);
    } else {
      onChange({ ...variants, [k]: arr });
    }
  };

  const addKey = () => {
    if (!key.trim() || variants[key.trim()]) return;
    onChange({ ...variants, [key.trim()]: [] });
    setKey('');
  };

  return (
    <div className="space-y-3">
      {Object.entries(variants).map(([k, vals]) => (
        <div key={k} className="border border-[var(--border)] p-3 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold uppercase tracking-wide">{k}</span>
            <button onClick={() => removeOption(k, '__all__')} className="text-red-400 hover:text-red-600 text-xs">Hapus Grup</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {vals.map(v => (
              <span key={v} className="flex items-center gap-1 bg-[var(--bg)] border border-[var(--border)] px-2 py-1 text-xs rounded">
                {v}
                <button onClick={() => removeOption(k, v)}><X size={10} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={val} onChange={e => setVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption(k))}
              placeholder={`Tambah opsi ${k}...`} className="input text-sm py-1.5 flex-1" />
            <button onClick={() => addOption(k)} className="btn-primary text-xs py-1.5 px-3">+</button>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <input value={key} onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKey())}
          placeholder="Nama varian baru (contoh: Ukuran, Warna, Tipe Motor)"
          className="input text-sm py-1.5 flex-1" />
        <button onClick={addKey} className="btn-outline text-xs py-1.5 px-3">+ Tambah</button>
      </div>
    </div>
  );
}

// ── Product Form Modal ────────────────────────────────────────
// ── Field styles ─────────────────────────────────────────────
const F = {
  label: "block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5",
  input: "w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)] transition-colors",
  textarea: "w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)] transition-colors resize-none",
  select: "w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)] transition-colors",
};

function ProductModal({ brand, categories, product, onClose, onSaved }) {
  const [form,       setForm]       = useState(product ? { ...EMPTY_FORM, ...product } : { ...EMPTY_FORM, brand });
  const [saving,     setSaving]     = useState(false);
  const [tab,        setTab]        = useState('basic');
  const [imgLoading, setImgLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const autoSlug = (name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    set('slug', slug + (product ? '' : '-' + Date.now().toString().slice(-5)));
  };

  const handleImage = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setImgLoading(true);
    try {
      const urls = await Promise.all(files.map(uploadImage));
      set('images', [...(form.images || []), ...urls]);
    } catch { toast.error('Gagal upload gambar'); }
    finally { setImgLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price) { toast.error('Nama dan harga wajib diisi'); return; }
    setSaving(true);
    try {
      const payload = { ...form, brand, price: parseFloat(form.price), price_compare: parseFloat(form.price_compare) || 0, weight: parseInt(form.weight) || 500, stock: parseInt(form.stock) || 0 };
      if (product?.id) await updateStoreProduct(product.id, payload);
      else await createStoreProduct(payload);
      toast.success(product ? 'Produk diupdate!' : 'Produk ditambahkan!');
      onSaved();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const TABS = [
    { id: 'basic',  label: 'Info Dasar' },
    { id: 'media',  label: 'Foto & Varian' },
    { id: 'detail', label: 'Detail & SEO' },
  ];

  const brandColor = brand === 'gpdistro' ? '#1a1a2e' : '#dc2626';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[var(--bg-card)] w-full max-w-2xl my-6 rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 rounded-full" style={{ background: brandColor }} />
            <div>
              <h2 className="font-bold text-base text-[var(--text-primary)]">
                {product ? 'Edit Produk' : 'Tambah Produk'}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{BRAND_LABEL[brand]}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg)] transition-colors text-[var(--text-muted)]">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-1 bg-[var(--bg)]" style={{ borderBottom: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 -mb-px ${
                tab === t.id
                  ? 'text-[var(--brand-600)] border-[var(--brand-600)]'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">

          {/* ── Tab: Info Dasar ─────────────────────────── */}
          {tab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className={F.label}>Nama Produk *</label>
                <input value={form.name}
                  onChange={e => { set('name', e.target.value); if (!product) autoSlug(e.target.value); }}
                  className={F.input} placeholder="Nama produk lengkap" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={F.label}>Harga Jual (Rp) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)] font-medium">Rp</span>
                    <input type="number" value={form.price} onChange={e => set('price', e.target.value)}
                      className={F.input + ' pl-10'} placeholder="150000" />
                  </div>
                </div>
                <div>
                  <label className={F.label}>Harga Coret (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)] font-medium">Rp</span>
                    <input type="number" value={form.price_compare} onChange={e => set('price_compare', e.target.value)}
                      className={F.input + ' pl-10'} placeholder="Opsional" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={F.label}>Stok</label>
                  <input type="number" value={form.stock} onChange={e => set('stock', e.target.value)}
                    className={F.input} placeholder="0" />
                </div>
                <div>
                  <label className={F.label}>Berat (gram)</label>
                  <input type="number" value={form.weight} onChange={e => set('weight', e.target.value)}
                    className={F.input} placeholder="500" />
                </div>
                <div>
                  <label className={F.label}>SKU</label>
                  <input value={form.sku} onChange={e => set('sku', e.target.value)}
                    className={F.input + ' font-mono'} placeholder="GPR-001" />
                </div>
              </div>

              <div>
                <label className={F.label}>Kategori</label>
                <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className={F.select}>
                  <option value="">— Pilih Kategori —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className={F.label}>Deskripsi Singkat</label>
                <textarea value={form.short_desc} onChange={e => set('short_desc', e.target.value)}
                  rows={2} className={F.textarea} placeholder="Ringkasan produk untuk listing toko" />
              </div>

              <div>
                <label className={F.label}>Deskripsi Lengkap</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={4} className={F.textarea} placeholder="Detail produk, spesifikasi, cara pemasangan..." />
              </div>

              <div className="flex gap-6 pt-1">
                {[
                  { k: 'is_active',   label: 'Aktif / Tampil di toko' },
                  { k: 'is_featured', label: 'Featured / Unggulan' },
                ].map(({ k, label }) => (
                  <label key={k} className="flex items-center gap-2.5 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form[k] ? 'border-[var(--brand-600)] bg-[var(--brand-600)]' : 'border-[var(--border)] group-hover:border-[var(--brand-400)]'}`}
                      onClick={() => set(k, !form[k])}>
                      {form[k] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} className="sr-only" />
                    <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Foto & Varian ──────────────────────── */}
          {tab === 'media' && (
            <div className="space-y-6">
              <div>
                <label className={F.label}>Foto Produk</label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {(form.images || []).map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--bg)] border border-[var(--border)] group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => set('images', form.images.filter((_, j) => j !== i))}
                          className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center">
                          <X size={12} className="text-white" />
                        </button>
                      </div>
                      {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-[var(--brand-600)] text-white text-[9px] font-bold text-center py-0.5 uppercase tracking-wide">Utama</span>}
                    </div>
                  ))}
                  {(form.images || []).length < 5 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[var(--brand-500)] hover:bg-[var(--brand-500)]/5 transition-colors text-[var(--text-muted)]">
                      {imgLoading
                        ? <div className="w-6 h-6 border-2 border-[var(--brand-500)] border-t-transparent rounded-full animate-spin"/>
                        : <><Upload size={20}/><span className="text-[10px] font-medium">Upload</span></>}
                      <input type="file" accept="image/*" multiple className="sr-only" onChange={handleImage} disabled={imgLoading}/>
                    </label>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">Maks 5 foto · Foto pertama = foto utama</p>
              </div>

              <div>
                <label className={F.label}>Varian Produk</label>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  {brand === 'gpdistro' ? 'Contoh: Ukuran (S/M/L/XL), Warna' : 'Contoh: Tipe Motor (Vario/Beat/Nmax)'}
                </p>
                <VariantEditor variants={form.variants || {}} onChange={v => set('variants', v)} />
              </div>
            </div>
          )}

          {/* ── Tab: Detail & SEO ──────────────────────── */}
          {tab === 'detail' && (
            <div className="space-y-4">
              <div>
                <label className={F.label}>Slug URL</label>
                <input value={form.slug} onChange={e => set('slug', e.target.value)}
                  className={F.input + ' font-mono text-xs'} placeholder="nama-produk-url" />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  URL: /products/<span className="font-mono font-medium">{form.slug || 'nama-produk'}</span>
                </p>
              </div>
              <div>
                <label className={F.label}>Meta Title <span className="text-[var(--text-muted)] normal-case font-normal">(maks 60 karakter)</span></label>
                <input value={form.meta_title} onChange={e => set('meta_title', e.target.value)}
                  className={F.input} placeholder="Judul untuk Google" maxLength={60} />
                <p className="text-right text-xs text-[var(--text-muted)] mt-1">{(form.meta_title||'').length}/60</p>
              </div>
              <div>
                <label className={F.label}>Meta Description <span className="text-[var(--text-muted)] normal-case font-normal">(maks 160 karakter)</span></label>
                <textarea value={form.meta_desc} onChange={e => set('meta_desc', e.target.value)}
                  rows={3} className={F.textarea} placeholder="Deskripsi untuk hasil pencarian Google" maxLength={160} />
                <p className="text-right text-xs text-[var(--text-muted)] mt-1">{(form.meta_desc||'').length}/160</p>
              </div>
              <div>
                <label className={F.label}>Tags</label>
                <input value={(form.tags || []).join(', ')}
                  onChange={e => set('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  className={F.input} placeholder="kampas rem, vario, beat (pisah dengan koma)" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg)]" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Batal
          </button>
          <div className="flex items-center gap-3">
            {tab !== 'basic' && (
              <button onClick={() => setTab(TABS[TABS.findIndex(t=>t.id===tab)-1].id)}
                className="px-4 py-2.5 text-sm font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg-card)] transition-colors">
                ← Sebelumnya
              </button>
            )}
            {tab !== 'detail' ? (
              <button onClick={() => setTab(TABS[TABS.findIndex(t=>t.id===tab)+1].id)}
                className="px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors"
                style={{ background: brandColor }}>
                Selanjutnya →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-60"
                style={{ background: brandColor }}>
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save size={15}/>}
                {saving ? 'Menyimpan...' : 'Simpan Produk'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Main Products Page ────────────────────────────────────────
export default function StoreProductsPage() {
  const { brand } = useParams();
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [modal,      setModal]      = useState(null); // null | 'add' | product obj
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing,    setSyncing]    = useState(false);
  const [showSync,   setShowSync]   = useState(false);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getStoreProducts({ brand, search, category_id: catFilter || undefined, page, limit: LIMIT });
      setProducts(r.data.data.products || []);
      setTotal(r.data.data.pagination?.total || 0);
    } catch (e) {
      toast.error('Gagal memuat produk: ' + e.message);
    } finally { setLoading(false); }
  }, [brand, search, catFilter, page]);

  const loadSyncStatus = async () => {
    try { const r = await getSyncStatus(brand); setSyncStatus(r.data.data); } catch { setSyncStatus(null); }
  };

  const handleSync = async (mode = 'full') => {
    if (!confirm(mode === 'stock' ? 'Update stok semua produk dari ERP?' : `Sync semua produk dari ERP ke toko ${(brand||'').toUpperCase()}?`)) return;
    setSyncing(true);
    try {
      const r = await syncFromERP({ brand, mode });
      toast.success(r.data.message);
      await load(); await loadSyncStatus();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal sync'); }
    finally { setSyncing(false); }
  };

  const handleSyncStock = async () => {
    setSyncing(true);
    try { const r = await syncStock({ brand }); toast.success(r.data.message); await load(); }
    catch { toast.error('Gagal sync stok'); } finally { setSyncing(false); }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getStoreCategories(brand).then(r => setCategories(r.data.data.categories || [])).catch(() => {});
  }, [brand]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Nonaktifkan produk "${name}"?`)) return;
    try {
      await deleteStoreProduct(id);
      toast.success('Produk dinonaktifkan');
      load();
    } catch { toast.error('Gagal'); }
  };

  const handleToggleActive = async (product) => {
    try {
      await updateStoreProduct(product.id, { is_active: !product.is_active });
      load();
    } catch { toast.error('Gagal'); }
  };

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Produk — {BRAND_LABEL[brand] || brand}</h1>
          <p className="body-sm text-[var(--text-muted)]">{total} produk total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/erp/products"
            className="btn-outline gap-2 text-sm"
            onClick={e => { e.preventDefault(); window.location.href='/erp/products'; }}>
            <Plus size={16}/> Tambah via ERP
          </a>
          <button onClick={() => handleSyncStock()} disabled={syncing}
            className="btn-secondary gap-2 text-sm h-9 disabled:opacity-50">
            {syncing ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}
            Sync Stok
          </button>
          <button onClick={() => handleSync('full')} disabled={syncing}
            className="btn-primary gap-2 text-sm h-9 disabled:opacity-50">
            {syncing ? <Loader2 size={14} className="animate-spin"/> : <Zap size={14}/>}
            Sync dari ERP
          </button>
          <button onClick={() => { loadSyncStatus(); setShowSync(s => !s); }}
            className="btn-icon" title="Status Sync">
            <RefreshCw size={15}/>
          </button>
        </div>
      </div>

      {/* Sync status panel */}
      {showSync && syncStatus && (
        <div className="table-wrapper p-4 space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Status Sinkronisasi ERP → Toko</p>
            <button onClick={() => setShowSync(false)} className="btn-icon-sm"><X size={13}/></button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { l:'Total', v:syncStatus.summary.total, c:'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-primary)]' },
              { l:'Tersync', v:syncStatus.summary.synced, c:'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' },
              { l:'Outdated', v:syncStatus.summary.outdated, c:'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800' },
              { l:'Belum Sync', v:syncStatus.summary.not_synced, c:'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800' },
            ].map(({l,v,c}) => (
              <span key={l} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${c}`}>{v} {l}</span>
            ))}
          </div>
          {syncStatus.items?.filter(i => i.status !== 'synced').length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {syncStatus.items.filter(i => i.status !== 'synced').map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg bg-[var(--bg-secondary)]">
                  <span className="font-medium truncate flex-1">{item.name}</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">{item.sku}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    item.status === 'outdated' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>{item.status === 'not_synced' ? 'BELUM SYNC' : 'OUTDATED'}</span>
                  <button onClick={() => syncFromERP({ brand, mode:'single', erp_product_id: item.erp_product_id }).then(load).then(loadSyncStatus).catch(e=>toast.error(e.message))}
                    className="text-[10px] text-[var(--brand-600)] hover:underline flex-shrink-0">Sync</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-600 font-semibold">✓ Semua produk sudah tersinkronisasi dengan data ERP terbaru</p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari produk atau SKU..." className="input pl-9" />
        </div>
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
          className="input w-48">
          <option value="">Semua Kategori</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                {['Produk','Kategori','Harga','Stok','Status','Aksi'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-[var(--bg)] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--text-muted)]">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Belum ada produk</p>
                    <div className="text-center mt-3">
                      <p className="text-xs text-[var(--text-muted)] mb-2">Tambah produk melalui menu ERP → Produk → Tab "Toko Online"</p>
                      <a href="/erp/products" onClick={e => { e.preventDefault(); window.location.href='/erp/products'; }}
                        className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1">
                        <Plus size={13}/> Ke Halaman Produk ERP
                      </a>
                    </div>
                  </td>
                </tr>
              ) : products.map(p => (
                <tr key={p.id} className="hover:bg-[var(--bg)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-10 h-10 object-cover flex-shrink-0 bg-[var(--bg)]" />
                      ) : (
                        <div className="w-10 h-10 bg-[var(--bg)] flex items-center justify-center flex-shrink-0">
                          <Package size={16} className="text-[var(--text-muted)]" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium line-clamp-1">{p.name}</p>
                        {p.sku && <p className="text-xs text-[var(--text-muted)] font-mono">{p.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{fmt(p.price)}</p>
                    {p.price_compare > 0 && <p className="text-xs text-[var(--text-muted)] line-through">{fmt(p.price_compare)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-sm font-semibold ${p.stock === 0 ? 'text-red-500' : p.stock < 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(p)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? <Eye size={10} /> : <EyeOff size={10} />}
                      {p.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                    {p.is_featured && <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Featured</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setModal(p)} className="btn-icon" title="Edit">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(p.id, p.name)} className="btn-icon text-red-400 hover:text-red-600" title="Hapus">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="border-t border-[var(--border)] px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} dari {total}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-outline py-1.5 px-3 text-xs disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * LIMIT >= total}
                className="btn-outline py-1.5 px-3 text-xs disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ProductModal
          brand={brand}
          categories={categories}
          product={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
