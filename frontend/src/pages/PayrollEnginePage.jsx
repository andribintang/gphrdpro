import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Play, CheckCircle2, CreditCard, ChevronRight,
  Plus, X, Loader2, Settings, Users, FileText, RefreshCw,
  ChevronLeft, ChevronDown, AlertTriangle, ToggleLeft,
  ToggleRight, Edit3, Eye, ArrowUpRight, ArrowDownRight,
  Calendar, TrendingUp, Banknote, Star, Moon,
  Percent, Clock, Info, CheckCheck, Wallet, UserCheck
, Pencil, Lock, Check} from 'lucide-react';
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
            <div key={run.id} className="table-wrapper">
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

      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} onSuccess={fetch} existingRuns={runs} />}
      {selectedSlip && <SlipModal itemId={selectedSlip} onClose={() => setSelectedSlip(null)} />}
    </div>
  );
};

// ── Generate Modal ─────────────────────────────────────────────
const GenerateModal = ({ onClose, onSuccess, existingRuns = [] }) => {
  const [form, setForm] = useState({ type:'monthly', period_month: currentMonth(), period_year: currentYear(), notes:'' });
  const [selectedParam, setSelectedParam] = useState('');
  const [loading, setLoading] = useState(false);
  const [thrPreview, setThrPreview] = useState(null);

  useEffect(() => {
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
              {Object.entries(RUN_TYPES).filter(([k]) => k !== 'incentive').map(([k,t]) => (
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
          <button onClick={handleSubmit} disabled={loading}
            className="btn-primary flex-1 h-11 text-sm">
            {(() => {
              if (loading) return <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>;
              const existing = existingRuns.find(r => 
                r.type === form.type && 
                r.period_month === parseInt(form.month) && 
                r.period_year === parseInt(form.year)
              );
              if (existing && ['draft','calculated'].includes(existing.status)) {
                return <><RefreshCw className="w-4 h-4" /> Re-Generate</>;
              }
              return <><Play className="w-4 h-4" /> Generate</>;
            })()}
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
      <div className="card-sm">
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
        <div className="table-wrapper">
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
  const [filterType, setFilterType] = useState('');
  const [editModal, setEditModal]   = useState(null); // null | component obj
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState({
    code:'', name:'', type:'income', category:'flat',
    default_value:'', applicable_to:['monthly'], description:'',
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollEngineService.getComponents({ type: filterType || undefined });
      setComponents(res.data.data.components);
    } catch { toast.error('Gagal memuat komponen'); } finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async () => {
    if (!form.code || !form.name) { toast.error('Kode dan nama wajib diisi'); return; }
    try {
      await payrollEngineService.createComponent(form);
      toast.success('Komponen ditambahkan');
      setShowAdd(false);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  const handleEdit = async (comp, updated) => {
    try {
      await payrollEngineService.updateComponent(comp.id, updated);
      toast.success('Komponen diperbarui');
      setEditModal(null);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  const handleToggle = async (id) => {
    try { await payrollEngineService.toggleComponent(id); fetch(); }
    catch { toast.error('Gagal'); }
  };

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const incomes    = components.filter(c => c.type === 'income');
  const deductions = components.filter(c => c.type === 'deduction');

  const ComponentRow = ({ c }) => {
    const isIncome = c.type === 'income';
    const color = isIncome ? 'text-emerald-600' : 'text-red-500';
    return (
      <div className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 transition-colors ${!c.is_active ? 'opacity-50' : ''}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`text-xs font-mono font-bold ${color}`}>{c.code}</p>
            {c.is_system && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">SISTEM</span>}
            {!c.is_active && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-semibold">NONAKTIF</span>}
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{c.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-[10px] text-[var(--text-muted)] capitalize">{c.category}</p>
            {c.default_value > 0 && (
              <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
                Default: {toRupiah(c.default_value)}
              </p>
            )}
            {c.percentage_of_base && (
              <p className="text-[10px] font-semibold text-blue-600">{c.percentage_of_base}% dari gaji pokok</p>
            )}
            <p className="text-[10px] text-[var(--text-muted)]">
              {(c.applicable_to || []).join(', ')}
            </p>
          </div>
          {c.description && <p className="text-[10px] text-[var(--text-muted)] mt-0.5 italic">{c.description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Edit button - all components */}
          <button onClick={() => setEditModal(c)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--brand-600)] transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {/* Toggle - all components including system */}
          <button onClick={() => handleToggle(c.id)} className="flex-shrink-0">
            {c.is_active
              ? <ToggleRight className="w-6 h-6 text-emerald-500" />
              : <ToggleLeft  className="w-6 h-6 text-[var(--text-muted)]" />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {[{v:'',l:'Semua'},{v:'income',l:'💚 Pendapatan'},{v:'deduction',l:'❤️ Potongan'}].map(t => (
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

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
        <strong>Info:</strong> Komponen <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold text-[10px]">SISTEM</span> tidak dapat dinonaktifkan,
        namun nilai default-nya dapat diedit. Klik ✏️ untuk mengedit parameter.
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-4">
          {(!filterType || filterType === 'income') && incomes.length > 0 && (
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">💚 Komponen Pendapatan ({incomes.length})</p>
              <div className="table-wrapper divide-y-0">
                {incomes.map(comp => <ComponentRow key={comp.id} c={comp} />)}
              </div>
            </div>
          )}
          {(!filterType || filterType === 'deduction') && deductions.length > 0 && (
            <div>
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">❤️ Komponen Potongan ({deductions.length})</p>
              <div className="table-wrapper divide-y-0">
                {deductions.map(comp => <ComponentRow key={comp.id} c={comp} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────── */}
      {editModal && (
        <EditComponentModal
          component={editModal}
          onClose={() => setEditModal(null)}
          onSave={(updated) => handleEdit(editModal, updated)}
        />
      )}

      {/* ── Add Modal ────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Tambah Komponen Baru</h3>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-secondary)]"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Kode *</label>
                <input value={form.code} onChange={e => setF('code', e.target.value.toUpperCase())}
                  placeholder="TUNJANGAN_KHUSUS" className="input-base text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Tipe *</label>
                <select value={form.type} onChange={e => setF('type', e.target.value)} className="input-base text-sm">
                  <option value="income">Pendapatan</option>
                  <option value="deduction">Potongan</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Nama *</label>
              <input value={form.name} onChange={e => setF('name', e.target.value)}
                placeholder="Tunjangan Khusus" className="input-base text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Nilai Default (Rp)</label>
                <input type="number" value={form.default_value} onChange={e => setF('default_value', e.target.value)}
                  placeholder="0" className="input-base text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Kategori</label>
                <select value={form.category} onChange={e => setF('category', e.target.value)} className="input-base text-sm">
                  <option value="flat">Flat</option>
                  <option value="percentage">Persentase</option>
                  <option value="attendance_based">Absensi</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Keterangan</label>
              <input value={form.description} onChange={e => setF('description', e.target.value)}
                placeholder="Deskripsi komponen..." className="input-base text-sm" />
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

// ── Edit Component Modal ──────────────────────────────────────
const EditComponentModal = ({ component: comp, onClose, onSave }) => {
  const [form, setForm] = useState({
    name:               comp.name || '',
    default_value:      comp.default_value || 0,
    percentage_of_base: comp.percentage_of_base || '',
    description:        comp.description || '',
    sort_order:         comp.sort_order || 0,
    is_taxable:         comp.is_taxable !== false,
  });
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  };

  const isIncome = comp.type === 'income';
  const color    = isIncome ? '#059669' : '#dc2626';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up p-5 space-y-4"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
              <Pencil className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-bold">Edit Komponen</p>
              <p className="text-[10px] font-mono text-[var(--text-muted)]">{comp.code}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badges */}
        <div className="flex gap-2">
          <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {isIncome ? '💚 Pendapatan' : '❤️ Potongan'}
          </span>
          {comp.is_system && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">🔒 Sistem</span>}
          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full capitalize">{comp.category}</span>
        </div>

        {/* Name - only editable for non-system */}
        {!comp.is_system && (
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Nama Komponen</label>
            <input value={form.name} onChange={e => sf('name', e.target.value)} className="input-base text-sm" />
          </div>
        )}

        {/* Default value */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
            Nilai Default (Rp)
          </label>
          <input type="number" value={form.default_value} onChange={e => sf('default_value', parseFloat(e.target.value) || 0)}
            className="input-base text-sm" placeholder="0" />
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Nilai ini digunakan sebagai default jika tidak ada override per karyawan.
          </p>
        </div>

        {/* Percentage of base */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
            Persentase dari Gaji Pokok (%)
          </label>
          <input type="number" step="0.01" value={form.percentage_of_base}
            onChange={e => sf('percentage_of_base', e.target.value === '' ? '' : parseFloat(e.target.value))}
            className="input-base text-sm" placeholder="Kosongkan jika tidak pakai persentase" />
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Contoh: 1 = 1% dari gaji pokok. Jika diisi, nilai ini menggantikan nilai default.
          </p>
        </div>

        {/* Sort order */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Urutan Tampil</label>
            <input type="number" value={form.sort_order} onChange={e => sf('sort_order', parseInt(e.target.value) || 0)}
              className="input-base text-sm" />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer
                ${form.is_taxable ? 'border-blue-500 bg-blue-500' : 'border-[var(--border)]'}`}
                onClick={() => sf('is_taxable', !form.is_taxable)}>
                {form.is_taxable && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </div>
              <span className="text-xs text-[var(--text-secondary)]">Kena Pajak</span>
            </label>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Keterangan</label>
          <input value={form.description} onChange={e => sf('description', e.target.value)}
            className="input-base text-sm" placeholder="Keterangan komponen (opsional)" />
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 h-10 text-sm">Batal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-10 text-sm gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
};


// ════════════════════════════════════════════════════════════════
// TAB: INSENTIF — Parameter Sales & % per Karyawan
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

  const loadLoans = useCallback(async () => {
    setLoading(true);
    try {
      const res = canManage
        ? await payrollEngineService.getLoans({ status: filterStatus || undefined })
        : await payrollEngineService.getMyLoans();
      setLoans(res.data.data.loans);
    } catch { toast.error('Gagal memuat data pinjaman'); } finally { setLoading(false); }
  }, [filterStatus, canManage]);

  useEffect(() => {
    loadLoans();
    if (canManage) {
      const apiBase = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
      window.fetch(apiBase + '/employees?status=active&limit=200', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } })
        .then(r => r.json()).then(r => { if(r.success) setEmployees(r.data.employees || r.data || []); }).catch(() => {});
    }
  }, [loadLoans]);

  const handleAdd = async () => {
    if (!form.total_amount || !form.monthly_installment) { toast.error('Jumlah dan cicilan wajib diisi'); return; }
    try {
      await payrollEngineService.createLoan(form);
      toast.success('Pinjaman berhasil diajukan');
      setShowAdd(false);
      loadLoans();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  const handleApprove = async (id) => {
    try { await payrollEngineService.approveLoan(id); toast.success('Pinjaman disetujui'); loadLoans(); }
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
  { id:'loan',       label:'Kasbon',    icon:Wallet },
  { id:'components', label:'Komponen',  icon:Settings },
  { id:'settings',   label:'Pengaturan',icon:Settings },
];
const TABS_EMP = [
  { id:'myslip', label:'Slip Saya', icon:FileText },
  { id:'loan',   label:'Kasbon',    icon:Wallet },
];


// ── Payroll Settings Tab ──────────────────────────────────────
const PayrollSettingsTab = () => {
  const [settings, setSettings] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({});

  useEffect(() => {
    payrollEngineService.getSettings()
      .then(r => {
        const s = r.data.data.settings;
        setSettings(s);
        setForm({
          late_deduction_amount:  s.late_deduction_amount  || 0,
          late_tolerance_minutes: s.late_tolerance_minutes || 0,
          alpha_deduction_type:   s.alpha_deduction_type   || 'per_day_salary',
          alpha_flat_amount:      s.alpha_flat_amount      || 0,
          bpjs_enabled:           s.bpjs_enabled           !== false,
          pph21_enabled:          s.pph21_enabled          || false,
          pph21_rate:             s.pph21_rate             || 5,
        });
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await payrollEngineService.updateSettings(form);
      toast.success('Pengaturan disimpan');
    } catch(e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[var(--brand-500)]"/></div>;

  const Section = ({ title, children }) => (
    <div className="table-wrapper p-5 space-y-4">
      <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, hint, children }) => (
    <div>
      <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-[var(--text-muted)] mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Keterlambatan ── */}
      <Section title="⏰ Aturan Keterlambatan">
        <Field label="Toleransi Terlambat (menit)"
          hint="Karyawan yang check-in dalam batas toleransi tidak dihitung terlambat. Contoh: 15 = sampai 15 menit setelah jam masuk masih dianggap tepat waktu.">
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="120" value={form.late_tolerance_minutes}
              onChange={e => sf('late_tolerance_minutes', parseInt(e.target.value)||0)}
              className="input-base text-sm w-24" />
            <span className="text-sm text-[var(--text-muted)]">menit</span>
          </div>
        </Field>
        <Field label="Potongan per Keterlambatan (Rp)"
          hint="Nominal potongan untuk setiap kali karyawan terlambat. Nilai ini akan dipakai jika komponen TELAT tidak memiliki default_value.">
          <input type="number" min="0" value={form.late_deduction_amount}
            onChange={e => sf('late_deduction_amount', parseFloat(e.target.value)||0)}
            className="input-base text-sm w-48" />
        </Field>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          <strong>Info:</strong> Nilai potongan terlambat bisa juga diset langsung di <strong>Tab Komponen → TELAT → Edit → Nilai Default</strong>. Nilai komponen akan diprioritaskan.
        </div>
      </Section>

      {/* ── Alpha / Tidak Hadir ── */}
      <Section title="📋 Aturan Absen (Alpha)">
        <Field label="Tipe Potongan Alpha">
          <select value={form.alpha_deduction_type} onChange={e => sf('alpha_deduction_type', e.target.value)}
            className="input-base text-sm">
            <option value="per_day_salary">Proporsional gaji harian</option>
            <option value="flat">Nominal flat per hari</option>
          </select>
        </Field>
        {form.alpha_deduction_type === 'flat' && (
          <Field label="Nominal Flat per Hari Alpha (Rp)">
            <input type="number" min="0" value={form.alpha_flat_amount}
              onChange={e => sf('alpha_flat_amount', parseFloat(e.target.value)||0)}
              className="input-base text-sm w-48" />
          </Field>
        )}
      </Section>

      {/* ── BPJS & PPH ── */}
      <Section title="🏛️ BPJS & Pajak">
        <Field label="BPJS Aktif">
          <label className="flex items-center gap-2 cursor-pointer">
            <button type="button" onClick={() => sf('bpjs_enabled', !form.bpjs_enabled)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.bpjs_enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.bpjs_enabled ? 'translate-x-5' : 'translate-x-0.5'}`}/>
            </button>
            <span className="text-sm text-[var(--text-secondary)]">{form.bpjs_enabled ? 'Aktif' : 'Nonaktif'}</span>
          </label>
        </Field>
        <Field label="PPH21 Aktif">
          <label className="flex items-center gap-2 cursor-pointer">
            <button type="button" onClick={() => sf('pph21_enabled', !form.pph21_enabled)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.pph21_enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.pph21_enabled ? 'translate-x-5' : 'translate-x-0.5'}`}/>
            </button>
            <span className="text-sm text-[var(--text-secondary)]">{form.pph21_enabled ? 'Aktif' : 'Nonaktif'}</span>
          </label>
        </Field>
        {form.pph21_enabled && (
          <Field label="Tarif PPH21 (%)" hint="Persentase PPH21 yang dipotong dari penghasilan kena pajak">
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="100" step="0.5" value={form.pph21_rate}
                onChange={e => sf('pph21_rate', parseFloat(e.target.value)||5)}
                className="input-base text-sm w-24" />
              <span className="text-sm text-[var(--text-muted)]">%</span>
            </div>
          </Field>
        )}
      </Section>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="btn-primary h-11 px-8 text-sm gap-2 disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
        {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </button>
    </div>
  );
};

export default function PayrollEnginePage() {
  const { user, isHR } = useAuth();
  const canManage = isHR || user?.role === 'admin';
  const TABS = canManage ? TABS_HR : TABS_EMP;
  const [activeTab, setActiveTab] = useState(canManage ? 'runs' : 'myslip');

  return (
    <div className="w-full animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Penggajian Pro</h1>
          <p className="text-sm text-[var(--text-secondary)]">Gaji · THR · Bonus · Kasbon</p>
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
      {activeTab === 'loan'        && <LoanTab />}
      {activeTab === 'components' && <ComponentsTab />}
      {activeTab === 'settings'   && <PayrollSettingsTab />}
    </div>
  );
}
