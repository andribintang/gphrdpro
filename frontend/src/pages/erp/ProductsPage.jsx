import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Edit3, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable, { StatusBadge } from '../../components/DataTable';
import { erpService, toRp, toRpShort } from '../../utils/erp/erpService';

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
        <div className="modal-header"><h3 className="text-sm font-bold">{isEdit?'Edit':'Tambah'} Produk</h3><button onClick={onClose} className="btn-icon-sm"><X size={14}/></button></div>
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
          <button onClick={handle} disabled={saving} className="btn-primary flex-1">{saving?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>}{isEdit?'Simpan':'Tambah'}</button>
        </div>
      </div>
    </div>
  );
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCats]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);

  const fetch = useCallback(async()=>{
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([erpService.getProducts({limit:500}), erpService.getCategories({limit:200})]);
      setProducts(pRes.data.data.products||[]);
      setCats(cRes.data.data.categories||[]);
    } catch { toast.error('Gagal memuat produk'); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{fetch();},[fetch]);

  const columns = [
    { key:'name', label:'Nama Produk', sortable:true, render:(v,row)=>(
      <div>
        <p className="font-semibold text-[var(--text-primary)] leading-tight">{v}</p>
        {row.sku && <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{row.sku}</p>}
      </div>
    )},
    { key:'category', label:'Kategori', nowrap:true, render:v=><span className="text-[var(--text-secondary)]">{v?.name||'—'}</span> },
    { key:'sell_price', label:'Harga Jual', sortable:true, align:'right', nowrap:true, render:v=><span className="font-semibold">{toRpShort(v)}</span> },
    { key:'buy_price', label:'Harga Beli', sortable:true, align:'right', nowrap:true, render:v=><span className="text-[var(--text-secondary)]">{toRpShort(v)}</span> },
    { key:'stock', label:'Stok', align:'center', nowrap:true, render:(v,row)=>{
      const qty=v?.qty||0; const min=row.stock_min||0;
      return <span className={`font-bold text-sm ${qty<=min?'text-red-500':'text-[var(--text-primary)]'}`}>
        {qty<0?<AlertTriangle size={14}/>:qty} <span className="text-[10px] font-normal text-[var(--text-muted)]">{row.unit}</span>
      </span>;
    }},
  ];

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Produk</h1><p className="body-sm text-[var(--text-muted)]">{products.length} produk</p></div>
        <button onClick={()=>setModal('new')} className="btn-primary"><Plus size={16}/> Tambah Produk</button>
      </div>
      <DataTable columns={columns} data={products} loading={loading}
        searchKeys={['name','sku','barcode']} searchPlaceholder="Cari nama, SKU, barcode..."
        emptyIcon={<Package size={40}/>} emptyText="Belum ada produk"
        emptyAction={<button onClick={()=>setModal('new')} className="btn-primary">Tambah Produk Pertama</button>}
        actions={(row)=>(<button onClick={()=>setModal(row)} className="btn-icon-sm"><Edit3 size={13}/></button>)}
        pageSize={25} zebra/>
      {modal && <ProductModal product={modal==='new'?null:modal} categories={categories} onClose={()=>setModal(null)} onSuccess={fetch}/>}
    </div>
  );
}
