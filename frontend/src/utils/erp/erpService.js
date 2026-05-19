import api from '../api';

const BASE = '/erp';

export const erpService = {
  getCategories:   (p)      => api.get(`${BASE}/categories`, { params: p }),
  createCategory:  (d)      => api.post(`${BASE}/categories`, d),
  updateCategory:  (id, d)  => api.put(`${BASE}/categories/${id}`, d),
  deleteCategory:  (id)     => api.delete(`${BASE}/categories/${id}`),
  getProducts:     (p)      => api.get(`${BASE}/products`, { params: p }),
  getByBarcode:    (code)   => api.get(`${BASE}/products/barcode/${code}`),
  createProduct:   (d)      => api.post(`${BASE}/products`, d),
  updateProduct:   (id, d)  => api.put(`${BASE}/products/${id}`, d),
  deleteProduct:   (id)     => api.delete(`${BASE}/products/${id}`),
  adjustStock:     (d)      => api.post(`${BASE}/products/stock/adjust`, d),
  getCustomers:    (p)      => api.get(`${BASE}/customers`, { params: p }),
  createCustomer:  (d)      => api.post(`${BASE}/customers`, d),
  updateCustomer:  (id, d)  => api.put(`${BASE}/customers/${id}`, d),
  importData:      (d)      => api.post(`${BASE}/import`, d),
  getTemplate:     (type)   => api.get(`${BASE}/import/template/${type}`),
  getOrders:       (p)      => api.get(`${BASE}/orders`, { params: p }),
  getOrder:        (id)     => api.get(`${BASE}/orders/${id}`),
  createOrder:     (d)      => api.post(`${BASE}/orders`, d),
  confirmOrder:    (id)     => api.post(`${BASE}/orders/${id}/confirm`),
  completeOrder:   (id)     => api.post(`${BASE}/orders/${id}/complete`),
  cancelOrder:     (id)     => api.post(`${BASE}/orders/${id}/cancel`),
  addPayment:      (id, d)  => api.post(`${BASE}/orders/${id}/payments`, d),
  verifyPayment:   (id, pid)=> api.post(`${BASE}/orders/${id}/payments/${pid}/verify`),
  addShipment:     (id, d)  => api.post(`${BASE}/orders/${id}/shipment`, d),
  updateShipment:  (id, sid, d) => api.put(`${BASE}/orders/${id}/shipment/${sid}`, d),
  getSalesReport:  (p)      => api.get(`${BASE}/reports/sales`, { params: p }),
  getShipmentReport:(p)     => api.get(`${BASE}/reports/shipments`, { params: p }),
};

export const toRp = (n) => `Rp ${Number(n||0).toLocaleString('id-ID')}`;
export const toRpShort = (n) => {
  const v = Number(n||0);
  if (v >= 1_000_000_000) return `Rp ${(v/1e9).toFixed(1)}M`;
  if (v >= 1_000_000)     return `Rp ${(v/1e6).toFixed(1)}jt`;
  if (v >= 1_000)         return `Rp ${(v/1e3).toFixed(0)}rb`;
  return `Rp ${v}`;
};

export const CHANNELS = {
  wa:          { label:'WhatsApp',    color:'text-emerald-600 dark:text-emerald-400', bg:'bg-emerald-100 dark:bg-emerald-950', dot:'bg-emerald-500' },
  marketplace: { label:'Marketplace', color:'text-orange-600 dark:text-orange-400',  bg:'bg-orange-100 dark:bg-orange-950',  dot:'bg-orange-500' },
  direct:      { label:'Langsung',    color:'text-blue-600 dark:text-blue-400',      bg:'bg-blue-100 dark:bg-blue-950',      dot:'bg-blue-500' },
};

export const ORDER_STATUS = {
  draft:      { label:'Draft',         color:'text-slate-500',   bg:'bg-slate-100 dark:bg-slate-800' },
  confirmed:  { label:'Dikonfirmasi',  color:'text-blue-600',    bg:'bg-blue-100 dark:bg-blue-950' },
  processing: { label:'Diproses',      color:'text-amber-600',   bg:'bg-amber-100 dark:bg-amber-950' },
  shipped:    { label:'Dikirim',       color:'text-purple-600',  bg:'bg-purple-100 dark:bg-purple-950' },
  completed:  { label:'Selesai',       color:'text-emerald-600', bg:'bg-emerald-100 dark:bg-emerald-950' },
  cancelled:  { label:'Dibatalkan',    color:'text-red-600',     bg:'bg-red-100 dark:bg-red-950' },
};

export const PAYMENT_METHODS = {
  cash:     { label:'Cash/Tunai',    icon:'💵' },
  transfer: { label:'Transfer Bank', icon:'🏦' },
  qris:     { label:'QRIS',          icon:'📱' },
  cod:      { label:'COD',           icon:'📦' },
};

export const COURIERS = ['JNE','JNT','Sicepat','Anteraja','Ninja Express','Pos Indonesia','Tiki','GoSend','GrabExpress','Wahana'];
