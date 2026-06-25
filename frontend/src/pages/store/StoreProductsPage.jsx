import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Save, X, Upload,
  RefreshCw, Zap, Package, Tag, AlertTriangle, Loader2,
  CheckCircle2, FolderOpen, AlertCircle,
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import {
  getStoreProducts, createStoreProduct, updateStoreProduct,
  deleteStoreProduct, getStoreCategories,
  bulkUpdateCategory, bulkDeleteProducts,
} from '../../utils/storeService';
import { erpService } from '../../utils/erp/erpService';
import { toRp } from '../../utils/erp/erpService';

const BRAND_LABEL = { gpdistro: 'GPDISTRO', gpracing: 'GP RACING' };
const BRAND_COLOR  = { gpdistro: '#1a1a2e', gpracing: '#dc2626' };

// ── Styles ────────────────────────────────────────────────────
const cs = {
  input:    'input-base',
  textarea: 'input-base resize-none',
  select:   'input-base',
};

// ── Product Modal ─────────────────────────────────────────────
const EMPTY = { name:'', sku:'', price:'', price_compare:'', stock:'', weight:500,
  category_id:'', description:'', short_desc:'', is_featured:false, is_active:true, images:[], tags:[] };

function ProductModal({ brand, categories, product, onClose, onSaved }) {
  const [form, setForm]       = useState(product ? { ...EMPTY, ...product } : { ...EMPTY, brand });
  const [saving, setSaving]   = useState(false);
  const [tab, setTab]         = useState('basic');
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const brandColor = BRAND_COLOR[brand] || '#333';

  const handle = async () => {
    if (!form.name?.trim()) { toast.error('Nama produk wajib diisi'); return; }
    if (!form.price)        { toast.error('Harga wajib diisi'); return; }
    setSaving(true);
    try {
      const payload = { ...form, brand, price: parseFloat(form.price), price_compare: parseFloat(form.price_compare)||0, weight: parseInt(form.weight)||500, stock: parseInt(form.stock)||0 };
      if (product?.id) await updateStoreProduct(product.id, payload);
      else             await createStoreProduct(payload);
      toast.success(product?.id ? 'Produk diperbarui' : 'Produk ditambahkan');
      onSaved();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const TABS = [{ k:'basic',l:'Info Dasar' }, { k:'detail',l:'Detail' }, { k:'media',l:'Media & SEO' }];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeftColor: brandColor, borderLeftWidth: 3 }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${brandColor}20` }}>
              <Package size={15} style={{ color: brandColor }}/>
            </div>
            <div>
              <h3 className="text-sm font-bold">{product?.id ? 'Edit Produk' : 'Tambah Produk'}</h3>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: brandColor }}>{BRAND_LABEL[brand]}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>

        {/* Tabs */}
        <div className="px-5 border-b border-[var(--border)] flex gap-1">
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${tab===t.k ? 'border-[var(--brand-600)] text-[var(--brand-600)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              {t.l}
            </button>
          ))}
        </div>

        <div className="modal-body space-y-3">
          {tab === 'basic' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="field-label">Nama Produk *</label>
                  <input value={form.name} onChange={e => sf('name', e.target.value)} className={cs.input} autoFocus/>
                </div>
                <div><label className="field-label">SKU</label>
                  <input value={form.sku||''} onChange={e => sf('sku', e.target.value)} className={cs.input}/></div>
                <div><label className="field-label">Kategori</label>
                  <select value={form.category_id||''} onChange={e => sf('category_id', e.target.value)} className={cs.select}>
                    <option value="">— Pilih Kategori —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div><label className="field-label">Harga Jual *</label>
                  <input type="number" min={0} value={form.price||''} onChange={e => sf('price', e.target.value)} className={cs.input}/></div>
                <div><label className="field-label">Harga Coret</label>
                  <input type="number" min={0} value={form.price_compare||''} onChange={e => sf('price_compare', e.target.value)} className={cs.input}/></div>
                <div><label className="field-label">Stok</label>
                  <input type="number" min={0} value={form.stock||0} onChange={e => sf('stock', e.target.value)} className={cs.input}/></div>
                <div><label className="field-label">Berat (gram)</label>
                  <input type="number" min={0} value={form.weight||500} onChange={e => sf('weight', e.target.value)} className={cs.input}/></div>
              </div>
              <div className="flex gap-4">
                {[{ k:'is_featured', l:'Produk Unggulan' }, { k:'is_active', l:'Aktif di Toko' }].map(({ k, l }) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer select-none">
                    <div onClick={() => sf(k, !form[k])}
                      className={`w-10 h-5 rounded-full transition-colors relative ${form[k] ? 'bg-[var(--brand-600)]' : 'bg-[var(--border)]'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[k] ? 'translate-x-5' : 'translate-x-0.5'}`}/>
                    </div>
                    <span className="text-xs font-medium">{l}</span>
                  </label>
                ))}
              </div>
            </>
          )}
          {tab === 'detail' && (
            <>
              <div><label className="field-label">Deskripsi Singkat</label>
                <textarea value={form.short_desc||''} onChange={e => sf('short_desc', e.target.value)} rows={2} className={cs.textarea}/></div>
              <div><label className="field-label">Deskripsi Lengkap</label>
                <textarea value={form.description||''} onChange={e => sf('description', e.target.value)} rows={5} className={cs.textarea}/></div>
              <div><label className="field-label">Tags (pisah dengan koma)</label>
                <input value={Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags||'')}
                  onChange={e => sf('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  className={cs.input} placeholder="fashion, batik, pria..."/></div>
            </>
          )}
          {tab === 'media' && (
            <>
              <div><label className="field-label">URL Gambar (satu per baris)</label>
                <textarea value={Array.isArray(form.images) ? form.images.join('\n') : ''} rows={4}
                  onChange={e => sf('images', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                  className={cs.textarea} placeholder="https://..."/></div>
              {Array.isArray(form.images) && form.images.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {form.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="w-16 h-16 object-cover rounded-lg border border-[var(--border)]"
                      onError={e => { e.target.style.display='none'; }}/>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="field-label">Meta Title (SEO)</label>
                  <input value={form.meta_title||''} onChange={e => sf('meta_title', e.target.value)} className={cs.input}/></div>
                <div><label className="field-label">Meta Description</label>
                  <input value={form.meta_desc||''} onChange={e => sf('meta_desc', e.target.value)} className={cs.input}/></div>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1 gap-2">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
            {product?.id ? 'Simpan Perubahan' : 'Tambah Produk'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Category Modal ──────────────────────────────────────
function BulkCategoryModal({ count, categories, onClose, onApply }) {
  const [catId, setCatId] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <FolderOpen size={15}/> Ganti Kategori
          </h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Ganti kategori untuk <strong>{count}</strong> produk yang dipilih.
          </p>
          <div>
            <label className="field-label">Kategori Baru</label>
            <select value={catId} onChange={e => setCatId(e.target.value)} className="input-base">
              <option value="">— Hapus Kategori (set null) —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={() => onApply(catId || null)}
            className="btn-primary flex-1 gap-2">
            <Tag size={14}/> Terapkan ke {count} Produk
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
export default function StoreProductsPage() {
  const { brand } = useParams();
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState(null);  // null | 'add' | product obj
  const [bulkCatModal, setBulkCatModal] = useState(false);
  const [syncing,    setSyncing]    = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [showSync,   setShowSync]   = useState(false);
  const LIMIT = 20;
  const brandColor = BRAND_COLOR[brand] || '#333';

  // ── Load ───────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getStoreProducts({ brand, search, category_id: catFilter||undefined, page, limit: LIMIT });
      setProducts(r.data.data.products || []);
      setTotal(r.data.data.pagination?.total || 0);
    } catch (e) { toast.error('Gagal memuat: ' + e.message); }
    finally { setLoading(false); }
  }, [brand, search, catFilter, page]);

  useEffect(() => {
    getStoreCategories(brand).then(r => setCategories(r.data.data || [])).catch(() => {});
  }, [brand]);

  useEffect(() => { load(); }, [load]);

  // ── Sync ───────────────────────────────────────────────────
  const loadSyncStatus = async () => {
    try { const r = await erpService.storeGetSyncStatus(brand); setSyncStatus(r.data.data); } catch { setSyncStatus(null); }
  };

  const handleSync = async (mode = 'full') => {
    if (!confirm(`Sync semua produk dari ERP ke toko ${(brand||'').toUpperCase()}?`)) return;
    setSyncing(true);
    try {
      const r = await erpService.storeSyncFromERP({ brand, mode });
      toast.success(r.data.message);
      await load(); await loadSyncStatus();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal sync'); }
    finally { setSyncing(false); }
  };

  const handleSyncStock = async () => {
    setSyncing(true);
    try { const r = await erpService.storeSyncStock({ brand }); toast.success(r.data.message); await load(); }
    catch { toast.error('Gagal sync stok'); } finally { setSyncing(false); }
  };

  // ── Single delete (soft: is_active=false) ──────────────────
  const handleDelete = async (p) => {
    if (!confirm(`Nonaktifkan "${p.name}"?`)) return;
    try { await deleteStoreProduct(p.id); toast.success('Produk dinonaktifkan'); load(); }
    catch { toast.error('Gagal'); }
  };

  // ── Bulk category ──────────────────────────────────────────
  const handleBulkCategory = async (rows, clearSel, catId) => {
    try {
      await bulkUpdateCategory({ ids: rows.map(r => r.id), category_id: catId });
      const label = catId ? categories.find(c => c.id == catId)?.name || catId : '(kosong)';
      toast.success(`${rows.length} produk → kategori "${label}"`);
      clearSel(); load();
    } catch { toast.error('Gagal update kategori'); }
    finally { setBulkCatModal(false); }
  };

  // ── Bulk delete (hard delete — hapus permanen) ─────────────
  const handleBulkDelete = async (rows, clearSel) => {
    if (!confirm(`HAPUS PERMANEN ${rows.length} produk dari database store? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const r = await bulkDeleteProducts({ ids: rows.map(p => p.id) });
      toast.success(r.data.message);
      clearSel(); load();
    } catch { toast.error('Gagal hapus'); }
  };

  // ── Columns ────────────────────────────────────────────────
  const columns = [
    {
      key: 'name', label: 'Produk', sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-3">
          {(row.images?.[0] || (Array.isArray(row.images) && row.images[0])) ? (
            <img src={Array.isArray(row.images) ? row.images[0] : row.images} alt=""
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-[var(--border)]"/>
          ) : (
            <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-[var(--bg-secondary)] flex items-center justify-center">
              <Package size={16} className="text-[var(--text-muted)]"/>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate max-w-[260px]">{v}</p>
            <p className="text-[11px] font-mono text-[var(--text-muted)]">{row.sku || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category', label: 'Kategori', nowrap: true,
      render: (v) => v ? (
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] font-medium">{v.name}</span>
      ) : <span className="text-[var(--text-muted)] text-xs">—</span>,
    },
    {
      key: 'price', label: 'Harga', sortable: true, align: 'right', nowrap: true,
      render: (v, row) => (
        <div className="text-right">
          <p className="font-bold text-sm" style={{ color: brandColor }}>{toRp(v)}</p>
          {row.price_compare > 0 && (
            <p className="text-[11px] line-through text-[var(--text-muted)]">{toRp(row.price_compare)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'stock', label: 'Stok', sortable: true, align: 'center', nowrap: true,
      render: (v) => (
        <span className={`font-bold text-sm ${v <= 0 ? 'text-red-500' : v <= 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
          {v}
        </span>
      ),
    },
    {
      key: 'is_active', label: 'Status', nowrap: true,
      render: (v, row) => (
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${v ? 'bg-emerald-500' : 'bg-slate-400'}`}/>
          <span className="text-xs font-semibold">{v ? 'Aktif' : 'Nonaktif'}</span>
          {row.is_featured && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 ml-1">★ UNGGULAN</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-7 rounded-full" style={{ background: brandColor }}/>
            <h1 className="page-title">Produk — {BRAND_LABEL[brand] || brand}</h1>
          </div>
          <p className="page-subtitle ml-4">{total} produk total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {syncStatus && (
            <button onClick={() => setShowSync(!showSync)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-semibold ${
                syncStatus.summary?.not_synced > 0 || syncStatus.summary?.outdated > 0
                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700'
              }`}>
              {syncStatus.summary?.not_synced > 0 || syncStatus.summary?.outdated > 0
                ? <AlertCircle size={11}/> : <CheckCircle2 size={11}/>}
              {syncStatus.summary?.synced}/{syncStatus.summary?.total} sync
            </button>
          )}
          <button onClick={() => { loadSyncStatus(); setShowSync(s => !s); }} className="btn-icon" title="Status Sync">
            <RefreshCw size={14}/>
          </button>
          <button onClick={() => handleSyncStock()} disabled={syncing} className="btn-secondary gap-1.5 text-sm h-9 disabled:opacity-50">
            {syncing ? <Loader2 size={13} className="animate-spin"/> : <RefreshCw size={13}/>} Sync Stok
          </button>
          <button onClick={() => handleSync('full')} disabled={syncing} className="btn-primary gap-1.5 text-sm h-9 disabled:opacity-50">
            {syncing ? <Loader2 size={13} className="animate-spin"/> : <Zap size={13}/>} Sync dari ERP
          </button>
          <button onClick={() => setModal('add')} className="btn-primary gap-1.5 text-sm h-9" style={{ background: brandColor, borderColor: brandColor }}>
            <Plus size={14}/> Tambah
          </button>
        </div>
      </div>

      {/* ── Sync status panel ──────────────────────────────── */}
      {showSync && syncStatus && (
        <div className="table-wrapper p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Status Sinkronisasi ERP → Toko</p>
            <button onClick={() => setShowSync(false)} className="btn-icon-sm"><X size={13}/></button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { l:'Total',      v:syncStatus.summary?.total||0,      c:'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-primary)]' },
              { l:'Tersync',    v:syncStatus.summary?.synced||0,     c:'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400' },
              { l:'Outdated',   v:syncStatus.summary?.outdated||0,   c:'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400' },
              { l:'Belum Sync', v:syncStatus.summary?.not_synced||0, c:'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400' },
            ].map(({l,v,c}) => (
              <span key={l} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${c}`}>{v} {l}</span>
            ))}
          </div>
          {syncStatus.items?.filter(i => i.status !== 'synced').length > 0 ? (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {syncStatus.items.filter(i => i.status !== 'synced').map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg bg-[var(--bg-secondary)]">
                  <span className="font-medium truncate flex-1">{item.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    item.status==='outdated'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'
                  }`}>{item.status==='not_synced'?'BELUM':'OUTDATED'}</span>
                  <button onClick={() => erpService.storeSyncFromERP({ brand, mode:'single', erp_product_id: item.erp_product_id }).then(load).then(loadSyncStatus).catch(e => toast.error(e.message))}
                    className="text-[10px] text-[var(--brand-600)] hover:underline flex-shrink-0">Sync</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-600 font-semibold">✓ Semua produk sudah tersinkronisasi</p>
          )}
        </div>
      )}

      {/* ── Filter kategori ─────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
          className="input-base h-9 text-sm w-44">
          <option value="">Semua Kategori</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select onChange={e => { /* active filter — pass to load */ }}
          className="input-base h-9 text-sm w-36">
          <option value="">Semua Status</option>
          <option value="1">Aktif</option>
          <option value="0">Nonaktif</option>
        </select>
      </div>

      {/* ── DataTable ───────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        rowKey="id"
        searchKeys={['name','sku']}
        searchPlaceholder={`Cari produk atau SKU di ${BRAND_LABEL[brand]||brand}...`}
        emptyIcon={<Package size={40}/>}
        emptyText="Belum ada produk di toko ini"
        emptyAction={
          <button onClick={() => handleSync('full')} className="btn-primary mt-3 gap-2">
            <Zap size={14}/> Sync dari ERP
          </button>
        }
        actions={row => (
          <div className="flex items-center gap-1">
            <button onClick={e => { e.stopPropagation(); setModal(row); }}
              className="btn-icon-sm text-amber-500 hover:text-amber-700" title="Edit">
              <Pencil size={13}/>
            </button>
            <button onClick={e => { e.stopPropagation(); handleDelete(row); }}
              className="btn-icon-sm text-red-500 hover:text-red-700" title="Nonaktifkan">
              <Trash2 size={13}/>
            </button>
          </div>
        )}
        selectable
        bulkActions={(rows, clearSel) => (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">{rows.length} produk dipilih</span>
            <div className="w-px h-4 bg-[var(--border)]"/>
            {/* Bulk: ganti kategori */}
            <button onClick={() => setBulkCatModal({ rows, clearSel })}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
              <FolderOpen size={13}/> Ganti Kategori
            </button>
            {/* Bulk: hapus permanen */}
            <button onClick={() => handleBulkDelete(rows, clearSel)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              <Trash2 size={13}/> Hapus Permanen ({rows.length})
            </button>
          </div>
        )}
        pageSize={LIMIT}
        pageSizeOptions={[10, 20, 50, 100]}
        exportable
        exportFilename={`store-${brand}-products`}
        zebra
      />

      {/* ── Modals ──────────────────────────────────────────── */}
      {(modal === 'add' || (modal && typeof modal === 'object')) && (
        <ProductModal
          brand={brand}
          categories={categories}
          product={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

      {bulkCatModal && (
        <BulkCategoryModal
          count={bulkCatModal.rows.length}
          categories={categories}
          onClose={() => setBulkCatModal(false)}
          onApply={(catId) => handleBulkCategory(bulkCatModal.rows, bulkCatModal.clearSel, catId)}
        />
      )}
    </div>
  );
}
