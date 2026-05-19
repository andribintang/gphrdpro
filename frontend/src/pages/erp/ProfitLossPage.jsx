import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRp, toRpShort, EXPENSE_CATEGORIES } from '../../utils/erp/erpService';

const MetricCard = ({ label, value, sub, positive, icon: Icon, bg, color }) => (
  <div className={`card p-4 border-l-4 ${positive === true ? 'border-l-emerald-500' : positive === false ? 'border-l-red-500' : 'border-l-brand-500'}`}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
      <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${color}`} size={16} />
      </div>
    </div>
    <p className={`text-xl font-black ${positive === true ? 'text-emerald-600 dark:text-emerald-400' : positive === false ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-primary)]'}`}>{value}</p>
    {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
  </div>
);

export default function ProfitLossPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch]   = useState('');
  const [dateRange, setDate]  = useState(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      to:   now.toISOString().split('T')[0],
    };
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpService.getProfitLoss({ branch_id: branch||undefined, date_from: dateRange.from, date_to: dateRange.to });
      setData(res.data.data);
    } catch { toast.error('Gagal memuat laporan'); }
    finally { setLoading(false); }
  }, [branch, dateRange]);

  useEffect(() => { fetch(); }, [fetch]);

  const setThisMonth  = () => { const n=new Date(); setDate({ from: new Date(n.getFullYear(),n.getMonth(),1).toISOString().split('T')[0], to: n.toISOString().split('T')[0] }); };
  const setLastMonth  = () => { const n=new Date(); setDate({ from: new Date(n.getFullYear(),n.getMonth()-1,1).toISOString().split('T')[0], to: new Date(n.getFullYear(),n.getMonth(),0).toISOString().split('T')[0] }); };
  const setThisYear   = () => { const n=new Date(); setDate({ from: `${n.getFullYear()}-01-01`, to: n.toISOString().split('T')[0] }); };

  if (loading) return (
    <div className="space-y-3">{[...Array(6)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
  );

  const income   = data?.income   || {};
  const expenses = data?.expenses || {};
  const netProfit = data?.net_profit || 0;

  return (
    <div className="max-w-lg lg:max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Laporan Laba Rugi</h1>
          <p className="text-sm text-[var(--text-secondary)]">Profit & Loss Statement</p>
        </div>
        <button onClick={fetch} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {[{l:'Bulan Ini',f:setThisMonth},{l:'Bulan Lalu',f:setLastMonth},{l:'Tahun Ini',f:setThisYear}].map(q => (
            <button key={q.l} onClick={q.f} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-brand-50 dark:hover:bg-brand-950 hover:text-brand-600 transition-all">{q.l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={dateRange.from} onChange={e => setDate(r=>({...r,from:e.target.value}))} className="input-base text-sm h-9 flex-1 min-w-28" />
          <span className="text-xs text-[var(--text-muted)]">s/d</span>
          <input type="date" value={dateRange.to} onChange={e => setDate(r=>({...r,to:e.target.value}))} className="input-base text-sm h-9 flex-1 min-w-28" />
          <select value={branch} onChange={e => setBranch(e.target.value)} className="input-base text-sm h-9">
            <option value="">Semua Cabang</option>
            <option value="1">GP Racing</option>
            <option value="2">GP Distro</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Total Omzet" value={toRpShort(income.revenue)} sub={`${income.total_orders||0} order`}
          icon={DollarSign} bg="bg-brand-100 dark:bg-brand-950" color="text-brand-600 dark:text-brand-400" />
        <MetricCard label="Laba Kotor" value={toRpShort(income.gross_profit)} sub={`Margin ${income.gross_margin||0}%`}
          positive={parseFloat(income.gross_profit||0) >= 0} icon={TrendingUp} bg="bg-emerald-100 dark:bg-emerald-950" color="text-emerald-600 dark:text-emerald-400" />
        <MetricCard label="Total Pengeluaran" value={toRpShort(expenses.total)} sub="Semua kategori"
          positive={false} icon={TrendingDown} bg="bg-red-100 dark:bg-red-950" color="text-red-600 dark:text-red-400" />
        <MetricCard label="Laba Bersih" value={toRpShort(netProfit)} sub={`Margin ${data?.net_margin||0}%`}
          positive={netProfit >= 0} icon={BarChart3} bg={netProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-red-100 dark:bg-red-950'}
          color={netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} />
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-5 space-y-4 lg:space-y-0">
        {/* Income Statement */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950 border-b border-[var(--border)]">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Pendapatan</p>
          </div>
          <div className="p-4 space-y-3">
            {[
              { l:'Omzet Penjualan',                  v: income.revenue,       bold: false },
              { l:'Harga Pokok Penjualan (HPP)',        v: -income.hpp,         bold: false, neg: true },
              { l:'', divider: true },
              { l:'Laba Kotor',                        v: income.gross_profit,  bold: true },
              { l:`Margin Kotor (${income.gross_margin||0}%)`, v: null, note: true },
            ].map((r, i) => r.divider ? (
              <div key={i} className="border-t border-[var(--border)] my-1" />
            ) : r.note ? (
              <p key={i} className="text-[10px] text-emerald-600 dark:text-emerald-400 -mt-2">Margin: {income.gross_margin||0}%</p>
            ) : (
              <div key={i} className={`flex justify-between ${r.bold ? 'font-bold border-t border-[var(--border)] pt-2' : ''}`}>
                <span className={`text-sm ${r.bold ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{r.l}</span>
                <span className={`text-sm ${r.bold ? (parseFloat(r.v||0)>=0?'text-emerald-600 dark:text-emerald-400':'text-red-600') : r.neg ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                  {r.neg ? `(${toRp(Math.abs(r.v||0))})` : toRp(Math.abs(r.v||0))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense breakdown */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-red-50 dark:bg-red-950 border-b border-[var(--border)]">
            <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Pengeluaran</p>
          </div>
          <div className="p-4 space-y-2">
            {Object.entries(expenses.by_category||{}).sort((a,b)=>b[1]-a[1]).map(([k,v]) => {
              const cat = EXPENSE_CATEGORIES[k] || EXPENSE_CATEGORIES.lainnya;
              const pct = expenses.total > 0 ? ((v/expenses.total)*100).toFixed(1) : 0;
              return (
                <div key={k}>
                  <div className="flex justify-between mb-0.5">
                    <span className={`text-xs font-semibold ${cat.color}`}>{cat.label}</span>
                    <span className="text-xs text-[var(--text-primary)] font-semibold">{toRpShort(v)} <span className="text-[var(--text-muted)] font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(expenses.by_category||{}).length === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">Belum ada pengeluaran</p>
            )}
            <div className="flex justify-between font-bold border-t border-[var(--border)] pt-2 mt-2">
              <span className="text-sm text-[var(--text-primary)]">Total Pengeluaran</span>
              <span className="text-sm text-red-600 dark:text-red-400">{toRp(expenses.total||0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Profit Summary */}
      <div className={`card mt-5 p-5 border-2 ${netProfit >= 0 ? 'border-emerald-400 dark:border-emerald-700' : 'border-red-400 dark:border-red-700'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Laba Bersih</p>
            <p className="text-xs text-[var(--text-muted)]">Laba Kotor - Total Pengeluaran</p>
            <p className="text-xs text-[var(--text-muted)]">{toRp(income.gross_profit||0)} - {toRp(expenses.total||0)}</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-black ${netProfit>=0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {netProfit < 0 ? '-' : ''}{toRpShort(Math.abs(netProfit))}
            </p>
            <p className={`text-sm font-semibold ${netProfit>=0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
              {netProfit >= 0 ? '✓ Untung' : '✗ Rugi'} — Margin {data?.net_margin||0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
