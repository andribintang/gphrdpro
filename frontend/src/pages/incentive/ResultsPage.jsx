import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Award, X, Loader2, RefreshCw,
  FileDown, FileSpreadsheet, Printer, Target,
  CheckCircle2, ChevronRight, Banknote, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  incentiveService, toRp, toRpShort, PERIOD_STATUS
} from '../../utils/incentive/incentiveService';
import {
  exportSlipPDF, exportBulkPDF, exportExcel
} from '../../utils/incentive/exportUtils';

// ── Slip Modal ─────────────────────────────────────────────────
const SlipModal = ({ resultId, period, onClose }) => {
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    incentiveService.getResultDetail(resultId)
      .then(r => setResult(r.data.data.result))
      .catch(() => toast.error('Gagal memuat slip'))
      .finally(() => setLoading(false));
  }, [resultId]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const fname = await exportSlipPDF(result, period);
      toast.success(`PDF tersimpan: ${fname}`);
    } catch (e) { toast.error('Export PDF gagal: ' + e.message); }
    finally { setExporting(false); }
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );
  if (!result) return null;

  const d = result.details_json || {};

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[92vh] overflow-y-auto scrollbar-thin"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>

        {/* Slip Header — red diagonal gradient sesuai referensi */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0" style={{background:'linear-gradient(135deg, #dc2626 0%, #991b1b 55%, #7f1d1d 100%)'}} />
          {/* Dot pattern dekoratif */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10"
            style={{backgroundImage:'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize:'10px 10px'}} />
          <div className="relative px-5 pt-5 pb-6">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/95 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 font-black text-xs">G</span>
                </div>
                <div>
                  <p className="text-white font-bold text-[10px] leading-none">GPDISTRO</p>
                  <p className="text-white/60 text-[7px] leading-none mt-0.5">Distribution Redefined</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center mb-1">
              <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">GPDISTRO HR PRO</p>
              <p className="text-white font-black text-2xl tracking-tight">SLIP INSENTIF</p>
              <div className="w-10 h-0.5 bg-white/50 mx-auto my-1.5 rounded-full"/>
              <p className="text-white/80 text-xs">{period?.name}</p>
            </div>
          </div>
        </div>

        <div className="px-5 pt-4">
          {/* Status badge */}
          {result.status && (
            <span className="inline-block px-3 py-1 rounded-lg text-[10px] font-bold uppercase text-white"
              style={{background:'#dc2626'}}>
              {{draft:'Draft',calculated:'Dihitung',approved:'Disetujui',locked:'Final'}[result.status] || result.status}
            </span>
          )}
        </div>

        {/* Employee card */}
        <div className="px-5 pt-3">
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'#dc2626'}}>
              <span className="text-white font-black text-lg">{result.employee_name?.[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base text-[var(--text-primary)] truncate">{result.employee_name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{result.position_name} | {result.branch_name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black text-lg text-emerald-600 whitespace-nowrap">{toRp(result.total_incentive)}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Total Insentif</p>
            </div>
          </div>
        </div>

        <div className="p-5 pt-4 space-y-4">
          {/* Performance */}
          {(parseFloat(result.wa_sales_amount) > 0 || parseFloat(result.marketplace_performance) > 0 || parseFloat(result.web_performance) > 0) && (
            <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
              <div className="px-4 py-2.5 flex items-center gap-2" style={{background:'#1e293b'}}>
                <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                  <span className="text-white text-[10px]">📊</span>
                </div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Performance Penjualan</p>
              </div>
              {parseFloat(result.wa_sales_amount) > 0 && (
                <div className="flex justify-between px-4 py-2.5 border-b border-[var(--border-subtle)]">
                  <p className="text-xs font-medium text-[var(--text-primary)]">WhatsApp</p>
                  <p className="text-xs font-semibold">{toRp(result.wa_sales_amount)}</p>
                </div>
              )}
              {parseFloat(result.marketplace_performance) > 0 && (
                <div className="flex justify-between px-4 py-2.5 border-b border-[var(--border-subtle)]">
                  <p className="text-xs font-medium text-[var(--text-primary)]">Marketplace</p>
                  <p className="text-xs font-semibold">{toRp(result.marketplace_performance)}</p>
                </div>
              )}
              {parseFloat(result.web_performance) > 0 && (
                <div className="flex justify-between px-4 py-2.5">
                  <p className="text-xs font-medium text-[var(--text-primary)]">Website</p>
                  <p className="text-xs font-semibold">{toRp(result.web_performance)}</p>
                </div>
              )}
            </div>
          )}

          {/* Incentive breakdown */}
          <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-2.5 flex items-center gap-2" style={{background:'#16a34a'}}>
              <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                <span className="text-white text-[10px]">📋</span>
              </div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Rincian Insentif</p>
            </div>
            {[
              { label:`Marketplace (${parseFloat(d.marketplace?.channel_pct||0)}%)`, value: result.marketplace_incentive },
              { label:`Website (${parseFloat(d.web?.channel_pct||0)}%)`,             value: result.web_incentive },
              { label:`WhatsApp (${parseFloat(d.wa?.channel_pct||0)}%)`,             value: result.wa_incentive },
              { label:'Aktivitas',                                                    value: result.activity_incentive },
              { label:`Bonus Target${d.bonus_target?.tier ? ` — ${d.bonus_target.tier.name}` : ''}`, value: result.bonus_target },
            ].filter(r => parseFloat(r.value) > 0).map((r, i, arr) => (
              <div key={i} className={`flex justify-between px-4 py-2.5 ${i < arr.length-1 ? 'border-b border-[var(--border-subtle)]' : ''}`}>
                <p className="text-xs font-medium text-[var(--text-primary)]">{r.label}</p>
                <p className="text-xs font-bold text-emerald-600">{toRp(r.value)}</p>
              </div>
            ))}
          </div>

          {/* Total Insentif — solid green card */}
          <div className="flex justify-between items-center px-4 py-4 rounded-2xl" style={{background:'#16a34a'}}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                <span className="text-white text-xs">🏅</span>
              </div>
              <span className="text-sm font-black text-white uppercase tracking-wider">Total Insentif</span>
            </div>
            <span className="text-base font-black text-white">{toRp(result.total_incentive)}</span>
          </div>

          {/* Activity details */}
          {d.activities?.details?.length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
              <div className="px-4 py-2.5 flex items-center gap-2" style={{background:'#1e293b'}}>
                <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                  <span className="text-white text-[10px]">⭐</span>
                </div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Detail Aktivitas</p>
              </div>
              {d.activities.details.map((a, i) => (
                <div key={i} className="flex justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{a.activity}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{a.date} · {a.qty} × {toRp(a.nominal)}</p>
                  </div>
                  <p className="text-xs font-bold text-emerald-600">{toRp(a.amount)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Export button */}
          <button onClick={handleExportPDF} disabled={exporting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
            style={{background:'linear-gradient(135deg, #dc2626, #991b1b)'}}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {exporting ? 'Membuat PDF...' : 'Download Slip PDF'}
          </button>
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
  const [period, setPeriod]     = useState(null);
  const [results, setResults]   = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [filterBranch, setFB]   = useState('');
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [branches, setBranches] = useState([]);
  const [exportingPDF,  setExportingPDF]  = useState(false);
  const [exportingXLS,  setExportingXLS]  = useState(false);
  const [progress,      setProgress]      = useState(null);
  const [showDisburse,  setShowDisburse]  = useState(false);

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

  const handleBulkPDF = async () => {
    if (!results.length) { toast.error('Tidak ada data'); return; }
    setExportingPDF(true);
    try {
      const fname = await exportBulkPDF(
        results, period, 'HRD Lite',
        (cur, total) => setProgress(`${cur}/${total}`)
      );
      toast.success(`✅ ${results.length} slip PDF tersimpan: ${fname}`);
    } catch (e) { toast.error('Export PDF gagal: ' + e.message); }
    finally { setExportingPDF(false); setProgress(null); }
  };

  const handleExcelExport = async () => {
    if (!results.length) { toast.error('Tidak ada data'); return; }
    setExportingXLS(true);
    try {
      const fname = await exportExcel(results, period);
      toast.success(`✅ Excel tersimpan: ${fname}`);
    } catch (e) { toast.error('Export Excel gagal: ' + e.message); }
    finally { setExportingXLS(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
    </div>
  );

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/incentive/periods')}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-[var(--text-primary)]">{period?.name}</h1>
          <div className="flex items-center gap-2">
            <p className="text-xs text-[var(--text-secondary)]">Hasil Kalkulasi</p>
            {period && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${PERIOD_STATUS[period.status]?.bg} ${PERIOD_STATUS[period.status]?.color}`}>
                {PERIOD_STATUS[period.status]?.label}
              </span>
            )}
          </div>
        </div>
        <button onClick={fetch} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ════════ DESKTOP 2-COLUMN LAYOUT ════════ */}
      <div className="lg:grid lg:grid-cols-[380px_1fr] lg:gap-5 lg:items-start">

      {/* ── LEFT COLUMN: actions + summary ── */}
      <div className="lg:sticky lg:top-4">

      {/* Transfer via Flip */}
      {period && ['approved','locked'].includes(period.status) && results.length > 0 && (
        <button onClick={() => setShowDisburse(true)}
          className="w-full flex items-center justify-center gap-2 py-3 mb-3 rounded-2xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white active:scale-95 transition-all">
          <Banknote className="w-4 h-4"/>
          Transfer Insentif via Flip ({results.length} karyawan)
        </button>
      )}

      {/* Export buttons */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={handleBulkPDF} disabled={exportingPDF}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95 disabled:opacity-60">
            {exportingPDF ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{progress}</> : <><Printer className="w-3.5 h-3.5" />Cetak Semua Slip</>}
          </button>
          <button onClick={handleExcelExport} disabled={exportingXLS}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 disabled:opacity-60">
            {exportingXLS ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            Export Excel
          </button>
        </div>
      )}

      {/* Period summary — Hero redesign */}
      {period && (
        <div className="space-y-3 mb-4">
          {/* Hero — Total Insentif (focal point) */}
          <div className="relative overflow-hidden rounded-2xl p-5"
            style={{background:'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #14532d 100%)'}}>
            <div className="absolute top-0 right-0 w-28 h-28 opacity-10"
              style={{backgroundImage:'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize:'9px 9px'}} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Total Insentif Periode</p>
                  <p className="text-white font-black text-3xl mt-1">{toRpShort(period.total_incentive_paid)}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/15">
                <span className="text-white/60 text-[11px]">Dari total penjualan</span>
                <span className="text-white font-bold text-xs">{toRpShort(period.total_all_sales)}</span>
              </div>
            </div>
          </div>

          {/* Channel stats — colored tint mini cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label:'WA',  icon:'💬', value: period.total_wa_sales,         bg:'bg-emerald-50 dark:bg-emerald-950', border:'border-emerald-200 dark:border-emerald-900', text:'text-emerald-700 dark:text-emerald-400' },
              { label:'MP',  icon:'🛒', value: period.total_marketplace_sales, bg:'bg-orange-50 dark:bg-orange-950',   border:'border-orange-200 dark:border-orange-900',   text:'text-orange-700 dark:text-orange-400' },
              { label:'Web', icon:'🌐', value: period.total_web_sales,        bg:'bg-blue-50 dark:bg-blue-950',       border:'border-blue-200 dark:border-blue-900',       text:'text-blue-700 dark:text-blue-400' },
            ].map((s,i) => (
              <div key={i} className={`rounded-xl p-2.5 border ${s.bg} ${s.border}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{s.icon}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wide ${s.text} opacity-70`}>{s.label}</span>
                </div>
                <p className={`text-xs font-black ${s.text}`}>{toRpShort(s.value)}</p>
              </div>
            ))}
          </div>

          {/* Bonus achievement card */}
          {parseFloat(period.bonus_per_employee) > 0 && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950">
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">🎯 Bonus Target Tercapai</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">{period.active_employee_count} karyawan aktif berhak menerima</p>
              </div>
              <p className="text-lg font-black text-amber-700 dark:text-amber-400 flex-shrink-0">{toRp(period.bonus_per_employee)}</p>
            </div>
          )}
        </div>
      )}

      {/* Breakdown summary — progress bars per channel */}
      {summary && results.length > 0 && (
        <div className="card p-4 mb-4">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Breakdown Insentif</p>
          <div className="space-y-2.5">
            {[
              { label:'WA',           icon:'💬', value: summary.total_wa,       color:'#10b981' },
              { label:'Marketplace',   icon:'🛒', value: summary.total_mp,       color:'#f97316' },
              { label:'Web',           icon:'🌐', value: summary.total_web,      color:'#3b82f6' },
              { label:'Aktivitas',     icon:'⭐', value: summary.total_activity, color:'#a855f7' },
              { label:'Bonus Target',  icon:'🎯', value: summary.total_bonus,    color:'#f59e0b' },
            ].filter(s => parseFloat(s.value) > 0).map((s,i) => {
              const total = parseFloat(period?.total_incentive_paid) || 1;
              const pct = Math.min(100, (parseFloat(s.value) / total) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                      <span>{s.icon}</span>{s.label}
                    </span>
                    <span className="text-xs font-bold" style={{color: s.color}}>{toRpShort(s.value)}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{width:`${pct}%`, background: s.color}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      </div>
      {/* ── END LEFT COLUMN ── */}

      {/* ── RIGHT COLUMN: filter + ranking list ── */}
      <div>

      {/* Filter */}
      <div className="mb-3">
        <div className="relative">
          <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <select value={filterBranch} onChange={e => setFB(e.target.value)}
            className="input-base text-sm w-full pl-9 font-medium">
            <option value="">Semua Cabang ({results.length} karyawan)</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Results list */}
      {results.length === 0 ? (
        <div className="text-center py-14">
          <Award className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada hasil kalkulasi</p>
          <button onClick={() => navigate(`/incentive/input/${periodId}`)}
            className="btn-primary mt-4 px-6 text-sm">Input Data & Hitung</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">Ranking Insentif</p>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {results.map((r, i) => {
              const isTop3 = i < 3;
              const rankTint = i === 0 ? 'bg-amber-50 dark:bg-amber-950/40' : i === 1 ? 'bg-slate-50 dark:bg-slate-800/40' : i === 2 ? 'bg-orange-50 dark:bg-orange-950/30' : '';
              const medalBg  = i === 0 ? '#fbbf24' : i === 1 ? '#cbd5e1' : '#fb923c';

              const TAGS = [
                parseFloat(r.wa_incentive)          > 0 && { l:'WA',     v:r.wa_incentive,          bg:'#d1fae5', fg:'#047857' },
                parseFloat(r.marketplace_incentive) > 0 && { l:'MP',     v:r.marketplace_incentive, bg:'#ffedd5', fg:'#c2410c' },
                parseFloat(r.web_incentive)         > 0 && { l:'Web',    v:r.web_incentive,         bg:'#dbeafe', fg:'#1d4ed8' },
                parseFloat(r.activity_incentive)    > 0 && { l:'Akt',    v:r.activity_incentive,    bg:'#f3e8ff', fg:'#7e22ce' },
                parseFloat(r.bonus_target)          > 0 && { l:'Bonus',  v:r.bonus_target,           bg:'#fef3c7', fg:'#b45309' },
              ].filter(Boolean);

              return (
                <button key={r.id} onClick={() => setSelectedSlip(r.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors text-left ${rankTint}`}>
                  {!isTop3 && (
                    <span className="text-xs font-bold w-5 flex-shrink-0 text-center text-[var(--text-muted)]">{i+1}</span>
                  )}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {r.employee_name?.[0]}
                    </div>
                    {isTop3 && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm border-2 border-[var(--bg-card)]"
                        style={{background: medalBg}}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{r.employee_name}</p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{r.branch_name}</p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {TAGS.map((t, ti) => (
                        <span key={ti} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{background: t.bg, color: t.fg}}>
                          {t.l} {toRpShort(t.v)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{toRpShort(r.total_incentive)}</p>
                    <div className="flex items-center gap-0.5 justify-end mt-0.5">
                      <p className="text-[10px] text-[var(--text-muted)]">Tap slip</p>
                      <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      </div>
      {/* ── END RIGHT COLUMN ── */}

      </div>
      {/* ════════ END DESKTOP 2-COLUMN LAYOUT ════════ */}

      {selectedSlip && (
        <SlipModal
          resultId={selectedSlip}
          period={period}
          onClose={() => setSelectedSlip(null)}
        />
      )}

      {/* Incentive Disburse Modal */}
      {showDisburse && period && (
        <IncentiveDisburseModal
          period={period}
          results={results}
          onClose={() => setShowDisburse(false)}
          onSuccess={() => { setShowDisburse(false); fetch(); }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// INCENTIVE DISBURSE MODAL
// ════════════════════════════════════════════════════════════════
function IncentiveDisburseModal({ period, results, onClose, onSuccess }) {
  const [balanceInfo,  setBalanceInfo]  = useState(null);
  const [statusItems,  setStatusItems]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [transferring, setTransferring] = useState(false);

  const API = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
  const authH = { Authorization: 'Bearer ' + localStorage.getItem('accessToken') };

  const toRupiah = (v) => 'Rp ' + (parseFloat(v)||0).toLocaleString('id-ID');
  const toRpShort = (v) => {
    const n = parseFloat(v)||0;
    if (n>=1e9) return 'Rp '+(n/1e9).toFixed(1)+'M';
    if (n>=1e6) return 'Rp '+(n/1e6).toFixed(1)+'jt';
    return 'Rp '+(n/1e3).toFixed(0)+'rb';
  };

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, balRes] = await Promise.all([
        fetch(`${API}/incentive/periods/${period.id}/disburse-status`, { headers: authH }).then(r=>r.json()),
        fetch(`${API}/flip/balance`, { headers: authH }).then(r=>r.json()).catch(()=>null),
      ]);
      setStatusItems(statusRes.data?.items || []);
      setBalanceInfo({
        current_balance: balRes?.data?.balance || 0,
        total_needed:    statusRes.data?.totalNeeded || 0,
        sufficient:      statusRes.data?.sufficient || false,
        pending_items:   (statusRes.data?.items||[]).filter(i=>i.flip_status!=='DONE').length,
        done_items:      (statusRes.data?.items||[]).filter(i=>i.flip_status==='DONE').length,
        summary:         statusRes.data?.summary,
      });
    } catch { alert('Gagal memuat status'); }
    finally { setLoading(false); }
  }, [period.id]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleTransfer = async () => {
    setTransferring(true);
    try {
      const r = await fetch(`${API}/incentive/periods/${period.id}/disburse`, {
        method: 'POST', headers: authH,
      });
      const d = await r.json();
      await loadStatus();
      if (d.success) {
        if (d.data?.failed > 0) alert(`${d.data.failed} transfer gagal — cek detail`);
        else { onSuccess(); }
      }
    } catch { alert('Gagal transfer'); }
    finally { setTransferring(false); }
  };

  const bi = balanceInfo;
  const pendingItems = statusItems.filter(i => i.flip_status !== 'DONE');
  const STYLE = { NONE:'bg-gray-100 text-gray-500', PENDING:'bg-yellow-100 text-yellow-700', DONE:'bg-green-100 text-green-700', FAILED:'bg-red-100 text-red-600' };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[var(--bg-card)] w-full max-w-2xl my-6 rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">🚀</div>
            <div>
              <h2 className="font-bold text-base">Transfer Insentif via Flip</h2>
              <p className="text-xs text-[var(--text-muted)]">{period.name} · {results.length} karyawan</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg)]">
            <X size={18}/>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500"/>
              <p className="text-sm text-[var(--text-muted)]">Mengecek saldo Flip...</p>
            </div>
          ) : (
            <>
              {/* Balance card */}
              <div className={`rounded-2xl border-2 p-5 ${bi?.sufficient ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                      {bi?.sufficient ? '✅ Saldo Mencukupi' : '⚠️ Saldo Tidak Mencukupi'}
                    </p>
                    <p className={`text-2xl font-black ${bi?.sufficient ? 'text-emerald-700' : 'text-red-700'}`}>
                      {toRupiah(bi?.current_balance||0)}
                    </p>
                  </div>
                  <button onClick={loadStatus} className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-white/50">
                    <RefreshCw size={13}/>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/70 rounded-xl p-3 text-center">
                    <p className="text-xs text-[var(--text-muted)]">Total Dibutuhkan</p>
                    <p className="font-bold text-sm">{toRupiah(bi?.total_needed||0)}</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${bi?.sufficient ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <p className="text-xs text-[var(--text-muted)]">{bi?.sufficient ? 'Sisa Saldo' : 'Kekurangan'}</p>
                    <p className={`font-bold text-sm ${bi?.sufficient ? 'text-emerald-700' : 'text-red-700'}`}>
                      {bi?.sufficient
                        ? toRupiah((bi?.current_balance||0)-(bi?.total_needed||0))
                        : toRupiah((bi?.total_needed||0)-(bi?.current_balance||0))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Topup info if insufficient */}
              {!bi?.sufficient && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                  <p className="text-sm font-bold text-amber-800 mb-2">📋 Cara Topup Saldo Flip</p>
                  <p className="text-xs text-amber-700">Login ke <a href="https://business.flip.id" target="_blank" rel="noreferrer" className="underline font-semibold">business.flip.id</a> → Saldo → Tambah Saldo → Transfer ke VA Flip</p>
                </div>
              )}

              {/* Employee list */}
              <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase">
                    Karyawan ({bi?.pending_items} akan ditransfer · {bi?.done_items} sudah)
                  </p>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                        <th className="px-3 py-2 text-left font-bold text-[var(--text-muted)] uppercase">Karyawan</th>
                        <th className="px-3 py-2 text-left font-bold text-[var(--text-muted)] uppercase">Bank</th>
                        <th className="px-3 py-2 text-right font-bold text-[var(--text-muted)] uppercase">Insentif</th>
                        <th className="px-3 py-2 text-center font-bold text-[var(--text-muted)] uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {statusItems.map(item => (
                        <tr key={item.id} className={`hover:bg-[var(--bg-secondary)] ${item.flip_status==='DONE'?'opacity-50':''}`}>
                          <td className="px-3 py-2 font-semibold">{item.employee_name}</td>
                          <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">
                            {item.bank_code ? `${item.bank_code.toUpperCase()} ···${item.bank_account_number?.slice(-4)}` : <span className="text-red-400">⚠ Belum diisi</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">{toRupiah(item.net_salary)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STYLE[item.flip_status]||STYLE.NONE}`}>
                              {item.flip_status||'PENDING'}
                            </span>
                            {item.flip_error && <p className="text-[9px] text-red-500 mt-0.5">{item.flip_error}</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg)] border-t border-[var(--border)]">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Tutup
          </button>
          <button
            onClick={handleTransfer}
            disabled={transferring || loading || pendingItems.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {transferring ? <Loader2 size={15} className="animate-spin"/> : <Banknote size={15}/>}
            {transferring ? 'Mentransfer...' : pendingItems.length > 0 ? `Transfer ${pendingItems.length} Karyawan · ${toRpShort(bi?.total_needed||0)}` : '✅ Semua Sudah Ditransfer'}
          </button>
        </div>
      </div>
    </div>
  );
}
