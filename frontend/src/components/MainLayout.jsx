import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Clock, CalendarOff, DollarSign,
  TrendingUp, Building2, SlidersHorizontal, Settings,
  ShoppingCart, Package, Upload, ShoppingBag, Wallet,
  ClipboardList, BarChart3, LogOut, Bell, Sun, Moon,
  ChevronRight, Menu, X, ChevronDown, Layers, Target,
  Home, Zap, PanelLeftClose, PanelLeftOpen, Search
} from 'lucide-react';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// ── Navigation Structure ──────────────────────────────────────
const NAV = [
  {
    group: null,
    items: [
      { to:'/dashboard', icon:Home, label:'Dashboard', roles:['admin','hr','supervisor','employee'] },
    ],
  },
  {
    group: 'HRD',
    items: [
      { to:'/employees',  icon:Users,           label:'Karyawan',    roles:['admin','hr','supervisor'] },
      { to:'/attendance', icon:Clock,           label:'Absensi',     roles:['admin','hr','supervisor','employee'] },
      { to:'/leaves',     icon:CalendarOff,     label:'Cuti',        roles:['admin','hr','supervisor','employee'] },
      { to:'/payroll-pro',icon:DollarSign,      label:'Gaji',        roles:['admin','hr'] },
      { to:'/reports',    icon:BarChart3,       label:'Laporan HRD', roles:['admin','hr'] },
    ],
  },
  {
    group: 'Insentif',
    items: [
      { to:'/incentive',         icon:TrendingUp, label:'Dashboard',  roles:['admin','hr'] },
      { to:'/incentive/master',  icon:Layers,     label:'Master Data',roles:['admin','hr'] },
      { to:'/incentive/periods', icon:Target,     label:'Periode',    roles:['admin','hr'] },
    ],
  },
  {
    group: 'ERP',
    isErp: true,
    items: [
      { to:'/erp',              icon:ShoppingCart,  label:'Penjualan',   roles:['admin','hr','supervisor','employee'] },
      { to:'/erp/products',     icon:Package,       label:'Produk',      roles:['admin','hr'] },
      { to:'/erp/purchases',    icon:ShoppingBag,   label:'Pembelian',   roles:['admin','hr'] },
      { to:'/erp/expenses',     icon:Wallet,        label:'Pengeluaran', roles:['admin','hr'] },
      { to:'/erp/profit-loss',  icon:TrendingUp,    label:'Laba Rugi',   roles:['admin','hr'] },
    ],
  },
  {
    group: 'Pengaturan',
    items: [
      { to:'/company-settings',   icon:Building2,         label:'Perusahaan',    roles:['admin'] },
      { to:'/payroll-components', icon:SlidersHorizontal, label:'Komponen Gaji', roles:['admin','hr'] },
      { to:'/settings',           icon:Settings,          label:'Akun',          roles:['admin','hr','supervisor','employee'] },
    ],
  },
];

// ── Single nav item ───────────────────────────────────────────
const NavItem = ({ to, icon: Icon, label, collapsed }) => (
  <NavLink to={to}
    className={({ isActive }) => [
      'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 font-medium',
      isActive
        ? 'bg-[var(--sidebar-item-active-bg)] text-[var(--sidebar-item-active-text)]'
        : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)]',
      collapsed ? 'justify-center' : '',
    ].join(' ')
  }>
    {({ isActive }) => (
      <>
        {/* Active indicator */}
        {isActive && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[var(--brand-600)] rounded-full" />
        )}
        <Icon size={16} className={`flex-shrink-0 ${isActive ? 'text-[var(--brand-600)]' : 'text-[var(--text-muted)]'}`} />
        {!collapsed && <span>{label}</span>}
        {/* Tooltip when collapsed */}
        {collapsed && (
          <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium
            bg-gray-900 dark:bg-gray-700 text-white whitespace-nowrap z-50
            opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg">
            {label}
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
          </span>
        )}
      </>
    )}
  </NavLink>
);

// ── Collapsible nav group ─────────────────────────────────────
const NavGroup = ({ section, collapsed, role, onMobileClose }) => {
  const location = useLocation();
  const isAnyActive = section.items.some(i =>
    location.pathname === i.to || location.pathname.startsWith(i.to + '/')
  );
  const [open, setOpen] = useState(isAnyActive);
  const visible = section.items.filter(i => !i.roles || i.roles.includes(role));
  if (!visible.length) return null;

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {visible.map(item => (
          <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} collapsed onClick={onMobileClose} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {section.group && (
        <button onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-3 py-1.5 mb-1 group">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
            {section.group}
          </span>
          <ChevronDown size={10} className={`text-[var(--text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      {open && (
        <div className="space-y-0.5">
          {visible.map(item => (
            <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} onClick={onMobileClose} />
          ))}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════════════════════════════
const Sidebar = ({ collapsed, onToggle, onMobileClose }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const role = user?.role;

  return (
    <div className="flex flex-col h-full bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]">

      {/* Logo */}
      <div className={`flex items-center gap-3 h-[60px] px-4 border-b border-[var(--sidebar-border)] flex-shrink-0 ${collapsed ? 'justify-center px-2' : ''}`}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-700)] flex items-center justify-center flex-shrink-0 shadow-sm">
          <Zap size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)] leading-none">GPDISTRO</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">HR Pro · ERP</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5 scrollbar-thin">
        {NAV.map((section, idx) => {
          // Ungrouped items (Dashboard)
          if (!section.group) {
            const visible = section.items.filter(i => !i.roles || i.roles.includes(role));
            return (
              <div key={idx} className="space-y-0.5">
                {visible.map(item => (
                  <NavItem key={item.to} to={item.to} icon={item.icon}
                    label={item.label} collapsed={collapsed} onClick={onMobileClose} />
                ))}
              </div>
            );
          }
          return (
            <NavGroup key={section.group} section={section}
              collapsed={collapsed} role={role} onMobileClose={onMobileClose} />
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-[var(--sidebar-border)] p-2 space-y-1">

        {/* Theme */}
        <button onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)] transition-all ${collapsed ? 'justify-center' : ''}`}>
          {theme === 'dark'
            ? <Sun size={15} className="text-[var(--text-muted)]" />
            : <Moon size={15} className="text-[var(--text-muted)]" />}
          {!collapsed && <span className="text-xs">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* User row */}
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--sidebar-item-hover)] transition-all">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{user?.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] capitalize">{user?.role}</p>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }}
              title="Logout"
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all flex-shrink-0">
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center justify-center py-2 rounded-xl text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all"
            title="Logout">
            <LogOut size={15} />
          </button>
        )}

        {/* Collapse toggle */}
        <button onClick={onToggle}
          className={`hidden lg:flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)] transition-all ${collapsed ? 'justify-center' : ''}`}>
          {collapsed
            ? <PanelLeftOpen size={14} />
            : <><PanelLeftClose size={14} /><span>Collapse</span></>}
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
  const location  = useLocation();
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Page title from nav
  const getTitle = () => {
    for (const s of NAV) {
      const found = s.items?.find(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'));
      if (found) return found.label;
    }
    return 'GPDISTRO HR Pro';
  };

  const sidebarW = collapsed ? 'lg:w-[68px]' : 'lg:w-[248px]';

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        </div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 flex flex-col
        transition-all duration-300 ease-in-out
        w-[248px] ${sidebarW}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        shadow-xl lg:shadow-none
      `}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(v => !v)}
          onMobileClose={() => setMobileOpen(false)}
        />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="flex-shrink-0 flex items-center gap-4 px-4 lg:px-6
          bg-[var(--topbar-bg)] border-b border-[var(--topbar-border)]"
          style={{ height: '60px' }}>

          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(v => !v)}
            className="lg:hidden btn-icon">
            <Menu size={18} />
          </button>

          {/* Page title + breadcrumb */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate">{getTitle()}</h1>
            <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">
              {new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </p>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1">
            <button className="btn-icon relative">
              <Bell size={17} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--brand-600)] rounded-full" />
            </button>
            {/* Avatar mobile */}
            <div className="lg:hidden w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center text-white font-bold text-xs">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="page-container py-6 lg:py-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
