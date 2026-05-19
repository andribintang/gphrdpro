import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Home, Users, Clock, CalendarOff, DollarSign,
  TrendingUp, Building2, SlidersHorizontal, Settings,
  ShoppingCart, Package, Upload, ShoppingBag, Wallet,
  ClipboardList, BarChart3, LogOut, Bell, Sun, Moon,
  ChevronRight, Menu, ChevronDown, Layers, Target,
  Zap, PanelLeftClose, PanelLeftOpen, LayoutGrid
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
    children: [
      {
        label:'Penjualan', icon:ShoppingCart, key:'sales',
        items:[
          { to:'/erp',           icon:Home,        label:'Dashboard', roles:['admin','hr','supervisor','employee'] },
          { to:'/erp/orders',    icon:ShoppingCart,label:'Order',     roles:['admin','hr','supervisor','employee'] },
          { to:'/erp/customers', icon:Users,       label:'Pelanggan', roles:['admin','hr'] },
        ],
      },
      {
        label:'Inventory', icon:Package, key:'inventory',
        items:[
          { to:'/erp/products',     icon:Package,       label:'Produk',      roles:['admin','hr'] },
          { to:'/erp/purchases',    icon:ShoppingBag,   label:'Pembelian',   roles:['admin','hr'] },
          { to:'/erp/stock-opname', icon:ClipboardList, label:'Stok Opname', roles:['admin','hr'] },
          { to:'/erp/import',       icon:Upload,        label:'Import Data', roles:['admin','hr'] },
        ],
      },
      {
        label:'Keuangan', icon:Wallet, key:'finance',
        items:[
          { to:'/erp/expenses',    icon:Wallet,     label:'Pengeluaran',  roles:['admin','hr'] },
          { to:'/erp/profit-loss', icon:TrendingUp, label:'Laba Rugi',    roles:['admin','hr'] },
          { to:'/erp/reports',     icon:BarChart3,  label:'Laporan Sales',roles:['admin','hr'] },
        ],
      },
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

// ── Simple nav item ───────────────────────────────────────────
const NavItem = ({ to, icon: Icon, label, collapsed, depth = 0, onClick }) => (
  <NavLink to={to} end={to === '/erp'} onClick={onClick}
    className={({ isActive }) => [
      'group relative flex items-center gap-3 rounded-xl text-sm transition-all duration-150 font-medium w-full',
      depth > 0 ? 'px-3 py-2' : 'px-3 py-2',
      isActive
        ? 'bg-[var(--sidebar-item-active-bg)] text-[var(--sidebar-item-active-text)] font-semibold'
        : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)]',
      collapsed ? 'justify-center' : '',
    ].join(' ')
  }>
    {({ isActive }) => (
      <>
        {isActive && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--brand-600)] rounded-full" />
        )}
        <Icon size={15} className={`flex-shrink-0 ${isActive ? 'text-[var(--brand-600)]' : 'text-[var(--text-muted)]'}`} />
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
        {/* Tooltip when collapsed */}
        {collapsed && (
          <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium
            bg-gray-900 dark:bg-gray-700 text-white whitespace-nowrap z-[100]
            opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg">
            {label}
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
          </span>
        )}
      </>
    )}
  </NavLink>
);

// ── Group with expand/collapse ────────────────────────────────
const NavGroup = ({ section, collapsed, role, onClose }) => {
  const location = useLocation();
  const visible = section.items?.filter(i => !i.roles || i.roles.includes(role));
  if (!visible?.length) return null;

  const isAnyActive = visible.some(i =>
    location.pathname === i.to || location.pathname.startsWith(i.to + '/')
  );
  const [open, setOpen] = useState(isAnyActive);

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {visible.map(item => (
          <NavItem key={item.to} {...item} collapsed onClick={onClose} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 rounded-lg
          hover:bg-[var(--sidebar-item-hover)] transition-all group cursor-pointer">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors select-none">
          {section.group}
        </span>
        <ChevronDown size={11} className={`text-[var(--text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-0.5">
          {visible.map(item => (
            <NavItem key={item.to} {...item} onClick={onClose} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── ERP nested group ──────────────────────────────────────────
const ErpGroup = ({ section, collapsed, role, onClose }) => {
  const location = useLocation();
  const isErpActive = location.pathname.startsWith('/erp');

  // Open state for the whole ERP section
  const [erpOpen, setErpOpen] = useState(isErpActive);

  // Open state for each sub-group
  const initSubs = {};
  section.children.forEach(child => {
    initSubs[child.key] = child.items.some(i =>
      location.pathname === i.to || location.pathname.startsWith(i.to + '/')
    );
  });
  const [subOpen, setSubOpen] = useState(initSubs);

  const toggleSub = (key) => setSubOpen(p => ({ ...p, [key]: !p[key] }));

  if (collapsed) {
    // Show all ERP items as flat icons with tooltip
    return (
      <div className="space-y-0.5">
        {section.children.flatMap(child =>
          child.items
            .filter(i => !i.roles || i.roles.includes(role))
            .map(item => (
              <NavItem key={item.to} {...item} collapsed onClick={onClose} />
            ))
        )}
      </div>
    );
  }

  return (
    <div>
      {/* ERP section header */}
      <button onClick={() => setErpOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 rounded-lg
          hover:bg-[var(--sidebar-item-hover)] transition-all group cursor-pointer">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors select-none">
          ERP
        </span>
        <ChevronDown size={11} className={`text-[var(--text-muted)] transition-transform duration-200 ${erpOpen ? 'rotate-180' : ''}`} />
      </button>

      {erpOpen && (
        <div className="space-y-0.5">
          {section.children.map(child => {
            const visItems = child.items.filter(i => !i.roles || i.roles.includes(role));
            if (!visItems.length) return null;
            const Icon = child.icon;
            const isSubActive = visItems.some(i =>
              location.pathname === i.to || location.pathname.startsWith(i.to + '/')
            );

            return (
              <div key={child.key}>
                {/* Sub-group header */}
                <button onClick={() => toggleSub(child.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium
                    transition-all duration-150 ${isSubActive ? 'text-[var(--brand-600)]' : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)]'}`}>
                  <Icon size={15} className={`flex-shrink-0 ${isSubActive ? 'text-[var(--brand-600)]' : 'text-[var(--text-muted)]'}`} />
                  <span className="flex-1 text-left truncate">{child.label}</span>
                  <ChevronDown size={11} className={`flex-shrink-0 transition-transform duration-200 ${subOpen[child.key] ? 'rotate-180' : ''}`} />
                </button>

                {/* Sub-group items */}
                {subOpen[child.key] && (
                  <div className="ml-4 pl-3 border-l border-[var(--border)] mt-0.5 mb-1 space-y-0.5">
                    {visItems.map(item => (
                      <NavItem key={item.to} {...item} depth={1} onClick={onClose} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════════════════════════════
const Sidebar = ({ collapsed, onToggle, onClose }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const role = user?.role;

  return (
    <div className="flex flex-col h-full bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]">

      {/* Logo */}
      <div className={`flex items-center gap-3 flex-shrink-0 border-b border-[var(--sidebar-border)] px-4 ${collapsed ? 'justify-center px-2' : ''}`}
        style={{ height: '60px' }}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-700)]
          flex items-center justify-center flex-shrink-0 shadow-sm">
          <Zap size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary)] leading-none truncate">GPDISTRO</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">HR Pro · ERP</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4 scrollbar-thin">
        {NAV.map((section, idx) => {
          // Dashboard (no group)
          if (!section.group) {
            const vis = section.items.filter(i => !i.roles || i.roles.includes(role));
            return (
              <div key={idx} className="space-y-0.5">
                {vis.map(item => (
                  <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onClose} />
                ))}
              </div>
            );
          }

          // ERP (nested)
          if (section.children) {
            return (
              <ErpGroup key="erp" section={section}
                collapsed={collapsed} role={role} onClose={onClose} />
            );
          }

          // Regular group
          return (
            <NavGroup key={section.group} section={section}
              collapsed={collapsed} role={role} onClose={onClose} />
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-[var(--sidebar-border)] p-2 space-y-0.5">
        {/* Theme */}
        <button onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm
            text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)]
            transition-all ${collapsed ? 'justify-center' : ''}`}>
          {theme === 'dark'
            ? <Sun size={15} className="text-[var(--text-muted)] flex-shrink-0" />
            : <Moon size={15} className="text-[var(--text-muted)] flex-shrink-0" />}
          {!collapsed && <span className="text-xs truncate">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* User */}
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl
          hover:bg-[var(--sidebar-item-hover)] transition-all ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)]
            flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{user?.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] capitalize truncate">{user?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={() => { logout(); navigate('/login'); }}
              className="w-6 h-6 rounded-lg flex items-center justify-center
                text-[var(--text-muted)] hover:text-red-500
                hover:bg-red-50 dark:hover:bg-red-950/50 transition-all flex-shrink-0"
              title="Logout">
              <LogOut size={13} />
            </button>
          )}
        </div>

        {/* Collapse toggle - desktop only */}
        <button onClick={onToggle}
          className={`hidden lg:flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs
            text-[var(--text-muted)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)]
            transition-all ${collapsed ? 'justify-center' : ''}`}>
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

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const getTitle = () => {
    for (const s of NAV) {
      if (s.children) {
        for (const child of s.children) {
          const f = child.items.find(i =>
            location.pathname === i.to || location.pathname.startsWith(i.to + '/'));
          if (f) return f.label;
        }
      } else {
        const f = s.items?.find(i =>
          location.pathname === i.to || location.pathname.startsWith(i.to + '/'));
        if (f) return f.label;
      }
    }
    return 'GPDISTRO HR Pro';
  };

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
        fixed lg:relative inset-y-0 left-0 z-50
        flex flex-col transition-all duration-300 ease-in-out
        ${collapsed ? 'lg:w-[68px]' : 'lg:w-[248px]'}
        w-[248px]
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        shadow-xl lg:shadow-none
      `}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(v => !v)}
          onClose={() => setMobileOpen(false)}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="flex-shrink-0 flex items-center gap-4 px-4 lg:px-6
          bg-[var(--topbar-bg)] border-b border-[var(--topbar-border)]"
          style={{ height: '60px' }}>
          <button onClick={() => setMobileOpen(v => !v)}
            className="lg:hidden btn-icon">
            <Menu size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate">{getTitle()}</h1>
            <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">
              {new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button className="btn-icon relative">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[var(--brand-600)] rounded-full" />
            </button>
            <div className="lg:hidden w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)]
              flex items-center justify-center text-white font-bold text-xs">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="page-container py-6 lg:py-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
