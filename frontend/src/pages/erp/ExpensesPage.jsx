import { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, Edit3, Trash2, X, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable, { StatusBadge } from '../../components/DataTable';
import { erpService, toRp, toRpShort, EXPENSE_CATEGORIES } from '../../utils/erp/erpService';

const ExpenseModal = ({ expense, onClose, onSuccess }) => {
  const isEdit = !!expense;
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    branch_id: expense?.branch_id||1,
    category: expense?.category||'operasional',
    description: expense?.description||'',
    amount: expense?.amount||'',
    expense_date: expense?.expense_date||today,
    payment_method: expense?.payment_method||'cash',
    notes: expense?.notes||'',
  });
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));

  const handle = async () => {
    if (!form.description.trim()) { toast.error('Deskripsi wajib'); return; }
    if (!form.amount) { toast.error('Jumlah wajib'); return; }
    setSaving(true);
    try {
      if (isEdit) await erpService.updateExpense(expense.id, form);
      else await erpService.createExpense(form);
      toast.success(isEdit?'Pengeluaran diperbarui':'Pengeluaran ditambahkan');
      onSuccess(); onClose();
    } catch(e) { toast.error(e.response?.data?.message||'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-backdrop"/>
      <div className="modal-box max-w-md" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-sm font-bold">{isEdit?'Edit':'Tambah'} Pengeluaran</h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Cabang</label>
              <select value={form.branch_id} onChange={e=>sf('branch_id',parseInt(e.target.value))} className="input-base text-sm">
                <option value={1}>GP Racing</option><option value={2}>GP Distro</option>
              </select>
            </div>
            <div><label className="field-label">Tanggal</label>
              <input type="date" value={form.expense_date} onChange={e=>sf('expense_date',e.target.value)} className="input-base"/>
            </div>
          </div>
          <div><label className="field-label">Kategori</label>
            <select value={form.category} onChange={e=>sf('category',e.target.value)} className="input-base text-sm">
              {Object.entries(EXPENSE_CATEGORIES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div><label className="field-label">Deskripsi *</label>
            <input value={form.description} onChange={e=>sf('description',e.target.value)} placeholder="Bayar listrik bulan Mei" className="input-base" autoFocus/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Jumlah (Rp) *</label>
              <input type="number" value={form.amount} onChange={e=>sf('amount',e.target.value)} className="input-base"/>
            </div>
            <div><label className="field-label">Metode Bayar</label>
              <select value={form.payment_method} onChange={e=>sf('payment_method',e.target.value)} className="input-base text-sm">
                <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="qris">QRIS</option>
              </select>
            </div>
          </div>
          <div><label className="field-label">Catatan</label>
            <textarea value={form.notes} onChange={e=>sf('notes',e.target.value)} rows={2} className="input-base resize-none text-sm"/>
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

export default function ExpensesPage() {
  const [expenses, setExp]  = useState([]);
  const [loading, setLoad]  = useState(true);
  const [modal, setModal]   = useState(null);
  const [dateRange, setDate]= useState(()=>{
    const n=new Date();
    return { from:`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`, to:n.toISOString().split('T')[0] };
  });

  const fetch = useCallback(async()=>{
    setLoad(true);
    try {
      const res = await erpService.getExpenses({ date_from:dateRange.from, date_to:dateRange.to, limit:500 });
      setExp(res.data.data.expenses||[]);
    } catch { toast.error('Gagal memuat pengeluaran'); }
    finally { setLoad(false); }
  },[dateRange]);

  useEffect(()=>{fetch();},[fetch]);

  const deleteExpense = async(id) => {
    if (!confirm('Hapus pengeluaran ini?')) return;
    try { await erpService.deleteExpense(id); toast.success('Dihapus'); fetch(); }
    catch { toast.error('Gagal'); }
  };

  const totalAmount = expenses.reduce((s,e)=>s+parseFloat(e.amount||0),0);

  const columns = [
    { key:'expense_date', label:'Tanggal', sortable:true, nowrap:true, render:v=><span className="text-[var(--text-secondary)]">{v}</span> },
    { key:'category', label:'Kategori', nowrap:true, render:v=>{
      const cat=EXPENSE_CATEGORIES[v]||EXPENSE_CATEGORIES.lainnya;
      return <StatusBadge label={cat.label} color={`${cat.bg} ${cat.color} border-transparent`}/>;
    }},
    { key:'description', label:'Deskripsi', render:v=><span className="font-medium">{v}</span> },
    { key:'payment_method', label:'Metode', nowrap:true, render:v=><span className="capitalize text-[var(--text-secondary)]">{v}</span> },
    { key:'amount', label:'Jumlah', sortable:true, align:'right', nowrap:true, render:v=><span className="font-bold text-red-600 dark:text-red-400">{toRpShort(v)}</span> },
  ];

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Pengeluaran</h1><p className="body-sm text-[var(--text-muted)]">{expenses.length} transaksi</p></div>
        <div className="flex gap-2">
          <button onClick={fetch} className="btn-icon"><RefreshCw size={16}/></button>
          <button onClick={()=>setModal('new')} className="btn-primary"><Plus size={16}/> Tambah</button>
        </div>
      </div>

      <div className="card-sm mb-5 flex items-center gap-3 flex-wrap">
        <input type="date" value={dateRange.from} onChange={e=>setDate(r=>({...r,from:e.target.value}))} className="input-base h-9 text-sm flex-1 min-w-28"/>
        <span className="text-xs text-[var(--text-muted)]">s/d</span>
        <input type="date" value={dateRange.to} onChange={e=>setDate(r=>({...r,to:e.target.value}))} className="input-base h-9 text-sm flex-1 min-w-28"/>
        <div className="ml-auto text-right">
          <p className="text-xs text-[var(--text-muted)]">Total Periode</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{toRp(totalAmount)}</p>
        </div>
      </div>

      <DataTable columns={columns} data={expenses} loading={loading}
        searchKeys={['description','category']} searchPlaceholder="Cari deskripsi, kategori..."
        emptyIcon={<Wallet size={40}/>} emptyText="Belum ada pengeluaran"
        emptyAction={<button onClick={()=>setModal('new')} className="btn-primary">Tambah Pengeluaran</button>}
        actions={(row)=>(
          <div className="flex gap-1">
            <button onClick={()=>setModal(row)} className="btn-icon-sm"><Edit3 size={13}/></button>
            <button onClick={()=>deleteExpense(row.id)} className="btn-icon-sm hover:text-red-500"><Trash2 size={13}/></button>
          </div>
        )}
        pageSize={25} zebra/>
      {modal && <ExpenseModal expense={modal==='new'?null:modal} onClose={()=>setModal(null)} onSuccess={fetch}/>}
    </div>
  );
}
