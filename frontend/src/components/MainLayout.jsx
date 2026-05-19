import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, Clock, CalendarOff, DollarSign,
  TrendingUp, Building2, SlidersHorizontal, Shield,
  ShoppingCart, Package, Upload, ShoppingBag, Wallet,
  ClipboardList, BarChart3, Settings, LogOut, Bell,
  Sun, Moon, ChevronRight, Menu, X, Search,
  Users as UsersIcon, FileText, Award, Target,
  Layers, ChevronDown, Home, Zap, Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// ── NAV STRUCTURE ─────────────────────────────────────────────
const NAV = [
  {
    group: 'WORKSPACE',
    items: [
      { to: '/dashboard', icon: Home,           label: 'Dashboard',    roles: ['admin','hr','supervisor','employee'] },
    ],
  },
  {
    group: 'HRD',
    items: [
      { to: '/employees',  icon: Users,          label: 'Karyawan',     roles: ['admin','hr','supervisor'] },
      { to: '/attendance', icon: Clock,          label: 'Absensi',      roles: ['admin','hr','supervisor','employee'] },
      { to: '/leaves',     icon: CalendarOff,    label: 'Cuti',         roles: ['admin','hr','supervisor','employee'] },
      { to: '/payroll-pro',icon: DollarSign,     label: 'Gaji',         roles: ['admin','hr'] },
      { to: '/reports',    icon: BarChart3,      label: 'Laporan HRD',  roles: ['admin','hr'] },
    ],
  },
  {
    group: 'INSENTIF',
    items: [
      { to: '/incentive',        icon: TrendingUp,  label: 'Dashboard',    roles: ['admin','hr'] },
      { to: '/incentive/master', icon: Layers,      label: 'Master Data',  roles: ['admin','hr'] },
      { to: '/incentive/periods',icon: Target,      label: 'Periode',      roles: ['admin','hr'] },
    ],
  },
  {
    group: 'ERP',
    collapse: true,
    children: [
      {
        label: 'Penjualan',
        icon: ShoppingCart,
        key: 'sales',
        items: [
          { to: '/erp',           icon: Home,        label: 'Dashboard',    roles: ['admin','hr','supervisor','employee'] },
          { to: '/erp/orders',    icon: ShoppingCart,label: 'Order',        roles: ['admin','hr','supervisor','employee'] },
          { to: '/erp/customers', icon: UsersIcon,   label: 'Pelanggan',    roles: ['admin','hr'] },
        ],
      },
      {
        label: 'Inventory',
        icon: Package,
        key: 'inventory',
        items: [
          { to: '/erp/products',    icon: Package,     label: 'Produk',      roles: ['admin','hr'] },
          { to: '/erp/purchases',   icon: ShoppingBag, label: 'Pembelian',   roles: ['admin','hr'] },
          { to: '/erp/stock-opname',icon: ClipboardList,label:'Stok Opname', roles: ['admin','hr'] },
          { to: '/erp/import',      icon: Upload,      label: 'Import Data', roles: ['admin','hr'] },
        ],
      },
      {
        label: 'Keuangan',
        icon: Wallet,
        key: 'finance',
        items: [
          { to: '/erp/expenses',   icon: Wallet,      label: 'Pengeluaran', roles: ['admin','hr'] },
          { to: '/erp/profit-loss',icon: TrendingUp,  label: 'Laba Rugi',   roles: ['admin','hr'] },
          { to: '/erp/reports',    icon: BarChart3,   label: 'Laporan',     roles: ['admin','hr'] },
        ],
      },
    ],
  },
  {
    group: 'PENGATURAN',
    items: [
      { to: '/company-settings',   icon: Building2,      label: 'Perusahaan',   roles: ['admin'] },
      { to: '/payroll-components', icon: SlidersHorizontal,label:'Komponen Gaji',roles: ['admin','hr'] },
      { to: '/settings',           icon: Settings,       label: 'Akun',         roles: ['admin','hr','supervisor','employee'] },
    ],
  },
];

// ── Sidebar NavItem ───────────────────────────────────────────
const NavItem = ({ to, icon: Icon, label, collapsed, onClick }) => (
  <NavLink to={to} onClick={onClick}
    className={({ isActive }) =>
      `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative
      ${isActive
        ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
      } ${collapsed ? 'justify-center px-2' : ''}`
    }>
    <Icon size={18} className="flex-shrink-0" />
    {!collapsed && <span className="truncate">{label}</span>}
    {collapsed && (
      <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-semibold rounded-lg
        opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
      </div>
    )}
  </NavLink>
);

// ── ERP Collapse Group ────────────────────────────────────────
const ErpGroup = ({ group, collapsed, userRole, mobileClose }) => {
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState(() => {
    const active = {};
    group.children.forEach(child => {
      if (child.items.some(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'))) {
        active[child.key] = true;
      }
    });
    return active;
  });

  const toggle = (key) => setOpenKeys(p => ({ ...p, [key]: !p[key] }));

  const isGroupActive = (child) =>
    child.items.some(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'));

  return (
    <div>
      {!collapsed && (
        <p className="px-3 mb-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {group.group}
        </p>
      )}
      {group.children.map(child => {
        const hasAccess = child.items.some(i =>
          !i.roles || i.roles.includes(userRole)
        );
        if (!hasAccess) return null;

        const isActive  = isGroupActive(child);
        const isOpen    = openKeys[child.key];
        const Icon      = child.icon;
        const visItems  = child.items.filter(i => !i.roles || i.roles.includes(userRole));

        if (collapsed) {
          return (
            <div key={child.key} className="relative group">
              <button className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-all ${isActive ? 'bg-brand-500/10 text-brand-500' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                <Icon size={18} />
              </button>
              {/* Hover flyout */}
              <div className="absolute left-full top-0 ml-3 w-44 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl p-1.5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-50 transition-opacity">
                <p className="px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{child.label}</p>
                {visItems.map(item => (
                  <NavLink key={item.to} to={item.to} onClick={mobileClose}
                    className={({ isActive }) => `flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-brand-500 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`}>
                    <item.icon size={14} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={child.key}>
            <button onClick={() => toggle(child.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`}>
              <Icon size={18} className="flex-shrink-0" />
              <span className="flex-1 text-left">{child.label}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="ml-4 pl-3 border-l-2 border-[var(--border)] mt-0.5 mb-1 space-y-0.5">
                {visItems.map(item => (
                  <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} onClick={mobileClose} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── SIDEBAR CONTENT ───────────────────────────────────────────
const SidebarContent = ({ collapsed, user, onToggle, onMobileClose }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => { logout(); navigate('/login'); };
  const role = user?.role;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 flex-shrink-0 ${collapsed ? 'justify-center px-2' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/30">
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-black text-[var(--text-primary)] leading-tight truncate">GPDISTRO</p>
            <p className="text-[10px] text-[var(--text-muted)] font-medium">HR Pro</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-4 pb-4 scrollbar-thin">
        {NAV.map((section) => {
          if (section.collapse) {
            return (
              <ErpGroup key={section.group} group={section} collapsed={collapsed}
                userRole={role} mobileClose={onMobileClose} />
            );
          }

          const visItems = section.items?.filter(i => !i.roles || i.roles.includes(role));
          if (!visItems?.length) return null;

          return (
            <div key={section.group}>
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                  {section.group}
                </p>
              )}
              <div className="space-y-0.5">
                {visItems.map(item => (
                  <NavItem key={item.to} to={item.to} icon={item.icon}
                    label={item.label} collapsed={collapsed} onClick={onMobileClose} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom: user + controls */}
      <div className={`flex-shrink-0 border-t border-[var(--border)] p-3 space-y-1`}>
        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all ${collapsed ? 'justify-center' : ''}`}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* User */}
        <div className={`flex items-center gap-2.5 px-2 py-2 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user?.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] capitalize">{user?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} title="Logout"
              className="w-7 h-7 rounded-lg hover:bg-red-100 dark:hover:bg-red-950 flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 transition-colors flex-shrink-0">
              <LogOut size={14} />
            </button>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        <button onClick={onToggle}
          className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-all">
          <ChevronRight size={14} className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN LAYOUT
// ════════════════════════════════════════════════════════════════
export default function MainLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [notifications, setNotifs]      = useState(2);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Get current page title from NAV
  const getPageTitle = () => {
    for (const section of NAV) {
      if (section.collapse) {
        for (const child of section.children) {
          const found = child.items.find(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'));
          if (found) return `${child.label} / ${found.label}`;
        }
      } else {
        const found = section.items?.find(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'));
        if (found) return found.label;
      }
    }
    return 'GPDISTRO HR Pro';
  };

  const sidebarW = collapsed ? 'lg:w-[72px]' : 'lg:w-[240px]';

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden">

      {/* ── MOBILE OVERLAY ──────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50
        flex flex-col
        bg-[var(--bg-card)] border-r border-[var(--border)]
        transition-all duration-300 ease-in-out
        ${sidebarW}
        w-[240px]
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        shadow-xl lg:shadow-none
      `}>
        <SidebarContent
          collapsed={collapsed}
          user={user}
          onToggle={() => setCollapsed(v => !v)}
          onMobileClose={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── MAIN AREA ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── TOPBAR ────────────────────────────────────────── */}
        <header className="flex-shrink-0 h-14 flex items-center gap-3 px-4 lg:px-6
          bg-[var(--bg-card)] border-b border-[var(--border)] shadow-sm">

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(v => !v)}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
            <Menu size={20} />
          </button>

          {/* Breadcrumb / page title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{getPageTitle()}</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] hidden sm:block">
              {new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </p>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            {/* Notification */}
            <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
              <Bell size={18} />
              {notifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>

            {/* User avatar — mobile */}
            <div className="lg:hidden w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ──────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
