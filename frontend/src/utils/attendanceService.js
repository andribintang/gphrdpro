import api from './api';

export const attendanceService = {
  // Get today's attendance status
  getToday: () => api.get('/attendance/today'),

  // Check in with optional GPS
  checkIn: (payload) => api.post('/attendance/check-in', payload),

  // Check out with optional GPS
  checkOut: (payload) => api.post('/attendance/check-out', payload),

  // Get personal history
  getHistory: (params) => api.get('/attendance/history', { params }),

  // Admin: daily recap
  getAdminDaily: (params) => api.get('/attendance/admin/daily', { params }),

  // Admin: monthly per user
  getAdminMonthly: (params) => api.get('/attendance/admin/monthly', { params }),
};

// ── GPS Helper ──────────────────────────────────────────────────
export const getGPSLocation = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS tidak didukung browser ini'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => {
        const messages = {
          1: 'Izin GPS ditolak. Aktifkan lokasi untuk absen.',
          2: 'Posisi tidak tersedia saat ini.',
          3: 'Timeout — coba lagi.',
        };
        reject(new Error(messages[err.code] || 'GPS error'));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options,
      }
    );
  });
};

// ── Status helpers ──────────────────────────────────────────────
export const STATUS_CONFIG = {
  present: { label: 'Hadir',      color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950', dot: 'bg-emerald-500' },
  late:    { label: 'Terlambat',  color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-100 dark:bg-amber-950',     dot: 'bg-amber-500'   },
  absent:  { label: 'Absen',      color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-100 dark:bg-red-950',         dot: 'bg-red-500'     },
  half_day:{ label: 'Setengah Hari', color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-950',       dot: 'bg-blue-500'    },
  leave:   { label: 'Cuti',       color: 'text-purple-600 dark:text-purple-400',   bg: 'bg-purple-100 dark:bg-purple-950',   dot: 'bg-purple-500'  },
  holiday: { label: 'Libur',      color: 'text-slate-600 dark:text-slate-400',     bg: 'bg-slate-100 dark:bg-slate-800',     dot: 'bg-slate-400'   },
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  return timeStr.slice(0, 5); // HH:MM
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const formatDateFull = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
