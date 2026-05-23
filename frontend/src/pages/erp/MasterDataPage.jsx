import { useState, useEffect, useCallback } from 'react';
import { Tag, ShoppingCart, Plus, Edit3, Trash2, X, Loader2, CheckCircle2, RefreshCw, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService } from '../../utils/erp/erpService';

const CategoryModal = ({ category, onClose, onSuccess }) => {
  const isEdit = !!category;
  const [form, setForm] = useState({ branch_id:category?.branch_id||'', name:category?.name||'', description:category?.description||'', sort_order:category?.sort_order||0 });
  const [saving, setSaving] = useState(false);
  const handle = async () => {
    if (!form.name.trim()) { toast.error('Nama kategori wajib'); return; }
    setSaving(true);
    try {
      if (isEdit) await erpService.updateCategory(category.id, form);
      else await erpService.createCategory({...form,branch_id:form.branch_id||null});
      toast.success(isEdit?'Diperbarui':'Ditambahkan'); onSuccess(); onClose();
    } catch(e){ toast.error(e.response?.data?.message||'Gagal'); } finally { setSaving(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-backdrop"/>
      <div className="modal-box max-w-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3 className="text-sm font-bold">{isEdit?'Edit':'Tambah'} Kategori</h3><button onClick={onClose} className="btn-icon-sm"><X size={14}/></button></div>
        <div className="modal-body">
          <div><label className="field-label">Cabang</label>
            <select value={form.branch_id} onChange={e=>setForm(f=>({...f,branch_id:e.target.value}))} className="input-base text-sm">
              <option value="">Semua</option><option value="1">GP Racing</option><option value="2">GP Distro</option>
            </select>
          </div>
          <div><label className="field-label">Nama *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="input-base" autoFocus/></div>
          <div><label className="field-label">Urutan</label><input type="number" value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:parseInt(e.target.value)||0}))} className="input-base"/></div>
        </div>
        <div className="modal-footer"><button onClick={onClose} className="btn-secondary flex-1">Batal</button><button onClick={handle} disabled={saving} className="btn-primary flex-1">{saving?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>}{isEdit?'Simpan':'Tambah'}</button></div>
      </div>
    </div>
  );
};

const SubChannelModal = ({ subChannel, onClose, onSuccess }) => {
  const isEdit = !!subChannel;
  const [form, setForm] = useState({ channel:subChannel?.channel||'marketplace', name:subChannel?.name||'', description:subChannel?.description||'', sort_order:subChannel?.sort_order||0 });
  const [saving, setSaving] = useState(false);
  const handle = async () => {
    if (!form.name.trim()) { toast.error('Nama wajib'); return; }
    setSaving(true);
    try {
      if (isEdit) await erpService.updateSubChannel(subChannel.id, form);
      else await erpService.createSubChannel(form);
      toast.success(isEdit?'Diperbarui':'Ditambahkan'); onSuccess(); onClose();
    } catch(e){ toast.error(e.response?.data?.message||'Gagal'); } finally { setSaving(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-backdrop"/>
      <div className="modal-box max-w-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3 className="text-sm font-bold">{isEdit?'Edit':'Tambah'} Sub Channel</h3><button onClick={onClose} className="btn-icon-sm"><X size={14}/></button></div>
        <div className="modal-body">
          <div><label className="field-label">Channel</label>
            <div className="grid grid-cols-3 gap-2">
              {[['wa','WhatsApp'],['marketplace','Marketplace'],['direct','Langsung']].map(([k,l])=>(
                <button key={k} onClick={()=>setForm(f=>({...f,channel:k}))} className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.channel===k?'bg-[var(--brand-600)] text-white border-[var(--brand-600)]':'border-[var(--border)] text-[var(--text-secondary)]'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div><label className="field-label">Nama *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="TOKOPEDIA #01" className="input-base" autoFocus/></div>
          <div><label className="field-label">Urutan</label><input type="number" value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:parseInt(e.target.value)||0}))} className="input-base"/></div>
        </div>
        <div className="modal-footer"><button onClick={onClose} className="btn-secondary flex-1">Batal</button><button onClick={handle} disabled={saving} className="btn-primary flex-1">{saving?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>}{isEdit?'Simpan':'Tambah'}</button></div>
      </div>
    </div>
  );
};

export default function MasterDataPage() {
  const [tab, setTab]           = useState('categories');
  const [categories, setCats]   = useState([]);
  const [subChannels, setSCs]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [catModal, setCatModal] = useState(null);
  const [scModal, setScModal]   = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([erpService.getCategories({limit:200}), erpService.getAllSubChannels()]);
      setCats(cRes.data.data.categories||[]); setSCs(sRes.data.data.sub_channels||[]);
    } catch { toast.error('Gagal memuat'); } finally { setLoading(false); }
  }, []);

  useEffect(()=>{fetchAll();},[fetchAll]);

  const deleteCat = async(id,name) => { if(!confirm(`Hapus "${name}"?`)) return; try{await erpService.deleteCategory(id);toast.success('Dihapus');fetchAll();}catch(e){toast.error(e.response?.data?.message||'Gagal');} };
  const deleteSC  = async(id,name) => { if(!confirm(`Nonaktifkan "${name}"?`)) return; try{await erpService.deleteSubChannel(id);toast.success('Dinonaktifkan');fetchAll();}catch(e){toast.error(e.response?.data?.message||'Gagal');} };

  const CH_COLORS = { wa:'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300', marketplace:'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300', direct:'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' };
  const CH_LABELS = { wa:'WhatsApp', marketplace:'Marketplace', direct:'Langsung' };
  const grouped = { marketplace:subChannels.filter(s=>s.channel==='marketplace'), direct:subChannels.filter(s=>s.channel==='direct'), wa:subChannels.filter(s=>s.channel==='wa') };

  return (
    <div className="section animate-fade-in">
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>ERP</span><span>›</span><span className="font-semibold text-[var(--text-primary)]">Master Data</span>
      </nav>
      <div className="page-header">
        <div><h1 className="page-title">Master Data ERP</h1><p className="body-sm text-[var(--text-muted)]">Kategori produk & sub channel</p></div>
        <button onClick={fetchAll} className="btn-icon"><RefreshCw size={16}/></button>
      </div>
      <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
        {[{k:'categories',l:'Kategori Produk',icon:Tag},{k:'subchannels',l:'Sub Channel',icon:ShoppingCart}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${tab===t.k?'border-[var(--brand-600)] text-[var(--brand-600)]':'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
            <t.icon size={15}/>{t.l}
          </button>
        ))}
      </div>
      {tab==='categories' && (
        <div>
          <div className="flex justify-between mb-4"><p className="text-sm text-[var(--text-muted)]">{categories.length} kategori</p><button onClick={()=>setCatModal('new')} className="btn-primary"><Plus size={15}/> Tambah</button></div>
          {loading ? <div className="skeleton h-32"/> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map(cat=>(
                <div key={cat.id} className="card p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--brand-50)] dark:bg-[var(--brand-100)] flex items-center justify-center flex-shrink-0"><Tag size={15} className="text-[var(--brand-600)]"/></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{cat.name}</p><p className="text-xs text-[var(--text-muted)]">{cat.branch_id===1?'GP Racing':cat.branch_id===2?'GP Distro':'Semua'}</p></div>
                  <div className="flex gap-1"><button onClick={()=>setCatModal(cat)} className="btn-icon-sm"><Edit3 size={13}/></button><button onClick={()=>deleteCat(cat.id,cat.name)} className="btn-icon-sm hover:text-red-500"><Trash2 size={13}/></button></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab==='subchannels' && (
        <div>
          <div className="flex justify-between mb-4"><p className="text-sm text-[var(--text-muted)]">{subChannels.length} sub channel</p><button onClick={()=>setScModal('new')} className="btn-primary"><Plus size={15}/> Tambah</button></div>
          {loading ? <div className="skeleton h-32"/> : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([ch,items])=>(
                <div key={ch}>
                  <div className="flex items-center gap-2 mb-2"><span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${CH_COLORS[ch]}`}>{CH_LABELS[ch]}</span><span className="text-xs text-[var(--text-muted)]">{items.length} item</span></div>
                  {items.length===0 ? <p className="text-xs text-[var(--text-muted)] pl-2 italic">Belum ada</p> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {items.map(sc=>(
                        <div key={sc.id} className={`card p-3.5 flex items-center gap-3 ${!sc.is_active?'opacity-50':''}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${CH_COLORS[ch]}`}><LayoutGrid size={13}/></div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{sc.name}</p></div>
                          <div className="flex gap-1"><button onClick={()=>setScModal(sc)} className="btn-icon-sm"><Edit3 size={13}/></button><button onClick={()=>deleteSC(sc.id,sc.name)} className="btn-icon-sm hover:text-red-500"><Trash2 size={13}/></button></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {catModal && <CategoryModal category={catModal==='new'?null:catModal} onClose={()=>setCatModal(null)} onSuccess={fetchAll}/>}
      {scModal  && <SubChannelModal subChannel={scModal==='new'?null:scModal} onClose={()=>setScModal(null)} onSuccess={fetchAll}/>}
    </div>
  );
}
