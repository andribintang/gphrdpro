import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Loader2, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { isDark, toggleTheme }    = useTheme();
  const { settings }               = useCompany();

  const [form, setForm]             = useState({ email: '', password: '' });
  const [showPassword, setShowPass] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [errors, setErrors]         = useState({});

  const from = location.state?.from?.pathname || '/dashboard';
  useEffect(() => { if (isAuthenticated) navigate(from, { replace: true }); }, [isAuthenticated]);

  const validate = () => {
    const e = {};
    if (!form.email.trim())    e.email    = 'Email wajib diisi';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email tidak valid';
    if (!form.password.trim()) e.password = 'Password wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await login(form.email.trim(), form.password);
      toast.success('Selamat datang!');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Email atau password salah';
      toast.error(msg);
      setErrors({ password: msg });
    } finally { setIsLoading(false); }
  };

  const setDemo = (email, password) => setForm({ email, password });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button onClick={toggleTheme}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all bg-[var(--bg-card)]">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* ── Left panel — branding ────────────────────────── */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 relative overflow-hidden flex-col items-center justify-center p-12">
          {/* Decorative circles */}
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute top-1/3 right-10 w-32 h-32 bg-white/5 rounded-full" />

          <div className="relative z-10 text-center">
            {/* Logo */}
            <div className="w-40 h-40 mx-auto mb-8 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-4">
              <img
                src={settings.logo_url || '/logo-gpdistro.png'}
                alt={settings.app_name}
                className="w-full h-full object-contain"
                onError={e => { e.target.src = '/logo-gpdistro.png'; }}
              />
            </div>

            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              {settings.app_name || 'GPDISTRO HR Pro'}
            </h1>
            <p className="text-white/70 text-lg mb-10">
              {settings.company_tagline || 'Human Resource Management System'}
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto">
              {['Absensi Wajah', 'Payroll Otomatis', 'Sistem Insentif', 'Manajemen Cuti', 'Laporan Analytics'].map((f, i) => (
                <span key={i} className="px-3 py-1.5 bg-white/10 border border-white/20 text-white/80 text-xs font-semibold rounded-full">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom company info */}
          {settings.company_name && (
            <div className="absolute bottom-8 text-center">
              <p className="text-white/40 text-xs">{settings.company_name}</p>
            </div>
          )}
        </div>

        {/* ── Right panel — login form ──────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-16">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-2xl shadow-lg flex items-center justify-center p-2 border border-[var(--border)]">
              <img
                src={settings.logo_url || '/logo-gpdistro.png'}
                alt={settings.app_name}
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl font-black text-[var(--text-primary)]">
              {settings.app_name || 'GPDISTRO HR Pro'}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {settings.company_tagline || 'Human Resource Management System'}
            </p>
          </div>

          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-[var(--text-primary)]">Selamat Datang 👋</h2>
              <p className="text-[var(--text-secondary)] text-sm mt-1">Masuk ke akun Anda untuk melanjutkan</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors({}); }}
                  placeholder="nama@perusahaan.com"
                  className={`input-base ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}`}
                  autoComplete="email"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors({}); }}
                    placeholder="Masukkan password"
                    className={`input-base pr-12 ${errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}`}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>

              {/* Submit */}
              <button type="submit" disabled={isLoading}
                className="btn-primary w-full h-12 text-base font-bold mt-2 disabled:opacity-60">
                {isLoading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Masuk...</>
                  : <><LogIn className="w-5 h-5" /> Masuk</>}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6">
              <p className="text-xs text-[var(--text-muted)] text-center font-semibold uppercase tracking-wider mb-3">
                Akun Demo
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label:'Admin',      email:'admin@hrd.com',      pass:'Admin@123',   color:'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400' },
                  { label:'HR',         email:'hr@hrd.com',         pass:'Hr@123456',   color:'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400' },
                  { label:'Supervisor', email:'supervisor@hrd.com', pass:'Super@123',   color:'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' },
                  { label:'Karyawan',   email:'ahmad@hrd.com',      pass:'Emp@123456',  color:'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' },
                ].map((d, i) => (
                  <button key={i} type="button" onClick={() => setDemo(d.email, d.pass)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${d.color} border border-current/20`}>
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] text-center mt-2">Klik untuk isi otomatis</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
