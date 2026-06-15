import api from './api';

const BASE = '/payroll-engine';

export const payrollEngineService = {
  // Runs
  generateRun:  (data)   => api.post(`${BASE}/runs/generate`, data),
  getRuns:      (params) => api.get(`${BASE}/runs`, { params }),
  getRunDetail: (id, params) => api.get(`${BASE}/runs/${id}`, { params }),
  approveRun:   (id)     => api.patch(`${BASE}/runs/${id}/approve`),
  markPaid:     (id, data)   => api.patch(`${BASE}/runs/${id}/pay`, data),

  // Slip
  getItem:      (id)     => api.get(`${BASE}/items/${id}`),
  getMy:        (params) => api.get(`${BASE}/my`, { params }),

  // Components
  getComponents:    (params) => api.get(`${BASE}/components`, { params }),
  createComponent:  (data)   => api.post(`${BASE}/components`, data),
  updateComponent:  (id, data) => api.put(`${BASE}/components/${id}`, data),
  toggleComponent:  (id)     => api.patch(`${BASE}/components/${id}/toggle`),

  // Allowances
  getEmployeeAllowances: (userId) => api.get(`${BASE}/allowances/${userId}`),
  upsertAllowance:       (userId, data) => api.post(`${BASE}/allowances/${userId}`, data),

  // Settings
  getSettings:    () => api.get(`${BASE}/settings`),
  updateSettings: (data) => api.put(`${BASE}/settings`, data),

  // Incentive
  getIncentiveParams:   (params) => api.get(`${BASE}/incentive/parameters`, { params }),
  createIncentiveParam: (data)   => api.post(`${BASE}/incentive/parameters`, data),

  // THR
  previewTHR: () => api.get(`${BASE}/thr/preview`),

  // Loans
  getLoans:    (params) => api.get(`${BASE}/loans`, { params }),
  getMyLoans:  ()       => api.get(`${BASE}/loans/my`),
  createLoan:  (data)   => api.post(`${BASE}/loans`, data),
  approveLoan: (id)     => api.patch(`${BASE}/loans/${id}/approve`),
};

export const toRupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
export const toRupiahShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000_000) return `Rp ${(v/1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v/1_000_000).toFixed(1)}jt`;
  if (v >= 1_000)     return `Rp ${(v/1_000).toFixed(0)}rb`;
  return `Rp ${v}`;
};

export const RUN_STATUS = {
  draft:      { label:'Draft',     color:'text-slate-500',                                 bg:'bg-slate-100 dark:bg-slate-800' },
  calculated: { label:'Dihitung',  color:'text-amber-600 dark:text-amber-400',             bg:'bg-amber-100 dark:bg-amber-950' },
  approved:   { label:'Disetujui', color:'text-blue-600 dark:text-blue-400',               bg:'bg-blue-100 dark:bg-blue-950' },
  paid:       { label:'Dibayar',   color:'text-emerald-600 dark:text-emerald-400',         bg:'bg-emerald-100 dark:bg-emerald-950' },
};

export const RUN_TYPES = {
  monthly:   { label:'Gaji Bulanan', icon:'💰', color:'text-brand-600 dark:text-brand-400',    bg:'bg-brand-100 dark:bg-brand-950' },
  thr:       { label:'THR',          icon:'🌙', color:'text-emerald-600 dark:text-emerald-400', bg:'bg-emerald-100 dark:bg-emerald-950' },
  bonus:     { label:'Bonus',        icon:'⭐', color:'text-amber-600 dark:text-amber-400',    bg:'bg-amber-100 dark:bg-amber-950' },
  incentive: { label:'Insentif',     icon:'🚀', color:'text-purple-600 dark:text-purple-400',  bg:'bg-purple-100 dark:bg-purple-950' },
};

export const MONTHS_ID = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
export const currentMonth = () => new Date().getMonth() + 1;
export const currentYear  = () => new Date().getFullYear();

// ── Flip Disbursement ─────────────────────────────────────────
export const flipService = {
  getBanks:        ()       => api.get('/flip/banks'),
  validateAccount: (data)   => api.post('/flip/validate-account', data),
  disburseRun:     (runId)  => api.post(`/flip/disburse/${runId}`),
  disburseItem:    (itemId) => api.post(`/flip/disburse-item/${itemId}`),
  getStatus:       (runId)  => api.get(`/flip/status/${runId}`),
};
