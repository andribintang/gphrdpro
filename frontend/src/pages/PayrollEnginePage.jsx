import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Play, CheckCircle2, CreditCard, ChevronRight,
  Plus, X, Loader2, Settings, Users, FileText, RefreshCw,
  ChevronLeft, ChevronDown, AlertTriangle, ToggleLeft,
  ToggleRight, Edit3, Eye, ArrowUpRight, ArrowDownRight,
  Calendar, TrendingUp, Banknote, Star, Moon,
  Percent, Clock, Info, CheckCheck, Wallet, UserCheck,
  Pencil, Lock, Check, Printer, Download, BarChart3,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  payrollEngineService, toRupiah, toRupiahShort,
  RUN_STATUS, RUN_TYPES, MONTHS_ID, currentMonth, currentYear,
  flipService,
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
// ── PDF Slip Generator (browser print) ───────────────────────
const handlePrintSlip = (item, run) => {
  const toRp = (n) => `Rp ${Number(n||0).toLocaleString('id-ID')}`;
  const rt = RUN_TYPES[run?.type] || RUN_TYPES.monthly;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>Slip Gaji - ${item.employee_name} - ${run?.period_label}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; padding: 24px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:12px; border-bottom:2px solid #1a1a1a; margin-bottom:16px; }
    .company-name { font-size:18px; font-weight:900; color:#1a1a1a; }
    .company-sub { font-size:10px; color:#666; margin-top:2px; }
    .slip-title { text-align:right; }
    .slip-title h2 { font-size:14px; font-weight:700; color:#1a1a1a; }
    .slip-title p { font-size:10px; color:#666; margin-top:2px; }
    .employee-box { background:#f8f9fa; border:1px solid #e0e0e0; border-radius:8px; padding:12px 16px; margin-bottom:16px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .emp-field label { font-size:9px; color:#888; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:2px; }
    .emp-field span { font-size:12px; font-weight:600; color:#1a1a1a; }
    .attendance { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:16px; }
    .att-box { border:1px solid #e0e0e0; border-radius:6px; padding:8px; text-align:center; }
    .att-box .num { font-size:18px; font-weight:900; }
    .att-box .lbl { font-size:9px; color:#888; font-weight:600; text-transform:uppercase; }
    .att-box.hadir .num { color:#16a34a; }
    .att-box.telat .num { color:#d97706; }
    .att-box.alpha .num { color:#dc2626; }
    .att-box.cuti  .num { color:#2563eb; }
    table { width:100%; border-collapse:collapse; margin-bottom:12px; }
    table thead th { background:#f1f5f9; padding:8px 10px; text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#64748b; border-bottom:1px solid #e2e8f0; }
    table thead th:last-child { text-align:right; }
    table tbody td { padding:7px 10px; border-bottom:1px solid #f1f5f9; font-size:11px; }
    table tbody td:last-child { text-align:right; font-weight:600; }
    table tbody td.note { font-size:9px; color:#888; padding-top:1px; padding-bottom:5px; }
    .income td:last-child { color:#16a34a; }
    .deduct td:last-child { color:#dc2626; }
    .total-row td { font-weight:700; font-size:12px; padding-top:10px; border-top:2px solid #1a1a1a; }
    .net-box { background:#f0fdf4; border:2px solid #16a34a; border-radius:8px; padding:14px 16px; display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
    .net-box .label { font-size:13px; font-weight:700; }
    .net-box .amount { font-size:20px; font-weight:900; color:#16a34a; }
    .footer { border-top:1px solid #e0e0e0; padding-top:12px; display:grid; grid-template-columns:1fr 1fr; gap:24px; }
    .sign-box { text-align:center; }
    .sign-box .title { font-size:10px; font-weight:600; margin-bottom:40px; }
    .sign-box .name { font-size:10px; border-top:1px solid #1a1a1a; padding-top:4px; }
    .badge { display:inline-block; padding:2px 8px; border-radius:100px; font-size:9px; font-weight:700; background:#dbeafe; color:#1d4ed8; }
    @media print { body { padding:12px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">GPDISTRO RACING ID</div>
      <div class="company-sub">HR &amp; Payroll Management System</div>
    </div>
    <div class="slip-title">
      <h2>SLIP GAJI ${rt.label.toUpperCase()}</h2>
      <p>Periode: ${run?.period_label || ''}</p>
      <p>Diterbitkan: ${new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'})}</p>
    </div>
  </div>

  <div class="employee-box">
    <div class="emp-field"><label>Nama Karyawan</label><span>${item.employee_name}</span></div>
    <div class="emp-field"><label>NIP</label><span>${item.employee_nip || '—'}</span></div>
    <div class="emp-field"><label>Jabatan</label><span>${item.employee_position || '—'}</span></div>
    <div class="emp-field"><label>Departemen</label><span>${item.employee_department || '—'}</span></div>
  </div>

  ${run?.type === 'monthly' ? `
  <div class="attendance">
    <div class="att-box hadir"><div class="num">${item.present_days||0}</div><div class="lbl">Hadir</div></div>
    <div class="att-box telat"><div class="num">${item.late_count||0}</div><div class="lbl">Terlambat</div></div>
    <div class="att-box alpha"><div class="num">${item.alpha_days||0}</div><div class="lbl">Alpha</div></div>
    <div class="att-box cuti"><div class="num">${item.leave_days||0}</div><div class="lbl">Cuti</div></div>
  </div>` : ''}

  <table>
    <thead><tr><th>Komponen Pendapatan</th><th>Keterangan</th><th>Jumlah</th></tr></thead>
    <tbody class="income">
      ${(item.income_lines||[]).map(l => `
        <tr><td>${l.name}${l.note ? `<br/><span class="note">${l.note}</span>` : ''}</td><td>${l.note||''}</td><td>+${toRp(l.amount)}</td></tr>
      `).join('')}
      <tr class="total-row"><td colspan="2">Total Pendapatan</td><td style="color:#16a34a">+${toRp(item.total_income)}</td></tr>
    </tbody>
  </table>

  ${(item.deduction_lines||[]).length > 0 || item.pph21_amount > 0 ? `
  <table>
    <thead><tr><th>Komponen Potongan</th><th>Keterangan</th><th>Jumlah</th></tr></thead>
    <tbody class="deduct">
      ${(item.deduction_lines||[]).map(l => `
        <tr><td>${l.name}${l.note ? `<br/><span class="note">${l.note}</span>` : ''}</td><td>${l.note||''}</td><td>-${toRp(l.amount)}</td></tr>
      `).join('')}
      ${item.pph21_amount > 0 ? `<tr><td>PPH21</td><td></td><td>-${toRp(item.pph21_amount)}</td></tr>` : ''}
      <tr class="total-row"><td colspan="2">Total Potongan</td><td style="color:#dc2626">-${toRp(item.total_deductions)}</td></tr>
    </tbody>
  </table>` : ''}

  <div class="net-box">
    <span class="label">💰 Take Home Pay</span>
    <span class="amount">${toRp(item.net_salary)}</span>
  </div>

  <div class="footer">
    <div class="sign-box">
      <div class="title">Karyawan</div>
      <div class="name">${item.employee_name}</div>
    </div>
    <div class="sign-box">
      <div class="title">Mengetahui, HRD</div>
      <div class="name">____________________</div>
    </div>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=800,height=900');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
};

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

        {/* Download PDF Button */}
        <div className="px-5 pb-2 pt-3 border-b border-[var(--border)] flex gap-2">
          <button onClick={() => handlePrintSlip(item, run)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)] transition-colors">
            <Download className="w-4 h-4"/> Download PDF
          </button>
          <button onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
            <Printer className="w-4 h-4"/> Print
          </button>
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
  const [runs,          setRuns]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [disburseRun,   setDisburseRun]   = useState(null);
  const [filterType,    setType]          = useState('');
  const [showGenerate,  setShowGenerate]  = useState(false);
  const [selectedRun,   setSelectedRun]   = useState(null);
  const [runItems,      setRunItems]      = useState([]);
  const [selectedSlip,  setSelectedSlip]  = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [flipStatuses,  setFlipStatuses]  = useState({}); // runId -> {allDone, anyFailed, anyDone}

  const API  = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
  const authH = { Authorization: 'Bearer ' + localStorage.getItem('accessToken') };

  const loadFlipStatus = useCallback(async (approvedRuns) => {
    const statuses = {};
    await Promise.all(approvedRuns.map(async (run) => {
      try {
        const r = await window.fetch(`${API}/flip/status/${run.id}`, { headers: authH });
        const d = await r.json();
        const items = d.data?.items || [];
        statuses[run.id] = {
          allDone:  items.length > 0 && items.every(i => i.flip_status === 'DONE'),
          anyDone:  items.some(i => i.flip_status === 'DONE'),
          anyFailed:items.some(i => i.flip_status === 'FAILED'),
          noneStarted: items.every(i => !i.flip_status || i.flip_status === 'NONE'),
        };
      } catch { statuses[run.id] = { allDone:false, anyDone:false, anyFailed:false, noneStarted:true }; }
    }));
    setFlipStatuses(statuses);
  }, []);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollEngineService.getRuns({ type: filterType || undefined, year: currentYear() });
      const allRuns = res.data.data.runs;
      setRuns(allRuns);
      // Load flip status for approved runs
      const approved = allRuns.filter(r => r.status === 'approved');
      if (approved.length) loadFlipStatus(approved);
    } catch { toast.error('Gagal memuat payroll'); } finally { setLoading(false); }
  }, [filterType, loadFlipStatus]);

  // Keep 'fetch' alias for compatibility with existing code
  const fetch2 = loadRuns;

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const openRun = async (run) => {
    setSelectedRun(run);
    try {
      const res = await payrollEngineService.getRunDetail(run.id, { limit: 100 });
      setRunItems(res.data.data.items);
    } catch { toast.error('Gagal memuat detail'); }
  };

  const handleApprove = async (id) => {
    setActionLoading(id + '-approve');
    try { await payrollEngineService.approveRun(id); toast.success('Payroll disetujui'); loadRuns(); }
    catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setActionLoading(null); }
  };

  const handlePay = async (id) => {
    setActionLoading(id + '-pay');
    try { await payrollEngineService.markPaid(id); toast.success('Payroll ditandai dibayar!'); loadRuns(); }
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
                  {run.status === 'approved' && (() => {
                    const fs = flipStatuses[run.id] || {};
                    // Flip sudah diproses (ada yang done/pending) — bukan gagal semua
                    const flipStarted   = fs.anyDone || (!fs.noneStarted && !fs.anyFailed);
                    const flipAllDone   = fs.allDone;
                    const flipHasFailed = fs.anyFailed && !fs.anyDone;
                    // Manual bayar: disable jika flip sudah jalan & tidak semua gagal
                    const manualDisabled = flipStarted && !flipHasFailed;

                    return (
                      <>
                        <button onClick={() => setDisburseRun(run)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-colors
                            ${flipAllDone
                              ? 'bg-emerald-500 hover:bg-emerald-600'
                              : flipStarted
                                ? 'bg-indigo-500 hover:bg-indigo-600'
                                : 'bg-blue-600 hover:bg-blue-700'}`}>
                          <Banknote className="w-3.5 h-3.5" />
                          {flipAllDone ? '✅ Lihat Status Transfer' : flipStarted ? '🔄 Lihat Status Transfer' : 'Transfer Flip'}
                        </button>
                        <button
                          onClick={() => handlePay(run.id)}
                          disabled={manualDisabled || actionLoading === run.id+'-pay'}
                          title={manualDisabled ? 'Sudah diproses via Flip' : 'Tandai bayar manual'}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors
                            ${manualDisabled
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
                          {actionLoading === run.id+'-pay' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                          {manualDisabled ? '🔒 Bayar Manual' : 'Bayar Manual'}
                        </button>
                      </>
                    );
                  })()}
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

      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} onSuccess={loadRuns} existingRuns={runs} />}
      {selectedSlip && <SlipModal itemId={selectedSlip} onClose={() => setSelectedSlip(null)} />}
      {disburseRun && (
        <DisburseModal
          run={disburseRun}
          onClose={() => setDisburseRun(null)}
          onSuccess={() => { setDisburseRun(null); loadRuns(); }}
        />
      )}
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
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [selectedSlip,setSelectedSlip]= useState(null);
  const [filterType,  setFilterType]  = useState('');
  // PIN gate
  const [unlocked,    setUnlocked]    = useState(false);
  const [pin,         setPin]         = useState('');
  const [pinError,    setPinError]    = useState('');
  const [pinLoading,  setPinLoading]  = useState(false);
  const [showPin,     setShowPin]     = useState(false);

  const handleUnlock = async () => {
    if (!pin) { setPinError('Masukkan password'); return; }
    setPinLoading(true);
    setPinError('');
    try {
      const API = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
      const r = await fetch(`${API}/auth/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:'Bearer '+localStorage.getItem('accessToken') },
        body: JSON.stringify({ password: pin }),
      });
      const d = await r.json();
      if (d.success) {
        setUnlocked(true);
        setPin('');
        // Auto-lock after 5 minutes
        setTimeout(() => setUnlocked(false), 5 * 60 * 1000);
      } else {
        setPinError('Password salah. Coba lagi.');
        setPin('');
      }
    } catch { setPinError('Gagal verifikasi. Coba lagi.'); }
    finally { setPinLoading(false); }
  };

  const loadSlips = useCallback(async () => {
    if (!unlocked) return;
    setLoading(true);
    try {
      const res = await payrollEngineService.getMy({ type: filterType || undefined });
      setItems(res.data.data.items);
    } catch { toast.error('Gagal memuat slip'); } finally { setLoading(false); }
  }, [filterType, unlocked]);

  useEffect(() => { loadSlips(); }, [loadSlips]);

  const yearTotal = items.filter(i => i.run?.period_year === currentYear()).reduce((s,i) => s + parseFloat(i.net_salary || 0), 0);

  if (!unlocked) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="table-wrapper p-8 text-center w-full max-w-xs">
        {/* Lock icon */}
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h3 className="font-bold text-base text-[var(--text-primary)] mb-1">Data Gaji Terkunci</h3>
        <p className="text-xs text-[var(--text-muted)] mb-5">
          Masukkan password akun kamu untuk melihat slip gaji
        </p>
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={e => { setPin(e.target.value); setPinError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              placeholder="Password"
              autoFocus
              className="input-base text-sm text-center tracking-widest w-full pr-10"
            />
            <button
              onClick={() => setShowPin(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {showPin ? '🙈' : '👁️'}
            </button>
          </div>
          {pinError && (
            <p className="text-xs text-red-500 font-semibold">{pinError}</p>
          )}
          <button
            onClick={handleUnlock}
            disabled={pinLoading || !pin}
            className="btn-primary w-full h-11 text-sm disabled:opacity-60 gap-2">
            {pinLoading
              ? <><Loader2 className="w-4 h-4 animate-spin"/> Memverifikasi...</>
              : '🔓 Buka Slip Gaji'}
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-4">
          Slip akan terkunci otomatis setelah 5 menit
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Lock button */}
      <div className="flex items-center justify-between">
        <div className="card-sm flex-1 mr-3">
          <p className="text-xs text-[var(--text-muted)] font-medium">Total Penghasilan {currentYear()}</p>
          <p className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">{toRupiahShort(yearTotal)}</p>
        </div>
        <button onClick={() => setUnlocked(false)}
          title="Kunci data gaji"
          className="w-10 h-10 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] flex-shrink-0">
          🔒
        </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 space-y-4">
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
        </div>
      )}
    </div>
  );
};


// ════════════════════════════════════════════════════════════════
// TAB: LAPORAN PAYROLL BULANAN
// ════════════════════════════════════════════════════════════════
const PayrollReportTab = () => {
  const [runs,    setRuns]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [selRun,  setSelRun]  = useState(null);
  const [detail,  setDetail]  = useState(null);
  const [loadDet, setLoadDet] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    payrollEngineService.getRuns({ limit: 50 })
      .then(r => {
        const all = r.data.data?.runs || [];
        setRuns(all.filter(r => r.status === 'paid' || r.status === 'approved'));
        if (all.length) setSelRun(all[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selRun) return;
    setLoadDet(true);
    payrollEngineService.getRunDetail(selRun, { limit: 200 })
      .then(r => setDetail(r.data.data))
      .catch(() => toast.error('Gagal memuat detail'))
      .finally(() => setLoadDet(false));
  }, [selRun]);

  const handleExport = () => {
    if (!detail) return;
    const run   = detail.run;
    const items = detail.items || [];
    const toRp  = (n) => `Rp ${Number(n||0).toLocaleString('id-ID')}`;

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"/>
<title>Laporan Payroll - ${run?.period_label}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:10px; padding:20px; color:#111; }
  h1 { font-size:16px; font-weight:900; margin-bottom:2px; }
  .sub { color:#666; font-size:10px; margin-bottom:16px; }
  .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
  .sum-box { border:1px solid #e0e0e0; border-radius:6px; padding:10px; text-align:center; }
  .sum-box .num { font-size:16px; font-weight:900; }
  .sum-box .lbl { font-size:9px; color:#888; }
  table { width:100%; border-collapse:collapse; }
  th { background:#f1f5f9; padding:7px 8px; text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; border-bottom:2px solid #e2e8f0; }
  td { padding:6px 8px; border-bottom:1px solid #f1f5f9; font-size:10px; }
  tr:last-child td { border-bottom:none; }
  .num-col { text-align:right; font-weight:600; }
  .total-row td { font-weight:700; background:#f8fafc; border-top:2px solid #1a1a1a; }
  @media print { body { padding:12px; } }
</style></head>
<body>
<h1>LAPORAN PAYROLL — ${run?.period_label?.toUpperCase()}</h1>
<div class="sub">GPDISTRO RACING ID · Dicetak: ${new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</div>
<div class="summary">
  <div class="sum-box"><div class="num" style="color:#2563eb">${items.length}</div><div class="lbl">Karyawan</div></div>
  <div class="sum-box"><div class="num" style="color:#16a34a">${toRp(items.reduce((s,i)=>s+Number(i.total_income||0),0))}</div><div class="lbl">Total Pendapatan</div></div>
  <div class="sum-box"><div class="num" style="color:#dc2626">${toRp(items.reduce((s,i)=>s+Number(i.total_deductions||0),0))}</div><div class="lbl">Total Potongan</div></div>
  <div class="sum-box"><div class="num" style="color:#16a34a">${toRp(items.reduce((s,i)=>s+Number(i.net_salary||0),0))}</div><div class="lbl">Total Gaji Bersih</div></div>
</div>
<table>
  <thead>
    <tr>
      <th>#</th><th>Nama Karyawan</th><th>Jabatan</th><th>Departemen</th>
      <th class="num-col">Gaji Pokok</th><th class="num-col">Total Pendapatan</th>
      <th class="num-col">Total Potongan</th><th class="num-col">Take Home Pay</th>
      <th>Hadir</th><th>Alpha</th><th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${items.map((item,i) => `
    <tr>
      <td>${i+1}</td>
      <td>${item.employee_name}</td>
      <td>${item.employee_position||'—'}</td>
      <td>${item.employee_department||'—'}</td>
      <td class="num-col">${toRp(item.base_salary)}</td>
      <td class="num-col">${toRp(item.total_income)}</td>
      <td class="num-col" style="color:#dc2626">-${toRp(item.total_deductions)}</td>
      <td class="num-col" style="color:#16a34a;font-weight:900">${toRp(item.net_salary)}</td>
      <td style="text-align:center">${item.present_days||0}</td>
      <td style="text-align:center;color:#dc2626">${item.alpha_days||0}</td>
      <td><span style="background:${item.flip_status==='DONE'?'#dcfce7':'#f1f5f9'};color:${item.flip_status==='DONE'?'#16a34a':'#64748b'};padding:2px 6px;border-radius:100px;font-size:9px;font-weight:700">${item.flip_status==='DONE'?'Ditransfer':'Pending'}</span></td>
    </tr>`).join('')}
    <tr class="total-row">
      <td colspan="4"><strong>TOTAL</strong></td>
      <td class="num-col">${toRp(items.reduce((s,i)=>s+Number(i.base_salary||0),0))}</td>
      <td class="num-col">${toRp(items.reduce((s,i)=>s+Number(i.total_income||0),0))}</td>
      <td class="num-col" style="color:#dc2626">-${toRp(items.reduce((s,i)=>s+Number(i.total_deductions||0),0))}</td>
      <td class="num-col" style="color:#16a34a">${toRp(items.reduce((s,i)=>s+Number(i.net_salary||0),0))}</td>
      <td></td><td></td><td></td>
    </tr>
  </tbody>
</table>
</body></html>`;
    const w = window.open('', '_blank', 'width=1100,height=800');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const run   = detail?.run;
  const items = detail?.items || [];
  const totIncome = items.reduce((s,i) => s + Number(i.total_income||0), 0);
  const totDeduct = items.reduce((s,i) => s + Number(i.total_deductions||0), 0);
  const totNet    = items.reduce((s,i) => s + Number(i.net_salary||0), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan Payroll</h1>
          <p className="page-subtitle">Breakdown komponen gaji per periode</p>
        </div>
        {detail && (
          <button onClick={handleExport}
            className="btn-primary gap-2">
            <Printer className="w-4 h-4"/> Cetak / Export PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {/* Run selector */}
        <div className="table-wrapper p-4">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Pilih Periode</p>
          {loading ? <div className="skeleton h-8 rounded-lg"/> : (
            <select value={selRun||''} onChange={e => setSelRun(e.target.value)}
              className="input-base text-sm w-full">
              {runs.map(r => (
                <option key={r.id} value={r.id}>{r.period_label} — {RUN_TYPES[r.type]?.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Summary cards */}
        {[
          { l:'Karyawan', v: items.length, c:'text-blue-600', icon:'👥' },
          { l:'Total Pendapatan', v: toRupiah(totIncome), c:'text-emerald-600', icon:'💰' },
          { l:'Total Potongan',   v: toRupiah(totDeduct), c:'text-red-500',     icon:'✂️' },
          { l:'Take Home Pay',    v: toRupiah(totNet),    c:'text-emerald-700', icon:'🏦' },
        ].map(({ l, v, c, icon }) => (
          <div key={l} className="table-wrapper p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">{icon} {l}</p>
            <p className={`text-lg font-black ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Detail table */}
      <div className="table-wrapper overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
            {run ? `${run.period_label} · ${items.length} karyawan` : 'Pilih periode'}
          </p>
        </div>
        {loadDet ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[var(--brand-500)]"/></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                  {['#','Karyawan','Jabatan','Dept','Gaji Pokok','Tunjangan','Potongan','Take Home Pay','Hadir','Alpha','Status'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-bold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.map((item, i) => (
                  <tr key={item.id} className="hover:bg-[var(--bg-secondary)]/40">
                    <td className="px-3 py-2.5 text-[var(--text-muted)]">{i+1}</td>
                    <td className="px-3 py-2.5 font-semibold">{item.employee_name}</td>
                    <td className="px-3 py-2.5 text-[var(--text-muted)]">{item.employee_position||'—'}</td>
                    <td className="px-3 py-2.5 text-[var(--text-muted)]">{item.employee_department||'—'}</td>
                    <td className="px-3 py-2.5 text-right">{toRupiah(item.base_salary)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600">+{toRupiah(item.total_income)}</td>
                    <td className="px-3 py-2.5 text-right text-red-500">-{toRupiah(item.total_deductions)}</td>
                    <td className="px-3 py-2.5 text-right font-black text-emerald-700">{toRupiah(item.net_salary)}</td>
                    <td className="px-3 py-2.5 text-center">{item.present_days||0}</td>
                    <td className="px-3 py-2.5 text-center text-red-500">{item.alpha_days||0}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.flip_status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.flip_status === 'DONE' ? 'Ditransfer' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
                {items.length > 0 && (
                  <tr className="border-t-2 border-[var(--border)] font-bold bg-[var(--bg)]">
                    <td colSpan={4} className="px-3 py-3 text-xs font-bold uppercase tracking-wide">TOTAL</td>
                    <td className="px-3 py-3 text-right">{toRupiah(items.reduce((s,i)=>s+Number(i.base_salary||0),0))}</td>
                    <td className="px-3 py-3 text-right text-emerald-600">+{toRupiah(totIncome)}</td>
                    <td className="px-3 py-3 text-right text-red-500">-{toRupiah(totDeduct)}</td>
                    <td className="px-3 py-3 text-right text-emerald-700 text-sm">{toRupiah(totNet)}</td>
                    <td colSpan={3}/>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// TAB: PAYROLL HISTORY PER KARYAWAN
// ════════════════════════════════════════════════════════════════
const PayrollHistoryTab = () => {
  const [employees, setEmployees] = useState([]);
  const [selEmp,    setSelEmp]    = useState('');
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [selSlip,   setSelSlip]   = useState(null);

  useEffect(() => {
    // Get all runs then extract unique employees
    payrollEngineService.getRuns({ limit: 100 }).then(r => {
      const runs = r.data.data?.runs || [];
      // Get first run detail to extract employee list
      if (runs.length) {
        payrollEngineService.getRunDetail(runs[0].id, { limit: 200 }).then(rd => {
          const emps = (rd.data.data?.items || []).map(i => ({
            id: i.user_id, name: i.employee_name, dept: i.employee_department,
          }));
          setEmployees(emps);
          if (emps.length) setSelEmp(String(emps[0].id));
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!selEmp) return;
    setLoading(true);
    // Get all runs and filter items for this employee
    payrollEngineService.getRuns({ limit: 100 }).then(async r => {
      const runs = r.data.data?.runs || [];
      const items = [];
      for (const run of runs.slice(0, 24)) { // last 24 periods
        try {
          const rd = await payrollEngineService.getRunDetail(run.id, { limit: 200 });
          const emp = (rd.data.data?.items || []).find(i => String(i.user_id) === selEmp);
          if (emp) items.push({ ...emp, run });
        } catch {}
      }
      setHistory(items);
    }).finally(() => setLoading(false));
  }, [selEmp]);

  const totalNet = history.reduce((s, i) => s + Number(i.net_salary||0), 0);
  const avgNet   = history.length ? totalNet / history.length : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">History Payroll</h1>
          <p className="page-subtitle">Riwayat gaji per karyawan</p>
        </div>
      </div>

      {/* Employee selector */}
      <div className="table-wrapper p-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-sm">
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Karyawan</label>
            <select value={selEmp} onChange={e => setSelEmp(e.target.value)} className="input-base text-sm w-full">
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.dept}</option>)}
            </select>
          </div>
          {history.length > 0 && (
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <p className="font-black text-blue-600">{history.length}x</p>
                <p className="text-[10px] text-[var(--text-muted)]">Periode</p>
              </div>
              <div className="text-center">
                <p className="font-black text-emerald-600">{toRupiah(totalNet)}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Total Gaji</p>
              </div>
              <div className="text-center">
                <p className="font-black text-[var(--brand-600)]">{toRupiah(avgNet)}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Rata-rata/Bulan</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History table */}
      <div className="table-wrapper overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[var(--brand-500)]"/></div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-30"/>
            <p className="text-sm text-[var(--text-muted)]">Belum ada riwayat gaji</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                  {['Periode','Tipe','Hadir','Telat','Alpha','Gaji Pokok','Tunjangan','Potongan','Take Home Pay','Status',''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-bold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {history.map((item) => {
                  const rt = RUN_TYPES[item.run?.type] || RUN_TYPES.monthly;
                  return (
                    <tr key={item.id} className="hover:bg-[var(--bg-secondary)]/40">
                      <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{item.run?.period_label}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px]">{rt.icon} {rt.label}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">{item.present_days||0}</td>
                      <td className="px-3 py-2.5 text-center text-amber-600">{item.late_count||0}</td>
                      <td className="px-3 py-2.5 text-center text-red-500">{item.alpha_days||0}</td>
                      <td className="px-3 py-2.5 text-right">{toRupiah(item.base_salary)}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-600">+{toRupiah(item.total_income)}</td>
                      <td className="px-3 py-2.5 text-right text-red-500">-{toRupiah(item.total_deductions)}</td>
                      <td className="px-3 py-2.5 text-right font-black text-emerald-700">{toRupiah(item.net_salary)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.run?.status === 'paid' ? 'bg-green-100 text-green-700' :
                          item.run?.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {RUN_STATUS[item.run?.status]?.label || item.run?.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => setSelSlip(item.id)}
                          className="text-[10px] text-[var(--brand-600)] hover:underline font-semibold">
                          Lihat Slip
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selSlip && <SlipModal itemId={selSlip} onClose={() => setSelSlip(null)} />}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
const TABS_HR = [
  { id:'runs',       label:'Payroll',      icon:DollarSign },
  { id:'payment',    label:'Pembayaran',   icon:Banknote },
  { id:'report',     label:'Laporan',      icon:BarChart3 },
  { id:'history',    label:'History',      icon:Clock },
  { id:'myslip',     label:'Slip Saya',    icon:FileText },
  { id:'loan',       label:'Kasbon',       icon:Wallet },
  { id:'components', label:'Komponen',     icon:Settings },
  { id:'settings',   label:'Pengaturan',   icon:Settings },
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

  const API = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
  const token = () => localStorage.getItem('accessToken');

  useEffect(() => {
    Promise.all([
      payrollEngineService.getSettings(),
      fetch(`${API}/attendance/office/settings`, { headers: { Authorization: 'Bearer ' + token() } }).then(r => r.json()),
    ]).then(([pr, or]) => {
      const s = pr.data.data.settings;
      setSettings(s);
      setForm({
        late_deduction_amount:  s.late_deduction_amount  || 0,
        late_tolerance_minutes: s.late_tolerance_minutes || 0,
        alpha_deduction_type:   s.alpha_deduction_type   || 'per_day_salary',
        alpha_flat_amount:      s.alpha_flat_amount      || 0,
        bpjs_enabled:           s.bpjs_enabled           !== false,
        pph21_enabled:          s.pph21_enabled          || false,
        pph21_rate:             s.pph21_rate             || 5,
        // Office settings
        office_name:            or.data?.name            || 'Kantor',
        check_in_start:         or.data?.check_in_start  || '06:00',
        check_in_deadline:      or.data?.check_in_deadline || '08:05',
        check_out_start:        or.data?.check_out_start || '15:00',
        work_hours_required:    or.data?.work_hours_required || 8,
        radius:                 or.data?.radius          || 100,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save payroll settings
      await payrollEngineService.updateSettings({
        late_deduction_amount:  form.late_deduction_amount,
        late_tolerance_minutes: form.late_tolerance_minutes,
        alpha_deduction_type:   form.alpha_deduction_type,
        alpha_flat_amount:      form.alpha_flat_amount,
        bpjs_enabled:           form.bpjs_enabled,
        pph21_enabled:          form.pph21_enabled,
        pph21_rate:             form.pph21_rate,
      });
      // Save office settings
      await fetch(`${API}/attendance/office/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify({
          name:                form.office_name,
          check_in_start:      form.check_in_start,
          check_in_deadline:   form.check_in_deadline,
          check_out_start:     form.check_out_start,
          work_hours_required: parseFloat(form.work_hours_required),
          radius:              parseInt(form.radius),
        }),
      });
      toast.success('Pengaturan disimpan');
    } catch(e) {
      toast.error(e.response?.data?.message || e.message || 'Gagal menyimpan');
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

      {/* ── Jam Kerja & Kehadiran ── */}
      <Section title="🏢 Jam Kerja & Aturan Kehadiran">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Jam Mulai Check-In" hint="Jam paling awal karyawan bisa check-in">
            <input type="time" value={form.check_in_start}
              onChange={e => sf('check_in_start', e.target.value)}
              className="input-base text-sm" />
          </Field>
          <Field label="Batas Tepat Waktu (Deadline)" hint="Lewat jam ini dianggap terlambat">
            <input type="time" value={form.check_in_deadline}
              onChange={e => sf('check_in_deadline', e.target.value)}
              className="input-base text-sm" />
          </Field>
          <Field label="Jam Minimal Check-Out" hint="Jam paling awal karyawan bisa check-out">
            <input type="time" value={form.check_out_start}
              onChange={e => sf('check_out_start', e.target.value)}
              className="input-base text-sm" />
          </Field>
          <Field label="Jam Kerja Wajib per Hari" hint="Minimal jam kerja agar dianggap hadir penuh">
            <div className="flex items-center gap-2">
              <input type="number" min="1" max="12" step="0.5" value={form.work_hours_required}
                onChange={e => sf('work_hours_required', parseFloat(e.target.value)||8)}
                className="input-base text-sm w-24" />
              <span className="text-sm text-[var(--text-muted)]">jam</span>
            </div>
          </Field>
          <Field label="Radius Lokasi (meter)" hint="Jarak maksimal dari kantor agar check-in valid">
            <div className="flex items-center gap-2">
              <input type="number" min="10" max="5000" value={form.radius}
                onChange={e => sf('radius', parseInt(e.target.value)||100)}
                className="input-base text-sm w-24" />
              <span className="text-sm text-[var(--text-muted)]">meter</span>
            </div>
          </Field>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
          <strong>Contoh:</strong> Deadline <strong>08:05</strong> + Toleransi <strong>0 menit</strong> → karyawan yang check-in jam 08:06 dianggap terlambat.
          Deadline <strong>08:00</strong> + Toleransi <strong>15 menit</strong> → karyawan masih dianggap tepat waktu sampai jam 08:15.
        </div>
      </Section>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="btn-primary h-11 px-8 text-sm gap-2 disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
        {saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
      </button>
    </div>
  );
};




// ── IncentiveDisburseModal (inline untuk PaymentPortalTab) ────
const IncentiveDisburseModal = ({ period, onClose, onSuccess }) => {
  const [statusItems,  setStatusItems]  = useState([]);
  const [balanceInfo,  setBalanceInfo]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [transferring, setTransferring] = useState(false);

  const API  = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
  const authH = { Authorization: 'Bearer ' + localStorage.getItem('accessToken') };

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, balRes] = await Promise.all([
        window.fetch(`${API}/incentive/periods/${period.id}/disburse-status`, { headers: authH }).then(r=>r.json()),
        window.fetch(`${API}/flip/balance`, { headers: authH }).then(r=>r.json()).catch(()=>null),
      ]);
      setStatusItems(statusRes.data?.items || []);
      const totalNeeded = (statusRes.data?.items||[])
        .filter(i=>i.flip_status!=='DONE')
        .reduce((s,i)=>s+parseFloat(i.net_salary||0),0);
      const bal = balRes?.data?.balance || 0;
      setBalanceInfo({ current_balance: bal, total_needed: totalNeeded, sufficient: bal >= totalNeeded });
    } catch { toast.error('Gagal memuat status'); }
    finally { setLoading(false); }
  }, [period.id]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleTransfer = async () => {
    setTransferring(true);
    try {
      const r = await window.fetch(`${API}/incentive/periods/${period.id}/disburse`, {
        method: 'POST', headers: authH,
      });
      const d = await r.json();
      await loadStatus();
      if (d.success) {
        if (d.data?.failed > 0) toast.error(`${d.data.failed} transfer gagal`);
        else { toast.success('Transfer insentif selesai'); onSuccess(); }
      } else toast.error(d.message);
    } catch { toast.error('Gagal transfer'); }
    finally { setTransferring(false); }
  };

  const pendingItems = statusItems.filter(i => i.flip_status !== 'DONE');
  const bi = balanceInfo;
  const STATUS_STYLE = { NONE:'bg-gray-100 text-gray-500', PENDING:'bg-yellow-100 text-yellow-700', DONE:'bg-green-100 text-green-700', FAILED:'bg-red-100 text-red-600' };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[var(--bg-card)] w-full max-w-2xl my-6 rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">🚀</div>
            <div>
              <h2 className="font-bold text-base">Transfer Insentif via Flip</h2>
              <p className="text-xs text-[var(--text-muted)]">{period.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg)]">
            <X className="w-4 h-4"/>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500"/></div>
          ) : (
            <>
              {/* Balance */}
              <div className={`rounded-2xl border-2 p-4 ${bi?.sufficient ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">
                      {bi?.sufficient ? '✅ Saldo Mencukupi' : '⚠️ Saldo Tidak Mencukupi'}
                    </p>
                    <p className={`text-2xl font-black ${bi?.sufficient ? 'text-emerald-700' : 'text-red-700'}`}>
                      {toRupiah(bi?.current_balance||0)}
                    </p>
                  </div>
                  <button onClick={loadStatus} className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center">
                    <RefreshCw className="w-3.5 h-3.5"/>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/70 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-[var(--text-muted)]">Dibutuhkan</p>
                    <p className="font-bold text-sm">{toRupiah(bi?.total_needed||0)}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 text-center ${bi?.sufficient ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <p className="text-[10px] text-[var(--text-muted)]">{bi?.sufficient ? 'Sisa' : 'Kurang'}</p>
                    <p className={`font-bold text-sm ${bi?.sufficient ? 'text-emerald-700' : 'text-red-600'}`}>
                      {toRupiah(Math.abs((bi?.current_balance||0)-(bi?.total_needed||0)))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Employee list */}
              <div className="border border-[var(--border)] rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
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
                        <td className="px-3 py-2 font-mono text-[var(--text-secondary)] text-[10px]">
                          {item.bank_code ? `${item.bank_code.toUpperCase()} ···${item.bank_account_number?.slice(-4)}` : <span className="text-red-400">⚠ Belum diisi</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{toRupiah(item.net_salary)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[item.flip_status]||STATUS_STYLE.NONE}`}>
                            {item.flip_status||'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg)] border-t border-[var(--border)]">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]">Tutup</button>
          <button onClick={handleTransfer} disabled={transferring || loading || pendingItems.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {transferring ? <Loader2 className="w-4 h-4 animate-spin"/> : <Banknote className="w-4 h-4"/>}
            {transferring ? 'Mentransfer...' : pendingItems.length > 0 ? `Transfer ${pendingItems.length} Karyawan · ${toRupiahShort(bi?.total_needed||0)}` : '✅ Semua Sudah Ditransfer'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// PAYMENT PORTAL TAB — 1 Portal untuk semua tipe pembayaran
// ════════════════════════════════════════════════════════════════
const PaymentPortalTab = () => {
  const [runs,       setRuns]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [balance,    setBalance]    = useState(null);
  const [disburse,   setDisburse]   = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const API = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
  const authH = { Authorization: 'Bearer ' + localStorage.getItem('accessToken') };

  const [incentivePeriods,    setIncentivePeriods]    = useState([]);
  const [disburseIncentive,  setDisburseIncentive]  = useState(null); // period to disburse

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [runsRes, balRes, incRes] = await Promise.all([
        payrollEngineService.getRuns({ year: filterYear, limit: 200 }),
        window.fetch(`${API}/flip/balance`, { headers: authH }).then(r=>r.json()).catch(()=>null),
        window.fetch(`${API}/incentive/periods?year=${filterYear}&limit=100`, { headers: authH }).then(r=>r.json()).catch(()=>null),
      ]);
      const allRuns = runsRes.data.data.runs || [];
      setRuns(allRuns.filter(r => ['approved','paid'].includes(r.status)));
      if (balRes?.data) setBalance(balRes.data.balance);
      // Incentive periods that are approved or locked
      const incPeriods = (incRes?.data?.periods || []).filter(p => ['approved','locked'].includes(p.status));
      setIncentivePeriods(incPeriods);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, [filterYear]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = filterType ? runs.filter(r => r.type === filterType) : runs;
  const readyToPay = filtered.filter(r => r.status === 'approved');
  const paid       = filtered.filter(r => r.status === 'paid');
  const totalPending = readyToPay.reduce((s,r) => s + parseFloat(r.total_net||0), 0);

  const TYPE_CONFIG = {
    monthly:   { icon:'💰', label:'Gaji Bulanan',   color:'bg-blue-100 text-blue-700',    border:'border-blue-400' },
    thr:       { icon:'🎊', label:'THR',             color:'bg-purple-100 text-purple-700', border:'border-purple-400' },
    bonus:     { icon:'🏆', label:'Bonus',           color:'bg-amber-100 text-amber-700',   border:'border-amber-400' },
    incentive: { icon:'🚀', label:'Insentif',        color:'bg-emerald-100 text-emerald-700', border:'border-emerald-400' },
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Balance card */}
      <div className="table-wrapper p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Saldo Flip</p>
            <p className={`text-2xl font-black ${balance === null ? 'text-[var(--text-muted)]' : balance >= totalPending ? 'text-emerald-600' : 'text-red-500'}`}>
              {balance === null ? '—' : toRupiahShort(balance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Total menunggu pembayaran</p>
            <p className="text-lg font-bold text-[var(--brand-600)]">{toRupiahShort(totalPending)}</p>
            {balance !== null && totalPending > 0 && (
              <p className={`text-xs font-semibold mt-0.5 ${balance >= totalPending ? 'text-emerald-600' : 'text-red-500'}`}>
                {balance >= totalPending ? `✅ Saldo cukup (+${toRupiahShort(balance - totalPending)})` : `⚠️ Kurang ${toRupiahShort(totalPending - balance)}`}
              </p>
            )}
          </div>
          <button onClick={loadData} className="btn-icon" title="Refresh">
            <RefreshCw size={15}/>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterYear} onChange={e=>setFilterYear(parseInt(e.target.value))}
          className="input-base h-9 text-sm w-24">
          {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        <div className="flex gap-1.5 flex-wrap">
          {[{v:'',l:'Semua'},{v:'monthly',l:'💰 Gaji'},{v:'thr',l:'🎊 THR'},{v:'bonus',l:'🏆 Bonus'},{v:'incentive',l:'🚀 Insentif'}].map(t=>(
            <button key={t.v} onClick={()=>setFilterType(t.v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                ${filterType===t.v ? 'bg-[var(--brand-600)] text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="skeleton h-24 rounded-2xl"/>)}</div>
      ) : (
        <>
          {/* Ready to pay */}
          {readyToPay.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"/>
                <p className="text-sm font-bold text-[var(--text-primary)]">Menunggu Pembayaran ({readyToPay.length})</p>
              </div>
              {readyToPay.map(run => {
                const tc = TYPE_CONFIG[run.type] || TYPE_CONFIG.monthly;
                return (
                  <div key={run.id} className={`table-wrapper border-l-4 ${tc.border}`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-xl flex-shrink-0">
                            {tc.icon}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{run.period_label}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tc.color}`}>
                                {tc.label}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {run.total_employees} karyawan
                              </span>
                              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                                ⏳ Menunggu Transfer
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-black text-[var(--brand-600)]">{toRupiahShort(run.total_net)}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">Total bersih</p>
                        </div>
                      </div>

                      {/* Breakdown */}
                      <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
                        {[
                          {l:'Pendapatan', v:toRupiahShort(run.total_gross),      c:'text-emerald-600'},
                          {l:'Potongan',   v:toRupiahShort(run.total_deductions), c:'text-red-500'},
                          {l:'Bersih',     v:toRupiahShort(run.total_net),        c:'text-[var(--brand-600)]'},
                        ].map(s=>(
                          <div key={s.l} className="bg-[var(--bg-secondary)] rounded-xl py-2 text-center">
                            <p className={`text-xs font-bold ${s.c}`}>{s.v}</p>
                            <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">{s.l}</p>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDisburse(run)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                          <Banknote size={14}/>
                          Transfer via Flip
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await payrollEngineService.markPaid(run.id);
                              toast.success('Ditandai dibayar manual');
                              loadData();
                            } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); }
                          }}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
                          <CreditCard size={13}/> Manual
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Already paid */}
          {paid.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-[var(--text-muted)] flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500"/>
                Sudah Dibayar ({paid.length})
              </p>
              <div className="table-wrapper overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                      {['Periode','Tipe','Karyawan','Total Bersih','Tgl Bayar','Status'].map(h=>(
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paid.map(run=>{
                      const tc = TYPE_CONFIG[run.type]||TYPE_CONFIG.monthly;
                      return (
                        <tr key={run.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]">
                          <td className="px-4 py-3 font-semibold">{run.period_label}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tc.color}`}>
                              {tc.icon} {tc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">{run.total_employees} orang</td>
                          <td className="px-4 py-3 font-bold text-emerald-600">{toRupiahShort(run.total_net)}</td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                            {run.payment_date || run.paid_at?.split('T')[0] || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">
                              ✅ Dibayar
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filtered.length === 0 && incentivePeriods.length === 0 && (
            <div className="table-wrapper p-12 text-center">
              <Banknote size={40} className="mx-auto mb-3 text-[var(--text-muted)] opacity-30"/>
              <p className="font-semibold text-[var(--text-primary)]">Tidak ada pembayaran</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Generate dan approve payroll/insentif terlebih dahulu
              </p>
            </div>
          )}

          {/* Incentive periods ready to pay */}
          {incentivePeriods.length > 0 && (!filterType || filterType === 'incentive') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"/>
                <p className="text-sm font-bold text-[var(--text-primary)]">🚀 Insentif Menunggu Pembayaran ({incentivePeriods.length})</p>
              </div>
              {incentivePeriods.map(period => (
                <div key={period.id} className="table-wrapper border-l-4 border-emerald-400">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl flex-shrink-0">🚀</div>
                        <div>
                          <p className="font-bold text-sm">{period.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">Insentif</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${period.status==='locked'?'bg-gray-100 text-gray-600':'bg-amber-100 text-amber-700'}`}>
                              {period.status==='locked'?'🔒 Terkunci':'⏳ Approved'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-600">{toRupiahShort(period.total_incentive_paid||0)}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Total insentif</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDisburseIncentive(period)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                      <Banknote size={14}/> Transfer Insentif via Flip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {disburse && (
        <DisburseModal
          run={disburse}
          onClose={() => setDisburse(null)}
          onSuccess={() => { setDisburse(null); loadData(); }}
        />
      )}

      {disburseIncentive && (
        <IncentiveDisburseModal
          period={disburseIncentive}
          results={[]}
          onClose={() => setDisburseIncentive(null)}
          onSuccess={() => { setDisburseIncentive(null); loadData(); }}
        />
      )}
    </div>
  );
};

// ── Disburse Modal (Transfer Gaji via Flip) ───────────────────
const DisburseModal = ({ run, onClose, onSuccess }) => {
  const [step,         setStep]        = useState('check'); // check | confirm | transfer
  const [status,       setStatus]      = useState(null);
  const [balanceInfo,  setBalanceInfo] = useState(null);
  const [loadingCheck, setLoadingCheck]= useState(true);
  const [transferring, setTransferring]= useState(false);
  const [progress,     setProgress]    = useState({ done:0, total:0, current:'' });

  const API = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
  const authH = { Authorization: 'Bearer ' + localStorage.getItem('accessToken') };

  // Step 1: Load balance + status together
  const loadCheck = useCallback(async () => {
    setLoadingCheck(true);
    try {
      const [balRes, statusRes] = await Promise.all([
        window.fetch(`${API}/flip/balance/check/${run.id}`, { headers: authH }).then(r=>r.json()),
        flipService.getStatus(run.id).then(r=>r.data.data).catch(()=>null),
      ]);
      setBalanceInfo(balRes.data);
      setStatus(statusRes);
    } catch(e) { toast.error('Gagal memuat info saldo'); }
    finally { setLoadingCheck(false); }
  }, [run.id]);

  useEffect(() => { loadCheck(); }, [loadCheck]);

  const handleDisburse = async () => {
    setStep('transfer');
    setTransferring(true);
    const pending = (status?.items||[]).filter(i => i.flip_status !== 'DONE' && i.bank_code);
    setProgress({ done:0, total: pending.length, current:'' });
    try {
      const r = await flipService.disburseRun(run.id);
      const d = r.data;
      await loadCheck(); // Refresh balance + status
      if (d.data?.failed > 0) toast.error(`${d.data.failed} transfer gagal — cek detail`);
      else toast.success(d.message || 'Transfer selesai');
    } catch(e) {
      toast.error(e.response?.data?.message || 'Gagal transfer');
    } finally {
      setTransferring(false);
      // Stay on transfer step to show final status
    }
  };

  const handleRetry = async (itemId) => {
    try {
      await flipService.disburseItem(itemId);
      toast.success('Retry berhasil');
      loadCheck();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal retry'); }
  };

  const FLIP_STATUS_STYLE = {
    NONE:      'bg-gray-100 text-gray-500',
    PENDING:   'bg-yellow-100 text-yellow-700',
    DONE:      'bg-green-100 text-green-700',
    FAILED:    'bg-red-100 text-red-600',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };

  const summary = status?.summary;

  const bi = balanceInfo;
  const pendingItems = (status?.items||[]).filter(i => i.flip_status !== 'DONE');
  const doneItems    = (status?.items||[]).filter(i => i.flip_status === 'DONE');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[var(--bg-card)] w-full max-w-2xl my-6 rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Banknote size={20} className="text-blue-600"/>
            </div>
            <div>
              <h2 className="font-bold text-base">Transfer Gaji via Flip</h2>
              <p className="text-xs text-[var(--text-muted)]">{run.period_label} · {run.total_employees} karyawan</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Step indicator */}
            <div className="flex items-center gap-1 mr-2">
              {['check','confirm','transfer'].map((s,i) => (
                <div key={s} className={`w-2 h-2 rounded-full transition-colors ${
                  step===s ? 'bg-blue-600' : ['check','confirm','transfer'].indexOf(step) > i ? 'bg-blue-300' : 'bg-[var(--border)]'
                }`}/>
              ))}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg)]">
              <X size={18}/>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {loadingCheck ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500"/>
              <p className="text-sm text-[var(--text-muted)]">Mengecek saldo Flip...</p>
            </div>
          ) : (

            <>
              {/* ── STEP: CHECK BALANCE ── */}
              {(step === 'check' || step === 'confirm') && (
                <>
                  {/* Balance card */}
                  <div className={`rounded-2xl border-2 p-5 ${bi?.sufficient ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                          {bi?.sufficient ? '✅ Saldo Flip Mencukupi' : '⚠️ Saldo Flip Tidak Mencukupi'}
                        </p>
                        <p className={`text-2xl font-black ${bi?.sufficient ? 'text-emerald-700' : 'text-red-700'}`}>
                          {toRupiah(bi?.current_balance || 0)}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Saldo deposit Flip saat ini</p>
                      </div>
                      <button onClick={loadCheck}
                        className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-white/50">
                        <RefreshCw size={13}/>
                      </button>
                    </div>

                    {/* Balance breakdown */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/70 rounded-xl p-3 text-center">
                        <p className="text-xs text-[var(--text-muted)]">Dibutuhkan</p>
                        <p className="font-bold text-sm">{toRupiah(bi?.total_needed || 0)}</p>
                      </div>
                      <div className="bg-white/70 rounded-xl p-3 text-center">
                        <p className="text-xs text-[var(--text-muted)]">Sudah Transfer</p>
                        <p className="font-bold text-sm text-emerald-600">{toRupiah((bi?.current_balance||0) - Math.max(0,(bi?.total_needed||0)-(bi?.current_balance||0)))}</p>
                      </div>
                      <div className={`rounded-xl p-3 text-center ${bi?.sufficient ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        <p className="text-xs text-[var(--text-muted)]">{bi?.sufficient ? 'Sisa' : 'Kurang'}</p>
                        <p className={`font-bold text-sm ${bi?.sufficient ? 'text-emerald-700' : 'text-red-700'}`}>
                          {bi?.sufficient ? toRupiah((bi?.current_balance||0) - (bi?.total_needed||0)) : toRupiah(bi?.gap||0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Topup instruction if insufficient */}
                  {!bi?.sufficient && (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-bold text-amber-800">📋 Cara Topup Saldo Flip</p>
                      <ol className="text-xs text-amber-700 space-y-1.5 list-decimal list-inside">
                        <li>Login ke dashboard Flip for Business: <a href="https://business.flip.id" target="_blank" rel="noreferrer" className="underline font-semibold">business.flip.id</a></li>
                        <li>Menu <strong>Saldo</strong> → klik <strong>Tambah Saldo</strong></li>
                        <li>Transfer sejumlah <strong className="text-amber-900">{toRupiah(bi?.gap||0)}</strong> (atau lebih) ke virtual account Flip</li>
                        <li>Setelah saldo masuk, klik tombol <strong>Refresh</strong> di atas untuk update</li>
                      </ol>
                      <div className="mt-2 p-3 bg-amber-100 rounded-lg">
                        <p className="text-xs text-amber-800 font-semibold">
                          💡 Sandbox mode: saldo selalu terlihat 0. Topup tidak diperlukan untuk testing.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Transfer summary */}
                  <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center justify-between">
                      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">
                        Karyawan ({bi?.pending_items} akan ditransfer · {bi?.done_items} sudah)
                      </p>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                            <th className="px-3 py-2 text-left font-bold text-[var(--text-muted)] uppercase">Karyawan</th>
                            <th className="px-3 py-2 text-left font-bold text-[var(--text-muted)] uppercase">Bank</th>
                            <th className="px-3 py-2 text-right font-bold text-[var(--text-muted)] uppercase">Nominal</th>
                            <th className="px-3 py-2 text-center font-bold text-[var(--text-muted)] uppercase">Status</th>
                            <th className="px-3 py-2"/>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {(status?.items||[]).map(item => (
                            <tr key={item.id} className={`hover:bg-[var(--bg-secondary)] ${item.flip_status==='DONE'?'opacity-50':''}`}>
                              <td className="px-3 py-2 font-semibold">{item.employee_name}</td>
                              <td className="px-3 py-2">
                                {item.bank_code
                                  ? <span className="font-mono text-[var(--text-secondary)]">{item.bank_code.toUpperCase()} ···{item.bank_account_number?.slice(-4)}</span>
                                  : <span className="text-red-400 font-semibold">⚠ Rekening kosong</span>}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold">{toRupiah(item.net_salary)}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${FLIP_STATUS_STYLE[item.flip_status]||'bg-gray-100 text-gray-500'}`}>
                                  {item.flip_status||'PENDING'}
                                </span>
                                {item.flip_error && <p className="text-[9px] text-red-500 mt-0.5 truncate max-w-[100px]">{item.flip_error}</p>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {item.flip_status==='FAILED' && (
                                  <button onClick={()=>handleRetry(item.id)} className="text-[10px] text-blue-600 hover:underline font-bold">Retry</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP: TRANSFER IN PROGRESS ── */}
              {step === 'transfer' && (
                <div className="py-6 space-y-5">
                  <div className="text-center">
                    {transferring ? (
                      <>
                        <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-3"/>
                        <p className="font-bold">Sedang mentransfer gaji...</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Jangan tutup halaman ini</p>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3"/>
                        <p className="font-bold text-emerald-600">Proses transfer selesai!</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Cek status di bawah</p>
                      </>
                    )}
                  </div>
                  {/* Status summary */}
                  {summary && (
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        {label:'Total',   value:summary.total,   c:'slate'},
                        {label:'Sukses',  value:summary.done,    c:'green'},
                        {label:'Pending', value:summary.pending, c:'yellow'},
                        {label:'Gagal',   value:summary.failed,  c:'red'},
                      ].map(({label,value,c}) => (
                        <div key={label} className={`bg-${c}-50 border border-${c}-200 rounded-xl p-3 text-center`}>
                          <p className={`text-2xl font-bold text-${c}-700`}>{value}</p>
                          <p className={`text-xs text-${c}-600`}>{label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg)] border-t border-[var(--border)]">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            {step==='transfer' && !transferring ? 'Selesai' : 'Tutup'}
          </button>

          {step !== 'transfer' && (
            <div className="flex items-center gap-2">
              {!bi?.sufficient && (
                <a href="https://business.flip.id" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-xl hover:bg-amber-200 transition-colors">
                  <ExternalLink size={14}/> Topup di Flip
                </a>
              )}
              <button
                onClick={handleDisburse}
                disabled={transferring || !bi || pendingItems.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <Banknote size={15}/>
                {pendingItems.length > 0
                  ? `Transfer ${pendingItems.length} Karyawan · ${toRupiahShort(bi?.total_needed||0)}`
                  : '✅ Semua Sudah Ditransfer'}
              </button>
            </div>
          )}
        </div>
      </div>
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

      <div className="flex border-b border-[var(--border)] mb-5 overflow-x-auto scrollbar-none">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0
                ${active
                  ? 'border-[var(--brand-600)] text-[var(--brand-600)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'runs'       && <RunsTab />}
      {activeTab === 'payment'    && <PaymentPortalTab />}
      {activeTab === 'report'     && <PayrollReportTab />}
      {activeTab === 'history'    && <PayrollHistoryTab />}
      {activeTab === 'myslip'     && <MySlipTab />}
      {activeTab === 'loan'        && <LoanTab />}
      {activeTab === 'components' && <ComponentsTab />}
      {activeTab === 'settings'   && <PayrollSettingsTab />}

    </div>
  );
}
