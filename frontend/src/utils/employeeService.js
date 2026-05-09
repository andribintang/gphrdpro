import api from './api';

export const employeeService = {
  getAll:        (params) => api.get('/employees', { params }),
  getOne:        (id)     => api.get(`/employees/${id}`),
  create:        (data)   => api.post('/employees', data),
  update:        (id, data) => api.put(`/employees/${id}`, data),
  deactivate:    (id, data) => api.patch(`/employees/${id}/deactivate`, data),
  reactivate:    (id)     => api.patch(`/employees/${id}/reactivate`),
  getStats:      ()       => api.get('/employees/stats'),
  getDepartments:()       => api.get('/employees/departments'),
};

// ── Status config ──────────────────────────────────────────────
export const EMP_STATUS = {
  active:     { label: 'Aktif',       color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950', dot: 'bg-emerald-500' },
  inactive:   { label: 'Tidak Aktif', color: 'text-slate-600 dark:text-slate-400',    bg: 'bg-slate-100 dark:bg-slate-800',     dot: 'bg-slate-400'   },
  on_leave:   { label: 'Cuti',        color: 'text-blue-600 dark:text-blue-400',      bg: 'bg-blue-100 dark:bg-blue-950',       dot: 'bg-blue-500'    },
  terminated: { label: 'Berhenti',    color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-100 dark:bg-red-950',         dot: 'bg-red-500'     },
};

export const ROLE_CONFIG = {
  admin:      { label: 'Admin',      color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-950' },
  hr:         { label: 'HR',         color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-950'    },
  supervisor: { label: 'Supervisor', color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-100 dark:bg-amber-950'  },
  employee:   { label: 'Karyawan',   color: 'text-slate-600 dark:text-slate-400',  bg: 'bg-slate-100 dark:bg-slate-800'  },
};

export const toRupiah = (n) =>
  `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

export const formatJoinDate = (d) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

// Generate avatar initials + deterministic color
const AVATAR_COLORS = [
  'from-blue-500 to-blue-700',
  'from-purple-500 to-purple-700',
  'from-emerald-500 to-emerald-700',
  'from-amber-500 to-amber-700',
  'from-rose-500 to-rose-700',
  'from-indigo-500 to-indigo-700',
  'from-teal-500 to-teal-700',
  'from-orange-500 to-orange-700',
];

export const avatarColor = (name = '') => {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};
