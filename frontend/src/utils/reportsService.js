import api from './api';

export const reportsService = {
  getOverview:   (params) => api.get('/reports/overview',   { params }),
  getAttendance: (params) => api.get('/reports/attendance', { params }),
  getLeaves:     (params) => api.get('/reports/leaves',     { params }),
  getPayroll:    (params) => api.get('/reports/payroll',    { params }),
  getEmployees:  (params) => api.get('/reports/employees',  { params }),
  export:        (params) => api.get('/reports/export',     { params }),
};

// ── CSV Export util ───────────────────────────────────────────
export const downloadCSV = (rows, filename) => {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h] ?? '';
        const str = String(val);
        // Wrap in quotes if contains comma, quotes, or newlines
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ];

  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href  = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ── Formatters ────────────────────────────────────────────────
export const toRupiah = (n) =>
  `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

export const toRupiahShort = (n) => {
  const num = Number(n || 0);
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`;
  if (num >= 1_000_000)     return `Rp ${(num / 1_000_000).toFixed(1)}jt`;
  if (num >= 1_000)         return `Rp ${(num / 1_000).toFixed(0)}rb`;
  return `Rp ${num}`;
};

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const currentYear = () => new Date().getFullYear();

export const prevMonth = (m) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const nextMonth = (m) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
export const monthLabel = (m) => {
  if (!m) return '';
  const [y, mo] = m.split('-');
  return `${MONTHS_ID[parseInt(mo) - 1]} ${y}`;
};

export const monthShort = (m) => {
  if (!m) return '';
  const mo = parseInt(m.split('-')[1]);
  return MONTHS_ID[mo - 1];
};
