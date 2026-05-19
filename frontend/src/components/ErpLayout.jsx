import { Outlet, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ERP_LABELS = {
  '/erp':              { group:'Penjualan',  label:'Dashboard'    },
  '/erp/orders':       { group:'Penjualan',  label:'Order'        },
  '/erp/customers':    { group:'Penjualan',  label:'Pelanggan'    },
  '/erp/products':     { group:'Inventory',  label:'Produk'       },
  '/erp/purchases':    { group:'Inventory',  label:'Pembelian'    },
  '/erp/stock-opname': { group:'Inventory',  label:'Stok Opname'  },
  '/erp/import':       { group:'Inventory',  label:'Import Data'  },
  '/erp/expenses':     { group:'Keuangan',   label:'Pengeluaran'  },
  '/erp/profit-loss':  { group:'Keuangan',   label:'Laba Rugi'    },
  '/erp/reports':      { group:'Keuangan',   label:'Laporan Sales'},
};

export default function ErpLayout() {
  const location = useLocation();

  // Match current path (support /erp/orders/123 → /erp/orders)
  const matched = Object.entries(ERP_LABELS).find(([path]) =>
    path === '/erp'
      ? location.pathname === '/erp'
      : location.pathname === path || location.pathname.startsWith(path + '/')
  );
  const info = matched?.[1];

  return (
    <div>
      {/* Breadcrumb */}
      {info && (
        <nav className="flex items-center gap-1.5 mb-6 text-xs select-none" aria-label="Breadcrumb">
          <span className="text-[var(--text-muted)]">ERP</span>
          <ChevronRight size={10} className="text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">{info.group}</span>
          <ChevronRight size={10} className="text-[var(--text-muted)]" />
          <span className="font-semibold text-[var(--text-primary)]">{info.label}</span>
        </nav>
      )}
      <Outlet />
    </div>
  );
}
