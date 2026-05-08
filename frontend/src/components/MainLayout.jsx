import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Users, Clock, CalendarOff,
  DollarSign, Menu, X, Sun, Moon, LogOut,
  Shield, Bell, ChevronRight, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/attendance', icon: Clock, label: 'Absensi' },
  { to: '/leaves', icon: CalendarOff, label: 'Cuti' },
  { to: '/payroll', icon: DollarSign, label: 'Gaji', roles: ['admin', 'hr'] },
  { to: '/employees', icon: Users, label: 'Karyawan', roles: ['admin', 'hr', 'supervisor'] },
];

const ROLE_COLORS = {
  admin: 'badge-info',
  hr: 'badge-success',
  supervisor: 'badge-warning',
  employee: 'badge-neutral',
};

const ROLE_LABELS = {
  admin: 'Admin',
  hr: 'HR',
  supervisor: 'Supervisor',
  employee: 'Karyawan',
};

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  );

  const handleLogout = async () => {
    setSidebarOpen(false);
    await logout();
    toast.success('Berhasil keluar');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 safe-top glass border-b border-[var(--border)]">
        <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 dark:bg-brand-400 rounded-lg flex items-center justify-center shadow-glow">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[var(--text-primary)] tracking-tight hidden sm:block">
              HRD Lite
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className="relative w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center
              text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center
                text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User menu trigger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl
                border border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-all"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {user?.name?.[0]?.toUpperCase()}
                </span>
              </div>
              <Menu className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
          <aside
            className="relative w-72 h-full bg-[var(--bg-card)] border-l border-[var(--border)]
              animate-slide-down flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <span className="font-bold text-[var(--text-primary)]">Menu</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center
                  text-[var(--text-muted)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User info */}
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600
                  flex items-center justify-center shadow-glow flex-shrink-0">
                  <span className="text-white text-lg font-bold">
                    {user?.name?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text-primary)] truncate">{user?.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
                  <span className={`badge mt-1 ${ROLE_COLORS[user?.role]}`}>
                    {ROLE_LABELS[user?.role]}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {visibleNav.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150
                    ${isActive
                      ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </NavLink>
              ))}
            </nav>

            {/* Footer actions */}
            <div className="p-3 border-t border-[var(--border)] space-y-1">
              <NavLink
                to="/settings"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--text-secondary)]
                  hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-all"
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium">Pengaturan</span>
              </NavLink>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500
                  hover:bg-red-50 dark:hover:bg-red-950 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Keluar</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-4 pb-24">
        <Outlet />
      </main>

      {/* Bottom Tab Navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-[var(--border)] safe-bottom">
        <div className="flex items-center justify-around h-16 px-2 max-w-screen-xl mx-auto">
          {visibleNav.slice(0, 5).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150 min-w-[56px]
                ${isActive
                  ? 'text-brand-500 dark:text-brand-400'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-brand-500/10' : ''}`}>
                    <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
