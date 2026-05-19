import { useState } from 'react';
import {
  User, Lock, Sun, Moon, Shield, Bell,
  ChevronRight, CheckCircle2, Loader2,
  LogOut, Info, Palette, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

const ROLE_LABEL = {
  admin: 'Administrator', hr: 'HR Manager',
  supervisor: 'Supervisor', employee: 'Karyawan',
};

const Section = ({ title, children }) => (
  <div className="space-y-2">
    <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-1">{title}</h3>
    <div className="table-wrapper">
      {children}
    </div>
  </div>
);

const SettingRow = ({ icon: Icon, label, sublabel, onClick, danger, children, iconBg = 'bg-[var(--bg-tertiary)]' }) => (
  <button onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
      ${danger
        ? 'hover:bg-red-50 dark:hover:bg-red-950'
        : 'hover:bg-[var(--bg-secondary)]'
      } ${!onClick ? 'cursor-default' : ''}`}>
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <Icon className={`w-4 h-4 ${danger ? 'text-red-500' : 'text-[var(--text-secondary)]'}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-semibold ${danger ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-primary)]'}`}>
        {label}
      </p>
      {sublabel && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sublabel}</p>}
    </div>
    {children || (onClick && <ChevronRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />)}
  </button>
);

// Change password modal
const ChangePasswordModal = ({ onClose }) => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Password baru tidak cocok'); return;
    }
    if (form.newPassword.length < 6) {
      toast.error('Password minimal 6 karakter'); return;
    }
    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password berhasil diubah');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengubah password');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full sm:max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl
        border border-[var(--border)] shadow-2xl animate-slide-up p-5 space-y-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center sm:hidden mb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border2)]" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)]">Ganti Password</h3>
        {[
          { key: 'currentPassword', label: 'Password Saat Ini' },
          { key: 'newPassword',     label: 'Password Baru' },
          { key: 'confirmPassword', label: 'Konfirmasi Password Baru' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{f.label}</label>
            <input type="password" value={form[f.key]}
              onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
              className="input-base text-sm" placeholder="••••••••" />
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 h-11 text-sm">Batal</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 h-11 text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SettingsPage() {
  const { user, logout, isHR } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showPwModal, setShowPwModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Berhasil keluar');
    navigate('/login');
  };

  return (
    <div className="max-w-lg lg:max-w-3xl mx-auto space-y-5 animate-slide-up">
      {/* Profile card */}
      <div className="card-padded">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600
            flex items-center justify-center shadow-glow flex-shrink-0">
            <span className="text-white font-black text-2xl">{user?.name?.[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-[var(--text-primary)] truncate">{user?.name}</h2>
            <p className="text-sm text-[var(--text-secondary)] truncate">{user?.email}</p>
            <div className="mt-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400">
                <Shield className="w-3 h-3" />
                {ROLE_LABEL[user?.role] || user?.role}
              </span>
            </div>
          </div>
        </div>
        {user?.last_login && (
          <p className="text-xs text-[var(--text-muted)] mt-3 border-t border-[var(--border)] pt-3">
            Login terakhir: {new Date(user.last_login).toLocaleString('id-ID')}
          </p>
        )}
      </div>

      {/* Akun */}
      <Section title="Akun">
        <SettingRow icon={Lock} label="Ganti Password"
          sublabel="Ubah password login Anda"
          iconBg="bg-amber-100 dark:bg-amber-950"
          onClick={() => setShowPwModal(true)} />
      </Section>

      {/* Tampilan */}
      <Section title="Tampilan">
        <SettingRow
          icon={isDark ? Moon : Sun}
          label={isDark ? 'Mode Gelap' : 'Mode Terang'}
          sublabel="Klik untuk mengganti tema"
          iconBg="bg-indigo-100 dark:bg-indigo-950"
          onClick={toggleTheme}
        >
          <div className={`w-10 h-5.5 rounded-full transition-colors relative flex-shrink-0 ${isDark ? 'bg-brand-500' : 'bg-[var(--border)]'}`}
            style={{ height: '22px' }}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isDark ? 'left-[calc(100%-18px)]' : 'left-0.5'}`} />
          </div>
        </SettingRow>
      </Section>

      {/* Laporan — for admin/HR */}
      {(isHR || user?.role === 'admin') && (
        <Section title="Laporan">
          <SettingRow icon={BarChart3} label="Buka Laporan & Analitik"
            sublabel="Data absensi, gaji, cuti, karyawan"
            iconBg="bg-indigo-100 dark:bg-indigo-950"
            onClick={() => navigate('/reports')} />
        </Section>
      )}

      {/* Info aplikasi */}
      <Section title="Aplikasi">
        <SettingRow icon={Info} label="HRD Lite Professional"
          sublabel="Versi 1.0.0 · 2024"
          iconBg="bg-[var(--bg-tertiary)]"
        />
      </Section>

      {/* Logout */}
      <Section title="Aksi">
        <SettingRow icon={LogOut} label="Keluar" sublabel="Logout dari akun ini"
          danger onClick={handleLogout} />
      </Section>

      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}
    </div>
  );
}
