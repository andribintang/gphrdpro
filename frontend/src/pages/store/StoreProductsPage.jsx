import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, Package, X, Save, Upload, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getStoreProducts, createStoreProduct, updateStoreProduct,
  deleteStoreProduct, getStoreCategories,
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
function ProductModal({ brand, categories, product, onClose, onSaved }) {
  const [form,    setForm]    = useState(product ? { ...EMPTY_FORM, ...product } : { ...EMPTY_FORM, brand });
  const [saving,  setSaving]  = useState(false);
  const [tab,     setTab]     = useState('basic');
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
      const payload = { ...form, brand, price: parseFloat(form.price), price_compare: parseFloat(form.price_compare) || 0, weight: parseInt(form.weight), stock: parseInt(form.stock) };
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[var(--bg-card)] w-full max-w-2xl my-8 border border-[var(--border)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold">Edit Produk {BRAND_LABEL[brand]}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${tab === t.id ? 'border-b-2 border-[var(--brand-600)] text-[var(--brand-600)]' : 'text-[var(--text-muted)]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {/* ── Tab: Basic ───────────────────────────────── */}
          {tab === 'basic' && <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label-sm">Nama Produk *</label>
                <input value={form.name} onChange={e => { set('name', e.target.value); if (!product) autoSlug(e.target.value); }}
                  className="input mt-1" placeholder="Nama produk lengkap" />
              </div>
              <div>
                <label className="label-sm">Harga Jual (Rp) *</label>
                <input type="number" value={form.price} onChange={e => set('price', e.target.value)}
                  className="input mt-1" placeholder="150000" />
              </div>
              <div>
                <label className="label-sm">Harga Coret (Rp)</label>
                <input type="number" value={form.price_compare} onChange={e => set('price_compare', e.target.value)}
                  className="input mt-1" placeholder="200000 (opsional)" />
              </div>
              <div>
                <label className="label-sm">Stok</label>
                <input type="number" value={form.stock} onChange={e => set('stock', e.target.value)}
                  className="input mt-1" placeholder="0" />
              </div>
              <div>
                <label className="label-sm">Berat (gram)</label>
                <input type="number" value={form.weight} onChange={e => set('weight', e.target.value)}
                  className="input mt-1" placeholder="500" />
              </div>
              <div>
                <label className="label-sm">SKU</label>
                <input value={form.sku} onChange={e => set('sku', e.target.value)}
                  className="input mt-1" placeholder="GPD-001" />
              </div>
              <div>
                <label className="label-sm">Kategori</label>
                <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
                  className="input mt-1">
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label-sm">Deskripsi Singkat</label>
              <textarea value={form.short_desc} onChange={e => set('short_desc', e.target.value)}
                rows={2} className="input mt-1 resize-none" placeholder="Deskripsi singkat untuk listing produk" />
            </div>
            <div>
              <label className="label-sm">Deskripsi Lengkap</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={4} className="input mt-1 resize-none" placeholder="Deskripsi detail produk..." />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Aktif / Tampil di toko</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Featured / Unggulan</span>
              </label>
            </div>
          </>}

          {/* ── Tab: Media & Variants ─────────────────────── */}
          {tab === 'media' && <>
            <div>
              <label className="label-sm mb-2 block">Foto Produk</label>
              {/* Image grid */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {(form.images || []).map((img, i) => (
                  <div key={i} className="relative aspect-square bg-[var(--bg)] border border-[var(--border)] overflow-hidden group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => set('images', form.images.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={12} />
                    </button>
                    {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">Utama</span>}
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--brand-600)] transition-colors text-[var(--text-muted)]">
                  {imgLoading ? <div className="w-5 h-5 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin" />
                    : <><Upload size={20} /><span className="text-xs mt-1">Upload</span></>}
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={handleImage} disabled={imgLoading} />
                </label>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Foto pertama jadi foto utama. Maks 5 foto. Format: JPG, PNG, WebP.</p>
            </div>

            <div>
              <label className="label-sm mb-2 block">Varian Produk</label>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                {brand === 'gpdistro' ? 'Contoh: Ukuran (S/M/L/XL), Warna (Hitam/Putih)' : 'Contoh: Tipe Motor (Vario/Beat/Nmax), Ukuran'}
              </p>
              <VariantEditor variants={form.variants || {}} onChange={v => set('variants', v)} />
            </div>
          </>}

          {/* ── Tab: Detail & SEO ─────────────────────────── */}
          {tab === 'detail' && <>
            <div>
              <label className="label-sm">Slug URL</label>
              <input value={form.slug} onChange={e => set('slug', e.target.value)}
                className="input mt-1 font-mono text-sm" placeholder="nama-produk-url" />
              <p className="text-xs text-[var(--text-muted)] mt-1">URL: /products/<span className="font-mono">{form.slug || 'nama-produk'}</span></p>
            </div>
            <div>
              <label className="label-sm">Meta Title (SEO)</label>
              <input value={form.meta_title} onChange={e => set('meta_title', e.target.value)}
                className="input mt-1" placeholder="Judul untuk Google (maks 60 karakter)" maxLength={60} />
            </div>
            <div>
              <label className="label-sm">Meta Description (SEO)</label>
              <textarea value={form.meta_desc} onChange={e => set('meta_desc', e.target.value)}
                rows={2} className="input mt-1 resize-none" placeholder="Deskripsi untuk Google (maks 160 karakter)" maxLength={160} />
            </div>
            <div>
              <label className="label-sm">Tags (pisah dengan koma)</label>
              <input value={(form.tags || []).join(', ')}
                onChange={e => set('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                className="input mt-1" placeholder="kaos, polo, cotton combed" />
            </div>
          </>}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline py-2 px-5">Batal</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary py-2 px-6 gap-2 disabled:opacity-60">
            <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Produk'}
          </button>
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
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getStoreProducts({ brand, search, category: catFilter, page, limit: LIMIT });
      setProducts(r.data.data.products);
      setTotal(r.data.data.total);
    } catch { } finally { setLoading(false); }
  }, [brand, search, catFilter, page]);

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
        <a href="/erp/products"
          className="btn-outline gap-2 text-sm"
          onClick={e => { e.preventDefault(); window.location.href='/erp/products'; }}>
          <Plus size={16} /> Tambah via ERP
        </a>
      </div>

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
