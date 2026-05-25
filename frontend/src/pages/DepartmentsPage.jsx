import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Edit3, Trash2, X, Loader2,
  CheckCircle2, RefreshCw, Search, Users, Zap,
  AlertTriangle, Hash, ChevronUp, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

// ── Form Modal ────────────────────────────────────────────────
const DeptModal = ({ dept, onClose, onSuccess }) => {
  const isEdit = !!dept;
  const [form, setForm] = useState({
    name:        dept?.name        || '',
    code:        dept?.code        || '',
    description: dept?.description || '',
    head_name:   dept?.head_name   || '',
    sort_order:  dept?.sort_order  || 0,
    is_active:   dept?.is_active   ?? true,
  });
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    if (!form.name.trim()) { toast.error('Nama departemen wajib'); return; }
    setSaving(true);
    try {
      if (isEdit) await api.put(`/departments/${dept.id}`, form);
      else        await api.post('/departments', form);
      toast.success(isEdit ? 'Departemen diperbarui' : 'Departemen ditambahkan');
      onSuccess(); onClose();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--brand-600)]/10 flex items-center justify-center">
              <Building2 size={15} className="text-[var(--brand-600)]"/>
            </div>
            <h3 className="text-sm font-bold">{isEdit ? 'Edit Departemen' : 'Tambah Departemen'}</h3>
          </div>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="field-label">Nama Departemen *</label>
              <input value={form.name} onChange={e => sf('name', e.target.value)}
                placeholder="mis. Human Resources" className="input-base" autoFocus/>
            </div>
            <div>
              <label className="field-label">Kode</label>
              <input value={form.code} onChange={e => sf('code', e.target.value.toUpperCase())}
                placeholder="mis. HR" maxLength={10} className="input-base font-mono uppercase"/>
            </div>
            <div>
              <label className="field-label">Urutan</label>
              <input type="number" value={form.sort_order} onChange={e => sf('sort_order', parseInt(e.target.value)||0)}
                min={0} className="input-base"/>
            </div>
            <div className="col-span-2">
              <label className="field-label">Kepala Departemen</label>
              <input value={form.head_name} onChange={e => sf('head_name', e.target.value)}
                placeholder="Nama kepala departemen (opsional)" className="input-base"/>
            </div>
            <div className="col-span-2">
              <label className="field-label">Deskripsi</label>
              <textarea value={form.description} onChange={e => sf('description', e.target.value)}
                rows={2} placeholder="Deskripsi singkat departemen" className="input-base resize-none text-sm"/>
            </div>
            <div className="col-span-2">
              <label className="field-label">Status</label>
              <div className="flex gap-2">
                {[{v:true,l:'Aktif'},{v:false,l:'Nonaktif'}].map(s => (
                  <button key={String(s.v)} type="button" onClick={() => sf('is_active', s.v)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      form.is_active === s.v
                        ? s.v ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 text-emerald-700 dark:text-emerald-400'
                               : 'bg-slate-100 dark:bg-slate-800 border-slate-400 text-slate-600 dark:text-slate-400'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'
                    }`}>
                    {s.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 size={15} className="animate-spin"/> : <CheckCircle2 size={15}/>}
            {isEdit ? 'Simpan' : 'Tambah'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Delete Confirm ────────────────────────────────────────────
const DeleteConfirm = ({ dept, onClose, onSuccess }) => {
  const [deleting, setDeleting] = useState(false);
  const handle = async () => {
    setDeleting(true);
    try {
      await api.delete(`/departments/${dept.id}`);
      toast.success(`${dept.name} dihapus`);
      onSuccess(); onClose();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setDeleting(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center mx-auto mb-4">
            <Trash2 size={22} className="text-red-600"/>
          </div>
          <h3 className="text-base font-bold mb-2">Hapus Departemen?</h3>
          <p className="text-sm text-[var(--text-muted)] mb-1">
            Departemen <strong className="text-[var(--text-primary)]">{dept.name}</strong> akan dihapus permanen.
          </p>
          {dept.employee_count > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-left">
              <AlertTriangle size={14} className="text-amber-600 flex-shrink-0"/>
              <p className="text-xs text-amber-700 dark:text-amber-400">Ada {dept.employee_count} karyawan aktif — tidak bisa dihapus</p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={deleting || dept.employee_count > 0}
            className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            {deleting ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
export default function DepartmentsPage() {
  const [depts, setDepts]     = useState([]);
  const [loading, setLoad]    = useState(true);
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(null);   // null | 'add' | dept obj
  const [delDept, setDel]     = useState(null);
  const [seeding, setSeed]    = useState(false);

  const fetch = useCallback(async () => {
    setLoad(true);
    try {
      const res = await api.get('/departments', { params: { search: search || undefined } });
      setDepts(res.data.data.departments || []);
    } catch { toast.error('Gagal memuat departemen'); }
    finally { setLoad(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetch, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetch, search]);

  const handleSeed = async () => {
    if (!confirm('Tambahkan departemen default? (Technology, HR, Finance, dll)')) return;
    setSeed(true);
    try {
      const res = await api.post('/departments/seed');
      toast.success(res.data.message);
      fetch();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSeed(false); }
  };

  const moveOrder = async (dept, dir) => {
    try {
      await api.put(`/departments/${dept.id}`, { sort_order: dept.sort_order + dir });
      fetch();
    } catch { toast.error('Gagal mengubah urutan'); }
  };

  const filtered = depts.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code?.toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = depts.filter(d => d.is_active).length;
  const totalEmp    = depts.reduce((s, d) => s + (d.employee_count || 0), 0);

  return (
    <div className="w-full animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Departemen</h1>
          <p className="body-sm text-[var(--text-muted)]">{depts.length} departemen · {totalEmp} karyawan aktif</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} disabled={loading} className="btn-icon">
            <RefreshCw size={16} className={loading?'animate-spin':''}/>
          </button>
          <button onClick={handleSeed} disabled={seeding} className="btn-secondary gap-2 text-sm">
            {seeding ? <Loader2 size={15} className="animate-spin"/> : <Zap size={15}/>}
            Seed Default
          </button>
          <button onClick={() => setModal('add')} className="btn-primary gap-2">
            <Plus size={16}/> Tambah
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { l:'Total',    v:depts.length,  color:'text-[var(--text-primary)]',  bg:'bg-[var(--bg-secondary)]' },
          { l:'Aktif',    v:activeCount,   color:'text-emerald-600',             bg:'bg-emerald-50 dark:bg-emerald-950/30' },
          { l:'Karyawan', v:totalEmp,      color:'text-[var(--brand-600)]',      bg:'bg-[var(--brand-600)]/5' },
        ].map(s => (
          <div key={s.l} className={`card p-4 ${s.bg}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{s.l}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama atau kode departemen..."
          className="w-full h-9 pl-9 pr-4 text-[13px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)]/20 transition-all"/>
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={13}/></button>}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[40px_1fr_80px_160px_120px_80px_100px] gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]/70">
          {['#','NAMA','KODE','KEPALA DEPT','KARYAWAN','STATUS','AKSI'].map(h => (
            <p key={h} className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{h}</p>
          ))}
        </div>

        {loading ? (
          [...Array(5)].map((_,i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-subtle)]">
              <div className="skeleton w-8 h-8 rounded-xl flex-shrink-0"/>
              <div className="flex-1 space-y-2"><div className="skeleton h-3.5 w-40 rounded"/><div className="skeleton h-3 w-28 rounded opacity-60"/></div>
              <div className="skeleton h-6 w-16 rounded-full"/>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={36} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30"/>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Belum ada departemen</p>
            <p className="text-xs text-[var(--text-muted)] mb-4">Tambah departemen baru atau gunakan data default</p>
            <div className="flex justify-center gap-2">
              <button onClick={handleSeed} className="btn-secondary text-sm gap-1.5"><Zap size={14}/>Seed Default</button>
              <button onClick={() => setModal('add')} className="btn-primary text-sm gap-1.5"><Plus size={14}/>Tambah Manual</button>
            </div>
          </div>
        ) : (
          filtered.map((dept, idx) => (
            <div key={dept.id}
              className={`flex flex-col md:grid md:grid-cols-[40px_1fr_80px_160px_120px_80px_100px] md:gap-4 px-5 py-4 border-b border-[var(--border-subtle)] last:border-0 transition-colors group hover:bg-[var(--bg-secondary)]/50 ${idx%2===0?'':'bg-[var(--bg-secondary)]/20'}`}>

              {/* Sort order */}
              <div className="hidden md:flex items-center">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveOrder(dept, -1)} className="text-[var(--text-muted)] hover:text-[var(--brand-600)] transition-colors"><ChevronUp size={12}/></button>
                  <span className="text-[11px] text-[var(--text-muted)] text-center leading-none">{dept.sort_order}</span>
                  <button onClick={() => moveOrder(dept, 1)} className="text-[var(--text-muted)] hover:text-[var(--brand-600)] transition-colors"><ChevronDown size={12}/></button>
                </div>
              </div>

              {/* Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[var(--brand-600)]/10 flex items-center justify-center flex-shrink-0">
                  <Building2 size={15} className="text-[var(--brand-600)]"/>
                </div>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate">{dept.name}</p>
                  {dept.description && <p className="text-[11px] text-[var(--text-muted)] truncate">{dept.description}</p>}
                </div>
              </div>

              {/* Code */}
              <div className="hidden md:flex items-center">
                {dept.code ? (
                  <span className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)] text-[11px] font-mono font-bold text-[var(--text-secondary)]">{dept.code}</span>
                ) : <span className="text-[var(--text-muted)] text-sm">—</span>}
              </div>

              {/* Head */}
              <div className="hidden md:flex items-center">
                <p className="text-[13px] text-[var(--text-secondary)] truncate">{dept.head_name || '—'}</p>
              </div>

              {/* Employee count */}
              <div className="hidden md:flex items-center gap-1.5">
                <Users size={13} className="text-[var(--text-muted)]"/>
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">{dept.employee_count || 0}</span>
                <span className="text-[11px] text-[var(--text-muted)]">karyawan</span>
              </div>

              {/* Status */}
              <div className="hidden md:flex items-center">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  dept.is_active
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dept.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}/>
                  {dept.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end md:justify-start gap-1 mt-2 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setModal(dept)} title="Edit"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--brand-600)] hover:bg-[var(--brand-600)]/8 transition-all">
                  <Edit3 size={14}/>
                </button>
                <button onClick={() => setDel(dept)} title="Hapus"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
                  <Trash2 size={14}/>
                </button>
              </div>

              {/* Mobile extra info */}
              <div className="flex md:hidden items-center gap-3 mt-2 flex-wrap">
                {dept.code && <span className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)] text-[11px] font-mono">{dept.code}</span>}
                <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1"><Users size={11}/>{dept.employee_count||0} karyawan</span>
                <span className={`text-[11px] font-semibold ${dept.is_active?'text-emerald-600':'text-slate-500'}`}>
                  {dept.is_active?'Aktif':'Nonaktif'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {modal && (
        <DeptModal
          dept={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={fetch}
        />
      )}
      {delDept && (
        <DeleteConfirm
          dept={delDept}
          onClose={() => setDel(null)}
          onSuccess={fetch}
        />
      )}
    </div>
  );
}
