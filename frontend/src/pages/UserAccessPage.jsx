import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, Key, Edit3, RefreshCw, Plus, X,
  Loader2, CheckCircle2, Eye, EyeOff, AlertTriangle,
  Lock, Unlock, UserCheck, UserX, Search, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

// ── Role config ──────────────────────────────────────────────
const ROLES = {
  admin:      { label:'Admin',      color:'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',     dot:'bg-red-500',     desc:'Akses penuh semua fitur' },
  hr:         { label:'HR',         color:'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',  dot:'bg-blue-500',    desc:'HRD, Gaji, Insentif, ERP' },
  supervisor: { label:'Supervisor', color:'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400', dot:'bg-purple-500', desc:'ERP, laporan, view karyawan' },
  employee:   { label:'Karyawan',   color:'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300', dot:'bg-slate-400',  desc:'Absensi, cuti, gaji sendiri' },
};

const RoleBadge = ({ role }) => {
  const r = ROLES[role] || ROLES.employee;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${r.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`}/>
      {r.label}
    </span>
  );
};

// ── Edit Modal ────────────────────────────────────────────────
const EditAccessModal = ({ user, onClose, onSuccess, currentUserId }) => {
  const [form, setForm] = useState({
    role: user.role || 'employee',
    is_active: user.is_active !== false,
    newPassword: '',
    confirmPassword: '',
  });
  const [showPw, setShowPw]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [changePw, setChangePw] = useState(false);
  const isSelf = user.id === currentUserId;

  const handleSave = async () => {
    if (changePw) {
      if (!form.newPassword) { toast.error('Password baru wajib diisi'); return; }
      if (form.newPassword.length < 6) { toast.error('Password minimal 6 karakter'); return; }
      if (form.newPassword !== form.confirmPassword) { toast.error('Konfirmasi password tidak cocok'); return; }
    }
    setSaving(true);
    try {
      // Update role & status
      await api.put(`/employees/${user.id}`, {
        role: form.role,
        is_active: form.is_active,
      });
      // Reset password if requested
      if (changePw && form.newPassword) {
        await api.put(`/employees/${user.id}/reset-password`, {
          new_password: form.newPassword,
        });
      }
      toast.success(`Hak akses ${user.name} diperbarui`);
      onSuccess();
      onClose();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Gagal memperbarui');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-md" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-bold">{user.name}</h3>
              <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>

        <div className="modal-body">
          {/* Role Selection */}
          <div>
            <label className="field-label mb-2">Hak Akses / Role</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROLES).map(([key, r]) => (
                <button key={key} type="button"
                  disabled={key === 'admin' && isSelf}
                  onClick={() => setForm(f=>({...f, role: key}))}
                  className={`p-3 rounded-xl border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    form.role === key
                      ? 'border-[var(--brand-600)] bg-[var(--brand-600)]/5'
                      : 'border-[var(--border)] hover:bg-[var(--bg-secondary)]'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${r.dot}`}/>
                    <span className={`text-xs font-bold ${form.role===key?'text-[var(--brand-600)]':'text-[var(--text-primary)]'}`}>{r.label}</span>
                    {form.role===key && <CheckCircle2 size={12} className="ml-auto text-[var(--brand-600)]"/>}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-tight">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="field-label mb-2">Status Akun</label>
            <div className="flex gap-2">
              {[
                { v:true,  l:'Aktif',    icon:Unlock, color:'text-emerald-600', bg:'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' },
                { v:false, l:'Nonaktif', icon:Lock,   color:'text-red-600',     bg:'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800' },
              ].map(s => (
                <button key={String(s.v)} type="button"
                  disabled={isSelf}
                  onClick={() => setForm(f=>({...f, is_active: s.v}))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all disabled:opacity-40 ${
                    form.is_active === s.v ? s.bg : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'
                  }`}>
                  <s.icon size={14} className={form.is_active===s.v ? s.color : ''}/>
                  <span className={form.is_active===s.v ? s.color : ''}>{s.l}</span>
                </button>
              ))}
            </div>
            {isSelf && <p className="text-[11px] text-amber-600 mt-1">⚠ Tidak bisa menonaktifkan akun sendiri</p>}
          </div>

          {/* Reset Password */}
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <button type="button" onClick={() => setChangePw(v=>!v)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${changePw ? 'bg-amber-50 dark:bg-amber-950/30' : 'hover:bg-[var(--bg-secondary)]'}`}>
              <Key size={15} className={changePw ? 'text-amber-600' : 'text-[var(--text-muted)]'}/>
              <span className={`text-sm font-semibold ${changePw ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--text-secondary)]'}`}>
                Reset Password
              </span>
              <ChevronDown size={14} className={`ml-auto transition-transform ${changePw ? 'rotate-180 text-amber-600' : 'text-[var(--text-muted)]'}`}/>
            </button>
            {changePw && (
              <div className="px-4 pb-4 pt-2 space-y-3 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-800">
                <div>
                  <label className="field-label">Password Baru</label>
                  <div className="relative">
                    <input type={showPw?'text':'password'} value={form.newPassword}
                      onChange={e=>setForm(f=>({...f,newPassword:e.target.value}))}
                      placeholder="Min. 6 karakter" autoComplete="new-password"
                      className="input-base pr-10"/>
                    <button type="button" onClick={()=>setShowPw(v=>!v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                      {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="field-label">Konfirmasi Password</label>
                  <input type={showPw?'text':'password'} value={form.confirmPassword}
                    onChange={e=>setForm(f=>({...f,confirmPassword:e.target.value}))}
                    placeholder="Ulangi password" autoComplete="new-password"
                    className="input-base"/>
                  {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                    <p className="text-[11px] text-red-500 mt-1">⚠ Password tidak cocok</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 size={15} className="animate-spin"/> : <CheckCircle2 size={15}/>}
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
export default function UserAccessPage() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoad]      = useState(true);
  const [editUser, setEdit]     = useState(null);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRole]   = useState('');
  const [currentUserId, setCurr]= useState(null);

  const fetch = useCallback(async () => {
    setLoad(true);
    try {
      const [usersRes, meRes] = await Promise.all([
        api.get('/employees', { params: { limit: 200, include_inactive: true } }),
        api.get('/auth/me'),
      ]);
      setUsers(usersRes.data.data.employees || []);
      setCurr(meRes.data.data.user?.id);
    } catch { toast.error('Gagal memuat data pengguna'); }
    finally { setLoad(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole   = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const toggleActive = async (user) => {
    if (user.id === currentUserId) { toast.error('Tidak bisa menonaktifkan akun sendiri'); return; }
    try {
      await api.put(`/employees/${user.id}`, { is_active: !user.is_active });
      toast.success(user.is_active ? `${user.name} dinonaktifkan` : `${user.name} diaktifkan`);
      fetch();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  const roleStats = Object.keys(ROLES).reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {});
  const activeCount = users.filter(u => u.is_active !== false).length;

  return (
    <div className="w-full animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hak Akses Pengguna</h1>
          <p className="body-sm text-[var(--text-muted)]">Kelola role dan akses login setiap pengguna sistem</p>
        </div>
        <button onClick={fetch} disabled={loading} className="btn-icon">
          <RefreshCw size={16} className={loading?'animate-spin':''}/>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Total User</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">{users.length}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">{activeCount} aktif</p>
        </div>
        {Object.entries(ROLES).map(([key, r]) => (
          <div key={key} className="card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{r.label}</p>
            <p className={`text-2xl font-black ${r.color.split(' ')[2]}`}>{roleStats[key] || 0}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Role permissions info */}
      <div className="card mb-5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center gap-2">
          <Shield size={15} className="text-[var(--brand-600)]"/>
          <h3 className="text-sm font-bold">Matriks Hak Akses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-[var(--text-muted)] uppercase tracking-wider">Fitur</th>
                {Object.entries(ROLES).map(([k,r]) => (
                  <th key={k} className="px-4 py-3 text-center font-bold uppercase tracking-wider">
                    <span className={`px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {[
                { f:'HRD — Karyawan',     admin:true,  hr:true,  supervisor:true,  employee:false },
                { f:'HRD — Absensi',      admin:true,  hr:true,  supervisor:true,  employee:true  },
                { f:'HRD — Cuti',         admin:true,  hr:true,  supervisor:true,  employee:true  },
                { f:'HRD — Gaji',         admin:true,  hr:true,  supervisor:false, employee:true  },
                { f:'Insentif',           admin:true,  hr:true,  supervisor:false, employee:false },
                { f:'ERP — Order',        admin:true,  hr:true,  supervisor:true,  employee:true  },
                { f:'ERP — Keuangan',     admin:true,  hr:true,  supervisor:true,  employee:false },
                { f:'ERP — Laporan',      admin:true,  hr:true,  supervisor:true,  employee:false },
                { f:'Hak Akses User',     admin:true,  hr:true,  supervisor:false, employee:false },
              ].map(row => (
                <tr key={row.f} className="hover:bg-[var(--bg-secondary)]/50">
                  <td className="px-4 py-2.5 font-medium text-[var(--text-secondary)]">{row.f}</td>
                  {['admin','hr','supervisor','employee'].map(role => (
                    <td key={role} className="px-4 py-2.5 text-center">
                      {row[role]
                        ? <span className="text-emerald-600 text-base">✓</span>
                        : <span className="text-[var(--text-muted)] opacity-30 text-base">✗</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama atau email..."
            className="w-full h-9 pl-9 pr-4 text-[13px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)]/20 transition-all"/>
          {search && <button onClick={()=>setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={13}/></button>}
        </div>
        <select value={roleFilter} onChange={e=>setRole(e.target.value)}
          className="h-9 px-3 text-[13px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)]/20 min-w-36">
          <option value="">Semua Role</option>
          {Object.entries(ROLES).map(([k,r])=><option key={k} value={k}>{r.label}</option>)}
        </select>
        <span className="h-9 flex items-center text-[12px] text-[var(--text-muted)] px-2">
          <span className="font-semibold text-[var(--text-secondary)]">{filtered.length}</span>&nbsp;pengguna
        </span>
      </div>

      {/* User table */}
      <div className="table-wrapper">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[1fr_180px_120px_100px_80px] gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]/70">
          {['PENGGUNA','JABATAN','ROLE','STATUS','AKSI'].map(h=>(
            <p key={h} className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{h}</p>
          ))}
        </div>

        {loading ? (
          [...Array(5)].map((_,i)=>(
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-subtle)]">
              <div className="skeleton w-9 h-9 rounded-xl flex-shrink-0"/>
              <div className="flex-1 space-y-2"><div className="skeleton h-3.5 w-40 rounded"/><div className="skeleton h-3 w-28 rounded opacity-60"/></div>
              <div className="skeleton h-6 w-20 rounded-full"/>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users size={36} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30"/>
            <p className="text-sm text-[var(--text-muted)]">Tidak ada pengguna ditemukan</p>
          </div>
        ) : filtered.map((user, idx) => {
          const isActive = user.is_active !== false;
          const isSelf   = user.id === currentUserId;
          return (
            <div key={user.id}
              className={`flex flex-col md:grid md:grid-cols-[1fr_180px_120px_100px_80px] md:gap-4 px-5 py-4 border-b border-[var(--border-subtle)] last:border-0 transition-colors group hover:bg-[var(--bg-secondary)]/50 ${idx%2===0?'':'bg-[var(--bg-secondary)]/20'}`}>

              {/* User info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${isActive ? 'bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)]' : 'bg-slate-400'}`}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate">{user.name}</p>
                    {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--brand-600)]/10 text-[var(--brand-600)] font-semibold">Anda</span>}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
                </div>
              </div>

              {/* Jabatan */}
              <div className="hidden md:flex items-center">
                <p className="text-[13px] text-[var(--text-secondary)] truncate">{user.employee?.position || '—'}</p>
              </div>

              {/* Role */}
              <div className="flex md:items-center mt-2 md:mt-0">
                <RoleBadge role={user.role}/>
              </div>

              {/* Status */}
              <div className="hidden md:flex items-center">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive?'bg-emerald-500':'bg-slate-400'}`}/>
                  {isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end md:justify-center gap-1 mt-2 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEdit(user)} title="Edit Hak Akses"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--brand-600)] hover:bg-[var(--brand-600)]/8 transition-all">
                  <Edit3 size={14}/>
                </button>
                <button onClick={() => toggleActive(user)} disabled={isSelf} title={isActive?'Nonaktifkan':'Aktifkan'}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    isActive
                      ? 'text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                      : 'text-[var(--text-muted)] hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  }`}>
                  {isActive ? <UserX size={14}/> : <UserCheck size={14}/>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editUser && (
        <EditAccessModal
          user={editUser}
          currentUserId={currentUserId}
          onClose={() => setEdit(null)}
          onSuccess={fetch}
        />
      )}
    </div>
  );
}
