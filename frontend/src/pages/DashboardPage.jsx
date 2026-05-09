import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Users, Clock, CalendarOff, DollarSign,
  TrendingUp, ChevronRight, LogIn, LogOut,
  CheckCircle2, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { attendanceService, STATUS_CONFIG, formatTime } from '../utils/attendanceService';
import { leaveService } from '../utils/leaveService';

const STAT_CARDS = [
  { label: 'Total Karyawan', value: '20', icon: Users, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-950', trend: '+2 bulan ini' },
  { label: 'Hadir Hari Ini', value: '17', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950', trend: '85% kehadiran' },
  { label: 'Cuti Pending', value: '3', icon: CalendarOff, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-950', trend: 'Perlu persetujuan' },
  { label: 'Payroll Bulan Ini', value: 'Rp 86jt', icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-950', trend: 'Draft' },
];

const RECENT_ACTIVITY = [
  { name: 'Ahmad Fauzi', action: 'Check-in', time: '08:03', status: 'Tepat Waktu', type: 'success' },
  { name: 'Siti Aminah', action: 'Check-in', time: '08:45', status: 'Terlambat', type: 'warning' },
  { name: 'Dewi Rahayu', action: 'Cuti diajukan', time: '09:00', status: 'Pending', type: 'info' },
  { name: 'Budi Santoso', action: 'Check-out', time: '17:02', status: 'Normal', type: 'success' },
];

export default function DashboardPage() {
  const { user, isAdmin, isHR } = useAuth();
  const navigate = useNavigate();
  const today = format(new Date(), "EEEE, d MMMM yyyy", { locale: localeID });

  const [todayAtt, setTodayAtt] = useState(null);
  const [leaveQuota, setLeaveQuota] = useState(null);

  useEffect(() => {
    attendanceService.getToday()
      .then(r => setTodayAtt(r.data.data))
      .catch(() => {});
    leaveService.getMyQuota(new Date().getFullYear())
      .then(r => setLeaveQuota(r.data.data))
      .catch(() => {});
  }, []);

  const att = todayAtt?.attendance;
  const hasIn  = !!att?.check_in;
  const hasOut = !!att?.check_out;

  const attStatus = hasOut ? 'done' : hasIn ? 'checked_in' : 'not_checked_in';
  const attStatusConfig = {
    done:           { label: 'Lengkap',       color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950', icon: CheckCircle2 },
    checked_in:     { label: 'Sudah Masuk',   color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-100 dark:bg-blue-950',       icon: LogIn },
    not_checked_in: { label: 'Belum Absen',   color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-100 dark:bg-amber-950',     icon: AlertTriangle },
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
            {today}
          </p>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Halo, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Berikut ringkasan hari ini
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Online</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {STAT_CARDS.map((stat, i) => (
          <div key={i} className="card p-4 space-y-3 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} size={18} />
              </div>
              <TrendingUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stat.value}</p>
              <p className="text-xs text-[var(--text-secondary)] font-medium">{stat.label}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{stat.trend}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-2 gap-2">
          {/* Attendance card - live status */}
          <button
            onClick={() => navigate('/attendance')}
            className="card p-4 flex flex-col gap-3 hover:border-brand-300 dark:hover:border-brand-700
              transition-all active:scale-[0.97] text-left">
            <div className="flex items-start justify-between">
              <div className={`w-9 h-9 ${attStatusConfig[attStatus].bg} rounded-xl flex items-center justify-center`}>
                {(() => { const I = attStatusConfig[attStatus].icon; return <I className={`w-4.5 h-4.5 ${attStatusConfig[attStatus].color}`} size={18} />; })()}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Absensi</p>
              <p className={`text-xs font-medium mt-0.5 ${attStatusConfig[attStatus].color}`}>
                {attStatusConfig[attStatus].label}
              </p>
              {att?.check_in && (
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Masuk {formatTime(att.check_in)}{att.check_out ? ` · Keluar ${formatTime(att.check_out)}` : ''}
                </p>
              )}
            </div>
          </button>

          <button
            onClick={() => navigate('/leaves')}
            className="card p-4 flex flex-col gap-3 hover:border-brand-300 dark:hover:border-brand-700
              transition-all active:scale-[0.97] text-left">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 bg-amber-100 dark:bg-amber-950 rounded-xl flex items-center justify-center">
                <CalendarOff className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" size={18} />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Cuti</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {leaveQuota
                  ? `Sisa ${leaveQuota.annual_remaining} hari`
                  : 'Ajukan request'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Aktivitas Terkini</h2>
          <button className="text-xs text-brand-500 dark:text-brand-400 font-semibold flex items-center gap-1">
            Lihat semua <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="card divide-y divide-[var(--border-subtle)]">
          {RECENT_ACTIVITY.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600
                flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{item.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{item.action} · {item.time}</p>
              </div>
              <span className={`badge flex-shrink-0 ${
                item.type === 'success' ? 'badge-success' :
                item.type === 'warning' ? 'badge-warning' :
                'badge-info'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
