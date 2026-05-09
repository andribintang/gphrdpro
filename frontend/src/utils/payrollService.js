import api from './api';

export const payrollService = {
  // Admin/HR
  generate:  (data)   => api.post('/payroll/generate', data),
  getAll:    (params) => api.get('/payroll', { params }),
  getSummary:(params) => api.get('/payroll/summary', { params }),
  markPaid:  (id)     => api.patch(`/payroll/${id}/pay`),
  bulkPay:   (month)  => api.post('/payroll/bulk-pay', { month }),
  remove:    (id)     => api.delete(`/payroll/${id}`),

  // All roles
  getMy:  (params) => api.get('/payroll/my', { params }),
  getOne: (id)     => api.get(`/payroll/${id}`),
};

// ── Formatters ─────────────────────────────────────────────────
export const toRupiah = (amount) => {
  if (amount === null || amount === undefined) return 'Rp 0';
  return `Rp ${Number(amount).toLocaleString('id-ID')}`;
};

export const toRupiahShort = (amount) => {
  const n = Number(amount);
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n}`;
};

export const monthLabel = (month) => {
  if (!month) return '';
  const [y, m] = month.split('-');
  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni',
                  'Juli','Agustus','September','Oktober','November','Desember'];
  return `${MONTHS[parseInt(m) - 1]} ${y}`;
};

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const prevMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const nextMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ── Status config ──────────────────────────────────────────────
export const PAYROLL_STATUS = {
  draft: {
    label: 'Draft',
    color: 'text-slate-600 dark:text-slate-400',
    bg:    'bg-slate-100 dark:bg-slate-800',
    dot:   'bg-slate-400',
  },
  processed: {
    label: 'Diproses',
    color: 'text-amber-600 dark:text-amber-400',
    bg:    'bg-amber-100 dark:bg-amber-950',
    dot:   'bg-amber-500',
  },
  paid: {
    label: 'Dibayar',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg:    'bg-emerald-100 dark:bg-emerald-950',
    dot:   'bg-emerald-500',
  },
};
