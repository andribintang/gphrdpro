import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, Briefcase, Percent, Star,
  Target, Plus, Edit3, Trash2, X, Loader2,
  CheckCircle2, ToggleLeft, ToggleRight, RefreshCw, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { incentiveService, toRp, MONTHS_ID } from '../../utils/incentive/incentiveService';

// ── Shared Modal ──────────────────────────────────────────────
const Modal = ({ title, onClose, children, footer }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
    <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[90vh] flex flex-col"
      onClick={e => e.stopPropagation()}>
      <div className="flex justify-center pt-3 sm:hidden flex-shrink-0"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">{children}</div>
      {footer && <div className="px-5 py-4 border-t border-[var(--border)] flex gap-2 flex-shrink-0">{footer}</div>}
    </div>
  </div>
);

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

// ════════════════════════════════════════════════════════════════
// BRANCHES TAB
// ════════════════════════════════════════════════════════════════
const BranchesTab = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | 'add' | {branch}
  const [form, setForm]         = useState({ code:'', name:'', business_type:'', address:'', phone:'', email:'' });
  const [saving, setSaving]     = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await incentiveService.getBranches(); setBranches(r.data.data.branches); }
    catch { toast.error('Gagal memuat cabang'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openAdd  = () => { setForm({ code:'', name:'', business_type:'', address:'', phone:'', email:'' }); setModal('add'); };
  const openEdit = (b) => { setForm(b); setModal(b); };

  const handleSave = async () => {
    if (!form.code || !form.name) { toast.error('Kode dan nama wajib diisi'); return; }
    setSaving(true);
    try {
      if (modal === 'add') { await incentiveService.createBranch(form); toast.success(`Cabang ${form.name} dibuat`); }
      else { await incentiveService.updateBranch(modal.id, form); toast.success('Cabang diperbarui'); }
      setModal(null); fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (b) => {
    if (!confirm(`Hapus cabang ${b.name}?`)) return;
    try { await incentiveService.deleteBranch(b.id); toast.success('Cabang dihapus'); fetch(); }
    catch (e) { toast.error(e.response?.data?.message || 'Gagal hapus'); }
  };

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-[var(--text-muted)]">{branches.length} cabang terdaftar</p>
        <button onClick={openAdd} className="btn-primary h-8 px-3 text-xs"><Plus className="w-3.5 h-3.5" /> Tambah</button>
      </div>
      {loading ? <div className="space-y-2">{[...Array(2)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      : branches.map(b => (
        <div key={b.id} className="card p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black">{b.code[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary)]">{b.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{b.business_type}</p>
            <p className="text-xs text-[var(--text-muted)]">{b.employee_count || 0} karyawan aktif</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => openEdit(b)} className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><Edit3 className="w-3.5 h-3.5" /></button>
            <button onClick={() => handleDelete(b)} className="w-8 h-8 rounded-lg border border-red-200 dark:border-red-900 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      ))}

      {modal !== null && (
        <Modal title={modal === 'add' ? 'Tambah Cabang' : 'Edit Cabang'} onClose={() => setModal(null)}
          footer={<><button onClick={() => setModal(null)} className="btn-secondary flex-1 h-10 text-sm">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-10 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Simpan
            </button></>}>
          <Field label="Kode" required><input value={form.code} onChange={e => sf('code', e.target.value.toUpperCase())} placeholder="GPRACING" className="input-base text-sm font-mono" /></Field>
          <Field label="Nama Cabang" required><input value={form.name} onChange={e => sf('name', e.target.value)} placeholder="GP Racing" className="input-base text-sm" /></Field>
          <Field label="Bidang Usaha"><input value={form.business_type} onChange={e => sf('business_type', e.target.value)} placeholder="Online Store Spare Part Racing" className="input-base text-sm" /></Field>
          <Field label="Alamat"><textarea value={form.address} onChange={e => sf('address', e.target.value)} rows={2} className="input-base text-sm" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telepon"><input value={form.phone} onChange={e => sf('phone', e.target.value)} placeholder="08xx" className="input-base text-sm" /></Field>
            <Field label="Email"><input value={form.email} onChange={e => sf('email', e.target.value)} placeholder="email@" className="input-base text-sm" /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
};


// ════════════════════════════════════════════════════════════════
// POSITIONS TAB — Jabatan per cabang
// ════════════════════════════════════════════════════════════════
const PositionsTab = () => {
  const [positions, setPositions]   = useState([]);
  const [branches, setBranches]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filterBranch, setFB]       = useState('');
  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState({ branch_id:'', name:'', level: 1 });
  const [saving, setSaving]         = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, bRes] = await Promise.all([
        incentiveService.getPositions({ branch_id: filterBranch || undefined }),
        incentiveService.getBranches(),
      ]);
      setPositions(pRes.data.data.positions);
      setBranches(bRes.data.data.branches);
    } catch { toast.error('Gagal memuat jabatan'); }
    finally { setLoading(false); }
  }, [filterBranch]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.branch_id || !form.name.trim()) {
      toast.error('Cabang dan nama jabatan wajib diisi'); return;
    }
    setSaving(true);
    try {
      if (modal === 'add') {
        await incentiveService.createPosition(form);
        toast.success(`Jabatan "${form.name}" ditambahkan`);
      } else {
        await incentiveService.updatePosition(modal.id, form);
        toast.success('Jabatan diperbarui');
      }
      setModal(null); fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (pos) => {
    if (!confirm(`Hapus jabatan "${pos.name}"?`)) return;
    try {
      await incentiveService.deletePosition(pos.id);
      toast.success('Jabatan dihapus');
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal menghapus'); }
  };

  // Group by branch
  const grouped = {};
  positions.forEach(p => {
    const key = p.branch?.name || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  const LEVEL_LABELS = { 1:'Staff', 2:'Senior / Koordinator', 3:'Manager / Lead' };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select value={filterBranch} onChange={e => setFB(e.target.value)} className="input-base text-sm flex-1">
          <option value="">Semua Cabang</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button onClick={() => { setForm({ branch_id: filterBranch || branches[0]?.id || '', name:'', level:1 }); setModal('add'); }}
          className="btn-primary h-10 px-3 text-xs flex-shrink-0">
          <Plus className="w-3.5 h-3.5" /> Tambah
        </button>
      </div>

      <p className="text-xs text-[var(--text-muted)]">{positions.length} jabatan terdaftar</p>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
      ) : positions.length === 0 ? (
        <div className="text-center py-10">
          <Briefcase className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada jabatan</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Klik "Tambah" untuk menambahkan jabatan baru</p>
        </div>
      ) : (
        Object.entries(grouped).map(([branchName, posts]) => (
          <div key={branchName}>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> {branchName} ({posts.length})
            </p>
            <div className="table-wrapper">
              {posts.map(pos => (
                <div key={pos.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{pos.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{LEVEL_LABELS[pos.level] || 'Staff'}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => { setForm({ branch_id: pos.branch_id, name: pos.name, level: pos.level }); setModal(pos); }}
                      className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDelete(pos)}
                      className="w-7 h-7 rounded-lg border border-red-200 dark:border-red-900 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {modal !== null && (
        <Modal
          title={modal === 'add' ? 'Tambah Jabatan' : `Edit Jabatan: ${modal.name}`}
          onClose={() => setModal(null)}
          footer={
            <>
              <button onClick={() => setModal(null)} className="btn-secondary flex-1 h-10 text-sm">Batal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-10 text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Simpan
              </button>
            </>
          }>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Cabang <span className="text-red-500">*</span>
            </label>
            <select value={form.branch_id} onChange={e => sf('branch_id', e.target.value)} className="input-base text-sm">
              <option value="">Pilih cabang...</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Nama Jabatan <span className="text-red-500">*</span>
            </label>
            <input value={form.name} onChange={e => sf('name', e.target.value)}
              placeholder="Contoh: Admin, Sales, CS, Packing..."
              className="input-base text-sm"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Level</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(LEVEL_LABELS).map(([v, l]) => (
                <button key={v} type="button" onClick={() => sf('level', parseInt(v))}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all text-center
                    ${form.level === parseInt(v)
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// EMPLOYEES TAB
// ════════════════════════════════════════════════════════════════
const EmployeesTab = () => {
  const [employees, setEmps]   = useState([]);
  const [branches, setBranches] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [modal, setModal]      = useState(null);
  const [filterBranch, setFB]  = useState('');
  const [form, setForm]        = useState({ name:'', email:'', phone:'', branch_id:'', position_id:'', join_date: new Date().toISOString().split('T')[0], employee_code:'', employment_status:'kontrak', is_active: true });
  const [saving, setSaving]    = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, bRes, pRes] = await Promise.all([
        incentiveService.getEmployees({ branch_id: filterBranch || undefined }),
        incentiveService.getBranches(),
        incentiveService.getPositions({ branch_id: filterBranch || undefined }),
      ]);
      setEmps(eRes.data.data.employees);
      setBranches(bRes.data.data.branches);
      setPositions(pRes.data.data.positions);
    } catch { toast.error('Gagal memuat data'); } finally { setLoading(false); }
  }, [filterBranch]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const openAdd  = () => { setForm({ name:'', email:'', phone:'', branch_id: branches[0]?.id || '', position_id:'', join_date: new Date().toISOString().split('T')[0], employee_code:'', employment_status:'kontrak', is_active: true }); setModal('add'); };
  const openEdit = (e) => { setForm({ ...e, branch_id: e.branch_id, position_id: e.position_id || '', employment_status: e.employment_status || 'kontrak', is_active: e.is_active !== false }); setModal(e); };

  const handleSave = async () => {
    if (!form.name || !form.branch_id) { toast.error('Nama dan cabang wajib diisi'); return; }
    setSaving(true);
    try {
      if (modal === 'add') { await incentiveService.createEmployee(form); toast.success(`${form.name} ditambahkan`); }
      else { await incentiveService.updateEmployee(modal.id, form); toast.success('Data diperbarui'); }
      setModal(null); fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (e) => {
    try {
      await incentiveService.updateEmployee(e.id, { is_active: !e.is_active });
      toast.success(`${e.name} ${e.is_active ? 'dinonaktifkan' : 'diaktifkan'}`);
      fetchAll();
    } catch { toast.error('Gagal'); }
  };

  const filteredPositions = positions.filter(p => !form.branch_id || p.branch_id == form.branch_id);

  // Quick-add jabatan baru tanpa menutup form karyawan
  const [showQuickPos, setShowQuickPos] = useState(false);
  const [quickPosName, setQuickPosName] = useState('');
  const [savingPos, setSavingPos]       = useState(false);

  const handleQuickAddPosition = async () => {
    if (!form.branch_id) { toast.error('Pilih cabang dulu sebelum tambah jabatan'); return; }
    if (!quickPosName.trim()) { toast.error('Nama jabatan wajib diisi'); return; }
    setSavingPos(true);
    try {
      const res = await incentiveService.createPosition({ branch_id: form.branch_id, name: quickPosName.trim(), level: 1 });
      const newPos = res.data.data.position;
      toast.success(`Jabatan "${quickPosName}" ditambahkan`);
      // Refresh positions list & auto-select new position
      const pRes = await incentiveService.getPositions({ branch_id: form.branch_id });
      setPositions(pRes.data.data.positions);
      sf('position_id', String(newPos.id));
      setQuickPosName('');
      setShowQuickPos(false);
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal menambah jabatan'); }
    finally { setSavingPos(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select value={filterBranch} onChange={e => setFB(e.target.value)} className="input-base text-sm flex-1">
          <option value="">Semua Cabang</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button onClick={openAdd} className="btn-primary h-10 px-3 text-xs flex-shrink-0"><Plus className="w-3.5 h-3.5" /></button>
      </div>
      <p className="text-xs text-[var(--text-muted)]">{employees.length} karyawan</p>

      {loading ? <div className="space-y-2">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      : employees.length === 0 ? <div className="text-center py-10 text-sm text-[var(--text-muted)]">Belum ada karyawan</div>
      : (
        <div className="table-wrapper">
          {employees.map(e => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {e.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${e.is_active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] line-through'}`}>{e.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <p className="text-xs text-[var(--text-muted)] truncate">{e.branch?.name} · {e.position?.name || 'No Position'}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                    e.employment_status === 'tetap'    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' :
                    e.employment_status === 'kontrak'  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400' :
                    e.employment_status === 'training' ? 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {e.employment_status || 'kontrak'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(e)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><Edit3 className="w-3 h-3" /></button>
                <button onClick={() => handleToggle(e)}>
                  {e.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-[var(--text-muted)]" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal title={modal === 'add' ? 'Tambah Karyawan' : 'Edit Karyawan'} onClose={() => setModal(null)}
          footer={<><button onClick={() => setModal(null)} className="btn-secondary flex-1 h-10 text-sm">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-10 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Simpan
            </button></>}>
          <Field label="Nama" required><input value={form.name} onChange={e => sf('name', e.target.value)} placeholder="Ahmad Fauzi" className="input-base text-sm" /></Field>
          <Field label="Cabang" required>
            <select value={form.branch_id} onChange={e => { sf('branch_id', e.target.value); sf('position_id', ''); }} className="input-base text-sm">
              <option value="">Pilih cabang...</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Jabatan">
            <select value={form.position_id} onChange={e => sf('position_id', e.target.value)} className="input-base text-sm">
              <option value="">Pilih jabatan...</option>
              {filteredPositions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          {/* Employment Status */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Status Kepegawaian</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v:'magang',   l:'Magang',   desc:'Tidak dapat insentif',    cls:'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
                { v:'training', l:'Training', desc:'Tidak dapat insentif',    cls:'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400' },
                { v:'kontrak',  l:'Kontrak',  desc:'Dapat insentif ✓',       cls:'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400' },
                { v:'tetap',    l:'Tetap',    desc:'Dapat insentif ✓',       cls:'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' },
              ].map(s => (
                <button key={s.v} type="button" onClick={() => sf('employment_status', s.v)}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                    form.employment_status === s.v ? s.cls + ' border-current' : 'border-[var(--border)] hover:bg-[var(--bg-secondary)]'
                  }`}>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{s.l}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <Field label="Kode Karyawan"><input value={form.employee_code} onChange={e => sf('employee_code', e.target.value)} placeholder="EMP-001" className="input-base text-sm" /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={e => sf('email', e.target.value)} placeholder="email@company.com" className="input-base text-sm" /></Field>
          <Field label="No HP"><input value={form.phone} onChange={e => sf('phone', e.target.value)} placeholder="08xx" className="input-base text-sm" /></Field>
          <Field label="Tanggal Bergabung"><input type="date" value={form.join_date} onChange={e => sf('join_date', e.target.value)} className="input-base text-sm" /></Field>
        </Modal>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// CHANNELS TAB — Persentase per Cabang per Jalur
// ════════════════════════════════════════════════════════════════
const ChannelsTab = () => {
  const [matrix, setMatrix]     = useState([]);
  const [channels, setChannels] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null); // { channel_id, branch_id, current_pct, channel_name, branch_name }
  const [pctInput, setPctInput] = useState('');
  const [saving, setSaving]     = useState(false);
  const [globalEdit, setGlobalEdit] = useState(null); // editing global rate
  const [globalPct, setGlobalPct]   = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await incentiveService.getChannelRates();
      setMatrix(res.data.data.matrix || []);
      setChannels(res.data.data.channels || []);
      setBranches(res.data.data.branches || []);
    } catch { toast.error('Gagal memuat data jalur'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSaveBranchRate = async () => {
    if (pctInput === '' || isNaN(parseFloat(pctInput))) { toast.error('Masukkan persentase yang valid'); return; }
    setSaving(true);
    try {
      await incentiveService.upsertChannelRate({
        branch_id:   editing.branch_id,
        channel_id:  editing.channel_id,
        percentage:  parseFloat(pctInput),
      });
      toast.success(`${editing.branch_name} / ${editing.channel_name} → ${pctInput}%`);
      setEditing(null);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleSaveGlobal = async (channelId) => {
    if (globalPct === '' || isNaN(parseFloat(globalPct))) { toast.error('Masukkan persentase yang valid'); return; }
    setSaving(true);
    try {
      await incentiveService.updateChannel(channelId, { percentage: parseFloat(globalPct) });
      toast.success('Rate global diperbarui');
      setGlobalEdit(null);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleResetBranchRate = async (rateId, channelName, branchName) => {
    if (!rateId) return;
    if (!confirm(`Reset rate ${branchName} / ${channelName} ke rate global?`)) return;
    try {
      await incentiveService.deleteChannelRate(rateId);
      toast.success('Rate direset ke global');
      fetch();
    } catch { toast.error('Gagal reset'); }
  };

  const ICONS = { WA: '💬', MARKETPLACE: '🛒', WEB: '🌐' };

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300">
        ⚙️ Setiap cabang bisa punya persentase berbeda per jalur penjualan. Jika tidak diset, akan menggunakan <strong>rate global</strong>.
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
      ) : (
        matrix.map(({ channel, branches: branchRates }) => (
          <div key={channel.id} className="table-wrapper">
            {/* Channel header */}
            <div className="flex items-center gap-3 px-4 py-3.5 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
              <span className="text-2xl">{ICONS[channel.code] || '📊'}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">{channel.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{channel.input_type === 'per_transaction' ? 'Input per transaksi' : 'Input per periode'}</p>
              </div>
              {/* Global rate */}
              <div className="text-right">
                {globalEdit === channel.id ? (
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <input type="number" step="0.001" value={globalPct}
                        onChange={e => setGlobalPct(e.target.value)}
                        className="input-base text-xs text-center h-8 w-20 pr-5"
                        autoFocus
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--text-muted)]">%</span>
                    </div>
                    <button onClick={() => handleSaveGlobal(channel.id)} disabled={saving}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'OK'}
                    </button>
                    <button onClick={() => setGlobalEdit(null)}
                      className="px-2 py-1.5 rounded-lg text-xs border border-[var(--border)] text-[var(--text-muted)]">✕</button>
                  </div>
                ) : (
                  <button onClick={() => { setGlobalEdit(channel.id); setGlobalPct(String(parseFloat(channel.percentage))); }}
                    className="text-right group">
                    <p className="text-sm font-black text-[var(--text-secondary)] group-hover:text-brand-500 transition-colors">
                      {parseFloat(channel.percentage)}% <span className="text-[10px] font-normal text-[var(--text-muted)]">global</span>
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] group-hover:text-brand-400">tap untuk ubah</p>
                  </button>
                )}
              </div>
            </div>

            {/* Per-branch rates */}
            <div className="divide-y divide-[var(--border-subtle)]">
              {branchRates.map(({ branch, rate_id, percentage, using_global }) => (
                <div key={branch.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {branch.code?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{branch.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {using_global
                        ? `Menggunakan rate global (${parseFloat(channel.percentage)}%)`
                        : `Rate khusus cabang ini`}
                    </p>
                  </div>

                  {/* Rate display / edit */}
                  {editing?.channel_id === channel.id && editing?.branch_id === branch.id ? (
                    <div className="flex items-center gap-1.5">
                      <div className="relative">
                        <input type="number" step="0.001" min="0" max="100"
                          value={pctInput}
                          onChange={e => setPctInput(e.target.value)}
                          className="input-base text-xs text-center h-9 w-24 pr-5"
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleSaveBranchRate()}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--text-muted)]">%</span>
                      </div>
                      <button onClick={handleSaveBranchRate} disabled={saving}
                        className="w-9 h-9 rounded-xl bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {!using_global && rate_id && (
                        <button onClick={() => handleResetBranchRate(rate_id, channel.name, branch.name)}
                          className="text-[10px] text-[var(--text-muted)] hover:text-red-500 transition-colors px-1.5 py-1 rounded">
                          reset
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditing({ channel_id: channel.id, branch_id: branch.id, channel_name: channel.name, branch_name: branch.name });
                          setPctInput(using_global ? String(parseFloat(channel.percentage)) : String(percentage || 0));
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black transition-all
                          ${using_global
                            ? 'text-[var(--text-muted)] hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950'
                            : 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 hover:bg-brand-100'
                          }`}>
                        {using_global ? `${parseFloat(channel.percentage)}%` : `${percentage}%`}
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// ACTIVITY TYPES TAB
// ════════════════════════════════════════════════════════════════
const ActivityTypesTab = () => {
  const [types, setTypes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({ name:'', calc_type:'per_qty', nominal:'', unit_label:'qty', notes:'' });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await incentiveService.getActivityTypes(); setTypes(r.data.data.activity_types); }
    catch { toast.error('Gagal'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.nominal) { toast.error('Nama dan nominal wajib diisi'); return; }
    setSaving(true);
    try {
      if (modal === 'add') { await incentiveService.createActivityType(form); toast.success('Aktivitas ditambahkan'); }
      else { await incentiveService.updateActivityType(modal.id, form); toast.success('Aktivitas diperbarui'); }
      setModal(null); fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (t) => {
    try { await incentiveService.updateActivityType(t.id, { is_active: !t.is_active }); fetch(); }
    catch { toast.error('Gagal'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-[var(--text-muted)]">{types.length} jenis aktivitas</p>
        <button onClick={() => { setForm({ name:'', calc_type:'per_qty', nominal:'', unit_label:'qty', notes:'' }); setModal('add'); }}
          className="btn-primary h-8 px-3 text-xs"><Plus className="w-3.5 h-3.5" /> Tambah</button>
      </div>

      {loading ? <div className="space-y-2">{[...Array(2)].map((_,i)=><div key={i} className="skeleton h-14 rounded-xl"/>)}</div>
      : types.map(t => (
        <div key={t.id} className="card p-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-bold ${t.is_active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] line-through'}`}>{t.name}</p>
              <span className="text-[10px] bg-[var(--bg-secondary)] text-[var(--text-muted)] px-2 py-0.5 rounded font-semibold">
                {t.calc_type === 'per_hour' ? '/jam' : '/qty'}
              </span>
            </div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{toRp(t.nominal)} per {t.unit_label}</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => { setForm(t); setModal(t); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><Edit3 className="w-3 h-3" /></button>
            <button onClick={() => handleToggle(t)}>
              {t.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-[var(--text-muted)]" />}
            </button>
          </div>
        </div>
      ))}

      {modal !== null && (
        <Modal title={modal === 'add' ? 'Tambah Aktivitas' : 'Edit Aktivitas'} onClose={() => setModal(null)}
          footer={<><button onClick={() => setModal(null)} className="btn-secondary flex-1 h-10 text-sm">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-10 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Simpan</button></>}>
          <Field label="Nama Aktivitas" required><input value={form.name} onChange={e => sf('name', e.target.value)} placeholder="Live Stream" className="input-base text-sm" /></Field>
          <Field label="Tipe Perhitungan">
            <div className="grid grid-cols-2 gap-2">
              {[{v:'per_qty',l:'Per Qty'},{v:'per_hour',l:'Per Jam'}].map(t => (
                <button key={t.v} type="button" onClick={() => sf('calc_type', t.v)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${form.calc_type===t.v ? 'bg-brand-500 text-white border-brand-500' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                  {t.l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Nominal" required>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">Rp</span>
              <input type="number" value={form.nominal} onChange={e => sf('nominal', e.target.value)} placeholder="10000" className="input-base pl-10 text-sm" />
            </div>
          </Field>
          <Field label="Satuan (label)"><input value={form.unit_label} onChange={e => sf('unit_label', e.target.value)} placeholder="jam / konten / video" className="input-base text-sm" /></Field>
          <Field label="Catatan"><textarea value={form.notes} onChange={e => sf('notes', e.target.value)} rows={2} className="input-base text-sm" /></Field>
        </Modal>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// BONUS TARGETS TAB
// ════════════════════════════════════════════════════════════════
const BonusTargetsTab = () => {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({ name:'', min_amount:'', bonus_amount:'', notes:'', eligible_statuses: ['kontrak','tetap'] });
  const [saving, setSaving]   = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await incentiveService.getBonusTargets(); setTargets(r.data.data.bonus_targets); }
    catch { toast.error('Gagal'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.min_amount || !form.bonus_amount) { toast.error('Semua field wajib diisi'); return; }
    setSaving(true);
    try {
      if (modal === 'add') { await incentiveService.createBonusTarget(form); toast.success('Target bonus dibuat'); }
      else { await incentiveService.updateBonusTarget(modal.id, form); toast.success('Target bonus diperbarui'); }
      setModal(null); fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (t) => {
    if (!confirm(`Hapus target "${t.name}"?`)) return;
    try { await incentiveService.deleteBonusTarget(t.id); toast.success('Dihapus'); fetch(); }
    catch { toast.error('Gagal'); }
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300">
        💡 Sistem mengambil target TERTINGGI yang tercapai (bukan akumulasi). Contoh: jika total penjualan Rp 350jt, maka tier &gt;300jt yang berlaku.
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs text-[var(--text-muted)]">{targets.length} target terdaftar</p>
        <button onClick={() => { setForm({ name:'', min_amount:'', bonus_amount:'', notes:'', eligible_statuses:['kontrak','tetap'] }); setModal('add'); }}
          className="btn-primary h-8 px-3 text-xs"><Plus className="w-3.5 h-3.5" /> Tambah Target</button>
      </div>

      {loading ? <div className="space-y-2">{[...Array(3)].map((_,i)=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      : targets.length === 0 ? <div className="text-center py-10 text-sm text-[var(--text-muted)]">Belum ada target bonus</div>
      : targets.map((t, i) => (
        <div key={t.id} className="card-sm">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{i === targets.length-1 ? '🏆' : '🎯'}</span>
                <p className="text-sm font-bold text-[var(--text-primary)]">{t.name}</p>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Total penjualan &gt; {toRp(t.min_amount)}</p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => { setForm(t); setModal(t); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><Edit3 className="w-3 h-3" /></button>
              <button onClick={() => handleDelete(t)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-xl px-3 py-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Total Bonus Dibagi Rata</span>
              <div className="text-right">
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{toRp(t.bonus_amount)}</span>
                <div className="flex gap-1 justify-end mt-1 flex-wrap">
                  {(t.eligible_statuses || ['kontrak','tetap']).map(s => (
                    <span key={s} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      s === 'tetap'    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' :
                      s === 'kontrak'  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600' :
                      s === 'training' ? 'bg-orange-100 dark:bg-orange-950 text-orange-600' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {modal !== null && (
        <Modal title={modal === 'add' ? 'Tambah Bonus Target' : 'Edit Bonus Target'} onClose={() => setModal(null)}
          footer={<><button onClick={() => setModal(null)} className="btn-secondary flex-1 h-10 text-sm">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-10 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Simpan</button></>}>
          <Field label="Nama Target" required><input value={form.name} onChange={e => sf('name', e.target.value)} placeholder="> 300 Juta" className="input-base text-sm" /></Field>
          <Field label="Minimum Total Penjualan (semua channel)" required>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">Rp</span>
              <input type="number" value={form.min_amount} onChange={e => sf('min_amount', e.target.value)} placeholder="300000000" className="input-base pl-10 text-sm" />
            </div>
            {form.min_amount && <p className="text-xs text-[var(--text-muted)] mt-1">{toRp(form.min_amount)}</p>}
          </Field>
          <Field label="Total Bonus (dibagi rata ke semua karyawan aktif)" required>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">Rp</span>
              <input type="number" value={form.bonus_amount} onChange={e => sf('bonus_amount', e.target.value)} placeholder="400000" className="input-base pl-10 text-sm" />
            </div>
            {form.bonus_amount && <p className="text-xs text-[var(--text-muted)] mt-1">{toRp(form.bonus_amount)}</p>}
          </Field>
          {/* Eligible Statuses */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Berlaku untuk Status Karyawan
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v:'magang',   l:'Magang',        cls:'text-slate-600 dark:text-slate-400' },
                { v:'training', l:'Training',       cls:'text-orange-600 dark:text-orange-400' },
                { v:'kontrak',  l:'Kontrak',        cls:'text-blue-600 dark:text-blue-400' },
                { v:'tetap',    l:'Karyawan Tetap', cls:'text-emerald-600 dark:text-emerald-400' },
              ].map(s => {
                const checked = (form.eligible_statuses || []).includes(s.v);
                return (
                  <button key={s.v} type="button"
                    onClick={() => {
                      const cur = form.eligible_statuses || [];
                      sf('eligible_statuses', checked ? cur.filter(x => x !== s.v) : [...cur, s.v]);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${
                      checked ? 'border-brand-400 bg-brand-50 dark:bg-brand-950' : 'border-[var(--border)] hover:bg-[var(--bg-secondary)]'
                    }`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      checked ? 'bg-brand-500 border-brand-500' : 'border-[var(--border2)]'
                    }`}>
                      {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-xs font-semibold ${checked ? s.cls : 'text-[var(--text-secondary)]'}`}>{s.l}</span>
                  </button>
                );
              })}
            </div>
            {(form.eligible_statuses || []).length === 0 && (
              <p className="text-xs text-amber-600 mt-1">⚠️ Pilih minimal 1 status</p>
            )}
          </div>
          <Field label="Catatan"><input value={form.notes} onChange={e => sf('notes', e.target.value)} className="input-base text-sm" /></Field>
        </Modal>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN MASTER DATA PAGE
// ════════════════════════════════════════════════════════════════
const TABS = [
  { id:'branches',  label:'Cabang',    icon:Building2 },
  { id:'positions', label:'Jabatan',   icon:Briefcase },
  { id:'employees', label:'Karyawan',  icon:Users },
  { id:'channels',  label:'Jalur',     icon:Percent },
  { id:'activities',label:'Aktivitas', icon:Star },
  { id:'bonus',     label:'Target',    icon:Target },
];

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState('branches');

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-5">
        <h1 className="page-title">Master Data</h1>
        <p className="text-sm text-[var(--text-secondary)]">Cabang · Karyawan · Jalur Penjualan · Aktivitas · Target</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin bg-[var(--bg-secondary)] p-1 rounded-2xl border border-[var(--border)] mb-5">
        {TABS.map(tab => {
          const Icon   = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap
                ${active ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'branches'   && <BranchesTab />}
      {activeTab === 'positions'  && <PositionsTab />}
      {activeTab === 'employees'  && <EmployeesTab />}
      {activeTab === 'channels'   && <ChannelsTab />}
      {activeTab === 'activities' && <ActivityTypesTab />}
      {activeTab === 'bonus'      && <BonusTargetsTab />}
    </div>
  );
}
