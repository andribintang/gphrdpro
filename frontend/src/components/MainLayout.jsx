import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Home, Users, Clock, CalendarOff, DollarSign,
  TrendingUp, Building2, SlidersHorizontal, Settings,
  ShoppingCart, Package, Upload, ShoppingBag, Wallet,
  ClipboardList, BarChart3, LogOut, Bell, Sun, Moon,
  ChevronDown, Menu, Truck, Database, CalendarDays,
  RotateCcw, LayoutList, Layers, Target, Zap, Plus, Store, Sparkles, User,
  PanelLeftClose, PanelLeftOpen, Shield
} from 'lucide-react';
import { useAuth }  from '../context/AuthContext';
import useAutoLogout from '../hooks/useAutoLogout';
import { useTheme } from '../context/ThemeContext';

const NAV = [
  // ── 1. Dashboard ERP ──────────────────────────────────────────
  {
    group: null,
    items: [
      { to:'/erp', icon:Home, label:'Dashboard ERP', roles:['admin','hr','supervisor','employee'] },
    ],
  },
  // ── 2. ERP ────────────────────────────────────────────────────
  {
    group: 'ERP',
    children: [
      {
        label:'Penjualan', icon:ShoppingCart, key:'sales',
        items:[
          { to:'/erp/orders',    icon:ShoppingCart,label:'Order',     roles:['admin','hr','supervisor','employee'] },
          { to:'/erp/shipments',  icon:Truck,       label:'Pengiriman',  roles:['admin','hr','supervisor','employee'] },
          { to:'/erp/customers', icon:Users,       label:'Pelanggan', roles:['admin','hr','supervisor','employee'] },
          { to:'/erp/returns',   icon:RotateCcw,   label:'Retur',     roles:['admin','hr','supervisor','employee'] },
        ],
      },
      {
        label:'Inventory', icon:Package, key:'inventory',
        items:[
          { to:'/erp/products',     icon:Package,       label:'Produk',      roles:['admin','hr','supervisor','employee'] },
          { to:'/erp/master',       icon:Database,      label:'Master Data', roles:['admin','hr','supervisor','employee'] },
          { to:'/erp/purchases',    icon:ShoppingBag,   label:'Pembelian',   roles:['admin','hr','supervisor','employee'] },
          { to:'/erp/stock-opname', icon:ClipboardList, label:'Stok Opname',     roles:['admin','hr','supervisor','employee'] },
          { to:'/erp/inventory',      icon:BarChart3,     label:'Inventory Intel', roles:['admin','hr','supervisor'] },
          { to:'/erp/import',       icon:Upload,        label:'Import Data', roles:['admin','hr','supervisor','employee'] },
        ],
      },
      {
        label:'Keuangan', icon:Wallet, key:'finance',
        items:[
          { to:'/erp/expenses',      icon:Wallet,      label:'Pengeluaran',     roles:['admin','hr','supervisor','employee'] },
          { to:'/erp/profit-loss',   icon:TrendingUp,  label:'Laba Rugi',       roles:['admin','hr'] },
          { to:'/erp/reports',       icon:BarChart3,   label:'Laporan Sales',   roles:['admin','hr','supervisor','employee'] },
          { to:'/erp/sales-target',   icon:Target,      label:'Target Sales',    roles:['admin','hr','supervisor'] },
          { to:'/erp/daily-report',  icon:CalendarDays,label:'Laporan Harian',  roles:['admin','hr','supervisor','employee'] },
          { to:'/erp/report-channel',icon:LayoutList,  label:'Laporan Channel', roles:['admin','hr','supervisor','employee'] },
        ],
      },
    ],
  },
  // ── 3. HRD ────────────────────────────────────────────────────
  {
    group: 'HRD',
    items: [
      { to:'/dashboard',        icon:Home,          label:'Dashboard HRD',  roles:['admin','hr','supervisor','employee'] },
      { to:'/employees',        icon:Users,         label:'Karyawan',        roles:['admin','hr','supervisor'] },
      { to:'/attendance',       icon:Clock,         label:'Absensi',         roles:['admin','hr','supervisor','employee'] },
      { to:'/attendance-admin', icon:ClipboardList, label:'Data Absensi',    roles:['admin','hr'] },
      { to:'/leaves',           icon:CalendarOff,   label:'Cuti',            roles:['admin','hr','supervisor','employee'] },
      { to:'/departments',      icon:Building2,     label:'Departemen',      roles:['admin','hr'] },
      { to:'/org-chart',         icon:LayoutList,    label:'Org Chart',       roles:['admin','hr','supervisor'] },
      { to:'/hr-assistant',      icon:Sparkles,      label:'AI HR Assistant', roles:['admin','hr'] },
      { to:'/payroll-pro',      icon:DollarSign,    label:'Gaji & Slip',     roles:['admin','hr','supervisor','employee'] },
      { to:'/reports',          icon:BarChart3,     label:'Laporan HRD',     roles:['admin','hr'] },
    ],
  },
  // ── 4. Insentif ───────────────────────────────────────────────
  {
    group: 'Insentif',
    items: [
      { to:'/incentive',         icon:TrendingUp, label:'Dashboard',  roles:['admin','hr'] },
      { to:'/incentive/master',  icon:Layers,     label:'Master Data',roles:['admin','hr'] },
      { to:'/incentive/periods', icon:Target,     label:'Periode',    roles:['admin','hr'] },
    ],
  },
  // ── 5. Toko Online ────────────────────────────────────────────
  {
    group: 'Toko Online',
    children: [
      {
        label: 'GPDISTRO', icon: Store, key: 'gpdistro',
        items: [
          { to:'/store/gpdistro/products', icon:Package,      label:'Produk',    roles:['admin','hr'] },
          { to:'/store/gpdistro/orders',   icon:ShoppingBag,  label:'Order',     roles:['admin','hr'] },
          { to:'/store/gpdistro/catalog',  icon:LayoutList,   label:'Kategori & Voucher', roles:['admin','hr'] },
        ],
      },
      {
        label: 'GP RACING', icon: Zap, key: 'gpracing',
        items: [
          { to:'/store/gpracing/products', icon:Package,      label:'Produk',    roles:['admin','hr'] },
          { to:'/store/gpracing/orders',   icon:ShoppingBag,  label:'Order',     roles:['admin','hr'] },
          { to:'/store/gpracing/catalog',  icon:LayoutList,   label:'Kategori & Voucher', roles:['admin','hr'] },
        ],
      },
    ],
  },
  // ── 6. Pengaturan ─────────────────────────────────────────────
  {
    group: 'Pengaturan',
    items: [
      { to:'/company-settings',   icon:Building2,         label:'Perusahaan',    roles:['admin'] },
      { to:'/payroll-components', icon:SlidersHorizontal, label:'Komponen Gaji', roles:['admin','hr'] },
      { to:'/user-access',        icon:Shield,            label:'Hak Akses',     roles:['admin','hr'] },
      { to:'/self-service',        icon:User,              label:'Self Service',  roles:['admin','hr','supervisor','employee'] },
      { to:'/settings',           icon:Settings,          label:'Akun',          roles:['admin','hr','supervisor','employee'] },
    ],
  },
];

const NavItem = ({ to, icon: Icon, label, collapsed, onClick }) => (
  <NavLink to={to} end={to === '/erp'} onClick={onClick}
    className={({ isActive }) => [
      'group relative flex items-center gap-3 rounded-xl text-sm transition-all duration-150 font-medium w-full px-3 py-2',
      isActive ? 'bg-[var(--sidebar-item-active-bg)] text-[var(--sidebar-item-active-text)] font-semibold'
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

const NavGroup = ({ section, collapsed, role, onClose, forceClose }) => {
  const location = useLocation();
  const visible = section.items?.filter(i => !i.roles || i.roles.includes(role));
  if (!visible?.length) return null;
  const isAnyActive = visible.some(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'));
  const [open, setOpen] = useState(isAnyActive && !forceClose);
  // Auto-collapse when forceClose changes
  useEffect(() => { if (forceClose) setOpen(false); }, [forceClose]);
  if (collapsed) return (
    <div className="space-y-0.5">{visible.map(item => <NavItem key={item.to} {...item} collapsed onClick={onClose} />)}</div>
  );
  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 rounded-lg hover:bg-[var(--sidebar-item-hover)] transition-all group cursor-pointer">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors select-none">
          {section.group}
        </span>
        <ChevronDown size={11} className={`text-[var(--text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-0.5">{visible.map(item => <NavItem key={item.to} {...item} onClick={onClose} />)}</div>
      )}
    </div>
  );
};

const ErpGroup = ({ section, collapsed, role, onClose }) => {
  const location = useLocation();
  const isErpActive = location.pathname.startsWith('/erp');
  const [erpOpen, setErpOpen] = useState(isErpActive);
  const initSubs = {};
  section.children.forEach(child => {
    initSubs[child.key] = child.items.some(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'));
  });
  const [subOpen, setSubOpen] = useState(initSubs);
  const toggleSub = (key) => setSubOpen(p => ({ ...p, [key]: !p[key] }));

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {section.children.flatMap(child =>
          child.items.filter(i => !i.roles || i.roles.includes(role))
            .map(item => <NavItem key={item.to} {...item} collapsed onClick={onClose} />)
        )}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setErpOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 rounded-lg hover:bg-[var(--sidebar-item-hover)] transition-all group cursor-pointer">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors select-none">
          {section.group}
        </span>
        <ChevronDown size={11} className={`text-[var(--text-muted)] transition-transform duration-200 ${erpOpen ? 'rotate-180' : ''}`} />
      </button>
      {erpOpen && (
        <div className="space-y-0.5">
          {section.children.map(child => {
            const visItems = child.items.filter(i => !i.roles || i.roles.includes(role));
            if (!visItems.length) return null;
            const Icon = child.icon;
            const isSubActive = visItems.some(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'));
            return (
              <div key={child.key}>
                <button onClick={() => toggleSub(child.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
                    ${isSubActive ? 'text-[var(--brand-600)]' : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)]'}`}>
                  <Icon size={15} className={`flex-shrink-0 ${isSubActive ? 'text-[var(--brand-600)]' : 'text-[var(--text-muted)]'}`} />
                  <span className="flex-1 text-left truncate">{child.label}</span>
                  <ChevronDown size={11} className={`flex-shrink-0 transition-transform duration-200 ${subOpen[child.key] ? 'rotate-180' : ''}`} />
                </button>
                {subOpen[child.key] && (
                  <div className="ml-4 pl-3 border-l border-[var(--border)] mt-0.5 mb-1 space-y-0.5">
                    {visItems.map(item => <NavItem key={item.to} {...item} depth={1} onClick={onClose} />)}
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

const Sidebar = ({ collapsed, onToggle, onClose, isOnErp }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const role = user?.role;

  return (
    <div className="flex flex-col h-full bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]">
      <div className={`flex items-center gap-3 flex-shrink-0 border-b border-[var(--sidebar-border)] px-4 ${collapsed ? 'justify-center px-2' : ''}`} style={{ height:'60px' }}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-700)] flex items-center justify-center flex-shrink-0 shadow-sm">
          <Zap size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary)] leading-none truncate">GPDISTRO RACING ID</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">ERP & HRD Integrated System</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4 scrollbar-thin">
        {NAV.map((section, idx) => {
          if (!section.group) {
            const vis = section.items.filter(i => !i.roles || i.roles.includes(role));
            return <div key={idx} className="space-y-0.5">{vis.map(item => <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onClose} />)}</div>;
          }
          if (section.children) return <ErpGroup key="erp" section={section} collapsed={collapsed} role={role} onClose={onClose} />;
          return <NavGroup key={section.group} section={section} collapsed={collapsed} role={role} onClose={onClose} forceClose={section.group === 'HRD' && isOnErp} />;
        })}
      </nav>

      <div className="flex-shrink-0 border-t border-[var(--sidebar-border)] p-2 space-y-0.5">
        <button onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)] transition-all ${collapsed ? 'justify-center' : ''}`}>
          {theme === 'dark' ? <Sun size={15} className="text-[var(--text-muted)] flex-shrink-0" /> : <Moon size={15} className="text-[var(--text-muted)] flex-shrink-0" />}
          {!collapsed && <span className="text-xs truncate">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--sidebar-item-hover)] transition-all ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{user?.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] capitalize truncate">{user?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={() => { logout(); navigate('/login'); }} title="Logout"
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all flex-shrink-0">
              <LogOut size={13} />
            </button>
          )}
        </div>
        <button onClick={onToggle}
          className={`hidden lg:flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)] transition-all ${collapsed ? 'justify-center' : ''}`}>
          {collapsed ? <PanelLeftOpen size={14} /> : <><PanelLeftClose size={14} /><span>Collapse</span></>}
        </button>
      </div>
    </div>
  );
};

// ── Bottom Navigation Bar (mobile only) — Role-based ──────────
const BottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = user?.role;
  const isHR = ['admin','hr'].includes(role);
  const isSupervisor = role === 'supervisor';

  const isActive = (path, exact = false) =>
    exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + '/');

  const NAV_ITEM = ({ to, icon: Icon, label, exact, fab }) => {
    const active = isActive(to, exact);
    if (fab) return (
      <button onClick={() => navigate(to)}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 -mt-5 relative">
        <div className="w-13 h-13 rounded-full w-12 h-12 flex items-center justify-center shadow-xl transition-transform active:scale-90"
          style={{ background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))' }}>
          <Icon size={22} strokeWidth={2.5} className="text-white"/>
        </div>
        <span className="text-[10px] font-semibold leading-none mt-0.5" style={{color:'var(--brand-600)'}}>{label}</span>
      </button>
    );
    return (
      <button onClick={() => navigate(to)}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all active:scale-95 relative ${active ? 'text-[var(--brand-600)]' : 'text-[var(--text-muted)]'}`}>
        {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[var(--brand-600)]"/>}
        <Icon size={20} strokeWidth={active ? 2.5 : 1.8}/>
        <span className="text-[10px] font-medium leading-none">{label}</span>
      </button>
    );
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
      style={{
        background: 'var(--topbar-bg)',
        borderTop: '1px solid var(--topbar-border)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(62px + env(safe-area-inset-bottom))',
      }}>

      {/* ── EMPLOYEE: HRD-focused nav ── */}
      {role === 'employee' && (<>
        <NAV_ITEM to="/dashboard"    icon={Home}        label="Home"   exact/>
        <NAV_ITEM to="/leaves"       icon={CalendarOff} label="Cuti"/>
        <NAV_ITEM to="/attendance"   icon={Clock}       label="Absensi" fab/>
        <NAV_ITEM to="/payroll-pro"  icon={DollarSign}  label="Slip"/>
        <NAV_ITEM to="/self-service" icon={User}        label="Profil"/>
      </>)}

      {/* ── SUPERVISOR: HRD + approval ── */}
      {isSupervisor && (<>
        <NAV_ITEM to="/employees"       icon={Users}       label="My Team"/>
        <NAV_ITEM to="/leaves"          icon={CalendarOff} label="Cuti"/>
        <NAV_ITEM to="/attendance"      icon={Clock}       label="Absensi" fab/>
        <NAV_ITEM to="/dashboard"       icon={Home}        label="Home"/>
        <NAV_ITEM to="/self-service"    icon={User}        label="Profil"/>
      </>)}

      {/* ── ADMIN/HR: Mixed HRD + ERP ── */}
      {isHR && (<>
        <NAV_ITEM to="/dashboard"  icon={Home}       label="Home"   exact/>
        <NAV_ITEM to="/employees"  icon={Users}      label="HRD"/>
        <NAV_ITEM to="/erp/orders/new" icon={Plus}   label="+Order" fab/>
        <NAV_ITEM to="/erp"        icon={ShoppingCart} label="ERP"/>
        <NAV_ITEM to="/settings"   icon={Settings}   label="Akun"/>
      </>)}

    </nav>
  );
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';

const fetchNotifs = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return { notifications: [], unread_count: 0 };
    const r = await fetch(`${API_BASE}/notifications?limit=20`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const d = await r.json();
    return d.data || { notifications: [], unread_count: 0 };
  } catch { return { notifications: [], unread_count: 0 }; }
};

export default function MainLayout() {
  const [showNotif,  setShowNotif]  = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifs,     setNotifs]     = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  useAutoLogout(logout); // Auto-logout after 30 min inactivity on shared PC
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Track which nav groups are open - HRD collapses when on ERP
  const isOnErp = location.pathname.startsWith('/erp');

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const getTitle = () => {
    for (const s of NAV) {
      if (s.children) {
        for (const child of s.children) {
          const f = child.items.find(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'));
          if (f) return f.label;
        }
      } else {
        const f = s.items?.find(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'));
        if (f) return f.label;
      }
    }
    return 'GPDISTRO RACING ID';
  };

  // Poll unread count every 30 seconds
  useEffect(() => {
    const load = async () => {
      const d = await fetchNotifs();
      setNotifCount(d.unread_count || 0);
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load full notifs when panel opened
  useEffect(() => {
    if (!showNotif) return;
    setNotifLoading(true);
    fetchNotifs().then(d => {
      setNotifs(d.notifications || []);
      setNotifCount(d.unread_count || 0);
    }).finally(() => setNotifLoading(false));
  }, [showNotif]);

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + localStorage.getItem('accessToken') }
      });
      setNotifs(prev => prev.map(n => ({...n, is_read: true})));
      setNotifCount(0);
    } catch {}
  };

  const handleMarkRead = async (id) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + localStorage.getItem('accessToken') }
      });
      setNotifs(prev => prev.map(n => n.id === id ? {...n, is_read: true} : n));
      setNotifCount(prev => Math.max(0, prev-1));
    } catch {}
  };

  const getNotifIcon = (type) => ({
    payroll_ready:'💰', payroll_paid:'🏦', leave_approved:'✅', leave_rejected:'❌',
    leave_pending:'📋', leave_reminder:'⏰', loan_approved:'💳', birthday:'🎂',
    attendance_late:'⚠️', announcement:'📢', system:'⚙️',
  }[type] || '🔔');

  const getTimeAgo = (d) => {
    const m = Math.floor((Date.now()-new Date(d))/60000);
    if (m<1) return 'Baru saja';
    if (m<60) return `${m} mnt lalu`;
    const h = Math.floor(m/60);
    if (h<24) return `${h} jam lalu`;
    return `${Math.floor(h/24)} hari lalu`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        </div>
      )}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out ${collapsed ? 'lg:w-[68px]' : 'lg:w-[248px]'} w-[248px] ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} shadow-xl lg:shadow-none`}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} onClose={() => setMobileOpen(false)} isOnErp={isOnErp} />
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 flex items-center gap-4 px-4 bg-[var(--topbar-bg)] border-b border-[var(--topbar-border)]" style={{ height:'60px' }}>
          <button onClick={() => setMobileOpen(v => !v)} className="lg:hidden btn-icon"><Menu size={18} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate">{getTitle()}</h1>
            <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">
              {new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button className="btn-icon relative" onClick={() => setShowNotif(v => !v)}>
              <Bell size={17} />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
            <div className="lg:hidden w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center text-white font-bold text-xs">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* ── Notification Panel ── */}
        {showNotif && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)}/>
            <div className="absolute top-14 right-2 sm:right-4 z-50 w-[calc(100vw-16px)] sm:w-96 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">Notifikasi</p>
                  {notifCount > 0 && (
                    <span className="text-[10px] bg-[var(--brand-600)] text-white px-1.5 py-0.5 rounded-full font-bold">
                      {notifCount} baru
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {notifCount > 0 && (
                    <button onClick={handleMarkAllRead}
                      className="text-[10px] text-[var(--brand-600)] hover:underline font-semibold">
                      Tandai Semua Dibaca
                    </button>
                  )}
                  <button onClick={() => setShowNotif(false)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              {notifLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : notifs.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell size={28} className="text-[var(--text-muted)] mx-auto mb-2 opacity-30"/>
                  <p className="text-sm text-[var(--text-muted)]">Tidak ada notifikasi</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)] max-h-[420px] overflow-y-auto">
                  {notifs.map((n) => (
                    <div key={n.id}
                      onClick={() => { handleMarkRead(n.id); if (n.link) { window.location.href = n.link; } setShowNotif(false); }}
                      className={`px-4 py-3 hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors flex items-start gap-3
                        ${!n.is_read ? 'bg-[var(--brand-600)]/5' : ''}`}>
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0 text-base">
                        {getNotifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-semibold ${!n.is_read ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <div className="w-2 h-2 rounded-full bg-[var(--brand-600)] flex-shrink-0 mt-1"/>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">{getTimeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              {notifs.length > 0 && (
                <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--bg)]">
                  <p className="text-[10px] text-[var(--text-muted)] text-center">
                    Notifikasi diperbarui setiap 30 detik
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="page-container py-4 lg:py-5 pb-[80px] lg:pb-5 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
