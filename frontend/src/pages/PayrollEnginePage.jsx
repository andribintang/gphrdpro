import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Play, CheckCircle2, CreditCard, ChevronRight,
  Plus, X, Loader2, Settings, Users, FileText, RefreshCw,
  ChevronLeft, ChevronDown, AlertTriangle, ToggleLeft,
  ToggleRight, Edit3, Eye, ArrowUpRight, ArrowDownRight,
  Calendar, TrendingUp, Banknote, Star, Moon, Target,
  Percent, Clock, Info, CheckCheck, Wallet, UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  payrollEngineService, toRupiah, toRupiahShort,
  RUN_STATUS, RUN_TYPES, MONTHS_ID, currentMonth, currentYear,
} from '../utils/payrollEngineService';

// ── Shared components ──────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = RUN_STATUS[status] || RUN_STATUS.draft;
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.color}`}>{s.label}</span>;
};

const TypeBadge = ({ type }) => {
  const t = RUN_TYPES[type] || RUN_TYPES.monthly;
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${t.bg} ${t.color}`}>{t.icon} {t.label}</span>;
};

const SectionTitle = ({ title, action }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
    {action}
  </div>
);

// ── Slip Modal ─────────────────────────────────────────────────
const SlipModal = ({ itemId, onClose }) => {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    payrollEngineService.getItem(itemId)
      .then(r => setItem(r.data.data.item))
      .catch(() => toast.error('Gagal memuat slip'))
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );
  if (!item) return null;

  const run = item.run;
  const rt  = RUN_TYPES[run?.type] || RUN_TYPES.monthly;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[92vh] overflow-y-auto scrollbar-thin"
        onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>

        {/* Header gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-800" />
          <div className="relative px-5 pt-5 pb-6">
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Slip {rt.label}</p>
                <p className="text-white font-black text-lg">{run?.period_label}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
                <span className="text-white font-black text-lg">{item.employee_name?.[0]}</span>
              </div>
              <div>
                <p className="text-white font-bold">{item.employee_name}</p>
                <p className="text-white/60 text-xs">{item.employee_position} · {item.employee_department}</p>
                <p className="text-white/40 text-xs font-mono">{item.employee_nip}</p>
              </div>
            </div>
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Take Home Pay</p>
              <p className="text-white font-black text-3xl">{toRupiah(item.net_salary)}</p>
              <StatusBadge status={item.status} />
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Attendance for monthly */}
          {run?.type === 'monthly' && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { l:'Hadir', v:item.present_days, c:'text-emerald-600 dark:text-emerald-400' },
                { l:'Telat', v:item.late_count,   c:'text-amber-600 dark:text-amber-400' },
                { l:'Alpha', v:item.alpha_days,   c:'text-red-600 dark:text-red-400' },
                { l:'Cuti',  v:item.leave_days,   c:'text-blue-600 dark:text-blue-400' },
              ].map((s,i) => (
                <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-2.5 text-center">
                  <p className={`text-base font-bold ${s.c}`}>{s.v}</p>
                  <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          )}

          {/* Income */}
          <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="bg-[var(--bg-secondary)] px-4 py-2.5 border-b border-[var(--border)]">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Pendapatan</p>
            </div>
            {(item.income_lines || []).map((l, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{l.name}</p>
                  {l.note && <p className="text-[10px] text-[var(--text-muted)]">{l.note}</p>}
                </div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{toRupiah(l.amount)}</p>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 bg-[var(--bg-secondary)]">
              <span className="text-sm font-bold text-[var(--text-primary)]">Total Pendapatan</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{toRupiah(item.total_income)}</span>
            </div>
          </div>

          {/* Deductions */}
          {(item.deduction_lines || []).length > 0 && (
            <div className="rounded-2xl border border-red-200 dark:border-red-900 overflow-hidden">
              <div className="bg-red-50 dark:bg-red-950 px-4 py-2.5 border-b border-red-200 dark:border-red-900">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Potongan</p>
              </div>
              {(item.deduction_lines || []).map((l, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{l.name}</p>
                    {l.note && <p className="text-[10px] text-[var(--text-muted)]">{l.note}</p>}
                  </div>
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">-{toRupiah(l.amount)}</p>
                </div>
              ))}
              {item.pph21_amount > 0 && (
                <div className="flex justify-between px-4 py-2.5 border-b border-[var(--border-subtle)]">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">PPH21</p>
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">-{toRupiah(item.pph21_amount)}</p>
                </div>
              )}
              <div className="flex justify-between px-4 py-3 bg-red-50 dark:bg-red-950">
                <span className="text-sm font-bold text-[var(--text-primary)]">Total Potongan</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">-{toRupiah(item.total_deductions)}</span>
              </div>
            </div>
          )}

          {/* Net */}
          <div className="rounded-2xl border-2 border-emerald-400 dark:border-emerald-600">
            <div className="flex justify-between px-4 py-4 bg-emerald-50 dark:bg-emerald-950">
              <span className="font-black text-base text-[var(--text-primary)]">Take Home Pay</span>
              <span className="font-black text-base text-emerald-600 dark:text-emerald-400">{toRupiah(item.net_salary)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// TAB: DAFTAR PAYROLL (Runs)
// ════════════════════════════════════════════════════════════════
const RunsTab = () => {
  const [runs, setRuns]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setType] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedRun, setSelectedRun]   = useState(null);
  const [runItems, setRunItems]         = useState([]);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollEngineService.getRuns({ type: filterType || undefined, year: currentYear() });
      setRuns(res.data.data.runs);
    } catch { toast.error('Gagal memuat payroll'); } finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetch(); }, [fetch]);

  const openRun = async (run) => {
    setSelectedRun(run);
    try {
      const res = await payrollEngineService.getRunDetail(run.id, { limit: 100 });
      setRunItems(res.data.data.items);
    } catch { toast.error('Gagal memuat detail'); }
  };

  const handleApprove = async (id) => {
    setActionLoading(id + '-approve');
    try { await payrollEngineService.approveRun(id); toast.success('Payroll disetujui'); fetch(); }
    catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setActionLoading(null); }
  };

  const handlePay = async (id) => {
    setActionLoading(id + '-pay');
    try { await payrollEngineService.markPaid(id); toast.success('Payroll ditandai dibayar!'); fetch(); }
    catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setActionLoading(null); }
  };

  // Type filter pills
  const types = [
    { v:'', l:'Semua' },
    ...Object.entries(RUN_TYPES).map(([v,t]) => ({ v, l:t.icon+' '+t.label })),
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {types.map(t => (
            <button key={t.v} onClick={() => setType(t.v)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                ${filterType === t.v ? 'bg-brand-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
              {t.l}
            </button>
          ))}
        </div>
        <button onClick={() => setShowGenerate(true)} className="btn-primary h-9 px-3 text-xs flex-shrink-0">
          <Play className="w-3.5 h-3.5" /> Generate
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : runs.length === 0 ? (
        <div className="text-center py-14">
          <DollarSign className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada payroll. Klik Generate untuk memulai.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map(run => (
            <div key={run.id} className="card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{run.period_label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <TypeBadge type={run.type} />
                      <StatusBadge status={run.status} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-black text-[var(--text-primary)]">{toRupiahShort(run.total_net)}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{run.total_employees} karyawan</p>
                  </div>
                </div>

                {/* Summary row */}
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  {[
                    { l:'Pendapatan', v:toRupiahShort(run.total_gross),      c:'text-emerald-600 dark:text-emerald-400' },
                    { l:'Potongan',   v:toRupiahShort(run.total_deductions), c:'text-red-500' },
                    { l:'Bersih',     v:toRupiahShort(run.total_net),        c:'text-brand-600 dark:text-brand-400' },
                  ].map((s,i) => (
                    <div key={i} className="bg-[var(--bg-secondary)] rounded-xl py-2">
                      <p className={`text-xs font-bold ${s.c}`}>{s.v}</p>
                      <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">{s.l}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => openRun(run)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
                    <Eye className="w-3.5 h-3.5" /> Detail
                  </button>
                  {run.status === 'calculated' && (
                    <button onClick={() => handleApprove(run.id)} disabled={actionLoading === run.id+'-approve'}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white">
                      {actionLoading === run.id+'-approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                  )}
                  {run.status === 'approved' && (
                    <button onClick={() => handlePay(run.id)} disabled={actionLoading === run.id+'-pay'}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white">
                      {actionLoading === run.id+'-pay' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                      Bayar
                    </button>
                  )}
                </div>
              </div>

              {/* Run detail panel */}
              {selectedRun?.id === run.id && (
                <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                  <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
                    <p className="text-xs font-bold text-[var(--text-primary)]">Detail Karyawan ({runItems.length})</p>
                    <button onClick={() => setSelectedRun(null)} className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)]">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto scrollbar-thin divide-y divide-[var(--border-subtle)]">
                    {runItems.map(item => (
                      <button key={item.id} onClick={() => setSelectedSlip(item.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card)] transition-colors text-left">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {item.employee_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.employee_name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{item.employee_department}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-[var(--text-primary)]">{toRupiahShort(item.net_salary)}</p>
                          <StatusBadge status={item.status} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} onSuccess={fetch} />}
      {selectedSlip && <SlipModal itemId={selectedSlip} onClose={() => setSelectedSlip(null)} />}
    </div>
  );
};

// ── Generate Modal ─────────────────────────────────────────────
const GenerateModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ type:'monthly', period_month: currentMonth(), period_year: currentYear(), notes:'' });
  const [incentiveParams, setIncentiveParams] = useState([]);
  const [selectedParam, setSelectedParam] = useState('');
  const [loading, setLoading] = useState(false);
  const [thrPreview, setThrPreview] = useState(null);

  useEffect(() => {
    if (form.type === 'incentive') {
      payrollEngineService.getIncentiveParams({ year: currentYear(), month: form.period_month })
        .then(r => setIncentiveParams(r.data.data.parameters))
        .catch(() => {});
    }
    if (form.type === 'thr') {
      payrollEngineService.previewTHR()
        .then(r => setThrPreview(r.data.data))
        .catch(() => {});
    }
  }, [form.type, form.period_month]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = { ...form };
      if (form.type === 'incentive' && selectedParam) payload.incentive_parameter_id = selectedParam;
      const res = await payrollEngineService.generateRun(payload);
      const d   = res.data.data;
      toast.success(`${res.data.message}`);
      if (d.errors?.length) toast(`⚠️ ${d.errors.length} karyawan gagal`, { icon:'⚠️' });
      onSuccess();
      onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal generate'); }
    finally { setLoading(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Generate Payroll</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Jenis Payroll</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(RUN_TYPES).map(([k,t]) => (
                <button key={k} onClick={() => set('type', k)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-left
                    ${form.type === k ? `${t.bg} ${t.color} border-current` : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Bulan</label>
              <select value={form.period_month} onChange={e => set('period_month', parseInt(e.target.value))} className="input-base text-sm">
                {MONTHS_ID.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Tahun</label>
              <select value={form.period_year} onChange={e => set('period_year', parseInt(e.target.value))} className="input-base text-sm">
                {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Incentive param selector */}
          {form.type === 'incentive' && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Parameter Insentif</label>
              {incentiveParams.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-xs">
                  <AlertTriangle className="w-4 h-4" /> Belum ada parameter insentif untuk periode ini. Buat dulu di tab Insentif.
                </div>
              ) : (
                <select value={selectedParam} onChange={e => setSelectedParam(e.target.value)} className="input-base text-sm">
                  <option value="">Pilih parameter...</option>
                  {incentiveParams.map(p => <option key={p.id} value={p.id}>{p.name} - Total Sales: {toRupiah(p.total_sales)}</option>)}
                </select>
              )}
            </div>
          )}

          {/* THR preview */}
          {form.type === 'thr' && thrPreview && (
            <div className="bg-[var(--bg-secondary)] rounded-xl p-3 space-y-1">
              <p className="text-xs font-bold text-[var(--text-primary)] mb-2">Preview THR</p>
              {thrPreview.previews?.slice(0,4).map((p,i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)] truncate">{p.name}</span>
                  <span className={`font-semibold flex-shrink-0 ml-2 ${p.eligibility === 'not_eligible' ? 'text-red-500' : p.eligibility === 'proportional' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {p.eligibility === 'not_eligible' ? 'Tidak Eligible' : toRupiahShort(p.thr_amount)}
                  </span>
                </div>
              ))}
              {thrPreview.previews?.length > 4 && <p className="text-[10px] text-[var(--text-muted)]">...+{thrPreview.previews.length-4} lainnya</p>}
              <div className="border-t border-[var(--border)] pt-1 mt-1 flex justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">Total THR</span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{toRupiah(thrPreview.total_thr)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Catatan (opsional)</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Catatan payroll..." className="input-base text-sm" />
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 h-11 text-sm">Batal</button>
          <button onClick={handleSubmit} disabled={loading || (form.type === 'incentive' && !selectedParam && incentiveParams.length > 0)}
            className="btn-primary flex-1 h-11 text-sm">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Play className="w-4 h-4" /> Generate</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// TAB: MY SLIP (for employee)
// ════════════════════════════════════════════════════════════════
const MySlipTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [filterType, setFilterType] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollEngineService.getMy({ type: filterType || undefined });
      setItems(res.data.data.items);
    } catch { toast.error('Gagal memuat slip'); } finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetch(); }, [fetch]);

  const yearTotal = items.filter(i => i.run?.period_year === currentYear()).reduce((s,i) => s + parseFloat(i.net_salary || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card p-4">
        <p className="text-xs text-[var(--text-muted)] font-medium">Total Penghasilan {currentYear()}</p>
        <p className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">{toRupiahShort(yearTotal)}</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {[{v:'',l:'Semua'}, ...Object.entries(RUN_TYPES).map(([v,t])=>({v,l:t.icon+' '+t.label}))].map(t => (
          <button key={t.v} onClick={() => setFilterType(t.v)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
              ${filterType === t.v ? 'bg-brand-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12"><FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" /><p className="text-sm text-[var(--text-muted)]">Belum ada slip gaji</p></div>
      ) : (
        <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
          {items.map(item => {
            const rt = RUN_TYPES[item.run?.type] || RUN_TYPES.monthly;
            return (
              <button key={item.id} onClick={() => setSelectedSlip(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-secondary)] text-left">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${rt.bg}`}>
                  {rt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{item.run?.period_label}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={item.status} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-[var(--text-primary)]">{toRupiahShort(item.net_salary)}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">-{toRupiahShort(item.total_deductions)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {selectedSlip && <SlipModal itemId={selectedSlip} onClose={() => setSelectedSlip(null)} />}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// TAB: COMPONENT MANAGER
// ════════════════════════════════════════════════════════════════
const ComponentsTab = () => {
  const [components, setComponents] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [filterType, setFilterType] = useState('');
  const [form, setForm]             = useState({ code:'', name:'', type:'income', category:'flat', default_value:'', applicable_to:['monthly'], description:'' });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollEngineService.getComponents({ type: filterType || undefined });
      setComponents(res.data.data.components);
    } catch { toast.error('Gagal memuat komponen'); } finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async () => {
    try {
      await payrollEngineService.createComponent(form);
      toast.success('Komponen ditambahkan');
      setShowAdd(false);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  const handleToggle = async (id) => {
    try { await payrollEngineService.toggleComponent(id); fetch(); }
    catch { toast.error('Gagal'); }
  };

  const setF = (k,v) => setForm(f => ({ ...f, [k]: v }));

  const incomes    = components.filter(c => c.type === 'income');
  const deductions = components.filter(c => c.type === 'deduction');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {[{v:'',l:'Semua'},{v:'income',l:'Pendapatan'},{v:'deduction',l:'Potongan'}].map(t => (
            <button key={t.v} onClick={() => setFilterType(t.v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                ${filterType === t.v ? 'bg-brand-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
              {t.l}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary h-8 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" /> Tambah
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
      ) : (
        <>
          {(!filterType || filterType === 'income') && incomes.length > 0 && (
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">💚 Komponen Pendapatan</p>
              <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
                {incomes.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-mono text-brand-500 dark:text-brand-400">{c.code}</p>
                        {c.is_system && <span className="text-[9px] bg-[var(--bg-tertiary)] text-[var(--text-muted)] px-1.5 py-0.5 rounded font-semibold">SISTEM</span>}
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{c.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{c.category} · {c.default_value > 0 ? toRupiah(c.default_value) : '–'}</p>
                    </div>
                    {!c.is_system && (
                      <button onClick={() => handleToggle(c.id)} className="flex-shrink-0">
                        {c.is_active
                          ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                          : <ToggleLeft  className="w-5 h-5 text-[var(--text-muted)]" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!filterType || filterType === 'deduction') && deductions.length > 0 && (
            <div>
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">❤️ Komponen Potongan</p>
              <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
                {deductions.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-mono text-red-500 dark:text-red-400">{c.code}</p>
                        {c.is_system && <span className="text-[9px] bg-[var(--bg-tertiary)] text-[var(--text-muted)] px-1.5 py-0.5 rounded font-semibold">SISTEM</span>}
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{c.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{c.category}</p>
                    </div>
                    {!c.is_system && (
                      <button onClick={() => handleToggle(c.id)} className="flex-shrink-0">
                        {c.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-[var(--text-muted)]" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add component modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Tambah Komponen Baru</h3>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><X className="w-4 h-4" /></button>
            </div>

            {[
              { label:'Kode (unik)', field:'code', placeholder:'TUNJANGAN_KHUSUS' },
              { label:'Nama',       field:'name', placeholder:'Tunjangan Khusus' },
            ].map(f => (
              <div key={f.field}>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{f.label}</label>
                <input value={form[f.field]} onChange={e => setF(f.field, e.target.value)} placeholder={f.placeholder} className="input-base text-sm" />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Tipe</label>
                <select value={form.type} onChange={e => setF('type', e.target.value)} className="input-base text-sm">
                  <option value="income">Pendapatan</option>
                  <option value="deduction">Potongan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Nilai Default</label>
                <input type="number" value={form.default_value} onChange={e => setF('default_value', e.target.value)} placeholder="0" className="input-base text-sm" />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 h-10 text-sm">Batal</button>
              <button onClick={handleAdd} className="btn-primary flex-1 h-10 text-sm"><Plus className="w-4 h-4" /> Tambah</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ════════════════════════════════════════════════════════════════
// TAB: INSENTIF — Parameter Sales & % per Karyawan
// ════════════════════════════════════════════════════════════════
const InsentifTab = () => {
  const [params, setParams]         = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({
    name: 'Sales Bulan Ini',
    period_month: new Date().getMonth() + 1,
    period_year:  new Date().getFullYear(),
    total_sales: '',
    description: '',
    rates: [],
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        payrollEngineService.getIncentiveParams({ year: new Date().getFullYear() }),
        fetch('/api/employees?status=active', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }).then(r => r.json()),
      ]);
      setParams(pRes.data.data.parameters);
      if (eRes.success) {
        const emps = eRes.data.employees || [];
        setEmployees(emps);
        // Init rates with 0 for each employee
        setForm(f => ({
          ...f,
          rates: emps.map(e => ({ user_id: e.id, name: e.name, department: e.employee?.department, rate_percentage: '' })),
        }));
      }
    } catch { toast.error('Gagal memuat data'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const setRate = (userId, val) => {
    setForm(f => ({
      ...f,
      rates: f.rates.map(r => r.user_id === userId ? { ...r, rate_percentage: val } : r),
    }));
  };

  const handleSubmit = async () => {
    if (!form.total_sales || parseFloat(form.total_sales) <= 0) {
      toast.error('Total sales harus diisi'); return;
    }
    const activeRates = form.rates.filter(r => r.rate_percentage && parseFloat(r.rate_percentage) > 0);
    if (activeRates.length === 0) {
      toast.error('Minimal 1 karyawan harus punya persentase'); return;
    }
    try {
      await payrollEngineService.createIncentiveParam({
        ...form,
        total_sales: parseFloat(form.total_sales),
        rates: activeRates.map(r => ({ user_id: r.user_id, rate_percentage: parseFloat(r.rate_percentage) })),
      });
      toast.success('Parameter insentif berhasil disimpan!');
      setShowForm(false);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  const totalPct = form.rates.reduce((s, r) => s + (parseFloat(r.rate_percentage) || 0), 0);
  const previewTotal = form.total_sales
    ? form.rates.reduce((s, r) => s + (parseFloat(form.total_sales) * (parseFloat(r.rate_percentage) || 0) / 100), 0)
    : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Parameter Insentif</h3>
          <p className="text-xs text-[var(--text-muted)]">Input sales bulanan & % per karyawan</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary h-9 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" /> Buat Parameter
        </button>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-100 dark:bg-purple-950 border border-purple-200 dark:border-purple-900">
        <Target className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
          <strong>Cara kerja insentif:</strong> HR input total penjualan bulan ini → set % per karyawan → Generate Payroll type "Insentif" → sistem hitung otomatis.
          <br />Contoh: Sales Rp 100jt × 0.5% = Rp 500rb untuk karyawan A.
        </div>
      </div>

      {/* Existing params */}
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : params.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada parameter insentif</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Klik "Buat Parameter" untuk mulai</p>
        </div>
      ) : (
        <div className="space-y-2">
          {params.map(p => (
            <div key={p.id} className="card overflow-hidden">
              <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--bg-secondary)]"
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{p.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {MONTHS_ID[p.period_month]} {p.period_year} · {p.rates?.length || 0} karyawan
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-purple-600 dark:text-purple-400">{toRupiahShort(p.total_sales)}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Total Sales</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${expandedId === p.id ? 'rotate-180' : ''}`} />
              </button>

              {expandedId === p.id && p.rates?.length > 0 && (
                <div className="border-t border-[var(--border)] divide-y divide-[var(--border-subtle)]">
                  <div className="grid grid-cols-3 px-4 py-2 bg-[var(--bg-secondary)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    <span>Karyawan</span><span className="text-center">%</span><span className="text-right">Insentif</span>
                  </div>
                  {p.rates.map(r => (
                    <div key={r.id} className="grid grid-cols-3 items-center px-4 py-2.5">
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{r.user?.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{r.user?.employee?.department}</p>
                      </div>
                      <p className="text-xs font-bold text-purple-600 dark:text-purple-400 text-center">{r.rate_percentage}%</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right">{toRupiahShort(r.calculated_amount)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-2.5 bg-[var(--bg-secondary)]">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Total Insentif</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {toRupiah(p.rates.reduce((s,r) => s + parseFloat(r.calculated_amount || 0), 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-lg bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 sm:hidden flex-shrink-0"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Parameter Insentif Baru</h3>
                <p className="text-xs text-[var(--text-muted)]">Input total sales & % per karyawan</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><X className="w-4 h-4" /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">

              {/* Nama parameter */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Nama Parameter</label>
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
                  placeholder="Sales Bulan Ini" className="input-base text-sm" />
              </div>

              {/* Periode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Bulan</label>
                  <select value={form.period_month} onChange={e => setForm(f=>({...f,period_month:parseInt(e.target.value)}))} className="input-base text-sm">
                    {MONTHS_ID.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Tahun</label>
                  <select value={form.period_year} onChange={e => setForm(f=>({...f,period_year:parseInt(e.target.value)}))} className="input-base text-sm">
                    {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Total sales */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Total Penjualan Bulan Ini <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)] font-medium">Rp</span>
                  <input type="number" value={form.total_sales}
                    onChange={e => setForm(f=>({...f,total_sales:e.target.value}))}
                    placeholder="100000000" className="input-base pl-10 text-sm" />
                </div>
                {form.total_sales && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">{toRupiah(form.total_sales)}</p>
                )}
              </div>

              {/* % per karyawan */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    % Insentif per Karyawan
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${totalPct > 100 ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
                      Total: {totalPct.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[var(--bg-secondary)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    <span className="col-span-5">Karyawan</span>
                    <span className="col-span-3 text-center">% Insentif</span>
                    <span className="col-span-4 text-right">Hasil</span>
                  </div>
                  {form.rates.map(r => {
                    const amount = form.total_sales ? (parseFloat(form.total_sales) * (parseFloat(r.rate_percentage) || 0) / 100) : 0;
                    return (
                      <div key={r.user_id} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5">
                        <div className="col-span-5 min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{r.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">{r.department}</p>
                        </div>
                        <div className="col-span-3">
                          <div className="relative">
                            <input
                              type="number" step="0.001" min="0" max="100"
                              value={r.rate_percentage}
                              onChange={e => setRate(r.user_id, e.target.value)}
                              placeholder="0"
                              className="input-base text-xs text-center pr-6 h-8"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] font-bold">%</span>
                          </div>
                        </div>
                        <div className="col-span-4 text-right">
                          <p className={`text-xs font-bold ${amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                            {amount > 0 ? toRupiahShort(amount) : '—'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {/* Total row */}
                  <div className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 bg-[var(--bg-secondary)]">
                    <span className="col-span-5 text-xs font-bold text-[var(--text-primary)]">Total</span>
                    <span className={`col-span-3 text-xs font-black text-center ${totalPct > 100 ? 'text-red-500' : 'text-purple-600 dark:text-purple-400'}`}>
                      {totalPct.toFixed(2)}%
                    </span>
                    <span className="col-span-4 text-xs font-black text-right text-emerald-600 dark:text-emerald-400">
                      {previewTotal > 0 ? toRupiahShort(previewTotal) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Catatan (opsional)</label>
                <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                  placeholder="Keterangan tambahan..." className="input-base text-sm" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[var(--border)] flex gap-2 flex-shrink-0">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1 h-11 text-sm">Batal</button>
              <button onClick={handleSubmit} className="btn-primary flex-1 h-11 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Simpan Parameter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// TAB: KASBON & HUTANG
// ════════════════════════════════════════════════════════════════
const LoanTab = () => {
  const { user, isHR } = useAuth();
  const canManage = isHR || user?.role === 'admin';
  const [loans, setLoans]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [employees, setEmployees] = useState([]);
  const [filterStatus, setStatus] = useState('active');
  const [form, setForm] = useState({
    user_id:'', type:'kasbon', total_amount:'',
    monthly_installment:'', loan_date: new Date().toISOString().split('T')[0],
    start_date: new Date().toISOString().split('T')[0], description:'',
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = canManage
        ? await payrollEngineService.getLoans({ status: filterStatus || undefined })
        : await payrollEngineService.getMyLoans();
      setLoans(res.data.data.loans);
    } catch { toast.error('Gagal memuat data pinjaman'); } finally { setLoading(false); }
  }, [filterStatus, canManage]);

  useEffect(() => {
    fetch();
    if (canManage) {
      fetch('/api/employees?status=active', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } })
        .then(r => r.json()).then(r => { if(r.success) setEmployees(r.data.employees || []); }).catch(() => {});
    }
  }, [fetch]);

  const handleAdd = async () => {
    if (!form.total_amount || !form.monthly_installment) { toast.error('Jumlah dan cicilan wajib diisi'); return; }
    try {
      await payrollEngineService.createLoan(form);
      toast.success('Pinjaman berhasil diajukan');
      setShowAdd(false);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  const handleApprove = async (id) => {
    try { await payrollEngineService.approveLoan(id); toast.success('Pinjaman disetujui'); fetch(); }
    catch { toast.error('Gagal'); }
  };

  const statusColors = {
    pending:   'badge-warning',
    active:    'badge-info',
    completed: 'badge-success',
    cancelled: 'badge-neutral',
  };
  const statusLabels = { pending:'Menunggu', active:'Aktif', completed:'Lunas', cancelled:'Dibatalkan' };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Kasbon & Hutang</h3>
          <p className="text-xs text-[var(--text-muted)]">Cicilan otomatis dipotong dari gaji</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary h-9 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" /> Ajukan
        </button>
      </div>

      {/* Status filter */}
      {canManage && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[{v:'',l:'Semua'},{v:'pending',l:'Menunggu'},{v:'active',l:'Aktif'},{v:'completed',l:'Lunas'}].map(f => (
            <button key={f.v} onClick={() => setStatus(f.v)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                ${filterStatus===f.v ? 'bg-brand-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
              {f.l}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_,i)=><div key={i} className="skeleton h-20 rounded-xl"/>)}</div>
      ) : loans.length === 0 ? (
        <div className="text-center py-12">
          <Wallet className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Tidak ada data pinjaman</p>
        </div>
      ) : (
        <div className="space-y-2">
          {loans.map(loan => {
            const paidPct = loan.total_amount > 0 ? ((parseFloat(loan.total_amount) - parseFloat(loan.remaining_amount)) / parseFloat(loan.total_amount)) * 100 : 0;
            return (
              <div key={loan.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${statusColors[loan.status] || 'badge-neutral'}`}>{statusLabels[loan.status]}</span>
                      <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded">
                        {loan.type === 'kasbon' ? '💳 Kasbon' : '💸 Hutang'}
                      </span>
                    </div>
                    {canManage && loan.user && (
                      <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{loan.user.name}</p>
                    )}
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{loan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[var(--text-primary)]">{toRupiahShort(loan.total_amount)}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Cicilan {toRupiahShort(loan.monthly_installment)}/bln</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                    <span>Terbayar {toRupiahShort(parseFloat(loan.total_amount) - parseFloat(loan.remaining_amount))}</span>
                    <span>Sisa {toRupiahShort(loan.remaining_amount)}</span>
                  </div>
                  <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${loan.status === 'completed' ? 'bg-emerald-500' : 'bg-brand-500'}`}
                      style={{ width: `${Math.min(100, paidPct)}%` }} />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{loan.installment_count}/{loan.total_installments} cicilan · {Math.round(paidPct)}% lunas</p>
                </div>

                {canManage && loan.status === 'pending' && (
                  <button onClick={() => handleApprove(loan.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all">
                    <UserCheck className="w-3.5 h-3.5" /> Setujui Pinjaman
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add loan modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Ajukan Pinjaman</h3>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><X className="w-4 h-4" /></button>
            </div>

            {canManage && (
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Karyawan</label>
                <select value={form.user_id} onChange={e => setForm(f=>({...f,user_id:e.target.value}))} className="input-base text-sm">
                  <option value="">Pilih karyawan...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} - {e.employee?.department}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Jenis</label>
              <div className="grid grid-cols-2 gap-2">
                {[{v:'kasbon',l:'💳 Kasbon'},{v:'hutang',l:'💸 Hutang'}].map(t => (
                  <button key={t.v} onClick={() => setForm(f=>({...f,type:t.v}))}
                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-all
                      ${form.type===t.v ? 'bg-brand-500 text-white border-brand-500' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {[
              { label:'Total Pinjaman', field:'total_amount', placeholder:'5000000', prefix:'Rp' },
              { label:'Cicilan per Bulan', field:'monthly_installment', placeholder:'500000', prefix:'Rp' },
            ].map(f => (
              <div key={f.field}>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{f.label}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">{f.prefix}</span>
                  <input type="number" value={form[f.field]} onChange={e => setForm(ff=>({...ff,[f.field]:e.target.value}))}
                    placeholder={f.placeholder} className="input-base pl-10 text-sm" />
                </div>
                {form[f.field] && <p className="text-xs text-[var(--text-muted)] mt-1">{toRupiah(form[f.field])}</p>}
              </div>
            ))}

            {form.total_amount && form.monthly_installment && (
              <div className="bg-[var(--bg-secondary)] rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Jumlah cicilan</span><span className="font-bold">{Math.ceil(parseFloat(form.total_amount)/parseFloat(form.monthly_installment))} bulan</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Mulai dipotong</span><span className="font-bold">{form.start_date}</span></div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Keterangan</label>
              <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                placeholder="Keperluan pinjaman..." className="input-base text-sm" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 h-10 text-sm">Batal</button>
              <button onClick={handleAdd} className="btn-primary flex-1 h-10 text-sm"><Plus className="w-4 h-4" /> Ajukan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
const TABS_HR = [
  { id:'runs',       label:'Payroll',   icon:DollarSign },
  { id:'myslip',     label:'Slip Saya', icon:FileText },
  { id:'incentif',   label:'Insentif',  icon:Target },
  { id:'loan',       label:'Kasbon',    icon:Wallet },
  { id:'components', label:'Komponen',  icon:Settings },
];
const TABS_EMP = [
  { id:'myslip', label:'Slip Saya', icon:FileText },
  { id:'loan',   label:'Kasbon',    icon:Wallet },
];

export default function PayrollEnginePage() {
  const { user, isHR } = useAuth();
  const canManage = isHR || user?.role === 'admin';
  const TABS = canManage ? TABS_HR : TABS_EMP;
  const [activeTab, setActiveTab] = useState(canManage ? 'runs' : 'myslip');

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Penggajian Pro</h1>
          <p className="text-sm text-[var(--text-secondary)]">Gaji · Insentif · THR · Bonus</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
      </div>

      <div className="flex p-1 gap-1 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)] mb-5 overflow-x-auto scrollbar-thin">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200
                ${active ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'runs'       && <RunsTab />}
      {activeTab === 'myslip'     && <MySlipTab />}
      {activeTab === 'incentif'    && <InsentifTab />}
      {activeTab === 'loan'        && <LoanTab />}
      {activeTab === 'components' && <ComponentsTab />}
    </div>
  );
}
