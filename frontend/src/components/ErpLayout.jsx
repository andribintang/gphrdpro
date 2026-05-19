import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ShoppingCart, Package, Users, BarChart3,
  ShoppingBag, Wallet, ClipboardList, Upload,
  TrendingUp, Home, ChevronRight, LayoutGrid
} from 'lucide-react';

const ERP_NAV = [
  {
    group: 'Penjualan',
    items: [
      { to:'/erp',           icon:Home,          label:'Dashboard',   exact:true },
      { to:'/erp/orders',    icon:ShoppingCart,  label:'Order'        },
      { to:'/erp/customers', icon:Users,         label:'Pelanggan'    },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { to:'/erp/products',     icon:Package,       label:'Produk'       },
      { to:'/erp/purchases',    icon:ShoppingBag,   label:'Pembelian'    },
      { to:'/erp/stock-opname', icon:ClipboardList, label:'Stok Opname'  },
      { to:'/erp/import',       icon:Upload,        label:'Import Data'  },
    ],
  },
  {
    group: 'Keuangan',
    items: [
      { to:'/erp/expenses',    icon:Wallet,      label:'Pengeluaran'   },
      { to:'/erp/profit-loss', icon:TrendingUp,  label:'Laba Rugi'     },
      { to:'/erp/reports',     icon:BarChart3,   label:'Laporan Sales' },
    ],
  },
];

const SubNavItem = ({ to, icon: Icon, label, exact }) => (
  <NavLink to={to} end={exact}
    className={({ isActive }) => [
      'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150',
      isActive
        ? 'bg-[var(--sidebar-item-active-bg)] text-[var(--sidebar-item-active-text)] font-semibold'
        : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)] font-medium',
    ].join(' ')
  }>
    {({ isActive }) => (
      <>
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[var(--brand-600)] rounded-full" />
        )}
        <Icon size={15} className={`flex-shrink-0 ${isActive ? 'text-[var(--brand-600)]' : 'text-[var(--text-muted)]'}`} />
        <span className="flex-1">{label}</span>
        {isActive && <ChevronRight size={11} className="text-[var(--brand-500)] opacity-50" />}
      </>
    )}
  </NavLink>
);

export default function ErpLayout() {
  const location = useLocation();

  const allItems   = ERP_NAV.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.exact
    ? location.pathname === i.to
    : location.pathname === i.to || location.pathname.startsWith(i.to + '/'));
  const activeGroup = ERP_NAV.find(g => g.items.includes(activeItem));

  return (
    <div className="flex h-full" style={{ margin: '-24px -32px -32px -32px' }}>

      {/* ── ERP Secondary Sidebar ── sama persis dengan MainLayout sidebar */}
      <aside className="hidden lg:flex flex-col w-[248px] flex-shrink-0
        bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]
        min-h-full">

        {/* Header */}
        <div className="flex items-center gap-3 h-[60px] px-4 border-b border-[var(--sidebar-border)] flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-700)] flex items-center justify-center flex-shrink-0 shadow-sm">
            <LayoutGrid size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)] leading-none">ERP System</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">GPDISTRO Racing</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5 scrollbar-thin">
          {ERP_NAV.map(group => (
            <div key={group.group}>
              <p className="px-3 mb-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => <SubNavItem key={item.to} {...item} />)}
              </div>
            </div>
          ))}
        </nav>

        {/* Branch footer */}
        <div className="flex-shrink-0 border-t border-[var(--sidebar-border)] p-2">
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase mb-2">Cabang</p>
            {[
              { name:'GP Racing',  dot:'bg-blue-400'   },
              { name:'GP Distro',  dot:'bg-purple-400' },
            ].map(b => (
              <div key={b.name} className="flex items-center gap-2 py-1">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${b.dot}`} />
                <span className="text-xs text-[var(--text-secondary)]">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Content Area ── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="page-container py-6 lg:py-8">

          {/* Breadcrumb */}
          {activeItem && (
            <nav className="flex items-center gap-1.5 mb-6 text-xs" aria-label="Breadcrumb">
              <span className="text-[var(--text-muted)]">ERP</span>
              {activeGroup && (
                <>
                  <ChevronRight size={10} className="text-[var(--text-muted)]" />
                  <span className="text-[var(--text-muted)]">{activeGroup.group}</span>
                </>
              )}
              <ChevronRight size={10} className="text-[var(--text-muted)]" />
              <span className="font-semibold text-[var(--text-primary)]">{activeItem.label}</span>
            </nav>
          )}

          {/* Mobile sub-nav */}
          <div className="lg:hidden mb-5 flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {ERP_NAV.flatMap(g => g.items).map(item => (
              <NavLink key={item.to} to={item.to} end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all border
                  ${isActive
                    ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)] shadow-sm'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border2)]'}`
                }>
                <item.icon size={11} />
                {item.label}
              </NavLink>
            ))}
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
