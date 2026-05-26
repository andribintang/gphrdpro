import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Edit3, X, Loader2, CheckCircle2, AlertTriangle, Store, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import { erpService, toRpShort } from '../../utils/erp/erpService';
import { createStoreProduct, getStoreCategories } from '../../utils/storeService';
import api from '../../utils/api';

// ── Product Edit Modal (unchanged) ────────────────────────────
const ProductModal = ({ product, categories, onClose, onSuccess }) => {
  const isEdit = !!product;
  const [form, setForm] = useState({
    branch_id: product?.branch_id||1, category_id: product?.category_id||'',
    name: product?.name||'', sku: product?.sku||'', barcode: product?.barcode||'',
    unit: product?.unit||'pcs', buy_price: product?.buy_price||0,
    sell_price: product?.sell_price||0, sell_price_mp: product?.sell_price_mp||'',
    sell_price_wa: product?.sell_price_wa||'', stock_min: product?.stock_min||0,
    weight: product?.weight||0, notes: product?.notes||'',
  });
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));

  const handle = async () => {
    if (!form.name.trim()) { toast.error('Nama produk wajib'); return; }
    setSaving(true);
    try {
      if (isEdit) await erpService.updateProduct(product.id, form);
      else await erpService.createProduct(form);
      toast.success(isEdit?'Produk diperbarui':'Produk ditambahkan');
      onSuccess(); onClose();
    } catch(e) { toast.error(e.response?.data?.message||'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-backdrop"/>
      <div className="modal-box max-w-lg" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-sm font-bold">{isEdit?'Edit':'Tambah'} Produk</h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Cabang</label>
              <select value={form.branch_id} onChange={e=>sf('branch_id',parseInt(e.target.value))} className="input-base text-sm">
                <option value={1}>GP Racing</option><option value={2}>GP Distro</option>
              </select>
            </div>
            <div><label className="field-label">Kategori</label>
              <select value={form.category_id} onChange={e=>sf('category_id',e.target.value)} className="input-base text-sm">
                <option value="">— Pilih —</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="field-label">Nama Produk *</label><input value={form.name} onChange={e=>sf('name',e.target.value)} className="input-base" autoFocus/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">SKU</label><input value={form.sku} onChange={e=>sf('sku',e.target.value)} className="input-base font-mono text-sm"/></div>
            <div><label className="field-label">Barcode</label><input value={form.barcode} onChange={e=>sf('barcode',e.target.value)} className="input-base font-mono text-sm"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Harga Beli</label><input type="number" value={form.buy_price} onChange={e=>sf('buy_price',e.target.value)} className="input-base"/></div>
            <div><label className="field-label">Harga Jual</label><input type="number" value={form.sell_price} onChange={e=>sf('sell_price',e.target.value)} className="input-base"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Harga Marketplace</label><input type="number" value={form.sell_price_mp} onChange={e=>sf('sell_price_mp',e.target.value)} className="input-base" placeholder="Opsional"/></div>
            <div><label className="field-label">Harga WA</label><input type="number" value={form.sell_price_wa} onChange={e=>sf('sell_price_wa',e.target.value)} className="input-base" placeholder="Opsional"/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="field-label">Satuan</label><input value={form.unit} onChange={e=>sf('unit',e.target.value)} className="input-base" placeholder="pcs"/></div>
            <div><label className="field-label">Stok Min</label><input type="number" value={form.stock_min} onChange={e=>sf('stock_min',e.target.value)} className="input-base"/></div>
            <div><label className="field-label">Berat (kg)</label><input type="number" step="0.1" value={form.weight} onChange={e=>sf('weight',e.target.value)} className="input-base"/></div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1">
            {saving?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>}
            {isEdit?'Simpan':'Tambah'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Publish to Store Modal ─────────────────────────────────────
const PublishModal = ({ product, onClose }) => {
  const [brand,       setBrand]       = useState('gpracing');
  const [storePrice,  setStorePrice]  = useState(product.sell_price_mp || product.sell_price || 0);
  const [priceCompare,setPriceCompare]= useState('');
  const [categoryId,  setCategoryId]  = useState('');
  const [description, setDescription] = useState(product.notes || '');
  const [storeCategories, setStoreCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    getStoreCategories(brand)
      .then(r => setStoreCategories(r.data.data.categories || []))
      .catch(() => {});
  }, [brand]);

  // Auto-detect brand from branch_id
  useEffect(() => {
    if (product.branch_id === 2) setBrand('gpdistro');
    else setBrand('gpracing');
  }, [product.branch_id]);

  const handlePublish = async () => {
    if (!storePrice || parseFloat(storePrice) <= 0) {
      toast.error('Harga jual toko wajib diisi'); return;
    }
    setSaving(true);
    try {
      const slug = product.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        + '-' + Date.now().toString().slice(-5);

      await createStoreProduct({
        brand,
        erp_product_id: product.id,
        name:          product.name,
        slug,
        sku:           product.sku || '',
        description:   description || product.notes || '',
        short_desc:    product.name,
        price:         parseFloat(storePrice),
        price_compare: parseFloat(priceCompare) || 0,
        weight:        Math.round((parseFloat(product.weight) || 0.5) * 1000), // kg → gram
        stock:         product.stock?.qty || 0,
        category_id:   categoryId || null,
        images:        [],
        variants:      {},
        is_active:     true,
        is_featured:   false,
      });

      setPublished(true);
      toast.success(`Produk berhasil dipublish ke toko ${brand === 'gpdistro' ? 'GPDISTRO' : 'GP RACING'}!`);
    } catch(e) {
      const msg = e.response?.data?.message || 'Gagal publish';
      if (msg.includes('slug') || msg.includes('Duplicate')) {
        toast.error('Produk ini sudah pernah dipublish ke toko ini');
      } else {
        toast.error(msg);
      }
    } finally { setSaving(false); }
  };

  const BRAND_INFO = {
    gpdistro: { label: 'GPDISTRO', sub: 'Fashion & Digital Printing', color: '#1a1a2e' },
    gpracing: { label: 'GP RACING STORE', sub: 'Spare Part Motor Racing', color: '#dc2626' },
  };
  const info = BRAND_INFO[brand];

  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-backdrop"/>
      <div className="modal-box max-w-md" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Store size={16} className="text-[var(--brand-600)]"/>
            <h3 className="text-sm font-bold">Publish ke Toko Online</h3>
          </div>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>

        {published ? (
          <div className="modal-body text-center py-8">
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4"/>
            <h3 className="font-bold text-lg mb-1">Berhasil Dipublish!</h3>
            <p className="text-sm text-[var(--text-muted)] mb-2">
              <strong>{product.name}</strong> sekarang tampil di toko{' '}
              <span style={{ color: info.color }} className="font-bold">{info.label}</span>
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Lengkapi foto & deskripsi di menu Toko Online → {brand === 'gpdistro' ? 'GPDISTRO' : 'GP RACING'} → Produk
            </p>
            <button onClick={onClose} className="btn-primary mt-6 px-8">Tutup</button>
          </div>
        ) : (
          <>
            <div className="modal-body space-y-4">
              {/* Product preview */}
              <div className="bg-[var(--bg)] rounded-lg p-3 flex items-start gap-3">
                <Package size={32} className="text-[var(--text-muted)] flex-shrink-0 mt-0.5"/>
                <div>
                  <p className="font-semibold text-sm leading-tight">{product.name}</p>
                  {product.sku && <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{product.sku}</p>}
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Stok ERP: <strong>{product.stock?.qty || 0} {product.unit}</strong>
                    {' · '}Harga Beli: <strong>{toRpShort(product.buy_price)}</strong>
                  </p>
                </div>
              </div>

              {/* Brand selector */}
              <div>
                <label className="field-label">Publish ke Toko</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {Object.entries(BRAND_INFO).map(([key, b]) => (
                    <button key={key} onClick={() => setBrand(key)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${brand === key ? 'border-[var(--brand-600)]' : 'border-[var(--border)] hover:border-[var(--brand-600)]/40'}`}>
                      <div className="w-3 h-3 rounded-full mb-2" style={{ background: b.color }}/>
                      <p className="text-xs font-bold">{b.label}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{b.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Harga Jual di Toko *</label>
                  <input type="number" value={storePrice}
                    onChange={e => setStorePrice(e.target.value)}
                    className="input-base mt-1" placeholder="150000"/>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Margin: {storePrice && product.buy_price
                      ? `${Math.round(((storePrice - product.buy_price) / product.buy_price) * 100)}%`
                      : '—'}
                  </p>
                </div>
                <div>
                  <label className="field-label">Harga Coret (Rp)</label>
                  <input type="number" value={priceCompare}
                    onChange={e => setPriceCompare(e.target.value)}
                    className="input-base mt-1" placeholder="Opsional"/>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Harga sebelum diskon</p>
                </div>
              </div>

              {/* Store category */}
              <div>
                <label className="field-label">Kategori Toko</label>
                <div className="relative mt-1">
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                    className="input-base appearance-none pr-8">
                    <option value="">— Tanpa Kategori —</option>
                    {storeCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]"/>
                </div>
                {storeCategories.length === 0 && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Belum ada kategori. Tambahkan dulu di Toko Online → {brand === 'gpdistro' ? 'GPDISTRO' : 'GP RACING'} → Kategori & Voucher
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="field-label">Deskripsi Singkat</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  rows={2} className="input-base mt-1 resize-none text-sm"
                  placeholder="Deskripsi produk untuk toko online..."/>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <strong>Info:</strong> Foto produk bisa ditambahkan setelah publish melalui menu{' '}
                <strong>Toko Online → {brand === 'gpdistro' ? 'GPDISTRO' : 'GP RACING'} → Produk → Edit</strong>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
              <button onClick={handlePublish} disabled={saving}
                className="btn-primary flex-1 gap-2 disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin"/> : <Store size={15}/>}
                {saving ? 'Publishing...' : 'Publish ke Toko'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────
export default function ProductsPage() {
  const [products,  setProducts]  = useState([]);
  const [categories,setCats]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [publishProduct, setPublishProduct] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        erpService.getProducts({ limit: 500 }),
        erpService.getCategories({ limit: 200 }),
      ]);
      setProducts(pRes.data.data.products || []);
      setCats(cRes.data.data.categories || []);
    } catch { toast.error('Gagal memuat produk'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const columns = [
    { key:'name', label:'Nama Produk', sortable:true, render:(v,row) => (
      <div>
        <p className="font-semibold text-[var(--text-primary)] leading-tight">{v}</p>
        {row.sku && <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{row.sku}</p>}
      </div>
    )},
    { key:'category', label:'Kategori', nowrap:true, render:v => <span className="text-[var(--text-secondary)]">{v?.name||'—'}</span> },
    { key:'sell_price', label:'Harga Jual', sortable:true, align:'right', nowrap:true, render:v => <span className="font-semibold">{toRpShort(v)}</span> },
    { key:'buy_price', label:'Harga Beli', sortable:true, align:'right', nowrap:true, render:v => <span className="text-[var(--text-secondary)]">{toRpShort(v)}</span> },
    { key:'stock', label:'Stok', align:'center', nowrap:true, render:(v,row) => {
      const qty = v?.qty || 0; const min = row.stock_min || 0;
      return <span className={`font-bold text-sm ${qty<=min ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
        {qty < 0 ? <AlertTriangle size={14}/> : qty}{' '}
        <span className="text-[10px] font-normal text-[var(--text-muted)]">{row.unit}</span>
      </span>;
    }},
  ];

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Produk</h1>
          <p className="body-sm text-[var(--text-muted)]">{products.length} produk</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary">
          <Plus size={16}/> Tambah Produk
        </button>
      </div>

      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        searchKeys={['name','sku','barcode']}
        searchPlaceholder="Cari nama, SKU, barcode..."
        emptyIcon={<Package size={40}/>}
        emptyText="Belum ada produk"
        emptyAction={<button onClick={() => setModal('new')} className="btn-primary">Tambah Produk Pertama</button>}
        actions={(row) => (
          <div className="flex items-center gap-1.5">
            {/* Publish to store button */}
            <button
              onClick={() => setPublishProduct(row)}
              className="btn-icon-sm text-[var(--brand-600)] hover:bg-[var(--brand-600)]/10"
              title="Publish ke Toko Online">
              <Store size={13}/>
            </button>
            {/* Edit button */}
            <button onClick={() => setModal(row)} className="btn-icon-sm" title="Edit Produk">
              <Edit3 size={13}/>
            </button>
          </div>
        )}
        pageSize={25}
        zebra
      />

      {/* Edit / Add modal */}
      {modal && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSuccess={fetch}
        />
      )}

      {/* Publish to store modal */}
      {publishProduct && (
        <PublishModal
          product={publishProduct}
          onClose={() => setPublishProduct(null)}
        />
      )}
    </div>
  );
}
