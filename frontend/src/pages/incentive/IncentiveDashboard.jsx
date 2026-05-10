import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Users, DollarSign, Target, Award,
  BarChart3, ArrowUpRight, RefreshCw, Loader2,
  Building2, Star, ChevronRight, Play, CheckCircle2, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { incentiveService, toRp, toRpShort, MONTHS_ID, PERIOD_STATUS } from '../../utils/incentive/incentiveService';

// ── Mini bar chart (pure CSS) ──────────────────────────────────
const MiniBar = ({ data, valueKey = 'total_sales', labelKey = 'month', colorClass = 'bg-brand-500' }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const pct = (val / max) * 100;
        return (
          <div key={i} className="flex flex-col items-center gap-0.5 flex-1 group">
            <div className="w-full relative h-12">
              <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                <div className={`w-full rounded-t-sm transition-all duration-500 ${colorClass} ${val === 0 ? 'opacity-20' : 'opacity-90'}`}
                  style={{ height: `${Math.max(pct, val > 0 ? 8 : 0)}%` }} />
              </div>
            </div>
            <span className="text-[8px] text-[var(--text-muted)] truncate w-full text-center">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'text-brand-500', bg = 'bg-brand-100 dark:bg-brand-950', onClick }) => (
  <button onClick={onClick}
    className={`card p-4 text-left space-y-3 transition-all ${onClick ? 'hover:border-brand-300 dark:hover:border-brand-700 active:scale-[0.98] cursor-pointer' : 'cursor-default'}`}>
    <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
      <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
    </div>
    <div>
      <p className="text-xl font-black text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-secondary)] font-medium">{label}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  </button>
);

export default function IncentiveDashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
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
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
    </div>
  );

  if (!data) return null;
  const { summary, top_performers, monthly_trend, branches } = data;

  const statusConfig = PERIOD_STATUS[summary.latest_status] || PERIOD_STATUS.draft;

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Sistem Insentif</h1>
          <p className="text-sm text-[var(--text-secondary)]">GP Racing & GP Distro</p>
        </div>
        <button onClick={fetch} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Latest period status */}
      {summary.latest_period && (
        <div className={`card p-4 border-l-4 ${summary.latest_status === 'locked' ? 'border-l-emerald-500' : summary.latest_status === 'approved' ? 'border-l-blue-500' : summary.latest_status === 'calculated' ? 'border-l-amber-500' : 'border-l-slate-400'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">Periode Terakhir</p>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{summary.latest_period}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                  {statusConfig.label}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-[var(--text-primary)]">{toRpShort(summary.latest_incentive)}</p>
              <p className="text-xs text-[var(--text-muted)]">Total Insentif</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{toRpShort(summary.latest_sales)} penjualan</p>
            </div>
          </div>
          <button onClick={() => navigate('/incentive/periods')}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
            Kelola Periode <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Building2} label="Cabang Aktif"   value={summary.total_branches}
          color="text-purple-600 dark:text-purple-400" bg="bg-purple-100 dark:bg-purple-950"
          onClick={() => navigate('/incentive/master/branches')} />
        <StatCard icon={Users}    label="Karyawan Aktif" value={summary.total_employees}
          color="text-blue-600 dark:text-blue-400" bg="bg-blue-100 dark:bg-blue-950"
          onClick={() => navigate('/incentive/master/employees')} />
      </div>

      {/* Monthly trend chart */}
      {monthly_trend?.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[var(--text-primary)]">Tren Penjualan {new Date().getFullYear()}</p>
            <BarChart3 className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <MiniBar data={monthly_trend} valueKey="total_sales" labelKey="month" colorClass="bg-brand-500" />
          <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-brand-500" />Penjualan</span>
          </div>
        </div>
      )}

      {/* Branch cards */}
      {branches?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Cabang</p>
          {branches.map(b => (
            <div key={b.id} className="card p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-base">{b.code[0]}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">{b.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{b.business_type}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{b.employee_count || 0}</p>
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
            <p className="text-xs font-bold text-[var(--text-primary)]">🏆 Top Insentif Periode Ini</p>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {top_performers.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`text-sm font-black w-6 flex-shrink-0 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-[var(--text-muted)]'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                </span>
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

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Periode Baru',   icon: Play,          to: '/incentive/periods',          color: 'bg-brand-500 text-white' },
          { label: 'Input WA',       icon: DollarSign,    to: '/incentive/sales/wa',          color: 'bg-emerald-500 text-white' },
          { label: 'Input Aktivitas',icon: Star,          to: '/incentive/activities',        color: 'bg-purple-500 text-white' },
          { label: 'Hasil Insentif', icon: Award,         to: '/incentive/results',           color: 'bg-amber-500 text-white' },
        ].map((a, i) => (
          <button key={i} onClick={() => navigate(a.to)}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${a.color}`}>
            <a.icon className="w-4 h-4" />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
