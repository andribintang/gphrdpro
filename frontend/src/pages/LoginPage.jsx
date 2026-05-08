import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Loader2, Sun, Moon, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const ROLE_DEMOS = [
  { label: 'Admin', email: 'admin@hrd.com', password: 'Admin@123', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400' },
  { label: 'HR', email: 'hr@hrd.com', password: 'Hr@123456', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  { label: 'Supervisor', email: 'supervisor@hrd.com', password: 'Super@123', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  { label: 'Karyawan', email: 'ahmad@hrd.com', password: 'Emp@123456', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated]);

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email diperlukan';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email tidak valid';
    if (!form.password) errs.password = 'Password diperlukan';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    const result = await login(form.email, form.password);
    setIsLoading(false);

    if (result.success) {
      toast.success(`Selamat datang, ${result.user.name}! 👋`);
      navigate(from, { replace: true });
    } else {
      toast.error(result.message);
    }
  };

  const fillDemo = (demo) => {
    setForm({ email: demo.email, password: demo.password });
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 safe-top">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-[var(--text-primary)] text-sm tracking-tight">HRD Lite</span>
        </div>
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center
            text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]
            transition-all duration-200"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
              bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Selamat Datang
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Masuk ke akun HRD Lite Anda
            </p>
          </div>

          {/* Demo roles */}
          <div className="mb-6 p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-1">
              Demo Login
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {ROLE_DEMOS.map(demo => (
                <button
                  key={demo.label}
                  onClick={() => fillDemo(demo)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 
                    active:scale-95 text-left ${demo.color}`}
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                onFocus={() => errors.email && setErrors(e => ({ ...e, email: '' }))}
                placeholder="nama@perusahaan.com"
                autoComplete="email"
                className={`input-base ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  onFocus={() => errors.password && setErrors(e => ({ ...e, password: '' }))}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  className={`input-base pr-12 ${errors.password ? 'border-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                    text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded-lg transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2 h-12 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Masuk
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 safe-bottom">
        <p className="text-xs text-[var(--text-muted)]">
          © 2024 HRD Lite Professional System · v1.0
        </p>
      </div>
    </div>
  );
}
