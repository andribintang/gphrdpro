import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, Key, Edit3, RefreshCw, X,
  Loader2, CheckCircle2, Eye, EyeOff,
  Lock, Unlock, UserCheck, UserX, Search,
  ChevronDown, Save, AlertTriangle, Check, Minus
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

// ── Feature list ──────────────────────────────────────────────
const FEATURES = [
  { group: 'HRD', items: [
    { key:'hrd.employees',    label:'Karyawan — Lihat' },
    { key:'hrd.employees.manage', label:'Karyawan — Kelola (Tambah/Edit)' },
    { key:'hrd.attendance',  label:'Absensi — Lihat semua' },
    { key:'hrd.leaves',      label:'Cuti — Kelola' },
    { key:'hrd.salary',      label:'Gaji — Lihat semua' },
    { key:'hrd.departments', label:'Departemen — Kelola' },
    { key:'hrd.reports',     label:'Laporan HRD' },
    { key:'hrd.attendance_data', label:'Data Absensi (foto)' },
  ]},
  { group: 'INSENTIF', items: [
    { key:'incentive.view',   label:'Insentif — Lihat' },
    { key:'incentive.manage', label:'Insentif — Input & Kelola' },
    { key:'incentive.master', label:'Insentif — Master Data' },
  ]},
  { group: 'ERP', items: [
    { key:'erp.orders',       label:'Penjualan — Buat & Lihat' },
    { key:'erp.products',     label:'Produk & Stok' },
    { key:'erp.customers',    label:'Pelanggan' },
    { key:'erp.purchases',    label:'Pembelian' },
    { key:'erp.expenses',     label:'Pengeluaran' },
    { key:'erp.reports',      label:'Laporan Sales & Harian' },
    { key:'erp.finance',      label:'Laporan Keuangan (Laba Rugi)' },
    { key:'erp.returns',      label:'Retur Penjualan' },
    { key:'erp.master',       label:'Master Data ERP' },
  ]},
  { group: 'PENGATURAN', items: [
    { key:'settings.company',  label:'Pengaturan Perusahaan' },
    { key:'settings.payroll',  label:'Komponen Gaji' },
    { key:'settings.access',   label:'Hak Akses Pengguna' },
  ]},
];

// Default matrix per role
const DEFAULT_MATRIX = {
  admin:      Object.fromEntries(FEATURES.flatMap(g=>g.items).map(f=>[f.key, true])),
  hr:         {
    'hrd.employees':true,'hrd.employees.manage':true,'hrd.attendance':true,
    'hrd.leaves':true,'hrd.salary':true,'hrd.departments':true,'hrd.reports':true,'hrd.attendance_data':true,
    'incentive.view':true,'incentive.manage':true,'incentive.master':true,
    'erp.orders':true,'erp.products':true,'erp.customers':true,'erp.purchases':true,
    'erp.expenses':true,'erp.reports':true,'erp.finance':true,'erp.returns':true,'erp.master':true,
    'settings.company':false,'settings.payroll':true,'settings.access':true,
  },
  supervisor: {
    'hrd.employees':true,'hrd.employees.manage':false,'hrd.attendance':true,
    'hrd.leaves':true,'hrd.salary':false,'hrd.departments':false,'hrd.reports':true,'hrd.attendance_data':false,
    'incentive.view':false,'incentive.manage':false,'incentive.master':false,
    'erp.orders':true,'erp.products':true,'erp.customers':true,'erp.purchases':true,
    'erp.expenses':true,'erp.reports':true,'erp.finance':true,'erp.returns':true,'erp.master':false,
    'settings.company':false,'settings.payroll':false,'settings.access':false,
  },
  employee: {
    'hrd.employees':false,'hrd.employees.manage':false,'hrd.attendance':false,
    'hrd.leaves':true,'hrd.salary':false,'hrd.departments':false,'hrd.reports':false,'hrd.attendance_data':false,
    'incentive.view':false,'incentive.manage':false,'incentive.master':false,
    'erp.orders':true,'erp.products':false,'erp.customers':false,'erp.purchases':false,
    'erp.expenses':false,'erp.reports':false,'erp.finance':false,'erp.returns':false,'erp.master':false,
    'settings.company':false,'settings.payroll':false,'settings.access':false,
  },
};

const ROLES = {
  admin:      { label:'Admin',      color:'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',     dot:'bg-red-500' },
  hr:         { label:'HR',         color:'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',  dot:'bg-blue-500' },
  supervisor: { label:'Supervisor', color:'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400', dot:'bg-purple-500' },
  employee:   { label:'Karyawan',   color:'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300', dot:'bg-slate-400' },
};

// ── Edit User Modal ───────────────────────────────────────────
const EditUserModal = ({ user, onClose, onSuccess, currentUserId }) => {
  const [form, setForm]     = useState({ role: user.role||'employee', is_active: user.is_active!==false, newPassword:'', confirmPassword:'' });
  const [showPw, setShowPw] = useState(false);
  const [changePw, setPw]   = useState(false);
  const [saving, setSaving] = useState(false);
  const isSelf = user.id === currentUserId;
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (changePw) {
      if (!form.newPassword) { toast.error('Password baru wajib'); return; }
      if (form.newPassword.length < 6) { toast.error('Min 6 karakter'); return; }
      if (form.newPassword !== form.confirmPassword) { toast.error('Password tidak cocok'); return; }
    }
    setSaving(true);
    try {
      await api.put(`/employees/${user.id}`, { role: form.role, is_active: form.is_active });
      if (changePw && form.newPassword) {
        await api.put(`/employees/${user.id}/reset-password`, { new_password: form.newPassword });
      }
      toast.success(`${user.name} diperbarui`);
      onSuccess(); onClose();
    } catch(e) { toast.error(e.response?.data?.message||'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-backdrop"/>
      <div className="modal-box max-w-md" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center text-white font-bold">{user.name?.[0]?.toUpperCase()}</div>
            <div><h3 className="text-sm font-bold">{user.name}</h3><p className="text-xs text-[var(--text-muted)]">{user.email}</p></div>
          </div>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body">
          {/* Role */}
          <div>
            <label className="field-label mb-2">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROLES).map(([key,r])=>(
                <button key={key} type="button" onClick={()=>sf('role',key)}
                  disabled={key==='admin'&&isSelf}
                  className={`p-3 rounded-xl border text-left transition-all disabled:opacity-40 ${form.role===key?'border-[var(--brand-600)] bg-[var(--brand-600)]/5':'border-[var(--border)] hover:bg-[var(--bg-secondary)]'}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`w-2 h-2 rounded-full ${r.dot}`}/>
                    <span className={`text-xs font-bold ${form.role===key?'text-[var(--brand-600)]':'text-[var(--text-primary)]'}`}>{r.label}</span>
                    {form.role===key&&<CheckCircle2 size={12} className="ml-auto text-[var(--brand-600)]"/>}
                  </div>
                </button>
              ))}
            </div>
          </div>
          {/* Status */}
          <div>
            <label className="field-label mb-2">Status</label>
            <div className="flex gap-2">
              {[{v:true,l:'Aktif',c:'emerald'},{v:false,l:'Nonaktif',c:'slate'}].map(s=>(
                <button key={String(s.v)} type="button" disabled={isSelf} onClick={()=>sf('is_active',s.v)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all disabled:opacity-40 ${form.is_active===s.v?`bg-${s.c}-50 dark:bg-${s.c}-950/30 border-${s.c}-400 text-${s.c}-700`:'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'}`}>
                  {s.l}
                </button>
              ))}
            </div>
          </div>
          {/* Reset password */}
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <button type="button" onClick={()=>setPw(v=>!v)} className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${changePw?'bg-amber-50 dark:bg-amber-950/30':'hover:bg-[var(--bg-secondary)]'}`}>
              <Key size={15} className={changePw?'text-amber-600':'text-[var(--text-muted)]'}/>
              <span className={`text-sm font-semibold ${changePw?'text-amber-700 dark:text-amber-400':'text-[var(--text-secondary)]'}`}>Reset Password</span>
              <ChevronDown size={14} className={`ml-auto transition-transform ${changePw?'rotate-180 text-amber-600':'text-[var(--text-muted)]'}`}/>
            </button>
            {changePw&&(
              <div className="px-4 pb-4 pt-2 space-y-3 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-800">
                <div><label className="field-label">Password Baru</label>
                  <div className="relative">
                    <input type={showPw?'text':'password'} value={form.newPassword} onChange={e=>sf('newPassword',e.target.value)} placeholder="Min. 6 karakter" autoComplete="new-password" className="input-base pr-10"/>
                    <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{showPw?<EyeOff size={15}/>:<Eye size={15}/>}</button>
                  </div>
                </div>
                <div><label className="field-label">Konfirmasi Password</label>
                  <input type={showPw?'text':'password'} value={form.confirmPassword} onChange={e=>sf('confirmPassword',e.target.value)} placeholder="Ulangi password" autoComplete="new-password" className="input-base"/>
                  {form.confirmPassword&&form.newPassword!==form.confirmPassword&&<p className="text-[11px] text-red-500 mt-1">⚠ Tidak cocok</p>}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>} Simpan
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
export default function UserAccessPage() {
  const [tab, setTab]           = useState('users');
  const [users, setUsers]       = useState([]);
  const [loading, setLoad]      = useState(true);
  const [editUser, setEdit]     = useState(null);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRole]   = useState('');
  const [currentUserId, setCurr]= useState(null);
  const [matrix, setMatrix]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('access_matrix')) || DEFAULT_MATRIX; } 
    catch { return DEFAULT_MATRIX; }
  });
  const [matrixSaved, setSaved] = useState(false);

  const fetch = useCallback(async () => {
    setLoad(true);
    try {
      const [ur, mr] = await Promise.all([
        api.get('/employees', { params: { limit: 200, include_inactive: true } }),
        api.get('/auth/me'),
      ]);
      setUsers(ur.data.data.employees||[]);
      setCurr(mr.data.data.user?.id);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoad(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = users.filter(u =>
    (!search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || u.role === roleFilter)
  );

  const toggleAccess = (role, featureKey) => {
    if (role === 'admin') return; // admin always full
    setMatrix(m => ({ ...m, [role]: { ...m[role], [featureKey]: !m[role][featureKey] } }));
    setSaved(false);
  };

  const saveMatrix = () => {
    localStorage.setItem('access_matrix', JSON.stringify(matrix));
    setSaved(true);
    toast.success('Matriks hak akses disimpan');
    setTimeout(() => setSaved(false), 3000);
  };

  const resetMatrix = () => {
    setMatrix(DEFAULT_MATRIX);
    setSaved(false);
    toast('Matriks direset ke default');
  };

  const roleStats = Object.keys(ROLES).reduce((acc,r) => { acc[r]=users.filter(u=>u.role===r).length; return acc; }, {});

  return (
    <div className="w-full animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hak Akses Pengguna</h1>
          <p className="body-sm text-[var(--text-muted)]">Kelola role, status akun, dan matriks akses fitur</p>
        </div>
        <button onClick={fetch} disabled={loading} className="btn-icon"><RefreshCw size={16} className={loading?'animate-spin':''}/></button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] mb-5 max-w-sm">
        {[{k:'users',l:'Pengguna'},{k:'matrix',l:'Matriks Akses'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab===t.k?'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]':'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── TAB: Users ─────────────────────────────────────── */}
      {tab === 'users' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            <div className="card p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Total</p><p className="text-2xl font-black">{users.length}</p></div>
            {Object.entries(ROLES).map(([k,r])=>(
              <div key={k} className="card p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{r.label}</p><p className={`text-2xl font-black ${r.color.split(' ')[2]}`}>{roleStats[k]||0}</p></div>
            ))}
          </div>

          {/* Search & filter */}
          <div className="flex gap-2.5 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-52">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama atau email..."
                className="w-full h-9 pl-9 pr-4 text-[13px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)]/20 transition-all"/>
              {search&&<button onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><X size={13}/></button>}
            </div>
            <select value={roleFilter} onChange={e=>setRole(e.target.value)}
              className="h-9 px-3 text-[13px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl min-w-36 focus:outline-none">
              <option value="">Semua Role</option>
              {Object.entries(ROLES).map(([k,r])=><option key={k} value={k}>{r.label}</option>)}
            </select>
          </div>

          {/* User table */}
          <div className="table-wrapper">
            <div className="hidden md:grid grid-cols-[1fr_160px_110px_100px_80px] gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]/70">
              {['PENGGUNA','JABATAN','ROLE','STATUS','AKSI'].map(h=><p key={h} className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{h}</p>)}
            </div>
            {loading ? [...Array(5)].map((_,i)=>(
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-subtle)]">
                <div className="skeleton w-9 h-9 rounded-xl flex-shrink-0"/>
                <div className="flex-1 space-y-2"><div className="skeleton h-3.5 w-40 rounded"/><div className="skeleton h-3 w-28 rounded opacity-60"/></div>
              </div>
            )) : filtered.map((user,idx)=>{
              const isActive = user.is_active!==false;
              const isSelf   = user.id===currentUserId;
              const r        = ROLES[user.role]||ROLES.employee;
              return (
                <div key={user.id} className={`flex flex-col md:grid md:grid-cols-[1fr_160px_110px_100px_80px] md:gap-4 px-5 py-4 border-b border-[var(--border-subtle)] last:border-0 transition-colors group hover:bg-[var(--bg-secondary)]/50 ${idx%2===0?'':'bg-[var(--bg-secondary)]/20'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${isActive?'bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)]':'bg-slate-400'}`}>{user.name?.[0]?.toUpperCase()}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13.5px] font-semibold truncate">{user.name}</p>
                        {isSelf&&<span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--brand-600)]/10 text-[var(--brand-600)] font-semibold">Anda</span>}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center"><p className="text-[13px] text-[var(--text-secondary)] truncate">{user.employee?.position||'—'}</p></div>
                  <div className="flex md:items-center mt-2 md:mt-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${r.color}`}><span className={`w-1.5 h-1.5 rounded-full ${r.dot}`}/>{r.label}</span>
                  </div>
                  <div className="hidden md:flex items-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${isActive?'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400':'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive?'bg-emerald-500':'bg-slate-400'}`}/>{isActive?'Aktif':'Nonaktif'}
                    </span>
                  </div>
                  <div className="flex items-center justify-end md:justify-start gap-1 mt-2 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={()=>setEdit(user)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--brand-600)] hover:bg-[var(--brand-600)]/8 transition-all"><Edit3 size={14}/></button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── TAB: Matrix ────────────────────────────────────── */}
      {tab === 'matrix' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Centang untuk mengizinkan akses. Admin selalu memiliki akses penuh.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={resetMatrix} className="btn-secondary text-sm gap-2"><RefreshCw size={14}/> Reset Default</button>
              <button onClick={saveMatrix} className="btn-primary text-sm gap-2">
                {matrixSaved?<CheckCircle2 size={14}/>:<Save size={14}/>}
                {matrixSaved?'Tersimpan':'Simpan Matriks'}
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]/70">
                    <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] min-w-64">Fitur</th>
                    {Object.entries(ROLES).map(([k,r])=>(
                      <th key={k} className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${r.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`}/>{r.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map(group=>(
                    <>
                      <tr key={group.group} className="bg-[var(--bg-secondary)]/50">
                        <td colSpan={5} className="px-5 py-2.5">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{group.group}</span>
                        </td>
                      </tr>
                      {group.items.map((feat,idx)=>(
                        <tr key={feat.key} className={`border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-secondary)]/40 transition-colors ${idx%2===0?'':'bg-[var(--bg-secondary)]/20'}`}>
                          <td className="px-5 py-3.5">
                            <p className="text-[13px] text-[var(--text-secondary)]">{feat.label}</p>
                          </td>
                          {Object.keys(ROLES).map(role=>{
                            const isAdmin   = role==='admin';
                            const hasAccess = isAdmin ? true : (matrix[role]?.[feat.key] ?? false);
                            return (
                              <td key={role} className="px-4 py-3.5 text-center">
                                <button
                                  onClick={()=>toggleAccess(role, feat.key)}
                                  disabled={isAdmin}
                                  className={`w-8 h-8 rounded-xl mx-auto flex items-center justify-center transition-all ${
                                    isAdmin
                                      ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 cursor-default opacity-60'
                                      : hasAccess
                                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 border border-[var(--border)]'
                                  }`}>
                                  {hasAccess ? <Check size={14}/> : <Minus size={14}/>}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5"/>
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Catatan Penting</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">Matriks ini disimpan di browser. Untuk implementasi penuh di backend, perlu integrasi dengan sistem permission. Role admin selalu memiliki akses penuh ke semua fitur.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {editUser && <EditUserModal user={editUser} currentUserId={currentUserId} onClose={()=>setEdit(null)} onSuccess={fetch}/>}
    </div>
  );
}
