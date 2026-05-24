import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Users, Clock, CalendarOff, DollarSign,
  ChevronLeft, ChevronRight, Download, RefreshCw,
  Loader2, TrendingUp, TrendingDown, Minus,
  Building2, Award, AlertTriangle, CheckCircle2,
  ArrowUpRight, FileDown, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  reportsService, downloadCSV, toRupiah, toRupiahShort,
  currentMonth, currentYear, prevMonth, nextMonth,
  monthLabel, monthShort,
} from '../utils/reportsService';

// ── Shared: pure-CSS bar chart ─────────────────────────────────
const BarChart = ({ data, valueKey, labelKey, colorClass = 'bg-brand-500 dark:bg-brand-400', height = 80, formatVal }) => {
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
          <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-0 group">
            <div className="w-full relative" style={{ height: height - 18 }}>
              {/* Tooltip on hover */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px]
                font-bold bg-[var(--text-primary)] text-[var(--bg-primary)] whitespace-nowrap
                opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {formatVal ? formatVal(val) : val}
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center">
                <div
                  className={`w-full rounded-t-sm transition-all duration-500 ${colorClass} ${val === 0 ? 'opacity-20' : 'opacity-90 hover:opacity-100'}`}
                  style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%` }}
                />
              </div>
            </div>
            <span className="text-[8px] text-[var(--text-muted)] truncate w-full text-center leading-none">
              {item[labelKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Horizontal bar (for dept/type breakdowns)
const HBar = ({ label, value, max, color = 'bg-brand-500 dark:bg-brand-400', suffix = '', subtext }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--text-primary)] truncate max-w-[55%]">{label}</span>
        <span className="font-bold text-[var(--text-secondary)] flex-shrink-0">
          {suffix ? `${value} ${suffix}` : value}
          {subtext && <span className="text-[var(--text-muted)] font-normal ml-1">{subtext}</span>}
        </span>
      </div>
      <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  );
};

// Donut chart (pure CSS)
const DonutChart = ({ segments, size = 80 }) => {
  const total = segments.reduce((s, g) => s + g.value, 0);
  if (total === 0) return <div className="text-center text-xs text-[var(--text-muted)]">Tidak ada data</div>;

  let offset = 0;
  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4'];

  return (
    <svg viewBox="0 0 80 80" style={{ width: size, height: size }} className="transform -rotate-90">
      {segments.map((seg, i) => {
        const pct = (seg.value / total) * 100;
        const stroke = (pct / 100) * (2 * Math.PI * 28);
        const gap    = (2 * Math.PI * 28) - stroke;
        const dashOffset = -(offset / 100) * (2 * Math.PI * 28);
        offset += pct;
        return (
          <circle key={i} cx="40" cy="40" r="28"
            fill="none" strokeWidth="12"
            stroke={COLORS[i % COLORS.length]}
            strokeDasharray={`${stroke} ${gap}`}
            strokeDashoffset={dashOffset}
          />
        );
      })}
      <circle cx="40" cy="40" r="22" fill="var(--bg-card)" />
    </svg>
  );
};

// Stat card
const StatCard = ({ icon: Icon, label, value, sub, trend, color = 'text-brand-500', bg = 'bg-brand-100 dark:bg-brand-950', onClick }) => (
  <button onClick={onClick}
    className={`card p-4 text-left space-y-3 transition-all ${onClick ? 'hover:border-brand-300 dark:hover:border-brand-700 active:scale-[0.98] cursor-pointer' : 'cursor-default'}`}>
    <div className="flex items-center justify-between">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-0.5 text-[10px] font-bold
          ${trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : trend < 0 ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
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

// Section header
const SectionHeader = ({ title, action }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
    {action}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// TAB 1: OVERVIEW
// ═══════════════════════════════════════════════════════════════
const OverviewTab = ({ month, onMonthChange }) => {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsService.getOverview({ month });
      setData(res.data.data);
    } catch { toast.error('Gagal memuat ringkasan'); }
    finally { setLoading(false); }
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
    </div>
  );
  if (!data) return null;

  const { employees, attendance, leaves, payroll } = data;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => onMonthChange(prevMonth(month))}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center
            text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all active:scale-95">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{monthLabel(month)}</h3>
          <p className="text-xs text-[var(--text-muted)]">Ringkasan bulan</p>
        </div>
        <button onClick={() => onMonthChange(nextMonth(month))}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center
            text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all active:scale-95">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} label="Karyawan Aktif" value={employees.active}
          sub={`Total ${employees.total} terdaftar`}
          color="text-blue-600 dark:text-blue-400" bg="bg-blue-100 dark:bg-blue-950" />
        <StatCard icon={Clock} label="Tingkat Kehadiran" value={`${attendance.rate}%`}
          sub={`${attendance.total_present} dari ${attendance.total_expected} hari`}
          color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-950" />
        <StatCard icon={CalendarOff} label="Cuti Pending" value={leaves.pending}
          sub={`${leaves.approved} disetujui bulan ini`}
          color="text-amber-600 dark:text-amber-400" bg="bg-amber-100 dark:bg-amber-950" />
        <StatCard icon={DollarSign} label="Total Gaji" value={toRupiahShort(payroll.total_amount)}
          sub={`${payroll.paid}/${payroll.total_records} sudah dibayar`}
          color="text-purple-600 dark:text-purple-400" bg="bg-purple-100 dark:bg-purple-950" />
      </div>

      {/* Attendance rate visual */}
      <div className="card p-4 space-y-3">
        <SectionHeader title="Tingkat Kehadiran" />
        <div className="space-y-3">
          {[
            { label: 'Hadir Tepat Waktu', value: attendance.total_present - attendance.total_late, color: 'bg-emerald-500', total: attendance.total_expected },
            { label: 'Terlambat',          value: attendance.total_late,    color: 'bg-amber-500',   total: attendance.total_expected },
            { label: 'Tidak Hadir',        value: Math.max(0, attendance.total_expected - attendance.total_present), color: 'bg-red-400', total: attendance.total_expected },
          ].map((row, i) => (
            <HBar key={i} label={row.label} value={row.value}
              max={row.total} color={row.color}
              suffix="hari" subtext={`(${row.total > 0 ? Math.round((row.value / row.total) * 100) : 0}%)`}
            />
          ))}
        </div>
      </div>

      {/* Payroll status donut */}
      <div className="card-sm">
        <SectionHeader title="Status Payroll" />
        <div className="flex items-center gap-4">
          <DonutChart segments={[
            { label: 'Dibayar',  value: payroll.paid },
            { label: 'Proses',   value: payroll.unpaid },
          ]} size={72} />
          <div className="space-y-2 flex-1">
            {[
              { label: 'Sudah Dibayar', val: payroll.paid,   color: 'bg-emerald-500' },
              { label: 'Belum Dibayar', val: payroll.unpaid, color: 'bg-amber-500'   },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${s.color}`} />
                <span className="text-xs text-[var(--text-secondary)]">{s.label}</span>
                <span className="text-xs font-bold text-[var(--text-primary)] ml-auto">{s.val}</span>
              </div>
            ))}
            <div className="border-t border-[var(--border)] pt-2 mt-1">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Total gaji</span>
                <span className="font-black text-[var(--text-primary)]">{toRupiahShort(payroll.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 2: ATTENDANCE ANALYTICS
// ═══════════════════════════════════════════════════════════════
const AttendanceTab = ({ month, onMonthChange }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExp]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsService.getAttendance({ month });
      setData(res.data.data);
    } catch { toast.error('Gagal memuat data absensi'); }
    finally { setLoading(false); }
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    setExp(true);
    try {
      const res = await reportsService.export({ type: 'attendance', month });
      downloadCSV(res.data.data.rows, res.data.data.filename);
      toast.success(`${res.data.data.count} baris berhasil diexport!`);
    } catch { toast.error('Export gagal'); }
    finally { setExp(false); }
  };

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;
  if (!data) return null;

  const maxPresent = Math.max(...(data.by_employee?.map(e => e.present) || [1]), 1);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Month nav + export */}
      <div className="flex items-center gap-2">
        <button onClick={() => onMonthChange(prevMonth(month))}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-bold text-[var(--text-primary)]">{monthLabel(month)}</p>
        </div>
        <button onClick={() => onMonthChange(nextMonth(month))}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold
            bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400
            hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-all disabled:opacity-50">
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
          CSV
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total Check-in', value: data.summary?.total_checkins || 0 },
          { label: 'Rata-rata Jam',  value: `${data.summary?.avg_hours || 0}j` },
          { label: 'Tepat Waktu',    value: data.summary?.most_punctual?.length || 0 },
        ].map((s, i) => (
          <div key={i} className="card p-3 text-center">
            <p className="text-base font-black text-[var(--text-primary)]">{s.value}</p>
            <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Daily trend bar chart */}
      {data.daily_trend?.length > 0 && (
        <div className="card-sm">
          <SectionHeader title="Tren Harian" />
          <BarChart
            data={data.daily_trend.slice(-14).map(d => ({
              ...d,
              label: d.date.split('-')[2], // day number
            }))}
            valueKey="present"
            labelKey="label"
            height={80}
            colorClass="bg-emerald-500"
          />
          <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" />Hadir</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400" />Terlambat</span>
          </div>
        </div>
      )}

      {/* Dept breakdown */}
      {data.by_department?.length > 0 && (
        <div className="card p-4 space-y-3">
          <SectionHeader title="Per Departemen" />
          {data.by_department.slice(0, 6).map((dept, i) => (
            <HBar key={i} label={dept.department}
              value={dept.present} max={Math.max(...data.by_department.map(d => d.present), 1)}
              suffix="hari" subtext={dept.late > 0 ? `${dept.late} terlambat` : null}
              color={`${['bg-brand-500','bg-emerald-500','bg-purple-500','bg-amber-500','bg-rose-500','bg-teal-500'][i % 6]}`}
            />
          ))}
        </div>
      )}

      {/* Employee ranking */}
      {data.by_employee?.length > 0 && (
        <div className="table-wrapper">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            <p className="text-xs font-bold text-[var(--text-primary)]">Peringkat Kehadiran</p>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {data.by_employee.slice(0, 8).map((emp, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className={`text-xs font-black w-5 flex-shrink-0 ${i < 3 ? 'text-brand-500' : 'text-[var(--text-muted)]'}`}>
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{emp.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{emp.department}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{emp.present} hadir</p>
                  {emp.late > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">{emp.late}x terlambat</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 3: PAYROLL ANALYTICS
// ═══════════════════════════════════════════════════════════════
const PayrollTab = ({ year, onYearChange }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExp]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsService.getPayroll({ year });
      setData(res.data.data);
    } catch { toast.error('Gagal memuat data payroll'); }
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    const month = data?.latest_month;
    if (!month) { toast.error('Tidak ada data untuk diexport'); return; }
    setExp(true);
    try {
      const res = await reportsService.export({ type: 'payroll', month });
      downloadCSV(res.data.data.rows, res.data.data.filename);
      toast.success('Export berhasil!');
    } catch { toast.error('Export gagal'); }
    finally { setExp(false); }
  };

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>;
  if (!data) return null;

  const nonZeroMonths = data.monthly_totals.filter(m => m.total_salary > 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Year nav + export */}
      <div className="flex items-center gap-2">
        <button onClick={() => onYearChange(y => y - 1)}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-bold text-[var(--text-primary)]">Tahun {year}</p>
        </div>
        <button onClick={() => onYearChange(y => y + 1)}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold
            bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400
            hover:bg-purple-200 dark:hover:bg-purple-900 transition-all disabled:opacity-50">
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
          CSV
        </button>
      </div>

      {/* Year total cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total Gaji',    value: toRupiahShort(data.year_total),      color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Tunjangan',     value: toRupiahShort(data.year_allowances),  color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Potongan',      value: toRupiahShort(data.year_deductions),  color: 'text-red-600 dark:text-red-400' },
        ].map((s, i) => (
          <div key={i} className="card p-3 text-center">
            <p className={`text-sm font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly bar chart */}
      <div className="card-sm">
        <SectionHeader title={`Tren Gaji ${year}`} />
        <BarChart
          data={data.monthly_totals.map(m => ({ ...m, label: monthShort(m.month) }))}
          valueKey="total_salary"
          labelKey="label"
          height={88}
          colorClass="bg-purple-500 dark:bg-purple-400"
          formatVal={toRupiahShort}
        />
      </div>

      {/* Dept breakdown */}
      {data.by_department?.length > 0 && (
        <div className="card p-4 space-y-3">
          <SectionHeader title={`Gaji per Dept (${monthLabel(data.latest_month)})`} />
          {data.by_department.map((dept, i) => (
            <HBar key={i} label={dept.department}
              value={toRupiahShort(dept.total)}
              max={data.by_department[0]?.total || 1}
              suffix=""
              subtext={`avg ${toRupiahShort(dept.avg)} · ${dept.count} org`}
              color={['bg-purple-500','bg-indigo-500','bg-blue-500','bg-teal-500','bg-emerald-500'][i % 5]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 4: LEAVE ANALYTICS
// ═══════════════════════════════════════════════════════════════
const LeaveTab = ({ year, onYearChange }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsService.getLeaves({ year });
      setData(res.data.data);
    } catch { toast.error('Gagal memuat data cuti'); }
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;
  if (!data) return null;

  const TYPE_ICONS = { annual:'🏖️', sick:'🏥', emergency:'🚨', maternity:'👶', paternity:'👨‍👶', unpaid:'💸', other:'📋' };
  const TYPE_LABELS = { annual:'Tahunan', sick:'Sakit', emergency:'Darurat', maternity:'Melahirkan', paternity:'Ayah', unpaid:'Tanpa Bayar', other:'Lainnya' };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Year nav */}
      <div className="flex items-center gap-2">
        <button onClick={() => onYearChange(y => y - 1)}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-bold text-[var(--text-primary)]">Cuti {year}</p>
        </div>
        <button onClick={() => onYearChange(y => y + 1)}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total Pengajuan', value: data.total_requests, color: 'text-[var(--text-primary)]' },
          { label: 'Disetujui',       value: data.total_approved, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Pending',         value: data.total_pending,  color: 'text-amber-600 dark:text-amber-400' },
        ].map((s, i) => (
          <div key={i} className="card p-3 text-center">
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly trend */}
      <div className="card-sm">
        <SectionHeader title="Tren Pengajuan Cuti" />
        <BarChart
          data={data.monthly_trend.map(m => ({ ...m, label: monthShort(m.month) }))}
          valueKey="count"
          labelKey="label"
          height={80}
          colorClass="bg-amber-500"
        />
      </div>

      {/* By type */}
      {data.by_type?.length > 0 && (
        <div className="card p-4 space-y-3">
          <SectionHeader title="Berdasarkan Tipe" />
          {data.by_type.sort((a, b) => b.total - a.total).map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-lg w-6 flex-shrink-0">{TYPE_ICONS[t.type] || '📋'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{TYPE_LABELS[t.type] || t.type}</span>
                  <span className="text-xs text-[var(--text-muted)]">{t.total} pengajuan · {t.days} hari</span>
                </div>
                <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-700"
                    style={{ width: `${data.total_requests > 0 ? (t.total / data.total_requests) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top users */}
      {data.top_leave_users?.length > 0 && (
        <div className="table-wrapper">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            <p className="text-xs font-bold text-[var(--text-primary)]">Karyawan Paling Banyak Cuti</p>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {data.top_leave_users.map((u, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-6 text-xs font-black ${i < 3 ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}>#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{u.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{u.department}</p>
                </div>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400 flex-shrink-0">
                  {u.days} hari
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 5: EMPLOYEE ANALYTICS
// ═══════════════════════════════════════════════════════════════
const EmployeeAnalyticsTab = ({ year, onYearChange }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExp]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsService.getEmployees({ year });
      setData(res.data.data);
    } catch { toast.error('Gagal memuat data karyawan'); }
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    setExp(true);
    try {
      const res = await reportsService.export({ type: 'employees' });
      downloadCSV(res.data.data.rows, res.data.data.filename);
      toast.success('Data karyawan berhasil diexport!');
    } catch { toast.error('Export gagal'); }
    finally { setExp(false); }
  };

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;
  if (!data) return null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => onYearChange(y => y - 1)}
            className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-[var(--text-primary)]">SDM {year}</span>
          <button onClick={() => onYearChange(y => y + 1)}
            className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold
            bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400
            hover:bg-teal-200 dark:hover:bg-teal-900 transition-all disabled:opacity-50">
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total',    value: data.total,      color: 'text-[var(--text-primary)]' },
          { label: 'Aktif',    value: data.active,     color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Berhenti', value: data.terminated, color: 'text-red-500' },
        ].map((s, i) => (
          <div key={i} className="card p-3 text-center">
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly joiners */}
      <div className="card-sm">
        <SectionHeader title={`Karyawan Baru ${year}`} />
        <BarChart
          data={data.monthly_joiners.map(m => ({ ...m, label: monthShort(m.month) }))}
          valueKey="count"
          labelKey="label"
          height={72}
          colorClass="bg-teal-500"
        />
      </div>

      {/* Tenure buckets donut */}
      {data.tenure_buckets?.length > 0 && (
        <div className="card-sm">
          <SectionHeader title="Masa Kerja (Karyawan Aktif)" />
          <div className="flex items-center gap-4">
            <DonutChart
              segments={data.tenure_buckets.map(b => ({ label: b.label, value: b.count }))}
              size={72}
            />
            <div className="space-y-1.5 flex-1">
              {data.tenure_buckets.map((b, i) => {
                const COLORS = ['text-emerald-600 dark:text-emerald-400','text-amber-600 dark:text-amber-400','text-blue-600 dark:text-blue-400','text-purple-600 dark:text-purple-400'];
                const BCOLORS = ['bg-emerald-500','bg-amber-500','bg-blue-500','bg-purple-500'];
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${BCOLORS[i]}`} />
                    <span className="text-xs text-[var(--text-secondary)] flex-1">{b.label}</span>
                    <span className={`text-xs font-bold ${COLORS[i]}`}>{b.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Dept distribution */}
      {data.dept_distribution?.length > 0 && (
        <div className="card p-4 space-y-3">
          <SectionHeader title="Distribusi Departemen" />
          {data.dept_distribution.map((d, i) => (
            <HBar key={i} label={d.dept}
              value={d.count}
              max={data.dept_distribution[0].count}
              suffix="orang"
              color={['bg-teal-500','bg-blue-500','bg-purple-500','bg-emerald-500','bg-amber-500'][i % 5]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN REPORTS PAGE
// ═══════════════════════════════════════════════════════════════
const TABS = [
  { id: 'overview',   label: 'Ringkasan', icon: BarChart3 },
  { id: 'attendance', label: 'Absensi',   icon: Clock },
  { id: 'payroll',    label: 'Gaji',      icon: DollarSign },
  { id: 'leaves',     label: 'Cuti',      icon: CalendarOff },
  { id: 'employees',  label: 'SDM',       icon: Users },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [month, setMonth]   = useState(currentMonth());
  const [year, setYear]     = useState(currentYear());

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan & Analitik</h1>
          <p className="text-sm text-[var(--text-secondary)]">Ringkasan data & export CSV</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>

      {/* Tab bar — horizontal scroll on mobile */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin mb-5
        bg-[var(--bg-secondary)] p-1 rounded-2xl border border-[var(--border)]">
        {TABS.map(tab => {
          const Icon  = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                transition-all duration-200 whitespace-nowrap
                ${active
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview'   && <OverviewTab   month={month} onMonthChange={setMonth} />}
      {activeTab === 'attendance' && <AttendanceTab month={month} onMonthChange={setMonth} />}
      {activeTab === 'payroll'    && <PayrollTab    year={year}   onYearChange={setYear}   />}
      {activeTab === 'leaves'     && <LeaveTab      year={year}   onYearChange={setYear}   />}
      {activeTab === 'employees'  && <EmployeeAnalyticsTab year={year} onYearChange={setYear} />}
    </div>
  );
}
