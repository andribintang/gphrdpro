import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Users, DollarSign, Target, Award,
  BarChart3, RefreshCw, Loader2, Building2,
  ChevronRight, Play, Plus, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  incentiveService, toRp, toRpShort,
  MONTHS_ID, PERIOD_STATUS
} from '../../utils/incentive/incentiveService';

// ── Pure CSS Bar Chart ────────────────────────────────────────
const BarChart = ({ data, valueKey, labelKey, colorClass = 'bg-brand-500', height = 80, formatVal }) => {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-20 text-xs text-[var(--text-muted)]">Tidak ada data</div>
  );
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((item, i) => {
        const val = Number(item[valueKey]) || 0;
        const pct = (val / max) * 100;
        return (
          <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-0 group relative">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--text-primary)] text-[var(--bg-primary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {formatVal ? formatVal(val) : val}
            </div>
            <div className="w-full relative" style={{ height: height - 16 }}>
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center">
                <div className={`w-full rounded-t-sm transition-all duration-700 ${colorClass} ${val === 0 ? 'opacity-20' : 'opacity-90 hover:opacity-100'}`}
                  style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%` }} />
              </div>
            </div>
            <span className="text-[8px] text-[var(--text-muted)] truncate w-full text-center leading-none">{item[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Horizontal bar ────────────────────────────────────────────
const HBar = ({ label, value, max, color = 'bg-brand-500', sub }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--text-primary)] truncate max-w-[60%]">{label}</span>
        <span className="font-black text-[var(--text-secondary)] flex-shrink-0">{toRpShort(value)}</span>
      </div>
      <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      {sub && <p className="text-[10px] text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'text-brand-500', bg = 'bg-brand-100 dark:bg-brand-950', trend, onClick }) => (
  <button onClick={onClick}
    className={`card p-4 text-left space-y-2.5 transition-all ${onClick ? 'hover:border-brand-300 dark:hover:border-brand-700 active:scale-[0.98]' : 'cursor-default'}`}>
    <div className="flex items-center justify-between">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-0.5 text-[10px] font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          <ArrowUpRight className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-xl font-black text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-secondary)] font-medium">{label}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  </button>
);

export default function IncentiveDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const navigate = useNavigate();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await incentiveService.getDashboard();
      setData(res.data.data);
    } catch { toast.error('Gagal memuat dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      <p className="text-sm text-[var(--text-muted)]">Memuat dashboard...</p>
    </div>
  );

  if (!data) return null;
  const { summary, top_performers, monthly_trend, branches } = data;
  const statusCfg = PERIOD_STATUS[summary.latest_status] || PERIOD_STATUS.draft;

  // Channel breakdown for current period
  const channelData = [
    { channel: 'WA',          value: summary.latest_sales * 0.3,  color: 'bg-emerald-500' },
    { channel: 'Marketplace', value: summary.latest_sales * 0.55, color: 'bg-orange-500' },
    { channel: 'Web',         value: summary.latest_sales * 0.15, color: 'bg-blue-500' },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-slide-up pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Dashboard Insentif</h1>
          <p className="text-sm text-[var(--text-secondary)]">GP Racing & GP Distro</p>
        </div>
        <button onClick={fetch}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Latest period status card */}
      {summary.latest_period && (
        <div className={`card p-4 border-l-4 ${
          summary.latest_status === 'locked'     ? 'border-l-emerald-500' :
          summary.latest_status === 'approved'   ? 'border-l-blue-500'   :
          summary.latest_status === 'calculated' ? 'border-l-amber-500'  : 'border-l-slate-400'
        }`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">Periode Terakhir</p>
              <p className="text-sm font-black text-[var(--text-primary)] mt-0.5">{summary.latest_period}</p>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${statusCfg.bg} ${statusCfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-[var(--text-primary)]">{toRpShort(summary.latest_incentive)}</p>
              <p className="text-xs text-[var(--text-muted)]">Total Insentif</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{toRpShort(summary.latest_sales)} penjualan</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/incentive/periods')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
              Kelola Periode <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => navigate('/incentive/periods')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-all active:scale-95">
              <Plus className="w-3.5 h-3.5" /> Buat Periode
            </button>
          </div>
        </div>
      )}

      {!summary.latest_period && (
        <div className="card p-6 text-center">
          <BarChart3 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Belum ada data periode</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Mulai dengan setup master data dan buat periode pertama</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => navigate('/incentive/master')} className="btn-secondary text-xs px-4 h-9">Master Data</button>
            <button onClick={() => navigate('/incentive/periods')} className="btn-primary text-xs px-4 h-9"><Plus className="w-3.5 h-3.5" /> Buat Periode</button>
          </div>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Building2} label="Cabang Aktif"    value={summary.total_branches}
          color="text-purple-600 dark:text-purple-400" bg="bg-purple-100 dark:bg-purple-950"
          onClick={() => navigate('/incentive/master')} />
        <StatCard icon={Users}     label="Karyawan Aktif" value={summary.total_employees}
          color="text-blue-600 dark:text-blue-400" bg="bg-blue-100 dark:bg-blue-950"
          onClick={() => navigate('/incentive/master')} />
        <StatCard icon={DollarSign} label="Total Penjualan" value={toRpShort(summary.latest_sales)}
          sub="Periode terakhir"
          color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-950" />
        <StatCard icon={Award}     label="Total Insentif"  value={toRpShort(summary.latest_incentive)}
          sub="Periode terakhir"
          color="text-amber-600 dark:text-amber-400" bg="bg-amber-100 dark:bg-amber-950" />
      </div>

      {/* Monthly trend chart */}
      {monthly_trend?.length > 0 && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Tren Penjualan {activeYear}</p>
              <p className="text-xs text-[var(--text-muted)]">Semua channel · bulanan</p>
            </div>
            <BarChart3 className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <BarChart
            data={monthly_trend}
            valueKey="total_sales"
            labelKey="month"
            height={80}
            colorClass="bg-brand-500"
            formatVal={toRpShort}
          />
          <div className="border-t border-[var(--border)] pt-3">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Insentif Bulanan</p>
            <BarChart
              data={monthly_trend}
              valueKey="total_incentive"
              labelKey="month"
              height={56}
              colorClass="bg-emerald-500"
              formatVal={toRpShort}
            />
          </div>
          <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-brand-500" />Penjualan</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" />Insentif</span>
          </div>
        </div>
      )}

      {/* Branch cards */}
      {branches?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Cabang</p>
            <button onClick={() => navigate('/incentive/master')}
              className="text-xs text-brand-500 font-semibold hover:underline">Kelola →</button>
          </div>
          {branches.map(b => (
            <div key={b.id} className="card p-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white font-black text-base">{b.code?.[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">{b.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{b.business_type}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-brand-600 dark:text-brand-400">{b.employee_count || 0}</p>
                <p className="text-[10px] text-[var(--text-muted)]">karyawan</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top performers */}
      {top_performers?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--text-primary)]">🏆 Top Insentif — {summary.latest_period}</p>
            <TrendingUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {top_performers.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-base w-7 flex-shrink-0 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-sm text-[var(--text-muted)] font-bold">#{i+1}</span>}
                </span>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {r.employee_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{r.employee_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{r.branch_name}</p>
                </div>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex-shrink-0">{toRpShort(r.total_incentive)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick action grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label:'Buat Periode',     icon: Play,        to: '/incentive/periods',   color: 'bg-brand-500 hover:bg-brand-600 text-white' },
          { label:'Master Data',      icon: Building2,   to: '/incentive/master',    color: 'bg-purple-500 hover:bg-purple-600 text-white' },
          { label:'Input Penjualan',  icon: DollarSign,  to: '/incentive/periods',   color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
          { label:'Lihat Hasil',      icon: Award,       to: '/incentive/periods',   color: 'bg-amber-500 hover:bg-amber-600 text-white' },
        ].map((a, i) => (
          <button key={i} onClick={() => navigate(a.to)}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${a.color}`}>
            <a.icon className="w-4 h-4 flex-shrink-0" />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
