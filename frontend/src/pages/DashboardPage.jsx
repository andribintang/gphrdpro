import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CalendarOff, DollarSign, Users,
  TrendingUp, ChevronRight, LogIn, LogOut,
  AlertTriangle, CheckCircle2, RefreshCw,
  Building2, Target, Star, ArrowUpRight,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { attendanceService, formatTime } from '../utils/attendanceService';
import { leaveService } from '../utils/leaveService';
import { employeeService } from '../utils/employeeService';
import api from '../utils/api';

// ── Helpers ───────────────────────────────────────────────────
const toRpShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000_000) return `Rp ${(v/1e9).toFixed(1)}M`;
  if (v >= 1_000_000)     return `Rp ${(v/1e6).toFixed(1)}jt`;
  if (v >= 1_000)         return `Rp ${(v/1e3).toFixed(0)}rb`;
  return `Rp ${v}`;
};

const today = () => format(new Date(), "EEEE, d MMMM yyyy", { locale: localeID });

// ── Stat Card ─────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color, bg, onClick, loading }) => (
  <button onClick={onClick}
    className={`card p-4 text-left transition-all ${onClick ? 'hover:border-brand-300 dark:hover:border-brand-700 active:scale-[0.98] cursor-pointer' : 'cursor-default'}`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
      </div>
      {onClick && <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)]" />}
    </div>
    {loading ? (
      <div className="skeleton h-7 w-20 rounded-lg mb-1" />
    ) : (
      <p className="text-xl font-black text-[var(--text-primary)]">{value ?? '—'}</p>
    )}
    <p className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">{label}</p>
    {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
  </button>
);

// ── Activity item ─────────────────────────────────────────────
const ActivityItem = ({ name, action, time, status, type }) => {
  const colors = {
    success: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
    info:    'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
    error:   'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
  };
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
        {name?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{name}</p>
        <p className="text-xs text-[var(--text-muted)]">{action} · {time}</p>
      </div>
      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${colors[type] || colors.info}`}>
        {status}
      </span>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { user } = useAuth();
  const { settings } = useCompany();
  const navigate = useNavigate();
  const isHRAdmin = ['admin','hr'].includes(user?.role);

  const [loading, setLoading]         = useState(true);
  const [todayAtt, setTodayAtt]       = useState(null);
  const [leaveQuota, setLeaveQuota]   = useState(null);
  const [empStats, setEmpStats]       = useState(null);
  const [payrollStats, setPayrollStats] = useState(null);
  const [recentAtt, setRecentAtt]     = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const promises = [
        attendanceService.getToday().then(r => setTodayAtt(r.data.data)).catch(() => {}),
        leaveService.getMyQuota(new Date().getFullYear()).then(r => setLeaveQuota(r.data.data)).catch(() => {}),
      ];

      if (isHRAdmin) {
        promises.push(
          employeeService.getStats().then(r => setEmpStats(r.data.data.stats)).catch(() => {}),
          // Payroll runs for current month
          api.get('/payroll-engine/runs', { params: { year: new Date().getFullYear() } })
            .then(r => {
              const runs = r.data.data?.runs || [];
              const thisMonth = new Date().getMonth() + 1;
              const monthRuns = runs.filter(r => r.type === 'monthly' && r.period_month === thisMonth);
              const latest = monthRuns[0];
              setPayrollStats(latest ? {
                total: latest.total_net,
                status: latest.status,
                count: latest.total_employees,
              } : null);
            }).catch(() => {}),
          // Recent attendance (last 10)
          api.get('/attendance/admin/realtime', { params: { limit: 6 } })
            .then(r => {
              const records = r.data.data?.attendance || r.data.data?.attendances || [];
              const mapped = records.slice(0,6).map(a => ({
                name:   a.user?.name || a.name || '—',
                action: a.check_out_time ? 'Check-out' : 'Check-in',
                time:   a.check_out_time
                  ? formatTime(a.check_out_time)
                  : formatTime(a.check_in_time),
                status: a.status === 'late' ? 'Terlambat' : a.status === 'present' ? 'Tepat Waktu' : a.status,
                type:   a.status === 'late' ? 'warning' : 'success',
              }));
              setRecentAtt(mapped);
            }).catch(() => {}),
        );
      }

      await Promise.all(promises);
    } finally {
      setLoading(false);
    }
  }, [isHRAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);



  const attStatus = todayAtt?.attendance?.status;
  const checkedIn  = !!todayAtt?.attendance?.check_in_time;
  const checkedOut = !!todayAtt?.attendance?.check_out_time;

  return (
    <div className="section animate-fade-in">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)] font-medium capitalize lg:hidden">{today()}</p>
          <h1 className="text-xl lg:text-2xl font-black text-[var(--text-primary)]">
            Halo, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {isHRAdmin ? 'Ringkasan operasional hari ini' : 'Berikut ringkasan hari ini'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1.5 rounded-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
          <button onClick={fetchData}
            className="w-8 h-8 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Attendance status card — navigate to attendance page ── */}
      <button onClick={() => navigate('/attendance')}
        className={`card p-4 border-l-4 text-left w-full hover:border-brand-300 dark:hover:border-brand-700 transition-all ${
          checkedOut  ? 'border-l-slate-400' :
          attStatus === 'late' ? 'border-l-amber-500' :
          checkedIn   ? 'border-l-emerald-500' : 'border-l-brand-500'
        }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">Absensi Hari Ini</p>
            {loading ? (
              <div className="skeleton h-6 w-28 rounded mt-1" />
            ) : (
              <p className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                {checkedOut  ? `✅ Check-out ${formatTime(todayAtt?.attendance?.check_out_time)}` :
                 checkedIn   ? `✅ Check-in ${formatTime(todayAtt?.attendance?.check_in_time)}` :
                 '⏰ Belum check-in'}
              </p>
            )}
            {attStatus === 'late' && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">⚠️ Terlambat</p>
            )}
            <p className="text-xs text-brand-500 mt-1 font-semibold">
              {checkedIn && !checkedOut ? 'Tap untuk check-out →' : !checkedIn ? 'Tap untuk absen sekarang →' : 'Lihat riwayat →'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            checkedOut ? 'bg-slate-100 dark:bg-slate-800' :
            checkedIn  ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-brand-100 dark:bg-brand-950'
          }`}>
            {checkedOut
              ? <CheckCircle2 className="w-6 h-6 text-slate-500" />
              : checkedIn
              ? <LogOut className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              : <LogIn className="w-6 h-6 text-brand-600 dark:text-brand-400" />}
          </div>
        </div>
      </button>

      {/* ── Stats grid ─────────────────────────────────────── */}
      {/* HR/Admin: 4 stats */}
      {isHRAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Clock} label="Absensi Hari Ini"
            value={loading ? null : (checkedIn ? (attStatus === 'late' ? '⚠️ Terlambat' : '✅ Hadir') : '—')}
            sub={checkedIn ? `Check-in ${formatTime(todayAtt?.attendance?.check_in_time)}` : 'Belum check-in'}
            color="text-brand-600 dark:text-brand-400" bg="bg-brand-100 dark:bg-brand-950"
            onClick={() => navigate('/attendance')} loading={loading}
          />
          <StatCard
            icon={Users} label="Karyawan Aktif"
            value={loading ? null : (empStats?.active ?? '—')}
            sub={empStats ? `${empStats.new_this_month || 0} baru bulan ini` : ''}
            color="text-blue-600 dark:text-blue-400" bg="bg-blue-100 dark:bg-blue-950"
            onClick={() => navigate('/employees')} loading={loading}
          />
          <StatCard
            icon={DollarSign} label="Gaji Bulan Ini"
            value={loading ? null : (payrollStats ? toRpShort(payrollStats.total) : '—')}
            sub={payrollStats ? `${payrollStats.count} karyawan · ${payrollStats.status}` : 'Belum diproses'}
            color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-950"
            onClick={() => navigate('/payroll-pro')} loading={loading}
          />
          <StatCard
            icon={CalendarOff} label="Sisa Cuti Saya"
            value={loading ? null : (leaveQuota?.annual_quota ? `${leaveQuota.annual_quota - (leaveQuota.annual_used || 0)}` : '—')}
            sub={leaveQuota ? `Terpakai ${leaveQuota.annual_used || 0} hari` : ''}
            color="text-purple-600 dark:text-purple-400" bg="bg-purple-100 dark:bg-purple-950"
            onClick={() => navigate('/leaves')} loading={loading}
          />
        </div>
      )}

      {/* Employee: 2 stats */}
      {!isHRAdmin && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={CalendarOff} label="Sisa Cuti Tahunan"
            value={loading ? null : (leaveQuota?.annual_quota ? `${leaveQuota.annual_quota - (leaveQuota.annual_used || 0)}` : '—')}
            sub={leaveQuota ? `Terpakai ${leaveQuota.annual_used || 0} hari` : ''}
            color="text-purple-600 dark:text-purple-400" bg="bg-purple-100 dark:bg-purple-950"
            onClick={() => navigate('/leaves')} loading={loading}
          />
          <StatCard
            icon={DollarSign} label="Slip Gaji"
            value="Lihat"
            sub="Slip gaji bulanan"
            color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-950"
            onClick={() => navigate('/payroll-pro')} loading={false}
          />
        </div>
      )}

      {/* ── HR/Admin extra: employee stats cards ──────────── */}
      {isHRAdmin && empStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label:'Total Karyawan', value: empStats.total,          color:'text-[var(--text-primary)]', bg:'bg-[var(--bg-secondary)]' },
            { label:'Cuti Pending',   value: empStats.leave_pending || 0, color:'text-amber-600 dark:text-amber-400', bg:'bg-amber-50 dark:bg-amber-950' },
            { label:'Tidak Aktif',    value: empStats.inactive || 0,  color:'text-red-600 dark:text-red-400',    bg:'bg-red-50 dark:bg-red-950' },
            { label:'Karyawan Baru',  value: empStats.new_this_month || 0, color:'text-brand-600 dark:text-brand-400', bg:'bg-brand-50 dark:bg-brand-950' },
          ].map((s, i) => (
            <div key={i} className={`rounded-2xl p-3.5 ${s.bg} border border-[var(--border)]`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick actions ──────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Aksi Cepat</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <button onClick={() => navigate('/attendance')}
            className="card p-4 text-left hover:border-brand-300 dark:hover:border-brand-700 active:scale-[0.98] transition-all">
            <div className="w-9 h-9 bg-brand-100 dark:bg-brand-950 rounded-xl flex items-center justify-center mb-3">
              <Clock className="w-4.5 h-4.5 text-brand-600 dark:text-brand-400" size={18} />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Absensi</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {checkedIn ? (checkedOut ? 'Lihat riwayat' : 'Check-out sekarang') : 'Belum absen'}
            </p>
          </button>
          <button onClick={() => navigate('/leaves')}
            className="card p-4 text-left hover:border-purple-300 dark:hover:border-purple-700 active:scale-[0.98] transition-all">
            <div className="w-9 h-9 bg-purple-100 dark:bg-purple-950 rounded-xl flex items-center justify-center mb-3">
              <CalendarOff className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" size={18} />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Cuti</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Sisa {leaveQuota ? leaveQuota.annual_quota - (leaveQuota.annual_used || 0) : '—'} hari
            </p>
          </button>
          <button onClick={() => navigate('/payroll-pro')}
            className="card p-4 text-left hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-[0.98] transition-all">
            <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-950 rounded-xl flex items-center justify-center mb-3">
              <DollarSign className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" size={18} />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Slip Gaji</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Lihat slip gaji</p>
          </button>
          {isHRAdmin ? (
            <button onClick={() => navigate('/incentive')}
              className="card p-4 text-left hover:border-amber-300 dark:hover:border-amber-700 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 bg-amber-100 dark:bg-amber-950 rounded-xl flex items-center justify-center mb-3">
                <TrendingUp className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" size={18} />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Insentif</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Kelola insentif</p>
            </button>
          ) : (
            <button onClick={() => navigate('/attendance')}
              className="card p-4 text-left hover:border-blue-300 dark:hover:border-blue-700 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center mb-3">
                <Activity className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" size={18} />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Riwayat</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Lihat aktivitas</p>
            </button>
          )}
        </div>
      </div>

      {/* ── Recent activity (HR/Admin only) ───────────────── */}
      {isHRAdmin && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Aktivitas Terkini</h3>
            <button onClick={() => navigate('/attendance')}
              className="text-xs text-brand-500 font-semibold hover:underline flex items-center gap-1">
              Lihat semua <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="table-wrapper">
            {loading ? (
              [...Array(4)].map((_,i) => <div key={i} className="skeleton h-14 rounded-none" />)
            ) : recentAtt.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-6 text-sm text-[var(--text-muted)]">
                <AlertTriangle className="w-4 h-4" />
                Belum ada aktivitas absensi hari ini
              </div>
            ) : (
              recentAtt.map((item, i) => (
                <div key={i} className="px-4">
                  <ActivityItem {...item} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Employee: my recent attendance ─────────────────── */}
      {!isHRAdmin && (
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Absensi Minggu Ini</h3>
          <div className="card-sm">
            {loading ? (
              <div className="skeleton h-16 rounded-xl" />
            ) : todayAtt?.recent?.length > 0 ? (
              <div className="space-y-2">
                {todayAtt.recent.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-subtle)] last:border-0">
                    <span className="text-[var(--text-secondary)] font-medium">{a.date}</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-lg ${
                      a.status === 'present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                      a.status === 'late'    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                      'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}>
                      {a.status === 'present' ? 'Hadir' : a.status === 'late' ? 'Terlambat' : a.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Belum ada data absensi</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
