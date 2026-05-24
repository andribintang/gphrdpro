import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Lock, Sun, Moon, BarChart3, LogOut,
  Eye, EyeOff, Loader2, CheckCircle2, ChevronRight,
  User, Bell, Palette, Info, Key
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const ROLE_LABELS = {
  admin: 'Administrator', hr: 'HR Manager',
  supervisor: 'Supervisor', employee: 'Karyawan',
};

const ROLE_COLORS = {
  admin:      'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
  hr:         'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  supervisor: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
  employee:   'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
};

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw]     = useState(false);
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [changingPw, setChangePw] = useState(false);
  const [pwForm, setPwForm]     = useState({ current: '', newPw: '', confirm: '' });
  const [saving, setSaving]     = useState(false);

  const toggleDark = () => {
    const html = document.documentElement;
    html.classList.toggle('dark');
    setDarkMode(html.classList.contains('dark'));
    localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
  };

  const handleChangePassword = async () => {
    if (!pwForm.current) { toast.error('Password saat ini wajib'); return; }
    if (pwForm.newPw.length < 6) { toast.error('Password baru min 6 karakter'); return; }
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Konfirmasi tidak cocok'); return; }
    setSaving(true);
    try {
      await api.put('/auth/change-password', { current_password: pwForm.current, new_password: pwForm.newPw });
      toast.success('Password berhasil diubah');
      setChangePw(false);
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal mengubah password'); }
    finally { setSaving(false); }
  };

  const handleLogout = () => {
    if (!confirm('Yakin ingin keluar?')) return;
    logout();
    navigate('/login');
  };

  const Section = ({ label, children }) => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-1 mb-2">{label}</p>
      <div className="card overflow-hidden divide-y divide-[var(--border-subtle)]">{children}</div>
    </div>
  );

  const MenuItem = ({ icon: Icon, label, sub, onClick, right, color='text-[var(--text-secondary)]', danger }) => (
    <button onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--bg-secondary)]/60 ${danger?'hover:bg-red-50 dark:hover:bg-red-950/20':''}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${danger?'bg-red-100 dark:bg-red-950/50':'bg-[var(--bg-secondary)]'}`}>
        <Icon size={16} className={danger?'text-red-600':color}/>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13.5px] font-semibold ${danger?'text-red-600':''}`}>{label}</p>
        {sub && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
      {right || <ChevronRight size={15} className="text-[var(--text-muted)] opacity-40 flex-shrink-0"/>}
    </button>
  );

  return (
    <div className="w-full animate-fade-in">
      <div className="page-header mb-6">
        <h1 className="page-title">Akun</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Profile card ──────────────────────── */}
        <div className="lg:col-span-1">
          <div className="card p-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-black text-3xl">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <h2 className="text-lg font-black text-[var(--text-primary)]">{user?.name}</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{user?.email}</p>
            <div className="flex justify-center mt-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${ROLE_COLORS[user?.role]||ROLE_COLORS.employee}`}>
                <Shield size={11}/>{ROLE_LABELS[user?.role]||user?.role}
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <p className="text-[11px] text-[var(--text-muted)]">Login terakhir</p>
              <p className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
                {new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}
              </p>
            </div>
          </div>

          {/* App info */}
          <div className="card p-5 mt-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Aplikasi</p>
            <div className="space-y-2.5">
              {[
                { l:'Nama', v:'GPDISTRO RACING ID' },
                { l:'Versi', v:'2.0.0 · 2026' },
                { l:'Platform', v:'ERP & HRD System' },
              ].map(item => (
                <div key={item.l} className="flex justify-between">
                  <span className="text-[12px] text-[var(--text-muted)]">{item.l}</span>
                  <span className="text-[12px] font-semibold text-[var(--text-secondary)]">{item.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Settings ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          <Section label="Keamanan">
            <div>
              <MenuItem
                icon={Key}
                label="Ganti Password"
                sub="Ubah password login Anda"
                color="text-amber-600"
                onClick={() => setChangePw(v => !v)}
                right={
                  <span className={`text-[11px] font-semibold transition-colors ${changingPw?'text-[var(--brand-600)]':'text-[var(--text-muted)]'}`}>
                    {changingPw ? 'Tutup' : 'Ubah'}
                  </span>
                }
              />
              {changingPw && (
                <div className="px-5 pb-5 pt-3 space-y-3 bg-[var(--bg-secondary)]/50 border-t border-[var(--border-subtle)]">
                  {[
                    { k:'current', l:'Password Saat Ini', ph:'Masukkan password lama' },
                    { k:'newPw',   l:'Password Baru',     ph:'Min. 6 karakter' },
                    { k:'confirm', l:'Konfirmasi Password Baru', ph:'Ulangi password baru' },
                  ].map(f => (
                    <div key={f.k}>
                      <label className="field-label">{f.l}</label>
                      <div className="relative">
                        <input type={showPw?'text':'password'} value={pwForm[f.k]}
                          onChange={e=>setPwForm(p=>({...p,[f.k]:e.target.value}))}
                          placeholder={f.ph} autoComplete="new-password" className="input-base pr-10"/>
                        {f.k==='newPw' && (
                          <button type="button" onClick={()=>setShowPw(v=>!v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                            {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
                          </button>
                        )}
                      </div>
                      {f.k==='confirm' && pwForm.confirm && pwForm.newPw !== pwForm.confirm && (
                        <p className="text-[11px] text-red-500 mt-1">⚠ Password tidak cocok</p>
                      )}
                    </div>
                  ))}
                  <button onClick={handleChangePassword} disabled={saving}
                    className="btn-primary w-full gap-2">
                    {saving?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>}
                    Simpan Password Baru
                  </button>
                </div>
              )}
            </div>
          </Section>

          <Section label="Tampilan">
            <MenuItem
              icon={darkMode ? Moon : Sun}
              label={darkMode ? 'Mode Gelap' : 'Mode Terang'}
              sub="Klik untuk mengganti tema"
              color={darkMode?'text-indigo-600':'text-amber-500'}
              onClick={toggleDark}
              right={
                <div onClick={toggleDark} className={`w-11 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 cursor-pointer ${darkMode?'bg-[var(--brand-600)]':'bg-slate-200 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${darkMode?'translate-x-5':'translate-x-0'}`}/>
                </div>
              }
            />
          </Section>

          <Section label="Laporan">
            <MenuItem
              icon={BarChart3}
              label="Buka Laporan & Analitik"
              sub="Data absensi, gaji, cuti, karyawan"
              color="text-[var(--brand-600)]"
              onClick={() => navigate('/reports')}
            />
          </Section>

          <Section label="Aksi">
            <MenuItem
              icon={LogOut}
              label="Keluar"
              sub="Logout dari akun ini"
              danger
              onClick={handleLogout}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
