import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Plus, Eye, X, Loader2, CheckCircle2, RefreshCw, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable, { StatusBadge } from '../../components/DataTable';
import { erpService, toRp, toRpShort, PURCHASE_STATUS } from '../../utils/erp/erpService';
import PeriodFilter from '../../components/PeriodFilter';

const STATUS_COLORS = {
  draft:    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200',
  ordered:  'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200',
  partial:  'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200',
  received: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200',
  cancelled:'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200',
};

const CreatePOModal = ({ onClose, onSuccess }) => {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ branch_id:1, supplier_name:'', supplier_phone:'', order_date:today, expected_date:'', notes:'' });
  const [items, setItems] = useState([{ product_id:'', product_name:'', qty_ordered:1, buy_price:0 }]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(()=>{ erpService.getProducts({limit:500}).then(r=>setProducts(r.data.data.products||[])).catch(()=>{}); },[]);

  const addItem = () => setItems(p=>[...p,{product_id:'',product_name:'',qty_ordered:1,buy_price:0}]);
  const removeItem = (i) => setItems(p=>p.filter((_,idx)=>idx!==i));
  const updateItem = (i,k,v) => setItems(p=>p.map((it,idx)=>idx===i?{...it,[k]:v}:it));
  const selectProduct = (i, pid) => {
    const p = products.find(p=>p.id==pid);
    if (p) updateItem(i,'product_id',pid); updateItem(i,'product_name',p?.name||''); updateItem(i,'buy_price',p?.buy_price||0);
  };

  const total = items.reduce((s,i)=>s+(parseFloat(i.buy_price)||0)*(parseInt(i.qty_ordered)||0),0);

  const handle = async() => {
    if (!form.supplier_name) { toast.error('Nama supplier wajib'); return; }
    if (!items[0].product_id) { toast.error('Pilih minimal 1 produk'); return; }
    setSaving(true);
    try {
      await erpService.createPurchase({ ...form, items });
      toast.success('PO dibuat'); onSuccess(); onClose();
    } catch(e) { toast.error(e.response?.data?.message||'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-backdrop"/>
      <div className="modal-box max-w-lg" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3 className="text-sm font-bold">Buat Purchase Order</h3><button onClick={onClose} className="btn-icon-sm"><X size={14}/></button></div>
        <div className="modal-body">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Cabang</label>
              <select value={form.branch_id} onChange={e=>sf('branch_id',parseInt(e.target.value))} className="input-base text-sm">
                <option value={1}>GP Racing</option><option value={2}>GP Distro</option>
              </select>
            </div>
            <div><label className="field-label">Tanggal PO</label>
              <input type="date" value={form.order_date} onChange={e=>sf('order_date',e.target.value)} className="input-base"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Nama Supplier *</label><input value={form.supplier_name} onChange={e=>sf('supplier_name',e.target.value)} className="input-base" autoFocus/></div>
            <div><label className="field-label">No. HP Supplier</label><input value={form.supplier_phone} onChange={e=>sf('supplier_phone',e.target.value)} className="input-base"/></div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2"><label className="field-label">Item</label><button onClick={addItem} className="text-xs text-[var(--brand-600)] font-semibold">+ Tambah</button></div>
            <div className="space-y-2">
              {items.map((item,i)=>(
                <div key={i} className="flex gap-2 items-center">
                  <select value={item.product_id} onChange={e=>selectProduct(i,e.target.value)} className="input-base text-xs flex-1">
                    <option value="">Pilih produk</option>
                    {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" value={item.qty_ordered} onChange={e=>updateItem(i,'qty_ordered',e.target.value)} placeholder="Qty" className="input-base w-16 text-xs text-center"/>
                  <input type="number" value={item.buy_price} onChange={e=>updateItem(i,'buy_price',e.target.value)} placeholder="Harga" className="input-base w-28 text-xs"/>
                  {items.length>1&&<button onClick={()=>removeItem(i)} className="btn-icon-sm text-red-500"><X size={12}/></button>}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between font-bold p-3 rounded-xl bg-[var(--bg-secondary)]">
            <span>Total</span><span className="text-[var(--brand-600)]">{toRp(total)}</span>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1">{saving?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>} Buat PO</button>
        </div>
      </div>
    </div>
  );
};

export default function PurchasesPage() {
  const [purchases, setPO] = useState([]);
  const [loading, setLoad] = useState(true);
  const [showAdd, setAdd]  = useState(false);
  const [dateRange, setDate]= useState(()=>{
    const n=new Date();
    return {from:`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`,to:n.toISOString().split('T')[0]};
  });
  const [branch, setBranch] = useState('');

  const fetch = useCallback(async()=>{
    setLoad(true);
    try {
      const r = await erpService.getPurchases({
        limit:200, branch_id:branch||undefined,
        date_from:dateRange.from, date_to:dateRange.to
      });
      setPO(r.data.data.purchases||[]);
    }
    catch { toast.error('Gagal memuat pembelian'); } finally { setLoad(false); }
  },[branch, dateRange]);

  useEffect(()=>{fetch();},[fetch]);

  const receive = async(id) => {
    try { await erpService.receivePurchase(id,{}); toast.success('PO diterima'); fetch(); }
    catch(e) { toast.error(e.response?.data?.message||'Gagal'); }
  };

  const columns = [
    { key:'po_no', label:'No. PO', nowrap:true, render:v=><span className="font-mono text-xs font-semibold">{v}</span> },
    { key:'order_date', label:'Tanggal', sortable:true, nowrap:true, render:v=><span className="text-[var(--text-secondary)]">{v}</span> },
    { key:'supplier_name', label:'Supplier', render:v=><span className="font-medium">{v||'—'}</span> },
    { key:'status', label:'Status', nowrap:true, render:v=>{const s=PURCHASE_STATUS[v]||PURCHASE_STATUS.draft;return <StatusBadge label={s.label} color={STATUS_COLORS[v]||STATUS_COLORS.draft}/>;} },
    { key:'total_amount', label:'Total', sortable:true, align:'right', nowrap:true, render:v=><span className="font-bold">{toRpShort(v)}</span> },
  ];

  return (
    <div className="section animate-fade-in">
      {/* Period Filter */}
      <div className="card-sm mb-5 space-y-3">
        <PeriodFilter value={dateRange} onChange={setDate}/>
        <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm">
          <option value="">Semua Cabang</option><option value="1">GP Racing</option><option value="2">GP Distro</option>
        </select>
      </div>
      <div className="page-header">
        <div><h1 className="page-title">Pembelian</h1><p className="body-sm text-[var(--text-muted)]">{purchases.length} purchase order</p></div>
        <div className="flex gap-2">
          <button onClick={fetch} className="btn-icon"><RefreshCw size={16}/></button>
          <button onClick={()=>setAdd(true)} className="btn-primary"><Plus size={16}/> Buat PO</button>
        </div>
      </div>
      <DataTable columns={columns} data={purchases} loading={loading}
        searchKeys={['po_no','supplier_name']} searchPlaceholder="Cari no. PO, supplier..."
        emptyIcon={<ShoppingBag size={40}/>} emptyText="Belum ada purchase order"
        emptyAction={<button onClick={()=>setAdd(true)} className="btn-primary">Buat PO Pertama</button>}
        actions={(row)=>row.status==='ordered'?(
          <button onClick={()=>receive(row.id)} className="btn-secondary text-xs px-2.5 h-7 gap-1"><Package size={12}/> Terima</button>
        ):null}
        pageSize={25} zebra/>
      {showAdd && <CreatePOModal onClose={()=>setAdd(false)} onSuccess={fetch}/>}
    </div>
  );
}
