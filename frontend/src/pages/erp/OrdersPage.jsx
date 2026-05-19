import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Plus, Search, Filter,
  RefreshCw, ChevronRight, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRpShort, ORDER_STATUS, CHANNELS } from '../../utils/erp/erpService';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setSF]     = useState('');
  const [channelFilter, setCF]    = useState('');
  const [branchFilter, setBF]     = useState('');
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const LIMIT = 20;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpService.getOrders({
        search:    search    || undefined,
        status:    statusFilter  || undefined,
        channel:   channelFilter || undefined,
        branch_id: branchFilter  || undefined,
        page, limit: LIMIT,
      });
      setOrders(res.data.data.orders);
      setTotal(res.data.data.total);
    } catch { toast.error('Gagal memuat order'); }
    finally { setLoading(false); }
  }, [search, statusFilter, channelFilter, branchFilter, page]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Penjualan</h1>
          <p className="body-sm text-[var(--text-secondary)]">{total} total order</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/erp/orders/new')} className="btn-primary">
            <Plus className="w-4 h-4" /> Buat Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-36">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input placeholder="Cari no. order, pelanggan..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-base pl-9 text-sm h-9 w-full" />
        </div>
        <select value={statusFilter} onChange={e => { setSF(e.target.value); setPage(1); }} className="input-base text-sm h-9">
          <option value="">Semua Status</option>
          {Object.entries(ORDER_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={channelFilter} onChange={e => { setCF(e.target.value); setPage(1); }} className="input-base text-sm h-9">
          <option value="">Semua Channel</option>
          {Object.entries(CHANNELS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={branchFilter} onChange={e => { setBF(e.target.value); setPage(1); }} className="input-base text-sm h-9">
          <option value="">Semua Cabang</option>
          <option value="1">GP Racing</option>
          <option value="2">GP Distro</option>
        </select>
      </div>

      {/* Status pills */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {['', 'draft','confirmed','processing','shipped','completed','cancelled'].map(s => {
          const cfg = s ? ORDER_STATUS[s] : null;
          return (
            <button key={s} onClick={() => { setSF(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                statusFilter === s
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)]'}`}>
              {s ? cfg?.label : 'Semua'}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_,i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-14">
          <ShoppingCart className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Tidak ada order</p>
          <button onClick={() => navigate('/erp/orders/new')} className="btn-primary mt-4">Buat Order Baru</button>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            {orders.map(o => {
              const st = ORDER_STATUS[o.status] || ORDER_STATUS.draft;
              const ch = CHANNELS[o.channel]   || CHANNELS.direct;
              return (
                <button key={o.id} onClick={() => navigate(`/erp/orders/${o.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors text-left">
                  <div className={`w-10 h-10 ${ch.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <ShoppingCart className={`w-4.5 h-4.5 ${ch.color}`} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{o.order_no}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${st.bg} ${st.color}`}>{st.label}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ch.bg} ${ch.color}`}>{ch.label}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                      {o.customer_name || 'Tanpa pelanggan'} · {o.order_date}
                    </p>
                    {o.shipment?.tracking_no && (
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
                        Resi: {o.shipment.courier} {o.shipment.tracking_no}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{toRpShort(o.total_amount)}</p>
                    {o.is_synced_incentive && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ Insentif</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-between mt-4">
              <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="btn-secondary h-9 px-4 text-sm disabled:opacity-40">← Sebelumnya</button>
              <span className="text-sm text-[var(--text-muted)]">Hal {page} / {Math.ceil(total/LIMIT)}</span>
              <button disabled={page >= Math.ceil(total/LIMIT)} onClick={() => setPage(p => p+1)} className="btn-secondary h-9 px-4 text-sm disabled:opacity-40">Berikutnya →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
