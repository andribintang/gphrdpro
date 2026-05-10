import api from '../api';

const BASE = '/incentive';

export const incentiveService = {
  // Dashboard
  getDashboard: () => api.get(`${BASE}/dashboard`),

  // Master — Branches
  getBranches:    ()      => api.get(`${BASE}/branches`),
  createBranch:   (data)  => api.post(`${BASE}/branches`, data),
  updateBranch:   (id, d) => api.put(`${BASE}/branches/${id}`, d),
  deleteBranch:   (id)    => api.delete(`${BASE}/branches/${id}`),

  // Master — Positions
  getPositions:   (params) => api.get(`${BASE}/positions`, { params }),
  createPosition: (data)   => api.post(`${BASE}/positions`, data),
  updatePosition: (id, d)  => api.put(`${BASE}/positions/${id}`, d),
  deletePosition: (id)     => api.delete(`${BASE}/positions/${id}`),

  // Master — Employees
  getEmployees:   (params) => api.get(`${BASE}/employees`, { params }),
  getEmployee:    (id)     => api.get(`${BASE}/employees/${id}`),
  createEmployee: (data)   => api.post(`${BASE}/employees`, data),
  updateEmployee: (id, d)  => api.put(`${BASE}/employees/${id}`, d),
  deleteEmployee: (id)     => api.delete(`${BASE}/employees/${id}`),

  // Master — Channels
  getChannels:    ()      => api.get(`${BASE}/channels`),
  updateChannel:  (id, d) => api.put(`${BASE}/channels/${id}`, d),

  // Master — Activity Types
  getActivityTypes:   (params) => api.get(`${BASE}/activity-types`, { params }),
  createActivityType: (data)   => api.post(`${BASE}/activity-types`, data),
  updateActivityType: (id, d)  => api.put(`${BASE}/activity-types/${id}`, d),
  deleteActivityType: (id)     => api.delete(`${BASE}/activity-types/${id}`),

  // Master — Bonus Targets
  getBonusTargets:   ()      => api.get(`${BASE}/bonus-targets`),
  createBonusTarget: (data)  => api.post(`${BASE}/bonus-targets`, data),
  updateBonusTarget: (id, d) => api.put(`${BASE}/bonus-targets/${id}`, d),
  deleteBonusTarget: (id)    => api.delete(`${BASE}/bonus-targets/${id}`),

  // Periods
  getPeriods:      (params) => api.get(`${BASE}/periods`, { params }),
  getPeriod:       (id)     => api.get(`${BASE}/periods/${id}`),
  createPeriod:    (data)   => api.post(`${BASE}/periods`, data),
  calculatePeriod: (id)     => api.post(`${BASE}/periods/${id}/calculate`),
  approvePeriod:   (id, d)  => api.post(`${BASE}/periods/${id}/approve`, d),
  lockPeriod:      (id)     => api.post(`${BASE}/periods/${id}/lock`),

  // WA Sales
  getWaSales:    (params) => api.get(`${BASE}/sales/wa`, { params }),
  createWaSale:  (data)   => api.post(`${BASE}/sales/wa`, data),
  updateWaSale:  (id, d)  => api.put(`${BASE}/sales/wa/${id}`, d),
  deleteWaSale:  (id)     => api.delete(`${BASE}/sales/wa/${id}`),

  // Marketplace
  getMarketplaceSales:   (params) => api.get(`${BASE}/sales/marketplace`, { params }),
  upsertMarketplaceSale: (data)   => api.post(`${BASE}/sales/marketplace`, data),

  // Web
  getWebSales:   (params) => api.get(`${BASE}/sales/web`, { params }),
  upsertWebSale: (data)   => api.post(`${BASE}/sales/web`, data),

  // Activities
  getActivities:   (params) => api.get(`${BASE}/activities`, { params }),
  createActivity:  (data)   => api.post(`${BASE}/activities`, data),
  deleteActivity:  (id)     => api.delete(`${BASE}/activities/${id}`),

  // Results
  getResults:      (params) => api.get(`${BASE}/results`, { params }),
  getResultDetail: (id)     => api.get(`${BASE}/results/${id}`),
};

// ── Formatters ────────────────────────────────────────────────
export const toRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
export const toRpShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000_000) return `Rp ${(v/1e9).toFixed(1)}M`;
  if (v >= 1_000_000)     return `Rp ${(v/1e6).toFixed(1)}jt`;
  if (v >= 1_000)         return `Rp ${(v/1e3).toFixed(0)}rb`;
  return `Rp ${v}`;
};

export const MONTHS_ID = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export const PERIOD_STATUS = {
  draft:      { label:'Draft',     color:'text-slate-500',                             bg:'bg-slate-100 dark:bg-slate-800',   dot:'bg-slate-400'  },
  calculated: { label:'Dihitung',  color:'text-amber-600 dark:text-amber-400',         bg:'bg-amber-100 dark:bg-amber-950',   dot:'bg-amber-500'  },
  approved:   { label:'Disetujui', color:'text-blue-600 dark:text-blue-400',           bg:'bg-blue-100 dark:bg-blue-950',     dot:'bg-blue-500'   },
  locked:     { label:'Terkunci',  color:'text-emerald-600 dark:text-emerald-400',     bg:'bg-emerald-100 dark:bg-emerald-950',dot:'bg-emerald-500'},
};

export const CHANNEL_COLORS = {
  WA:          { label:'WhatsApp',    color:'text-emerald-600', bg:'bg-emerald-100 dark:bg-emerald-950', icon:'💬' },
  MARKETPLACE: { label:'Marketplace', color:'text-orange-600',  bg:'bg-orange-100 dark:bg-orange-950',  icon:'🛒' },
  WEB:         { label:'Website',     color:'text-blue-600',    bg:'bg-blue-100 dark:bg-blue-950',      icon:'🌐' },
};
