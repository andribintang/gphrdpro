import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Edit3, X, Loader2,
  CheckCircle2, Phone, MapPin, RefreshCw,
  ShoppingCart, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRpShort } from '../../utils/erp/erpService';

const CustomerModal = ({ customer, onClose, onSuccess }) => {
  const isEdit = !!customer;
  const [form, setForm] = useState({
    name:        customer?.name        || '',
    phone:       customer?.phone       || '',
    email:       customer?.email       || '',
    address:     customer?.address     || '',
    city:        customer?.city        || '',
    province:    customer?.province    || '',
    postal_code: customer?.postal_code || '',
    notes:       customer?.notes       || '',
  });
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => setForm(f => ({...f,[k]:v}));

  const handle = async () => {
    if (!form.name.trim()) { toast.error('Nama wajib diisi'); return; }
    setSaving(true);
    try {
      if (isEdit) await erpService.updateCustomer(customer.id, form);
      else        await erpService.createCustomer(form);
      toast.success(isEdit ? 'Pelanggan diperbarui' : 'Pelanggan ditambahkan');
      onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{isEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin">
          {[
            { k:'name',        l:'Nama Lengkap', r:true  },
            { k:'phone',       l:'No. HP/WA',    t:'tel' },
            { k:'email',       l:'Email',        t:'email' },
            { k:'address',     l:'Alamat'                },
            { k:'city',        l:'Kota'                  },
            { k:'province',    l:'Provinsi'              },
            { k:'postal_code', l:'Kode Pos'              },
          ].map(f => (
            <div key={f.k}>
              <label className="field-label">{f.l}{f.r && <span className="text-red-500 ml-0.5">*</span>}</label>
              <input type={f.t||'text'} value={form[f.k]} onChange={e => sf(f.k, e.target.value)}
                className="input-base text-sm" />
            </div>
          ))}
          <div>
            <label className="field-label">Catatan</label>
            <textarea value={form.notes} onChange={e => sf('notes', e.target.value)}
              rows={2} className="input-base text-sm resize-none" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[var(--border)] flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 h-11 text-sm">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1 h-11 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isEdit ? 'Simpan' : 'Tambah'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CustomersPage() {
  const [customers, setCust] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editCust, setEdit]   = useState(null);
  const [total, setTotal]     = useState(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpService.getCustomers({ search: search||undefined, limit:100 });
      setCust(res.data.data.customers);
      setTotal(res.data.data.total);
    } catch { toast.error('Gagal memuat pelanggan'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Pelanggan</h1>
          <p className="text-sm text-[var(--text-secondary)]">{total} pelanggan terdaftar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary h-9 px-3 text-sm">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input type="text" placeholder="Cari nama, no. HP..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base pl-9 text-sm h-10 w-full" />
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-14">
          <Users className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada pelanggan</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 px-6 text-sm">Tambah Pelanggan</button>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
          {customers.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {c.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{c.name}</p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {c.phone && (
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Phone className="w-3 h-3" />{c.phone}
                    </span>
                  )}
                  {c.city && (
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <MapPin className="w-3 h-3" />{c.city}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {c.total_orders > 0 && (
                  <>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{c.total_orders}x order</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{toRpShort(c.total_spent)}</p>
                  </>
                )}
              </div>
              <button onClick={() => setEdit(c)}
                className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] flex-shrink-0">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && <CustomerModal onClose={() => setShowAdd(false)} onSuccess={fetch} />}
      {editCust && <CustomerModal customer={editCust} onClose={() => setEdit(null)} onSuccess={fetch} />}
    </div>
  );
}
