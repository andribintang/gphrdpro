import { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Search, Edit3, X, Loader2,
  CheckCircle2, AlertTriangle, RefreshCw,
  ToggleLeft, ToggleRight, SlidersHorizontal,
  Barcode, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRp } from '../../utils/erp/erpService';

// ── Product Form Modal ────────────────────────────────────────
const ProductModal = ({ product, branches, categories, onClose, onSuccess }) => {
  const isEdit = !!product;
  const [form, setForm] = useState({
    branch_id:    product?.branch_id    || branches[0]?.id || 1,
    category_id:  product?.category_id  || '',
    sku:          product?.sku          || '',
    barcode:      product?.barcode      || '',
    name:         product?.name         || '',
    unit:         product?.unit         || 'pcs',
    buy_price:    product?.buy_price    || '',
    sell_price:   product?.sell_price   || '',
    sell_price_mp:product?.sell_price_mp|| '',
    sell_price_wa:product?.sell_price_wa|| '',
    stock_min:    product?.stock_min    || 0,
    weight:       product?.weight       || '',
    notes:        product?.notes        || '',
  });
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filteredCats = categories.filter(c =>
    !c.branch_id || c.branch_id == form.branch_id
  );

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama produk wajib diisi'); return; }
    if (!form.sell_price)  { toast.error('Harga jual wajib diisi');  return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        buy_price:    parseFloat(form.buy_price)     || 0,
        sell_price:   parseFloat(form.sell_price)    || 0,
        sell_price_mp:parseFloat(form.sell_price_mp) || null,
        sell_price_wa:parseFloat(form.sell_price_wa) || null,
        weight:       parseFloat(form.weight)        || 0,
        category_id:  form.category_id || null,
      };
      if (isEdit) await erpService.updateProduct(product.id, payload);
      else        await erpService.createProduct(payload);
      toast.success(isEdit ? 'Produk diperbarui' : 'Produk ditambahkan');
      onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const UNITS = ['pcs','kg','gram','meter','cm','liter','ml','box','lusin','roll','lembar'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      {/* ERP Breadcrumb */}
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>ERP</span><span>›</span>
        <span>Inventory</span><span>›</span>
        <span className="font-semibold text-[var(--text-primary)]">Produk</span>
      </nav>

      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-lg bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">{isEdit ? 'Edit Produk' : 'Tambah Produk'}</h3>
            <p className="text-xs text-[var(--text-muted)]">{isEdit ? product.name : 'Produk baru'}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {/* Branch */}
          <div>
            <label className="field-label">Cabang <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {branches.map(b => (
                <button key={b.id} type="button" onClick={() => { sf('branch_id', b.id); sf('category_id',''); }}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    form.branch_id == b.id ? 'bg-brand-500 text-white border-brand-500' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="field-label">Nama Produk <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => sf('name', e.target.value)} placeholder="Kampas Rem Honda Beat" className="input-base text-sm" />
          </div>

          {/* SKU + Barcode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">SKU</label>
              <input value={form.sku} onChange={e => sf('sku', e.target.value)} placeholder="KR-001" className="input-base text-sm font-mono" />
            </div>
            <div>
              <label className="field-label">Barcode</label>
              <input value={form.barcode} onChange={e => sf('barcode', e.target.value)} placeholder="8991234567890" className="input-base text-sm font-mono" />
            </div>
          </div>

          {/* Category + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Kategori</label>
              <select value={form.category_id} onChange={e => sf('category_id', e.target.value)} className="input-base text-sm">
                <option value="">Pilih kategori</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Satuan</label>
              <select value={form.unit} onChange={e => sf('unit', e.target.value)} className="input-base text-sm">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Prices */}
          <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Harga</p>
            </div>
            <div className="p-4 space-y-3">
              {[
                { key:'buy_price',    label:'Harga Beli (HPP)',       required: true },
                { key:'sell_price',   label:'Harga Jual Normal',      required: true },
                { key:'sell_price_mp',label:'Harga Marketplace (opsional)' },
                { key:'sell_price_wa',label:'Harga WA (opsional)' },
              ].map(f => (
                <div key={f.key}>
                  <label className="field-label">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">Rp</span>
                    <input type="number" value={form[f.key]}
                      onChange={e => sf(f.key, e.target.value)}
                      placeholder="0" className="input-base pl-10 text-sm" />
                  </div>
                  {form[f.key] > 0 && f.key !== 'buy_price' && (
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      Margin: Rp {(parseFloat(form[f.key]||0) - parseFloat(form.buy_price||0)).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Weight + Min stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Berat (gram)</label>
              <input type="number" value={form.weight} onChange={e => sf('weight', e.target.value)} placeholder="100" className="input-base text-sm" />
            </div>
            <div>
              <label className="field-label">Min. Stok Alert</label>
              <input type="number" value={form.stock_min} onChange={e => sf('stock_min', parseInt(e.target.value)||0)} placeholder="5" className="input-base text-sm" />
            </div>
          </div>

          <div>
            <label className="field-label">Catatan</label>
            <textarea value={form.notes} onChange={e => sf('notes', e.target.value)} rows={2} className="input-base text-sm resize-none" />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--border)] flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isEdit ? 'Simpan' : 'Tambah Produk'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Stock Adjust Modal ────────────────────────────────────────
const StockModal = ({ product, onClose, onSuccess }) => {
  const [type, setType]   = useState('in');
  const [qty, setQty]     = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!qty || parseInt(qty) <= 0) { toast.error('Jumlah harus lebih dari 0'); return; }
    setSaving(true);
    try {
      await erpService.adjustStock({ product_id: product.id, branch_id: product.branch_id, type, qty: parseInt(qty), notes });
      toast.success(`Stok ${type === 'in' ? 'ditambah' : 'dikurangi'}: ${qty} ${product.unit}`);
      onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Adjust Stok</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">{product.name} · Stok: {product.stock?.qty || 0} {product.unit}</p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {[{ v:'in', l:'+ Tambah Stok' },{ v:'out', l:'- Kurangi Stok' }].map(t => (
            <button key={t.v} onClick={() => setType(t.v)}
              className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                type === t.v
                  ? t.v === 'in' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-red-500 text-white border-red-500'
                  : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
              {t.l}
            </button>
          ))}
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="field-label">Jumlah ({product.unit})</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" className="input-base text-sm" autoFocus />
          </div>
          <div>
            <label className="field-label">Keterangan</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Stok opname, retur, dll" className="input-base text-sm" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 h-10 text-sm">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1 h-10 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function ProductsPage() {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [branchFilter, setBF]       = useState('');
  const [catFilter, setCF]          = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [editProduct, setEdit]      = useState(null);
  const [stockProduct, setStock]    = useState(null);
  const [lowStockOnly, setLowStock] = useState(false);

  const BRANCHES = [{ id:1, name:'GP Racing' },{ id:2, name:'GP Distro' }];

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        erpService.getProducts({
          search: search || undefined,
          branch_id: branchFilter || undefined,
          category_id: catFilter || undefined,
          low_stock: lowStockOnly || undefined,
          limit: 100,
        }),
        erpService.getCategories({ branch_id: branchFilter || undefined }),
      ]);
      setProducts(pRes.data.data.products);
      setCategories(cRes.data.data.categories);
    } catch { toast.error('Gagal memuat produk'); }
    finally { setLoading(false); }
  }, [search, branchFilter, catFilter, lowStockOnly]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (p) => {
    if (!window.confirm(`Nonaktifkan produk "${p.name}"?`)) return;
    try {
      await erpService.deleteProduct(p.id);
      toast.success('Produk dinonaktifkan');
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  const lowStockCount = products.filter(p => (p.stock?.qty||0) <= p.stock_min).length;

  return (
    <div className="section animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Produk</h1>
          <p className="body-sm text-[var(--text-secondary)]">{products.length} produk aktif</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <button onClick={() => setLowStock(v => !v)}
          className={`w-full flex items-center gap-2.5 p-3 rounded-xl mb-4 text-sm font-semibold transition-all border ${
            lowStockOnly ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                         : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)]'}`}>
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          {lowStockCount} produk stok menipis
          <span className="ml-auto text-xs">{lowStockOnly ? 'Lihat semua' : 'Filter'}</span>
        </button>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-36">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input type="text" placeholder="Cari produk, SKU, barcode..." value={search}
            onChange={e => setSearch(e.target.value)} className="input-base pl-9 text-sm h-9 w-full" />
        </div>
        <select value={branchFilter} onChange={e => { setBF(e.target.value); setCF(''); }} className="input-base text-sm h-9">
          <option value="">Semua Cabang</option>
          {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={catFilter} onChange={e => setCF(e.target.value)} className="input-base text-sm h-9">
          <option value="">Semua Kategori</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Product list */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_,i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : products.length === 0 ? (
        <div className="text-center py-14">
          <Package className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada produk</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">Tambah Produk</button>
        </div>
      ) : (
        <div className="table-wrapper">
          {products.map(p => {
            const qty    = p.stock?.qty || 0;
            const isLow  = qty <= p.stock_min;
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                {/* Stock indicator */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isLow ? 'bg-amber-100 dark:bg-amber-950' : 'bg-[var(--bg-secondary)]'}`}>
                  <Package className={`w-4.5 h-4.5 ${isLow ? 'text-amber-500' : 'text-[var(--text-muted)]'}`} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.name}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {p.sku && <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">{p.sku}</span>}
                    <span className="text-[10px] text-[var(--text-muted)]">{p.category?.name || 'No category'}</span>
                    <span className={`text-[10px] font-bold ${isLow ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      Stok: {qty} {p.unit}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-0.5">{toRp(p.sell_price)}</p>
                </div>
                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setStock(p)}
                    className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] text-xs font-bold"
                    title="Adjust stok">
                    ±
                  </button>
                  <button onClick={() => setEdit(p)}
                    className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd   && <ProductModal branches={BRANCHES} categories={categories} onClose={() => setShowAdd(false)} onSuccess={fetch} />}
      {editProduct && <ProductModal product={editProduct} branches={BRANCHES} categories={categories} onClose={() => setEdit(null)} onSuccess={fetch} />}
      {stockProduct && <StockModal product={stockProduct} onClose={() => setStock(null)} onSuccess={fetch} />}
    </div>
  );
}
