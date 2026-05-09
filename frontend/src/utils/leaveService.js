import api from './api';

export const leaveService = {
  create:      (data)   => api.post('/leaves', data),
  getMyLeaves: (params) => api.get('/leaves', { params }),
  getMyQuota:  (year)   => api.get('/leaves/quota', { params: { year } }),
  getOne:      (id)     => api.get(`/leaves/${id}`),
  cancel:      (id)     => api.delete(`/leaves/${id}`),

  // Admin / HR
  getPending:  (params) => api.get('/leaves/admin/pending', { params }),
  getAll:      (params) => api.get('/leaves/admin/all', { params }),
  approve:     (id)     => api.patch(`/leaves/${id}/approve`),
  reject:      (id, reason) => api.patch(`/leaves/${id}/reject`, { rejection_reason: reason }),
};

export const LEAVE_TYPES = [
  { value: 'annual',    label: 'Cuti Tahunan',        icon: '🏖️',  color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-950'    },
  { value: 'sick',      label: 'Cuti Sakit',           icon: '🏥',  color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-100 dark:bg-red-950'      },
  { value: 'emergency', label: 'Cuti Darurat',         icon: '🚨',  color: 'text-orange-600 dark:text-orange-400',bg: 'bg-orange-100 dark:bg-orange-950'},
  { value: 'maternity', label: 'Cuti Melahirkan',      icon: '👶',  color: 'text-pink-600 dark:text-pink-400',    bg: 'bg-pink-100 dark:bg-pink-950'    },
  { value: 'paternity', label: 'Cuti Ayah',            icon: '👨‍👶', color: 'text-indigo-600 dark:text-indigo-400',bg: 'bg-indigo-100 dark:bg-indigo-950'},
  { value: 'unpaid',    label: 'Cuti Tanpa Bayaran',   icon: '💸',  color: 'text-slate-600 dark:text-slate-400',  bg: 'bg-slate-100 dark:bg-slate-800'  },
  { value: 'other',     label: 'Lainnya',              icon: '📋',  color: 'text-purple-600 dark:text-purple-400',bg: 'bg-purple-100 dark:bg-purple-950'},
];

export const LEAVE_STATUS = {
  pending:   { label: 'Menunggu',  color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-100 dark:bg-amber-950',   dot: 'bg-amber-500'  },
  approved:  { label: 'Disetujui', color: 'text-emerald-600 dark:text-emerald-400',bg:'bg-emerald-100 dark:bg-emerald-950',dot: 'bg-emerald-500'},
  rejected:  { label: 'Ditolak',   color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-100 dark:bg-red-950',       dot: 'bg-red-500'    },
  cancelled: { label: 'Dibatalkan',color: 'text-slate-500 dark:text-slate-400',   bg: 'bg-slate-100 dark:bg-slate-800',   dot: 'bg-slate-400'  },
};

export const getLeaveType = (value) =>
  LEAVE_TYPES.find(t => t.value === value) || LEAVE_TYPES[6];

export const formatLeaveDates = (start, end) => {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end   + 'T00:00:00');
  const opts = { day: 'numeric', month: 'short' };
  const optsFull = { day: 'numeric', month: 'short', year: 'numeric' };
  if (start === end) return s.toLocaleDateString('id-ID', optsFull);
  if (s.getFullYear() === e.getFullYear())
    return `${s.toLocaleDateString('id-ID', opts)} – ${e.toLocaleDateString('id-ID', optsFull)}`;
  return `${s.toLocaleDateString('id-ID', optsFull)} – ${e.toLocaleDateString('id-ID', optsFull)}`;
};
