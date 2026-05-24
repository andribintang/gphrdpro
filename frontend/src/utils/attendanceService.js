import api from './api';

export const attendanceService = {
  getToday:       ()       => api.get('/attendance/today'),
  checkIn:        (data)   => api.post('/attendance/check-in', data),
  checkOut:       (data)   => api.post('/attendance/check-out', data),
  breakStart:     ()       => api.post('/attendance/break-start'),
  breakEnd:       ()       => api.post('/attendance/break-end'),
  getHistory:     (params) => api.get('/attendance/history', { params }),
  registerFace:   (data)   => api.post('/attendance/register-face', data),
  getFaceStatus:  (userId) => api.get(`/attendance/face-status/${userId || ''}`),
  getRealtimeMonitoring: () => api.get('/attendance/admin/realtime'),
  getOfficeSettings:    () => api.get('/attendance/office/settings'),
  updateOfficeSettings: (data) => api.put('/attendance/office/settings', data),
  getAdminMonthly:     (params) => api.get('/attendance/admin/monthly', { params }),
  getAllAttendances:    (params) => api.get('/attendance/admin/all', { params }),
};

export const getGPSLocation = (options = {}) => new Promise((resolve, reject) => {
  if (!navigator.geolocation) { reject(new Error('GPS tidak didukung')); return; }
  navigator.geolocation.getCurrentPosition(
    pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
    err => {
      const msgs = { 1: 'Izin GPS ditolak.', 2: 'Posisi tidak tersedia.', 3: 'GPS timeout.' };
      reject(new Error(msgs[err.code] || 'GPS error'));
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0, ...options }
  );
});

export const STATUS_CONFIG = {
  present:  { label: 'Hadir',          color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950', dot: 'bg-emerald-500' },
  late:     { label: 'Terlambat',      color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-100 dark:bg-amber-950',     dot: 'bg-amber-500'   },
  absent:   { label: 'Absen',          color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-100 dark:bg-red-950',         dot: 'bg-red-500'     },
  half_day: { label: 'Setengah Hari',  color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-100 dark:bg-blue-950',       dot: 'bg-blue-500'    },
  leave:    { label: 'Cuti',           color: 'text-purple-600 dark:text-purple-400',   bg: 'bg-purple-100 dark:bg-purple-950',   dot: 'bg-purple-500'  },
};

export const formatTime = (t) => t ? t.slice(0, 5) : '—';
export const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
};
