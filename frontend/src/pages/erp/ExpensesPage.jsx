import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Plus, X, Loader2, CheckCircle2,
  RefreshCw, Edit3, Trash2, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRp, toRpShort, EXPENSE_CATEGORIES } from '../../utils/erp/erpService';

const ExpenseModal = ({ expense, onClose, onSuccess }) => {
  const isEdit = !!expense;
  const [form, setForm] = useState({
    branch_id:      expense?.branch_id      || '',
    category:       expense?.category       || 'operasional',
    description:    expense?.description    || '',
    amount:         expense?.amount         || '',
    expense_date:   expense?.expense_date   || new Date().toISOString().split('T')[0],
    payment_method: expense?.payment_method || 'cash',
    notes:          expense?.notes          || '',
  });
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => setForm(f => ({...f,[k]:v}));

  const handle = async () => {
    if (!form.description.trim()) { toast.error('Keterangan wajib diisi'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Jumlah wajib diisi'); return; }
    setSaving(true);
    try {
      const payload = { ...form, branch_id: form.branch_id || null, amount: parseFloat(form.amount) };
      if (isEdit) await erpService.updateExpense(expense.id, payload);
      else        await erpService.createExpense(payload);
      toast.success(isEdit ? 'Pengeluaran diperbarui' : 'Pengeluaran dicatat');
      onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{isEdit ? 'Edit Pengeluaran' : 'Catat Pengeluaran'}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {/* Category */}
          <div>
            <label className="field-label">Kategori</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(EXPENSE_CATEGORIES).map(([k,v]) => (
                <button key={k} onClick={() => sf('category', k)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left transition-all ${form.category===k ? `${v.bg} ${v.color} border-current` : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="field-label">Keterangan <span className="text-red-500">*</span></label>
            <input value={form.description} onChange={e => sf('description', e.target.value)}
              placeholder="Bayar listrik bulan Mei..." className="input-base text-sm" autoFocus />
          </div>

          {/* Amount */}
          <div>
            <label className="field-label">Jumlah <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">Rp</span>
              <input type="number" value={form.amount} onChange={e => sf('amount', e.target.value)}
                placeholder="0" className="input-base pl-10 text-sm text-right" />
            </div>
          </div>

          {/* Date + Branch */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Tanggal</label>
              <input type="date" value={form.expense_date} onChange={e => sf('expense_date', e.target.value)} className="input-base text-sm" />
            </div>
            <div>
              <label className="field-label">Cabang</label>
              <select value={form.branch_id} onChange={e => sf('branch_id', e.target.value)} className="input-base text-sm">
                <option value="">Semua</option>
                <option value="1">GP Racing</option>
                <option value="2">GP Distro</option>
              </select>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="field-label">Metode Bayar</label>
            <div className="grid grid-cols-3 gap-2">
              {[{v:'cash',l:'Cash'},{v:'transfer',l:'Transfer'},{v:'qris',l:'QRIS'}].map(m => (
                <button key={m.v} onClick={() => sf('payment_method', m.v)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.payment_method===m.v ? 'bg-brand-500 text-white border-brand-500' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                  {m.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Catatan</label>
            <textarea value={form.notes} onChange={e => sf('notes', e.target.value)} rows={2} className="input-base text-sm resize-none" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[var(--border)] flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 h-11 text-sm">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1 h-11 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isEdit ? 'Simpan' : 'Catat'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotal] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [editItem, setEdit]     = useState(null);
  const [catFilter, setCF]      = useState('');
  const [branchFilter, setBF]   = useState('');
  const [dateRange, setDate]    = useState(() => {
    const now  = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      to:   now.toISOString().split('T')[0],
    };
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpService.getExpenses({
        category:  catFilter    || undefined,
        branch_id: branchFilter || undefined,
        date_from: dateRange.from,
        date_to:   dateRange.to,
        limit: 100,
      });
      setExpenses(res.data.data.expenses);
      setTotal(res.data.data.total_amount || 0);
    } catch { toast.error('Gagal memuat pengeluaran'); }
    finally { setLoading(false); }
  }, [catFilter, branchFilter, dateRange]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id) => {
    if (!confirm('Hapus pengeluaran ini?')) return;
    try { await erpService.deleteExpense(id); toast.success('Dihapus'); fetch(); }
    catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  // By category summary
  const byCat = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount);
    return acc;
  }, {});
  const maxCat = Math.max(...Object.values(byCat), 1);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Pengeluaran</h1>
          <p className="text-sm text-[var(--text-secondary)]">{expenses.length} transaksi</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowAdd(true)} className="btn-primary h-9 px-3 text-sm"><Plus className="w-4 h-4" /> Catat</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { l:'Hari Ini',   f:() => { const t=new Date().toISOString().split('T')[0]; setDate({from:t,to:t}); }},
            { l:'Bulan Ini',  f:() => { const n=new Date(); setDate({from:new Date(n.getFullYear(),n.getMonth(),1).toISOString().split('T')[0],to:n.toISOString().split('T')[0]}); }},
            { l:'Bulan Lalu', f:() => { const n=new Date(); setDate({from:new Date(n.getFullYear(),n.getMonth()-1,1).toISOString().split('T')[0],to:new Date(n.getFullYear(),n.getMonth(),0).toISOString().split('T')[0]}); }},
          ].map(q => (
            <button key={q.l} onClick={q.f} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-brand-50 dark:hover:bg-brand-950 hover:text-brand-600 transition-all">{q.l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={dateRange.from} onChange={e => setDate(r=>({...r,from:e.target.value}))} className="input-base text-sm h-9 flex-1 min-w-28" />
          <span className="text-xs text-[var(--text-muted)]">s/d</span>
          <input type="date" value={dateRange.to} onChange={e => setDate(r=>({...r,to:e.target.value}))} className="input-base text-sm h-9 flex-1 min-w-28" />
          <select value={branchFilter} onChange={e => setBF(e.target.value)} className="input-base text-sm h-9">
            <option value="">Semua Cabang</option>
            <option value="1">GP Racing</option>
            <option value="2">GP Distro</option>
          </select>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setCF('')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${!catFilter ? 'bg-brand-500 text-white border-brand-500' : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)]'}`}>Semua</button>
          {Object.entries(EXPENSE_CATEGORIES).map(([k,v]) => (
            <button key={k} onClick={() => setCF(k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${catFilter===k ? `${v.bg} ${v.color} border-current` : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)]'}`}>{v.label}</button>
          ))}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-5 space-y-4 lg:space-y-0">
        {/* Left — list */}
        <div className="lg:col-span-2">
          {/* Total card */}
          <div className="card p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Pengeluaran</p>
              <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{toRp(totalAmount)}</p>
            </div>
            <Wallet className="w-10 h-10 text-red-200 dark:text-red-900" />
          </div>

          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-10 card">
              <Wallet className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
              <p className="text-sm text-[var(--text-muted)]">Belum ada pengeluaran</p>
            </div>
          ) : (
            <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
              {expenses.map(e => {
                const cat = EXPENSE_CATEGORIES[e.category] || EXPENSE_CATEGORIES.lainnya;
                return (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                      <Wallet className={`w-4 h-4 ${cat.color}`} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{e.description}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cat.bg} ${cat.color}`}>{cat.label}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{e.expense_date}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">{toRpShort(e.amount)}</p>
                      <div className="flex gap-1 justify-end mt-1">
                        <button onClick={() => setEdit(e)} className="w-6 h-6 rounded hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => handleDelete(e.id)} className="w-6 h-6 rounded hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center text-[var(--text-muted)] hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — summary */}
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Per Kategori</p>
            <div className="space-y-3">
              {Object.entries(byCat).sort((a,b) => b[1]-a[1]).map(([k,v]) => {
                const cat = EXPENSE_CATEGORIES[k] || EXPENSE_CATEGORIES.lainnya;
                return (
                  <div key={k}>
                    <div className="flex justify-between mb-1">
                      <span className={`text-xs font-semibold ${cat.color}`}>{cat.label}</span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">{toRpShort(v)}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cat.bg.replace('bg-','bg-').replace('100','400').replace('950','600')}`}
                        style={{ width: `${(v/maxCat)*100}%` }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(byCat).length === 0 && <p className="text-xs text-[var(--text-muted)] text-center py-4">Tidak ada data</p>}
            </div>
          </div>
        </div>
      </div>

      {showAdd && <ExpenseModal onClose={() => setShowAdd(false)} onSuccess={fetch} />}
      {editItem && <ExpenseModal expense={editItem} onClose={() => setEdit(null)} onSuccess={fetch} />}
    </div>
  );
}
