import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  ShoppingCart, Package, Users, BarChart3,
  ShoppingBag, Wallet, ClipboardList, Upload,
  TrendingUp, Home, ChevronRight, LayoutGrid,
  ChevronDown
} from 'lucide-react';

// ── ERP Sub-navigation structure ─────────────────────────────
const ERP_NAV = [
  {
    group: 'PENJUALAN',
    items: [
      { to: '/erp',           icon: Home,         label: 'Dashboard',   exact: true },
      { to: '/erp/orders',    icon: ShoppingCart, label: 'Order'        },
      { to: '/erp/customers', icon: Users,        label: 'Pelanggan'    },
    ],
  },
  {
    group: 'INVENTORY',
    items: [
      { to: '/erp/products',     icon: Package,      label: 'Produk'       },
      { to: '/erp/purchases',    icon: ShoppingBag,  label: 'Pembelian'    },
      { to: '/erp/stock-opname', icon: ClipboardList,label: 'Stok Opname'  },
      { to: '/erp/import',       icon: Upload,       label: 'Import Data'  },
    ],
  },
  {
    group: 'KEUANGAN',
    items: [
      { to: '/erp/expenses',    icon: Wallet,     label: 'Pengeluaran'  },
      { to: '/erp/profit-loss', icon: TrendingUp, label: 'Laba Rugi'    },
      { to: '/erp/reports',     icon: BarChart3,  label: 'Laporan Sales' },
    ],
  },
];

// ── Sub-nav item ──────────────────────────────────────────────
const SubNavItem = ({ to, icon: Icon, label, exact }) => (
  <NavLink
    to={to}
    end={exact}
    className={({ isActive }) =>
      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
      ${isActive
        ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-semibold'
        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
      }`
    }>
    {({ isActive }) => (
      <>
        <Icon size={15} className={isActive ? 'text-brand-500' : 'text-[var(--text-muted)]'} />
        <span>{label}</span>
        {isActive && <ChevronRight size={12} className="ml-auto text-brand-400" />}
      </>
    )}
  </NavLink>
);

// ── Mobile sub-nav (top tabs) ─────────────────────────────────
const MobileSubNav = () => {
  const location = useLocation();
  const allItems = ERP_NAV.flatMap(g => g.items);
  const active = allItems.find(i => i.exact
    ? location.pathname === i.to
    : location.pathname.startsWith(i.to)
  );

  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
      {allItems.map(item => {
        const isActive = item.exact
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to);
        return (
          <NavLink key={item.to} to={item.to} end={item.exact}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all
            ${isActive
              ? 'bg-brand-500 text-white'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
            <item.icon size={12} />
            {item.label}
          </NavLink>
        );
      })}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// ERP LAYOUT
// ════════════════════════════════════════════════════════════════
export default function ErpLayout() {
  const location = useLocation();

  // Get active page label for breadcrumb
  const allItems = ERP_NAV.flatMap(g => g.items);
  const active = allItems.find(i => i.exact
    ? location.pathname === i.to
    : location.pathname === i.to || location.pathname.startsWith(i.to + '/')
  );
  const activeGroup = ERP_NAV.find(g =>
    g.items.some(i => i.exact
      ? location.pathname === i.to
      : location.pathname === i.to || location.pathname.startsWith(i.to + '/'))
  );

  return (
    <div className="flex gap-0 lg:gap-6 min-h-full -m-4 lg:-m-6">

      {/* ── ERP Secondary Sidebar ─────────────────────── */}
      <aside className="hidden lg:flex flex-col w-52 flex-shrink-0 min-h-full
        border-r border-[var(--border)] bg-[var(--bg-card)]
        -ml-6 pt-6 pb-6">

        {/* ERP Header */}
        <div className="px-4 mb-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <LayoutGrid size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-[var(--text-primary)]">ERP</p>
              <p className="text-[10px] text-[var(--text-muted)]">GPDISTRO Racing</p>
            </div>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 space-y-5 overflow-y-auto scrollbar-thin">
          {ERP_NAV.map(group => (
            <div key={group.group}>
              <p className="px-3 mb-1.5 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <SubNavItem key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ERP Stats footer */}
        <div className="px-4 pt-4 border-t border-[var(--border)] mt-4">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Cabang</p>
          {[
            { name:'GP Racing',  color:'bg-blue-500' },
            { name:'GP Distro',  color:'bg-purple-500' },
          ].map(b => (
            <div key={b.name} className="flex items-center gap-2 mb-1.5">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.color}`} />
              <span className="text-xs text-[var(--text-secondary)]">{b.name}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────── */}
      <div className="flex-1 min-w-0 py-6 pr-0 lg:pr-6 pl-4 lg:pl-0">

        {/* Breadcrumb */}
        {active && (
          <div className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)]">
            <LayoutGrid size={12} />
            <span>ERP</span>
            {activeGroup && (
              <>
                <ChevronRight size={10} />
                <span>{activeGroup.group.charAt(0) + activeGroup.group.slice(1).toLowerCase()}</span>
              </>
            )}
            <ChevronRight size={10} />
            <span className="text-[var(--text-primary)] font-semibold">{active.label}</span>
          </div>
        )}

        {/* Mobile sub-nav */}
        <div className="lg:hidden mb-4">
          <MobileSubNav />
        </div>

        {/* Page content */}
        <Outlet />
      </div>
    </div>
  );
}
