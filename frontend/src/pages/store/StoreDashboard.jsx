import { useEffect, useState } from 'react';
import { ShoppingBag, Package, TrendingUp, Clock, ExternalLink, Store } from 'lucide-react';
import { getStoreStats } from '../../utils/storeService';
import { Link } from 'react-router-dom';

const BRANDS = [
  { id: 'gpdistro', label: 'GPDISTRO', color: '#1a1a2e', sub: 'Fashion & Digital Printing' },
  { id: 'gpracing', label: 'GP RACING', color: '#dc2626', sub: 'Spare Part Motor Racing' },
];

const fmt = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

function BrandStatCard({ brand }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoreStats(brand.id)
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [brand.id]);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Brand header */}
      <div className="px-6 py-4 flex items-center justify-between"
        style={{ background: brand.color }}>
        <div>
          <h3 className="font-display text-xl text-white tracking-widest">{brand.label}</h3>
          <p className="text-xs text-white/60 mt-0.5">{brand.sub}</p>
        </div>
        <Store size={24} className="text-white/40" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)]">
        {[
          { label: 'Total Order',    value: loading ? '...' : stats?.totalOrders || 0,         icon: ShoppingBag },
          { label: 'Order Hari Ini', value: loading ? '...' : stats?.todayOrders || 0,         icon: Clock },
          { label: 'Total Omzet',    value: loading ? '...' : fmt(stats?.totalRevenue),         icon: TrendingUp, wide: true },
          { label: 'Order Pending',  value: loading ? '...' : stats?.pendingOrders || 0,        icon: Package },
        ].map(({ label, value, icon: Icon, wide }) => (
          <div key={label} className={`px-5 py-4 ${wide ? '' : ''}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="border-t border-[var(--border)] px-5 py-3 flex gap-4">
        {[
          { label: 'Produk', to: `/store/${brand.id}/products` },
          { label: 'Order',  to: `/store/${brand.id}/orders` },
          { label: 'Buka Toko', href: brand.id === 'gpdistro' ? 'https://gpdistro.com' : 'https://gpracingstore.com' },
        ].map(l => l.href ? (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-600)] flex items-center gap-1 uppercase tracking-wide transition-colors">
            {l.label} <ExternalLink size={10} />
          </a>
        ) : (
          <Link key={l.label} to={l.to}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-600)] uppercase tracking-wide transition-colors">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function StoreDashboard() {
  return (
    <div className="w-full animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Store Management</h1>
          <p className="body-sm text-[var(--text-muted)]">Kelola toko online GPDISTRO & GP Racing</p>
        </div>
      </div>

      {/* Brand overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {BRANDS.map(b => <BrandStatCard key={b.id} brand={b} />)}
      </div>

      {/* Quick actions */}
      <div className="card p-6">
        <h2 className="font-semibold text-sm uppercase tracking-widest mb-5 text-[var(--text-muted)]">Aksi Cepat</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '+ Tambah Produk',   to: '/erp/products',           color: '#059669', sub: 'Via ERP → Tab Toko Online' },
            { label: 'Produk GPDISTRO',   to: '/store/gpdistro/products', color: '#1a1a2e' },
            { label: 'Produk GPRACING',   to: '/store/gpracing/products', color: '#dc2626' },
            { label: 'Order GPDISTRO',    to: '/store/gpdistro/orders' },
            { label: 'Order GPRACING',    to: '/store/gpracing/orders' },
          ].map(a => (
            <Link key={a.label} to={a.to}
              className="btn-primary text-xs py-3 px-4 text-center justify-center"
              style={a.color ? { background: a.color } : {}}>
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
