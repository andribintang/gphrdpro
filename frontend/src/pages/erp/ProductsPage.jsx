import { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Edit3, X, Loader2,
  CheckCircle2, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable, { StatusBadge } from '../../components/DataTable';
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
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  const filteredCats = categories.filter(c => !c.branch_id || c.branch_id == form.branch_id);
  const UNITS = ['pcs','kg','gram','meter','cm','liter','ml','box','lusin','roll','lembar'];

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama produk wajib'); return; }
    if (!form.sell_price)  { toast.error('Harga jual wajib');  return; }
    setSaving(true);
    try {
      const payload = { ...form, buy_price: parseFloat(form.buy_price)||0, sell_price: parseFloat(form.sell_price)||0,
        sell_price_mp: parseFloat(form.sell_price_mp)||null, sell_price_wa: parseFloat(form.sell_price_wa)||null,
        weight: parseFloat(form.weight)||0, category_id: form.category_id||null };
      if (isEdit) await erpService.updateProduct(product.id, payload);
      else        await erpService.createProduct(payload);
      toast.success(isEdit ? 'Produk diperbarui' : 'Produk ditambahkan');
      onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop" />
      <div className="modal-box max-w-lg" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{isEdit ? 'Edit Produk' : 'Tambah Produk'}</h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="field-label">Cabang</label>
            <div className="grid grid-cols-2 gap-2">
              {branches.map(b => (
                <button key={b.id} type="button" onClick={() => { sf('branch_id',b.id); sf('category_id',''); }}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.branch_id==b.id ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                  {b.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">Nama Produk *</label>
            <input value={form.name} onChange={e=>sf('name',e.target.value)} placeholder="Nama produk" className="input-base" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">SKU</label><input value={form.sku} onChange={e=>sf('sku',e.target.value)} placeholder="KR-001" className="input-base font-mono text-sm" /></div>
            <div><label className="field-label">Barcode</label><input value={form.barcode} onChange={e=>sf('barcode',e.target.value)} placeholder="8991234" className="input-base font-mono text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Kategori</label>
              <select value={form.category_id} onChange={e=>sf('category_id',e.target.value)} className="input-base text-sm">
                <option value="">Pilih kategori</option>
                {filteredCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Satuan</label>
              <select value={form.unit} onChange={e=>sf('unit',e.target.value)} className="input-base text-sm">
                {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Harga</p>
            </div>
            <div className="p-4 space-y-3">
              {[
                {k:'buy_price',    l:'Harga Beli (HPP) *'},
                {k:'sell_price',   l:'Harga Jual Normal *'},
                {k:'sell_price_mp',l:'Harga Marketplace (opsional)'},
                {k:'sell_price_wa',l:'Harga WA (opsional)'},
              ].map(f=>(
                <div key={f.k}>
                  <label className="field-label">{f.l}</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">Rp</span>
                    <input type="number" value={form[f.k]} onChange={e=>sf(f.k,e.target.value)} placeholder="0" className="input-base pl-10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Berat (gram)</label><input type="number" value={form.weight} onChange={e=>sf('weight',e.target.value)} placeholder="100" className="input-base" /></div>
            <div><label className="field-label">Min. Stok Alert</label><input type="number" value={form.stock_min} onChange={e=>sf('stock_min',parseInt(e.target.value)||0)} placeholder="5" className="input-base" /></div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            {isEdit ? 'Simpan' : 'Tambah'}
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
    if (!qty || parseInt(qty) <= 0) { toast.error('Jumlah harus > 0'); return; }
    setSaving(true);
    try {
      await erpService.adjustStock({ product_id:product.id, branch_id:product.branch_id, type, qty:parseInt(qty), notes });
      toast.success(`Stok ${type==='in'?'ditambah':'dikurangi'}: ${qty}`);
      onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop" />
      <div className="modal-box max-w-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Adjust Stok — {product.name}</h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="grid grid-cols-2 gap-2">
            {[{v:'in',l:'+ Tambah'},{v:'out',l:'- Kurangi'}].map(t=>(
              <button key={t.v} onClick={()=>setType(t.v)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${type===t.v ? (t.v==='in'?'bg-emerald-500 text-white border-emerald-500':'bg-red-500 text-white border-red-500') : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                {t.l}
              </button>
            ))}
          </div>
          <div>
            <label className="field-label">Jumlah ({product.unit})</label>
            <input type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="0" className="input-base" autoFocus />
          </div>
          <div>
            <label className="field-label">Keterangan</label>
            <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Stok opname, retur, dll" className="input-base" />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 size={15} className="animate-spin" /> : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
export default function ProductsPage() {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [editProduct, setEdit]      = useState(null);
  const [stockProduct, setStock]    = useState(null);
  const BRANCHES = [{id:1,name:'GP Racing'},{id:2,name:'GP Distro'}];

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        erpService.getProducts({ limit:200 }),
        erpService.getCategories(),
      ]);
      setProducts(pRes.data.data.products);
      setCategories(cRes.data.data.categories);
    } catch { toast.error('Gagal memuat produk'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (p) => {
    if (!window.confirm(`Nonaktifkan "${p.name}"?`)) return;
    try { await erpService.deleteProduct(p.id); toast.success('Dinonaktifkan'); fetch(); }
    catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  const columns = [
    {
      key:'name', label:'Produk', sortable:true,
      render: (v, row) => (
        <div>
          <p className="font-semibold text-[var(--text-primary)]">{v}</p>
          {row.sku && <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">{row.sku}</p>}
        </div>
      ),
    },
    {
      key:'category', label:'Kategori',
      render: (v) => <span className="text-[var(--text-secondary)]">{v?.name || '—'}</span>,
    },
    {
      key:'stock', label:'Stok', align:'center', nowrap:true,
      render: (v, row) => {
        const qty    = v?.qty || 0;
        const isLow  = qty <= row.stock_min;
        return (
          <div className="flex items-center justify-center gap-1.5">
            {isLow && <AlertTriangle size={13} className="text-amber-500" />}
            <span className={`font-semibold ${isLow ? 'text-amber-600' : 'text-[var(--text-primary)]'}`}>{qty}</span>
            <span className="text-xs text-[var(--text-muted)]">{row.unit}</span>
          </div>
        );
      },
    },
    {
      key:'sell_price', label:'Harga Jual', sortable:true, align:'right', nowrap:true,
      render: (v) => <span className="font-semibold">{toRp(v)}</span>,
    },
    {
      key:'buy_price', label:'HPP', align:'right', nowrap:true,
      render: (v) => <span className="text-[var(--text-muted)]">{toRp(v)}</span>,
    },
  ];

  return (
    <div className="section animate-fade-in">
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>ERP</span><span>›</span><span>Inventory</span><span>›</span>
        <span className="font-semibold text-[var(--text-primary)]">Produk</span>
      </nav>
      <div className="page-header">
        <div>
          <h1 className="page-title">Produk</h1>
          <p className="body-sm text-[var(--text-muted)]">{products.length} produk aktif</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        searchKeys={['name','sku','barcode']}
        searchPlaceholder="Cari produk, SKU, barcode..."
        filters={[
          { key:'branch_id', label:'Cabang', options:[{value:'1',label:'GP Racing'},{value:'2',label:'GP Distro'}] },
        ]}
        emptyIcon={<Package size={40} />}
        emptyText="Belum ada produk"
        emptyAction={<button onClick={()=>setShowAdd(true)} className="btn-primary">Tambah Produk</button>}
        actions={(row) => (
          <>
            <button onClick={()=>setStock(row)} className="btn-icon-sm" title="Adjust stok">
              <span className="text-xs font-bold">±</span>
            </button>
            <button onClick={()=>setEdit(row)} className="btn-icon-sm" title="Edit">
              <Edit3 size={13} />
            </button>
          </>
        )}
        pageSize={25}
        zebra
      />

      {showAdd     && <ProductModal branches={BRANCHES} categories={categories} onClose={()=>setShowAdd(false)} onSuccess={fetch} />}
      {editProduct && <ProductModal product={editProduct} branches={BRANCHES} categories={categories} onClose={()=>setEdit(null)} onSuccess={fetch} />}
      {stockProduct && <StockModal product={stockProduct} onClose={()=>setStock(null)} onSuccess={fetch} />}
    </div>
  );
}
