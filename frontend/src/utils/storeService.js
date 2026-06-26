import api from './api';

const BASE = '/store/admin';

// ── Stats ─────────────────────────────────────────────────────
export const getStoreStats    = (brand)       => api.get(`${BASE}/stats`, { params: { brand } });

// ── Config ────────────────────────────────────────────────────
export const getStoreConfig   = ()            => api.get(`${BASE}/config`);
export const saveStoreConfig  = (data)        => api.post(`${BASE}/config`, data);

// ── Categories — read from ERP ────────────────────────────────
// Use ERP categories directly (branch_id: 1=gpracing, 2=gpdistro)
export const getStoreCategories = (brand)     => api.get(`${BASE}/categories`, { params: { brand } });
// Also expose ERP categories endpoint directly for dropdowns
export const getErpCategories = (branchId)   => api.get('/erp/categories', { params: { branch_id: branchId, limit: 200 } });

// ── Products ──────────────────────────────────────────────────
export const getStoreProducts   = (params)    => api.get(`${BASE}/products`, { params });
export const createStoreProduct = (data)      => api.post(`${BASE}/products`, data);
export const updateStoreProduct = (id, data)  => api.put(`${BASE}/products/${id}`, data);
export const deleteStoreProduct    = (id)      => api.delete(`${BASE}/products/${id}`);
export const bulkUpdateCategory    = (data)    => api.patch(`${BASE}/products/bulk-category`, data);
export const bulkDeleteProducts    = (data)    => api.post(`${BASE}/products/bulk-delete`, data);

// ── Banners ───────────────────────────────────────────────────
export const getStoreBanners    = (brand)     => api.get(`${BASE}/banners`, { params: { brand } });
export const createStoreBanner  = (data)      => api.post(`${BASE}/banners`, data);
export const updateStoreBanner  = (id, data)  => api.put(`${BASE}/banners/${id}`, data);
export const deleteStoreBanner  = (id)        => api.delete(`${BASE}/banners/${id}`);

// ── Vouchers ──────────────────────────────────────────────────
export const getStoreVouchers   = (brand)     => api.get(`${BASE}/vouchers`, { params: { brand } });
export const createStoreVoucher = (data)      => api.post(`${BASE}/vouchers`, data);
export const updateStoreVoucher = (id, data)  => api.put(`${BASE}/vouchers/${id}`, data);

// ── Orders ────────────────────────────────────────────────────
export const getStoreOrders          = (params)    => api.get(`${BASE}/orders`, { params });
export const updateStoreOrderStatus  = (id, data)  => api.patch(`${BASE}/orders/${id}/status`, data);

// ── Sync ERP → Store ──────────────────────────────────────────
export const getSyncStatus   = (brand)       => api.get(`${BASE}/sync-status`, { params: { brand } });
export const syncFromERP     = (data)        => api.post(`${BASE}/sync-from-erp`, data);
export const syncStock       = (data)        => api.post(`${BASE}/sync-stock`, data);
