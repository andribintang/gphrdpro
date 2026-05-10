import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Award, X, Loader2, Building2,
  TrendingUp, Star, Target, Download, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  incentiveService, toRp, toRpShort,
  PERIOD_STATUS, CHANNEL_COLORS
} from '../../utils/incentive/incentiveService';

// ── Slip Modal ─────────────────────────────────────────────────
const SlipModal = ({ resultId, onClose }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    incentiveService.getResultDetail(resultId)
      .then(r => setResult(r.data.data.result))
      .catch(() => toast.error('Gagal memuat slip'))
      .finally(() => setLoading(false));
  }, [resultId]);

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );
  if (!result) return null;

  const d = result.details_json || {};

  const rows = [
    { label:'💬 Penjualan WA',      amount: result.wa_sales_amount,       type:'performance' },
    { label:'🛒 Performance MP',     amount: result.marketplace_performance,type:'performance' },
    { label:'🌐 Performance Web',    amount: result.web_performance,        type:'performance' },
    null, // divider
    { label:'💬 Insentif WA',        amount: result.wa_incentive,           type:'income', pct: d.wa?.channel_pct },
    { label:'🛒 Insentif Marketplace',amount:result.marketplace_incentive,  type:'income', pct: d.marketplace?.channel_pct },
    { label:'🌐 Insentif Web',        amount: result.web_incentive,         type:'income', pct: d.web?.channel_pct },
    { label:'⭐ Insentif Aktivitas',  amount: result.activity_incentive,    type:'income' },
    { label:'🎯 Bonus Target',        amount: result.bonus_target,          type:'income' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[92vh] overflow-y-auto scrollbar-thin"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>

        {/* Slip header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-indigo-800" />
          <div className="relative px-5 pt-5 pb-6">
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Slip Insentif</p>
                <p className="text-white font-black text-lg">{result.period?.name}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                <span className="text-white font-black text-xl">{result.employee_name?.[0]}</span>
              </div>
              <div>
                <p className="text-white font-bold text-base">{result.employee_name}</p>
                <p className="text-white/60 text-xs">{result.position_name}</p>
                <p className="text-white/60 text-xs">{result.branch_name}</p>
              </div>
            </div>
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Total Insentif</p>
              <p className="text-white font-black text-3xl">{toRp(result.total_incentive)}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Performance */}
          <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="bg-[var(--bg-secondary)] px-4 py-2.5 border-b border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Performance Penjualan</p>
            </div>
            {[
              { label:'💬 Penjualan WA',       value: result.wa_sales_amount },
              { label:'🛒 Performance Marketplace', value: result.marketplace_performance },
              { label:'🌐 Performance Web',     value: result.web_performance },
            ].map((r, i) => parseFloat(r.value) > 0 && (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                <p className="text-xs font-medium text-[var(--text-primary)]">{r.label}</p>
                <p className="text-xs font-semibold text-[var(--text-secondary)]">{toRp(r.value)}</p>
              </div>
            ))}
          </div>

          {/* Incentive breakdown */}
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 overflow-hidden">
            <div className="bg-emerald-50 dark:bg-emerald-950 px-4 py-2.5 border-b border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Rincian Insentif</p>
            </div>
            {[
              { label:'💬 Insentif WA',           value: result.wa_incentive,          note: d.wa?.channel_pct ? `${parseFloat(d.wa.channel_pct)}%` : '' },
              { label:'🛒 Insentif Marketplace',   value: result.marketplace_incentive,  note: d.marketplace?.channel_pct ? `${parseFloat(d.marketplace.channel_pct)}%` : '' },
              { label:'🌐 Insentif Web',           value: result.web_incentive,          note: d.web?.channel_pct ? `${parseFloat(d.web.channel_pct)}%` : '' },
              { label:'⭐ Insentif Aktivitas',     value: result.activity_incentive,     note: '' },
              { label:'🎯 Bonus Target',           value: result.bonus_target,           note: d.bonus_target?.tier ? d.bonus_target.tier.name : '' },
            ].map((r, i) => parseFloat(r.value) > 0 && (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{r.label}</p>
                  {r.note && <p className="text-[10px] text-[var(--text-muted)]">{r.note}</p>}
                </div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{toRp(r.value)}</p>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 bg-emerald-50 dark:bg-emerald-950">
              <span className="text-sm font-black text-[var(--text-primary)]">Total Insentif</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{toRp(result.total_incentive)}</span>
            </div>
          </div>

          {/* Activity details */}
          {d.activities?.details?.length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
              <div className="bg-[var(--bg-secondary)] px-4 py-2.5 border-b border-[var(--border)]">
                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Detail Aktivitas</p>
              </div>
              {d.activities.details.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{a.activity}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{a.date} · {a.qty} × {toRp(a.nominal)}</p>
                  </div>
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400">+{toRp(a.amount)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Bonus target info */}
          {d.bonus_target?.tier && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-3">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">🎯 Bonus Target Tercapai</p>
              <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
                {d.bonus_target.tier.name} — Total bonus {toRp(d.bonus_target.tier.total_bonus)} ÷ karyawan aktif = {toRp(result.bonus_target)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN RESULTS PAGE
// ════════════════════════════════════════════════════════════════
export default function ResultsPage() {
  const { periodId } = useParams();
  const navigate     = useNavigate();
  const [period, setPeriod]   = useState(null);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFB] = useState('');
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [branches, setBranches] = useState([]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, rRes, bRes] = await Promise.all([
        incentiveService.getPeriod(periodId),
        incentiveService.getResults({ period_id: periodId, branch_id: filterBranch || undefined }),
        incentiveService.getBranches(),
      ]);
      setPeriod(pRes.data.data.period);
      setResults(rRes.data.data.results);
      setSummary(rRes.data.data.summary);
      setBranches(bRes.data.data.branches);
    } catch { toast.error('Gagal memuat hasil'); }
    finally { setLoading(false); }
  }, [periodId, filterBranch]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/incentive/periods')}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-[var(--text-primary)]">{period?.name}</h1>
          <p className="text-xs text-[var(--text-secondary)]">Hasil Kalkulasi Insentif</p>
        </div>
        <button onClick={fetch} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Period summary */}
      {period && (
        <div className="card p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label:'Total Penjualan', value: toRpShort(period.total_all_sales), color:'text-[var(--text-primary)]' },
              { label:'Total Insentif',  value: toRpShort(period.total_incentive_paid), color:'text-emerald-600 dark:text-emerald-400' },
            ].map((s,i) => (
              <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-3 text-center">
                <p className={`text-base font-black ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label:'💬 WA',    value: toRpShort(period.total_wa_sales),          color:'text-emerald-600 dark:text-emerald-400' },
              { label:'🛒 MP',    value: toRpShort(period.total_marketplace_sales),  color:'text-orange-600 dark:text-orange-400' },
              { label:'🌐 Web',   value: toRpShort(period.total_web_sales),          color:'text-blue-600 dark:text-blue-400' },
            ].map((s,i) => (
              <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-2 text-center">
                <p className={`text-xs font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
          {period.bonus_per_employee > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-xs text-amber-700 dark:text-amber-400 font-semibold">
              <Target className="w-4 h-4" />
              Bonus target tercapai · {toRp(period.bonus_per_employee)} per karyawan
            </div>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <select value={filterBranch} onChange={e => setFB(e.target.value)} className="input-base text-sm flex-1">
          <option value="">Semua Cabang ({results.length} karyawan)</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Summary breakdown */}
      {summary && (
        <div className="card p-3 mb-4">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Rincian Total Insentif</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {[
              { label:'Insentif WA',          value: summary.total_wa,       color:'text-emerald-600 dark:text-emerald-400' },
              { label:'Insentif Marketplace',  value: summary.total_mp,       color:'text-orange-600 dark:text-orange-400' },
              { label:'Insentif Web',          value: summary.total_web,      color:'text-blue-600 dark:text-blue-400' },
              { label:'Insentif Aktivitas',    value: summary.total_activity, color:'text-purple-600 dark:text-purple-400' },
              { label:'Bonus Target',          value: summary.total_bonus,    color:'text-amber-600 dark:text-amber-400' },
            ].map((s, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-xs text-[var(--text-secondary)]">{s.label}</span>
                <span className={`text-xs font-bold ${s.color}`}>{toRpShort(s.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee results list */}
      {results.length === 0 ? (
        <div className="text-center py-14">
          <Award className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada hasil kalkulasi</p>
          <button onClick={() => navigate(`/incentive/input/${periodId}`)}
            className="mt-4 btn-primary px-6 text-sm">Input Data & Hitung</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] grid grid-cols-12 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            <span className="col-span-1">#</span>
            <span className="col-span-5">Karyawan</span>
            <span className="col-span-6 text-right">Total Insentif</span>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {results.map((r, i) => (
              <button key={r.id} onClick={() => setSelectedSlip(r.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors text-left">
                <span className={`text-sm font-black w-5 flex-shrink-0 ${i < 3 ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{r.employee_name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{r.branch_name} · {r.position_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {parseFloat(r.wa_incentive) > 0 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">WA {toRpShort(r.wa_incentive)}</span>
                    )}
                    {parseFloat(r.marketplace_incentive) > 0 && (
                      <span className="text-[10px] text-orange-600 dark:text-orange-400">MP {toRpShort(r.marketplace_incentive)}</span>
                    )}
                    {parseFloat(r.web_incentive) > 0 && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400">Web {toRpShort(r.web_incentive)}</span>
                    )}
                    {parseFloat(r.activity_incentive) > 0 && (
                      <span className="text-[10px] text-purple-600 dark:text-purple-400">Aktivitas {toRpShort(r.activity_incentive)}</span>
                    )}
                    {parseFloat(r.bonus_target) > 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">Bonus {toRpShort(r.bonus_target)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{toRpShort(r.total_incentive)}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Tap untuk slip</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSlip && <SlipModal resultId={selectedSlip} onClose={() => setSelectedSlip(null)} />}
    </div>
  );
}
