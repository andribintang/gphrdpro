import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Users, Clock, CalendarOff,
  DollarSign, Menu, X, Sun, Moon, LogOut,
  Bell, ChevronRight, Settings, BarChart3,
  TrendingUp, Building2, SlidersHorizontal,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/attendance',  icon: Clock,           label: 'Absensi' },
  { to: '/leaves',      icon: CalendarOff,     label: 'Cuti' },
  { to: '/payroll-pro', icon: DollarSign,      label: 'Gaji',     roles: ['admin','hr','supervisor','employee'] },
  { to: '/incentive',   icon: TrendingUp,      label: 'Insentif', roles: ['admin','hr'] },
  { to: '/employees',   icon: Users,           label: 'Karyawan', roles: ['admin','hr','supervisor'] },
];

const ROLE_COLORS = { admin:'badge-info', hr:'badge-success', supervisor:'badge-warning', employee:'badge-neutral' };
const ROLE_LABELS = { admin:'Admin', hr:'HR', supervisor:'Supervisor', employee:'Karyawan' };

export default function MainLayout() {
  const { user, logout }         = useAuth();
  const { isDark, toggleTheme }  = useTheme();
  const { settings }             = useCompany();
  const navigate                 = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  );
  const isHRAdmin = ['admin','hr'].includes(user?.role);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    toast.success('Berhasil keluar');
    navigate('/login');
  };

  // ── Sidebar link component ────────────────────────────────
  const SidebarLink = ({ to, icon: Icon, label, onClick }) => (
    <NavLink to={to} onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group
        ${isActive
          ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'}`
      }>
      <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
      <span className="text-sm font-medium">{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* ════════════════════════════════════════════════════
          DESKTOP LAYOUT (lg+) — Sidebar kiri + konten kanan
          ════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex h-screen overflow-hidden">

        {/* Sidebar kiri — fixed */}
        <aside className="w-64 xl:w-72 flex-shrink-0 bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col h-full overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--border)]">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm flex-shrink-0">
              <img src={settings.logo_url || '/logo-gpdistro.png'} alt="Logo"
                className="w-full h-full object-contain p-0.5"
                onError={e => { e.target.style.display='none'; }} />
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm text-[var(--text-primary)] truncate leading-tight">
                {settings.app_name || 'GPDISTRO HR Pro'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">HR Management System</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider px-3 mb-2">Menu Utama</p>
            {visibleNav.map(item => (
              <SidebarLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
            ))}

            {/* Extra admin/hr links */}
            {['admin','hr'].includes(user?.role) && (
              <>
                <div className="my-3 border-t border-[var(--border)]" />
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider px-3 mb-2">Pengaturan</p>
                <SidebarLink to="/reports"    icon={BarChart3}          label="Laporan" />
                <SidebarLink to="/payroll-components" icon={SlidersHorizontal} label="Komponen Gaji" />
                {user?.role === 'admin' && (
                  <SidebarLink to="/company-settings" icon={Building2} label="Pengaturan Perusahaan" />
                )}
                <SidebarLink to="/settings"   icon={Settings}           label="Pengaturan Akun" />
              </>
            )}
            {user?.role === 'employee' && (
              <>
                <div className="my-3 border-t border-[var(--border)]" />
                <SidebarLink to="/settings" icon={Settings} label="Pengaturan" />
              </>
            )}
          </nav>

          {/* User profile di bawah */}
          <div className="px-3 py-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)]">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user?.name}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{ROLE_LABELS[user?.role]}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={toggleTheme}
                  className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] transition-colors">
                  {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
                <button onClick={handleLogout}
                  className="w-7 h-7 rounded-lg hover:bg-red-100 dark:hover:bg-red-950 flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar desktop */}
          <header className="flex-shrink-0 h-14 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center justify-between px-6">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                {new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
              </button>
              <div className="h-6 w-px bg-[var(--border)]" />
              <div className="flex items-center gap-2 text-sm">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <span className="font-medium text-[var(--text-primary)] hidden xl:block">{user?.name}</span>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MOBILE LAYOUT (< lg) — Top header + bottom nav
          ════════════════════════════════════════════════════ */}
      <div className="lg:hidden flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 safe-top glass border-b border-[var(--border)]">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shadow-sm flex items-center justify-center">
                <img src={settings.logo_url || '/logo-gpdistro.png'} alt="Logo"
                  className="w-full h-full object-contain"
                  onError={e => { e.target.style.display='none'; }} />
              </div>
              <span className="font-bold text-[var(--text-primary)] tracking-tight text-sm">
                {settings.app_name || 'GPDISTRO HR Pro'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
              </button>
              <button onClick={toggleTheme}
                className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={() => setMobileMenuOpen(true)}
                className="flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-secondary)]">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
                <Menu className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setMobileMenuOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
            <aside className="relative w-72 h-full bg-[var(--bg-card)] border-l border-[var(--border)] animate-slide-down flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{user?.name}</p>
                    <span className={`badge ${ROLE_COLORS[user?.role]}`}>{ROLE_LABELS[user?.role]}</span>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {visibleNav.map(item => (
                  <SidebarLink key={item.to} to={item.to} icon={item.icon} label={item.label}
                    onClick={() => setMobileMenuOpen(false)} />
                ))}
                <div className="my-2 border-t border-[var(--border)]" />
                {['admin','hr'].includes(user?.role) && (
                  <>
                    <SidebarLink to="/reports"    icon={BarChart3}          label="Laporan"                onClick={() => setMobileMenuOpen(false)} />
                    <SidebarLink to="/payroll-components" icon={SlidersHorizontal} label="Komponen Gaji"  onClick={() => setMobileMenuOpen(false)} />
                    {user?.role === 'admin' && (
                      <SidebarLink to="/company-settings" icon={Building2} label="Pengaturan Perusahaan" onClick={() => setMobileMenuOpen(false)} />
                    )}
                  </>
                )}
                <SidebarLink to="/settings" icon={Settings} label="Pengaturan" onClick={() => setMobileMenuOpen(false)} />
              </nav>
              <div className="p-3 border-t border-[var(--border)]">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all">
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Keluar</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Mobile content */}
        <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
          <Outlet />
        </main>

        {/* Bottom tab nav — mobile only */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-[var(--border)] safe-bottom lg:hidden">
          <div className="flex items-center justify-around h-16 px-1 max-w-screen-xl mx-auto">
            {visibleNav.slice(0, 5).map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-[52px]
                  ${isActive ? 'text-brand-500 dark:text-brand-400' : 'text-[var(--text-muted)]'}`
                }>
                {({ isActive }) => (
                  <>
                    <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-brand-500/10' : ''}`}>
                      <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
                    </div>
                    <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'} leading-none`}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

    </div>
  );
}
