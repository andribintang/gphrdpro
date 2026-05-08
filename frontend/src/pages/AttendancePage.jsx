import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Clock, CheckCircle2, LogIn, LogOut,
  ChevronLeft, ChevronRight, AlertTriangle,
  Loader2, Navigation, BarChart3, Calendar,
  TrendingUp, Wifi, WifiOff, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLiveClock } from '../hooks/useLiveClock';
import {
  attendanceService, getGPSLocation,
  STATUS_CONFIG, formatTime, formatDate, formatDateFull
} from '../utils/attendanceService';

// ── Tabs ───────────────────────────────────────────────────────
const TABS = [
  { id: 'clock',   label: 'Absen',   icon: Clock },
  { id: 'history', label: 'Riwayat', icon: Calendar },
];

if (typeof window !== 'undefined') {
  // inject keyframe for pulse ring
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ping-slow { 0% { transform: scale(1); opacity:.6 } 100% { transform: scale(1.6); opacity:0 } }
    @keyframes ping-med  { 0% { transform: scale(1); opacity:.4 } 100% { transform: scale(1.4); opacity:0 } }
    .ring-ping-slow { animation: ping-slow 2s ease-out infinite; }
    .ring-ping-med  { animation: ping-med  2s ease-out infinite .4s; }
    @keyframes btn-press { 0%,100%{transform:scale(1)} 50%{transform:scale(.94)} }
    .btn-press { animation: btn-press .25s ease; }
  `;
  document.head.appendChild(style);
}

// ── Status Badge ───────────────────────────────────────────────
const StatusBadge = ({ status, size = 'md' }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.absent;
  const cls = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-3 py-1';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${cls} ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ── GPS Indicator ──────────────────────────────────────────────
const GPSIndicator = ({ gps, loading }) => {
  if (loading) return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
      <Loader2 className="w-3 h-3 animate-spin" /> Mengambil lokasi...
    </div>
  );
  if (!gps) return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
      <WifiOff className="w-3 h-3" /> Tanpa GPS
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
      <Navigation className="w-3 h-3" />
      {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
      <span className="text-[var(--text-muted)]">±{Math.round(gps.accuracy)}m</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// CLOCK TAB — Big check-in/out button
// ═══════════════════════════════════════════════════════════════
function ClockTab({ todayData, onRefresh }) {
  const { user } = useAuth();
  const clock    = useLiveClock();

  const [gps, setGps]           = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  const attendance = todayData?.attendance;
  const hasCheckedIn  = !!attendance?.check_in;
  const hasCheckedOut = !!attendance?.check_out;
  const isComplete    = hasCheckedIn && hasCheckedOut;

  // Auto-fetch GPS on mount
  useEffect(() => {
    fetchGPS();
  }, []);

  const fetchGPS = async () => {
    setGpsLoading(true);
    try {
      const loc = await getGPSLocation();
      setGps(loc);
    } catch {
      setGps(null); // GPS optional - tidak blokir
    } finally {
      setGpsLoading(false);
    }
  };

  const handleAction = async () => {
    if (actionLoading || isComplete) return;

    // Animate button
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    setActionLoading(true);
    const payload = {};
    if (gps) { payload.lat = gps.lat; payload.lng = gps.lng; }

    try {
      if (!hasCheckedIn) {
        await attendanceService.checkIn(payload);
        toast.success(clock.isLate ? '⚠️ Check-in berhasil (Terlambat)' : '✅ Check-in berhasil! Tepat waktu');
      } else {
        await attendanceService.checkOut(payload);
        toast.success('🏁 Check-out berhasil! Selamat istirahat');
      }
      onRefresh();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal melakukan absensi';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Determine button state
  const btnState = isComplete ? 'done'
    : hasCheckedIn ? 'checkout'
    : 'checkin';

  const btnConfig = {
    checkin: {
      label:    'CHECK IN',
      sublabel: clock.isLate ? `Terlambat · ${clock.timeShort}` : `Tepat Waktu · ${clock.timeShort}`,
      icon:     LogIn,
      gradient: clock.isLate
        ? 'from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400'
        : 'from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400',
      ring:     clock.isLate
        ? 'bg-amber-400/20'
        : 'bg-emerald-400/20',
      ring2:    clock.isLate
        ? 'bg-amber-400/10'
        : 'bg-emerald-400/10',
    },
    checkout: {
      label:    'CHECK OUT',
      sublabel: `Pulang · ${clock.timeShort}`,
      icon:     LogOut,
      gradient: 'from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400',
      ring:     'bg-blue-400/20',
      ring2:    'bg-blue-400/10',
    },
    done: {
      label:    'SELESAI',
      sublabel: `Absensi hari ini lengkap`,
      icon:     CheckCircle2,
      gradient: 'from-slate-400 to-slate-500',
      ring:     'bg-slate-400/10',
      ring2:    'bg-slate-400/5',
    },
  };

  const cfg = btnConfig[btnState];
  const BtnIcon = cfg.icon;

  return (
    <div className="flex flex-col items-center gap-6 py-4 animate-slide-up">

      {/* Live Clock Display */}
      <div className="text-center w-full">
        <div className="text-5xl font-bold tracking-tight text-[var(--text-primary)]"
          style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>
          {clock.timeStr}
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
          {clock.dayStr}, {clock.dateStr} · WIB
        </p>
        {clock.isLate && !hasCheckedIn && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full
            bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-xs font-semibold">
            <AlertTriangle className="w-3 h-3" />
            Melewati batas waktu 08:05
          </div>
        )}
      </div>

      {/* ─── Big Action Button ─────────────────────────────── */}
      <div className="relative flex items-center justify-center my-2">
        {/* Pulse rings — only when active */}
        {!isComplete && (
          <>
            <div className={`absolute w-52 h-52 rounded-full ${cfg.ring} ring-ping-slow`} />
            <div className={`absolute w-44 h-44 rounded-full ${cfg.ring2} ring-ping-med`} />
          </>
        )}

        {/* Button */}
        <button
          onClick={handleAction}
          disabled={actionLoading || isComplete}
          className={`
            relative w-40 h-40 rounded-full
            bg-gradient-to-br ${cfg.gradient}
            flex flex-col items-center justify-center gap-2
            shadow-2xl transition-all duration-200
            ${!isComplete ? 'active:scale-90 hover:scale-105 cursor-pointer' : 'cursor-default opacity-80'}
            ${animating ? 'btn-press' : ''}
            disabled:cursor-not-allowed
          `}
          style={{
            boxShadow: isComplete ? 'none' : `0 0 40px 0 color-mix(in srgb, currentColor 30%, transparent)`,
          }}
        >
          {actionLoading ? (
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          ) : (
            <>
              <BtnIcon className="w-10 h-10 text-white" strokeWidth={2} />
              <span className="text-white font-black text-base tracking-widest">{cfg.label}</span>
            </>
          )}
        </button>
      </div>

      {/* Status sublabel */}
      <p className="text-sm font-medium text-[var(--text-secondary)] -mt-2">
        {cfg.sublabel}
      </p>

      {/* GPS status */}
      <div className="flex flex-col items-center gap-2">
        <GPSIndicator gps={gps} loading={gpsLoading} />
        {!gpsLoading && (
          <button onClick={fetchGPS}
            className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]
              transition-colors px-2 py-1 rounded-lg hover:bg-[var(--bg-secondary)]">
            <RefreshCw className="w-3 h-3" /> Refresh GPS
          </button>
        )}
      </div>

      {/* Today info card */}
      <div className="w-full card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Rekap Hari Ini
          </span>
          {attendance && <StatusBadge status={attendance.status} />}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {hasCheckedIn ? formatTime(attendance.check_in) : '—'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium uppercase tracking-wide">Masuk</p>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {hasCheckedOut ? formatTime(attendance.check_out) : '—'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium uppercase tracking-wide">Keluar</p>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {attendance?.work_hours ? `${attendance.work_hours}j` : '—'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium uppercase tracking-wide">Jam Kerja</p>
          </div>
        </div>

        {/* GPS info if available */}
        {attendance?.check_in_lat && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
            <span>Lokasi tercatat: {parseFloat(attendance.check_in_lat).toFixed(4)}, {parseFloat(attendance.check_in_lng).toFixed(4)}</span>
          </div>
        )}
      </div>

      {/* Late warning info */}
      {!hasCheckedIn && (
        <div className="w-full flex items-start gap-3 p-3.5 rounded-xl
          bg-[var(--bg-secondary)] border border-[var(--border)]">
          <Clock className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">Jam Kerja</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Masuk 08:00 — Keluar 17:00 · Toleransi terlambat hingga <strong className="text-amber-600 dark:text-amber-400">08:05</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HISTORY TAB
// ═══════════════════════════════════════════════════════════════
function HistoryTab() {
  const [records, setRecords]   = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [month, setMonth]       = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getHistory({ month });
      setRecords(res.data.data.records);
      setStats(res.data.data.stats);
    } catch {
      toast.error('Gagal memuat riwayat absensi');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const changeMonth = (dir) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = (() => {
    const [y, m] = month.split('-');
    const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];
    return `${MONTHS[parseInt(m) - 1]} ${y}`;
  })();

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <button onClick={() => changeMonth(-1)}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center
            text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all active:scale-95">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{monthLabel}</h3>
        <button onClick={() => changeMonth(1)}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center
            text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all active:scale-95">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Hari', value: stats.total_days, color: 'text-[var(--text-primary)]' },
            { label: 'Hadir', value: stats.present, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Telat', value: stats.late, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Jam', value: stats.total_hours, color: 'text-brand-600 dark:text-brand-400' },
          ].map((s, i) => (
            <div key={i} className="card p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Attendance List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada data absensi bulan ini</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
          {records.map((rec, i) => (
            <div key={rec.id || i}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors">
              {/* Date */}
              <div className="text-center w-10 flex-shrink-0">
                <p className="text-base font-bold text-[var(--text-primary)] leading-none">
                  {rec.date.split('-')[2]}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5 uppercase">
                  {new Date(rec.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short' })}
                </p>
              </div>

              {/* Vertical divider */}
              <div className="w-px h-10 bg-[var(--border)] flex-shrink-0" />

              {/* Times */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <LogIn className="w-3 h-3 text-emerald-500" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {formatTime(rec.check_in)}
                    </span>
                  </div>
                  {rec.check_out && (
                    <>
                      <span className="text-[var(--text-muted)] text-xs">→</span>
                      <div className="flex items-center gap-1.5">
                        <LogOut className="w-3 h-3 text-blue-500" />
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {formatTime(rec.check_out)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {rec.work_hours && (
                    <span className="text-xs text-[var(--text-muted)]">
                      {rec.work_hours} jam
                    </span>
                  )}
                  {rec.check_in_lat && (
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-500">
                      <MapPin className="w-2.5 h-2.5" /> GPS
                    </span>
                  )}
                </div>
              </div>

              {/* Status */}
              <StatusBadge status={rec.status} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('clock');
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading]     = useState(true);

  const fetchToday = useCallback(async () => {
    try {
      const res = await attendanceService.getToday();
      setTodayData(res.data.data);
    } catch {
      toast.error('Gagal memuat data absensi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  return (
    <div className="max-w-lg mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Absensi</h1>
          <p className="text-sm text-[var(--text-secondary)]">Check-in & riwayat kehadiran</p>
        </div>
        <button onClick={fetchToday}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center
            text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]
            transition-all active:scale-95">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex p-1 gap-1 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)] mb-5">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
                transition-all duration-200
                ${isActive
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm text-[var(--text-muted)]">Memuat data absensi...</p>
        </div>
      ) : (
        <>
          {activeTab === 'clock'   && <ClockTab   todayData={todayData} onRefresh={fetchToday} />}
          {activeTab === 'history' && <HistoryTab />}
        </>
      )}
    </div>
  );
}
