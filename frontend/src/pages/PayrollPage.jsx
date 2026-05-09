import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, ChevronLeft, ChevronRight, RefreshCw,
  Loader2, AlertTriangle, CheckCircle2, Clock,
  Play, CreditCard, Users, TrendingUp, X,
  FileText, ChevronDown, Info, Printer,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  payrollService, toRupiah, toRupiahShort,
  monthLabel, currentMonth, prevMonth, nextMonth,
  PAYROLL_STATUS,
} from '../utils/payrollService';

// ── Status Badge ───────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = PAYROLL_STATUS[status] || PAYROLL_STATUS.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

// ── Slip Gaji Modal ────────────────────────────────────────────
const SlipModal = ({ payroll, onClose }) => {
  if (!payroll) return null;
  const d = payroll.details_json || {};
  const emp = d.employee || {};
  const att = d.attendance_summary || {};
  const allowItems  = d.allowance_items  || [];
  const deductItems = d.deduction_items  || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      <div
        className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl
          border border-[var(--border)] shadow-2xl animate-slide-up max-h-[95vh] overflow-y-auto scrollbar-thin"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--border2)]" />
        </div>

        {/* Slip header */}
        <div className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-800 dark:from-brand-700 dark:to-brand-900" />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          <div className="relative px-5 pt-5 pb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Slip Gaji</p>
                <p className="text-white font-black text-lg mt-0.5">{monthLabel(payroll.month)}</p>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center
                  text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Employee info */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-lg">{payroll.user?.name?.[0] || emp.name?.[0]}</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm">{payroll.user?.name || emp.name}</p>
                <p className="text-white/60 text-xs">{emp.position} · {emp.department}</p>
                <p className="text-white/50 text-xs font-mono mt-0.5">{emp.nip}</p>
              </div>
            </div>

            {/* Net salary hero */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Take Home Pay</p>
              <p className="text-white font-black text-3xl tracking-tight">
                {toRupiah(payroll.total_salary)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={payroll.status} />
                {payroll.paid_at && (
                  <span className="text-white/40 text-xs">
                    Dibayar {new Date(payroll.paid_at).toLocaleDateString('id-ID')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Slip body */}
        <div className="p-5 space-y-4">

          {/* Attendance summary */}
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Rekap Kehadiran
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Hadir',   value: att.present    || 0, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Telat',   value: att.late       || 0, color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Cuti',    value: att.leave      || 0, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Absen',   value: att.absent     || 0, color: 'text-red-600 dark:text-red-400' },
              ].map((s, i) => (
                <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-2.5 text-center">
                  <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gaji Pokok */}
          <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="bg-[var(--bg-secondary)] px-4 py-2.5 border-b border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Komponen Gaji</p>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {/* Base */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand-100 dark:bg-brand-950 flex items-center justify-center">
                    <Minus className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Gaji Pokok</span>
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)]">{toRupiah(payroll.salary_base)}</span>
              </div>

              {/* Allowances */}
              {allowItems.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      a.amount >= 0
                        ? 'bg-emerald-100 dark:bg-emerald-950'
                        : 'bg-red-100 dark:bg-red-950'
                    }`}>
                      {a.amount >= 0
                        ? <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        : <ArrowDownRight className="w-3 h-3 text-red-600 dark:text-red-400" />
                      }
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] font-medium">{a.name}</span>
                  </div>
                  <span className={`text-xs font-semibold ${
                    a.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {a.amount >= 0 ? '+' : ''}{toRupiah(a.amount)}
                  </span>
                </div>
              ))}

              {/* Gross subtotal */}
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)]">
                <span className="text-sm font-bold text-[var(--text-primary)]">Gaji Kotor</span>
                <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                  {toRupiah(d.gross_salary)}
                </span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="rounded-2xl border border-red-200 dark:border-red-900 overflow-hidden">
            <div className="bg-red-50 dark:bg-red-950 px-4 py-2.5 border-b border-red-200 dark:border-red-900">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Potongan</p>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {deductItems.map((d, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
                      <ArrowDownRight className="w-3 h-3 text-red-600 dark:text-red-400" />
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] font-medium">{d.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    -{toRupiah(d.amount)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-950">
                <span className="text-sm font-bold text-[var(--text-primary)]">Total Potongan</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  -{toRupiah(payroll.deductions)}
                </span>
              </div>
            </div>
          </div>

          {/* Take home */}
          <div className="rounded-2xl border-2 border-emerald-400 dark:border-emerald-600 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4 bg-emerald-50 dark:bg-emerald-950">
              <span className="font-black text-base text-[var(--text-primary)]">Take Home Pay</span>
              <span className="font-black text-base text-emerald-600 dark:text-emerald-400">
                {toRupiah(payroll.total_salary)}
              </span>
            </div>
          </div>

          {/* Print hint */}
          <p className="text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-1">
            <Printer className="w-3 h-3" /> Gunakan Ctrl+P untuk cetak slip
          </p>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ADMIN / HR TAB — Generate & manage payroll
// ═══════════════════════════════════════════════════════════════
const AdminTab = () => {
  const [month, setMonth]           = useState(currentMonth);
  const [payrolls, setPayrolls]     = useState([]);
  const [summary, setSummary]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [bulkPaying, setBulkPaying] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollService.getAll({ month });
      setPayrolls(res.data.data.payrolls);
      setSummary(res.data.data.summary);
    } catch { toast.error('Gagal memuat data payroll'); }
    finally   { setLoading(false); }
  }, [month]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await payrollService.generate({ month });
      const d   = res.data.data;
      toast.success(`✅ ${d.created.length} baru, ${d.updated.length} diperbarui`);
      if (d.errors.length > 0) toast.error(`⚠️ ${d.errors.length} gagal`);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generate gagal');
    } finally { setGenerating(false); }
  };

  const handleBulkPay = async () => {
    const processed = payrolls.filter(p => p.status === 'processed').length;
    if (!processed) { toast.error('Tidak ada payroll berstatus "Diproses"'); return; }
    if (!window.confirm(`Tandai ${processed} slip gaji sebagai DIBAYAR?`)) return;
    setBulkPaying(true);
    try {
      await payrollService.bulkPay(month);
      toast.success('Semua slip gaji berhasil ditandai dibayar!');
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal');
    } finally { setBulkPaying(false); }
  };

  const handleMarkPaid = async (id) => {
    try {
      await payrollService.markPaid(id);
      toast.success('Slip gaji ditandai dibayar');
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
  };

  const processedCount = payrolls.filter(p => p.status === 'processed').length;
  const paidCount      = payrolls.filter(p => p.status === 'paid').length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMonth(m => prevMonth(m))}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center
            text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all active:scale-95">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{monthLabel(month)}</h3>
          <p className="text-xs text-[var(--text-muted)]">{payrolls.length} karyawan</p>
        </div>
        <button onClick={() => setMonth(m => nextMonth(m))}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center
            text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all active:scale-95">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Total Gaji</p>
            <p className="text-lg font-black text-[var(--text-primary)]">
              {toRupiahShort(summary.total_gaji)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Potongan: {toRupiahShort(summary.total_potongan)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-[var(--text-secondary)] font-medium">{processedCount} proses</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-[var(--text-secondary)] font-medium">{paidCount} bayar</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={handleGenerate} disabled={generating}
          className="btn-primary h-11 text-sm">
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            : <><Play className="w-4 h-4" /> Generate</>}
        </button>
        <button onClick={handleBulkPay} disabled={bulkPaying || processedCount === 0}
          className="h-11 text-sm flex items-center justify-center gap-2 rounded-xl font-semibold
            bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-95
            disabled:opacity-40 disabled:cursor-not-allowed">
          {bulkPaying
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
            : <><CreditCard className="w-4 h-4" /> Bayar Semua ({processedCount})</>}
        </button>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
        <Info className="w-4 h-4 text-brand-500 dark:text-brand-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          <strong>Generate</strong> menghitung otomatis dari absensi + cuti bulan ini.
          Gaji sudah dibayar tidak bisa diubah.
        </p>
      </div>

      {/* Payroll list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : payrolls.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-[var(--text-muted)]">Belum ada data payroll {monthLabel(month)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Klik Generate untuk menghitung gaji bulan ini</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
          {payrolls.map(p => {
            const emp = p.user?.employee;
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600
                  flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                  {p.user?.name?.[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.user?.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {emp?.department} · {emp?.position}
                  </p>
                </div>

                {/* Salary */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{toRupiahShort(p.total_salary)}</p>
                  <StatusBadge status={p.status} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setSelectedSlip(p)}
                    className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center
                      text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all">
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  {p.status === 'processed' && (
                    <button onClick={() => handleMarkPaid(p.id)}
                      className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center
                        text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-all">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedSlip && <SlipModal payroll={selectedSlip} onClose={() => setSelectedSlip(null)} />}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE TAB — My salary slips
// ═══════════════════════════════════════════════════════════════
const MyPayrollTab = () => {
  const [payrolls, setPayrolls]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [year, setYear]             = useState(new Date().getFullYear());

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollService.getMy({ limit: 24 });
      setPayrolls(res.data.data.payrolls);
    } catch { toast.error('Gagal memuat slip gaji'); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Year totals
  const yearPayrolls = payrolls.filter(p => p.month?.startsWith(String(year)));
  const yearTotal    = yearPayrolls.reduce((s, p) => s + parseFloat(p.total_salary || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Year selector + total */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setYear(y => y - 1)}
              className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center
                text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-bold text-[var(--text-primary)]">{year}</span>
            <button onClick={() => setYear(y => y + 1)}
              className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center
                text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)] font-medium">Total {year}</p>
            <p className="text-base font-black text-brand-600 dark:text-brand-400">{toRupiahShort(yearTotal)}</p>
          </div>
        </div>

        {/* Monthly bar chart — simple CSS */}
        {yearPayrolls.length > 0 && (
          <div className="flex items-end gap-1 h-12">
            {Array.from({ length: 12 }, (_, i) => {
              const m = `${year}-${String(i + 1).padStart(2, '0')}`;
              const p = yearPayrolls.find(x => x.month === m);
              const val = p ? parseFloat(p.total_salary) : 0;
              const max = Math.max(...yearPayrolls.map(x => parseFloat(x.total_salary)));
              const pct = max > 0 ? (val / max) * 100 : 0;
              const MONTHS_SHORT = ['J','F','M','A','M','J','J','A','S','O','N','D'];
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full rounded-t-sm transition-all duration-500 relative group"
                    style={{
                      height: `${Math.max(pct, 4)}%`,
                      background: p?.status === 'paid'
                        ? 'rgb(16 185 129)' // emerald
                        : p?.status === 'processed'
                        ? 'rgb(245 158 11)' // amber
                        : 'var(--border)',
                    }}>
                  </div>
                  <span className="text-[8px] text-[var(--text-muted)]">{MONTHS_SHORT[i]}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Dibayar</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />Diproses</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--border)]" />Belum</span>
      </div>

      {/* Slip list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : payrolls.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada slip gaji</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Slip gaji akan muncul setelah HR memproses gaji bulan ini</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
          {payrolls.map(p => (
            <button key={p.id} onClick={() => setSelectedSlip(p)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors text-left">
              {/* Month badge */}
              <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0
                ${p.status === 'paid'
                  ? 'bg-emerald-100 dark:bg-emerald-950'
                  : p.status === 'processed'
                  ? 'bg-amber-100 dark:bg-amber-950'
                  : 'bg-[var(--bg-secondary)]'
                }`}>
                <span className={`text-xs font-black leading-none ${
                  p.status === 'paid' ? 'text-emerald-600 dark:text-emerald-400'
                  : p.status === 'processed' ? 'text-amber-600 dark:text-amber-400'
                  : 'text-[var(--text-muted)]'
                }`}>
                  {p.month?.split('-')[1]}
                </span>
                <span className="text-[9px] text-[var(--text-muted)]">{p.month?.split('-')[0]}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">{monthLabel(p.month)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={p.status} />
                </div>
              </div>

              {/* Amount */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-[var(--text-primary)]">{toRupiahShort(p.total_salary)}</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  -{toRupiahShort(p.deductions)} potongan
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {selectedSlip && <SlipModal payroll={selectedSlip} onClose={() => setSelectedSlip(null)} />}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function PayrollPage() {
  const { user, isHR } = useAuth();
  const canManage = isHR || user?.role === 'admin';

  const TABS = [
    { id: 'mine',  label: 'Slip Saya', icon: FileText },
    ...(canManage ? [{ id: 'admin', label: 'Kelola Gaji', icon: Users }] : []),
  ];

  const [activeTab, setActiveTab] = useState(canManage ? 'admin' : 'mine');

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Penggajian</h1>
          <p className="text-sm text-[var(--text-secondary)]">Slip gaji & manajemen payroll</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
      </div>

      {/* Tabs — only show if user has both roles */}
      {TABS.length > 1 && (
        <div className="flex p-1 gap-1 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)] mb-5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
                  transition-all duration-200
                  ${active
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === 'mine'  && <MyPayrollTab />}
      {activeTab === 'admin' && <AdminTab />}
    </div>
  );
}
