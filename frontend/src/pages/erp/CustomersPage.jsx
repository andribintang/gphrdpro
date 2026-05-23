import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit3, X, Loader2, CheckCircle2, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import { erpService, toRpShort } from '../../utils/erp/erpService';

const CustomerModal = ({ customer, onClose, onSuccess }) => {
  const isEdit = !!customer;
  const [form, setForm] = useState({ name:customer?.name||'', phone:customer?.phone||'', email:customer?.email||'', address:customer?.address||'', city:customer?.city||'', province:customer?.province||'', postal_code:customer?.postal_code||'', notes:customer?.notes||'' });
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  const handle = async () => {
    if (!form.name.trim()) { toast.error('Nama wajib'); return; }
    setSaving(true);
    try {
      if (isEdit) await erpService.updateCustomer(customer.id, form);
      else await erpService.createCustomer(form);
      toast.success(isEdit?'Diperbarui':'Ditambahkan'); onSuccess(); onClose();
    } catch(e){ toast.error(e.response?.data?.message||'Gagal'); } finally { setSaving(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-backdrop"/>
      <div className="modal-box max-w-md" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3 className="text-sm font-bold">{isEdit?'Edit':'Tambah'} Pelanggan</h3><button onClick={onClose} className="btn-icon-sm"><X size={14}/></button></div>
        <div className="modal-body">
          {[{k:'name',l:'Nama *'},{k:'phone',l:'No. HP',t:'tel'},{k:'email',l:'Email',t:'email'},{k:'address',l:'Alamat'},{k:'city',l:'Kota'},{k:'province',l:'Provinsi'},{k:'postal_code',l:'Kode Pos'}].map(f=>(
            <div key={f.k}><label className="field-label">{f.l}</label><input type={f.t||'text'} value={form[f.k]} onChange={e=>sf(f.k,e.target.value)} className="input-base"/></div>
          ))}
          <div><label className="field-label">Catatan</label><textarea value={form.notes} onChange={e=>sf('notes',e.target.value)} rows={2} className="input-base resize-none"/></div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1">{saving?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>}{isEdit?'Simpan':'Tambah'}</button>
        </div>
      </div>
    </div>
  );
};

export default function CustomersPage() {
  const [customers, setCust] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editCust, setEdit]   = useState(null);

  const fetch = useCallback(async()=>{
    setLoading(true);
    try{ const res=await erpService.getCustomers({limit:500}); setCust(res.data.data.customers||[]); }
    catch{ toast.error('Gagal memuat pelanggan'); } finally{ setLoading(false); }
  },[]);

  useEffect(()=>{fetch();},[fetch]);

  const columns = [
    { key:'name', label:'Nama', sortable:true, render:(v,row)=>(
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{v?.[0]?.toUpperCase()}</div>
        <span className="font-semibold">{v}</span>
      </div>
    )},
    { key:'phone', label:'No. HP', nowrap:true, render:v=>v?<span className="flex items-center gap-1.5 text-[var(--text-secondary)]"><Phone size={12}/>{v}</span>:<span className="text-[var(--text-muted)]">—</span> },
    { key:'city', label:'Kota', render:v=>v?<span className="flex items-center gap-1.5 text-[var(--text-secondary)]"><MapPin size={12}/>{v}</span>:<span className="text-[var(--text-muted)]">—</span> },
    { key:'total_orders', label:'Order', sortable:true, align:'center', nowrap:true, render:v=><span className="font-semibold">{v||0}x</span> },
    { key:'total_spent', label:'Total Belanja', sortable:true, align:'right', nowrap:true, render:v=>v>0?<span className="font-semibold text-emerald-600 dark:text-emerald-400">{toRpShort(v)}</span>:<span className="text-[var(--text-muted)]">—</span> },
  ];

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Pelanggan</h1><p className="body-sm text-[var(--text-muted)]">{customers.length} terdaftar</p></div>
        <button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus size={16}/> Tambah</button>
      </div>
      <DataTable columns={columns} data={customers} loading={loading}
        searchKeys={['name','phone','email','city']} searchPlaceholder="Cari nama, HP, email..."
        emptyIcon={<Users size={40}/>} emptyText="Belum ada pelanggan"
        emptyAction={<button onClick={()=>setShowAdd(true)} className="btn-primary">Tambah Pelanggan</button>}
        actions={(row)=>(<button onClick={()=>setEdit(row)} className="btn-icon-sm"><Edit3 size={13}/></button>)}
        pageSize={25} zebra/>
      {showAdd && <CustomerModal onClose={()=>setShowAdd(false)} onSuccess={fetch}/>}
      {editCust && <CustomerModal customer={editCust} onClose={()=>setEdit(null)} onSuccess={fetch}/>}
    </div>
  );
}
