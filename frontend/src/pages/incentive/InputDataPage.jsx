import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  RefreshCw, MessageCircle, Star, Plus,
  Trash2, X, Loader2, ChevronLeft, AlertTriangle,
  CheckCircle2, Calculator
} from 'lucide-react';
import toast from 'react-hot-toast';
import { incentiveService, toRp, toRpShort, MONTHS_ID, PERIOD_STATUS } from '../../utils/incentive/incentiveService';

// ── Shared ────────────────────────────────────────────────────
const SectionTitle = ({ title, sub }) => (
  <div className="mb-4">
    <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
    {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
  </div>
);

// ════════════════════════════════════════════════════════════════
// WA SALES TAB
// ════════════════════════════════════════════════════════════════
const WaTab = ({ periodId, branches, employees, channel, periodLocked }) => {
  const [sales, setSales]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [filterBranch, setFB] = useState('');
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    employee_id: '',
    branch_id: '',
    customer_name: '',
    sale_amount: '',
    notes: '',
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await incentiveService.getWaSales({ period_id: periodId, branch_id: filterBranch || undefined });
      setSales(res.data.data.sales);
    } catch { toast.error('Gagal memuat data WA'); }
    finally { setLoading(false); }
  }, [periodId, filterBranch]);

  useEffect(() => { fetch(); }, [fetch]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filteredEmps = employees.filter(e => !form.branch_id || e.branch_id == form.branch_id);

  const handleAdd = async () => {
    if (!form.employee_id || !form.sale_amount || !form.date) {
      toast.error('Karyawan, tanggal, dan nominal wajib diisi'); return;
    }
    setSaving(true);
    try {
      const res = await incentiveService.createWaSale({ ...form, period_id: periodId });
      toast.success(`Penjualan ditambahkan · Insentif: ${toRp(res.data.data.incentive)}`);
      setShowAdd(false);
      setForm({ date: new Date().toISOString().split('T')[0], employee_id:'', branch_id: form.branch_id, customer_name:'', sale_amount:'', notes:'' });
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name, amount) => {
    if (!window.confirm(`Hapus data penjualan WA\n${name} — Rp ${new Intl.NumberFormat('id-ID').format(amount)}?\n\nData yang dihapus tidak bisa dikembalikan.`)) return;
    setDeleting(id);
    try { await incentiveService.deleteWaSale(id); toast.success('Transaksi dihapus'); fetch(); }
    catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setDeleting(null); }
  };

  const handleSync = async () => {
    if (!window.confirm(`Sinkronisasi data penjualan dari ERP ke periode ini?\n\n• Hanya order berstatus "Selesai" yang akan ditarik\n• Data retur akan mengurangi nilai penjualan\n• Data yang sudah ada tidak akan terduplikasi`)) return;
    setSyncing(true);
    try {
      const res = await incentiveService.syncFromERP(periodId);
      const d = res.data.data;
      toast.success(`Sinkronisasi selesai!\nWA: +${d.wa.added} baru, ${d.wa.updated} update\nMarketplace: +${d.mp.added} baru`);
      fetch();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal sinkronisasi'); }
    finally { setSyncing(false); }
  };

  const totalSales     = sales.reduce((s, r) => s + parseFloat(r.sale_amount), 0);
  const totalIncentive = sales.reduce((s, r) => s + parseFloat(r.incentive_amount), 0);

  return (
    <div className="space-y-4">
      {/* Channel info */}
      {channel && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900">
          <span className="text-2xl">💬</span>
          <div>
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Insentif WA = Nominal × {parseFloat(channel.percentage)}%</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Input per transaksi penjualan</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="card p-3 text-center">
          <p className="text-sm font-black text-[var(--text-primary)]">{toRpShort(totalSales)}</p>
          <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">Total Penjualan WA</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{toRpShort(totalIncentive)}</p>
          <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">Total Insentif</p>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="flex gap-2">
        <select value={filterBranch} onChange={e => setFB(e.target.value)} className="input-base text-sm flex-1">
          <option value="">Semua Cabang</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {!periodLocked && (
          <>
            <button onClick={handleSync} disabled={syncing} className="btn-secondary h-10 px-3 text-xs flex-shrink-0 gap-1.5">
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <RefreshCw className="w-3.5 h-3.5"/>}
              Sync ERP
            </button>
            <button onClick={() => setShowAdd(true)} className="btn-primary h-10 px-3 text-xs flex-shrink-0">
              <Plus className="w-3.5 h-3.5" /> Tambah
            </button>
          </>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : sales.length === 0 ? (
        <div className="text-center py-10">
          <MessageCircle className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada transaksi WA</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
          {sales.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{s.employee?.name}</p>
                  <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">{s.branch?.code}</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">{s.date} · {s.customer_name || '—'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{toRp(s.sale_amount)}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">→ {toRp(s.incentive_amount)}</span>
                </div>
              </div>
              {!periodLocked && (
                <button onClick={() => handleDelete(s.id, s.employee?.name || '', s.sale_amount)} disabled={deleting === s.id}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950 flex-shrink-0">
                  {deleting === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Tambah Penjualan WA</h3>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><X className="w-4 h-4" /></button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Cabang</label>
              <select value={form.branch_id} onChange={e => { sf('branch_id', e.target.value); sf('employee_id', ''); }} className="input-base text-sm">
                <option value="">Pilih cabang...</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Karyawan *</label>
              <select value={form.employee_id} onChange={e => sf('employee_id', e.target.value)} className="input-base text-sm">
                <option value="">Pilih karyawan...</option>
                {filteredEmps.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Tanggal *</label>
              <input type="date" value={form.date} onChange={e => sf('date', e.target.value)} className="input-base text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Customer</label>
              <input value={form.customer_name} onChange={e => sf('customer_name', e.target.value)} placeholder="Nama customer" className="input-base text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Nominal Penjualan *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">Rp</span>
                <input type="number" value={form.sale_amount} onChange={e => sf('sale_amount', e.target.value)} placeholder="500000" className="input-base pl-10 text-sm" />
              </div>
              {form.sale_amount && channel && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Insentif: {toRp(parseFloat(form.sale_amount) * parseFloat(channel.percentage) / 100)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Keterangan</label>
              <input value={form.notes} onChange={e => sf('notes', e.target.value)} placeholder="Opsional" className="input-base text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 h-11 text-sm">Batal</button>
              <button onClick={handleAdd} disabled={saving} className="btn-primary flex-1 h-11 text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MARKETPLACE / WEB TAB (same UI, different channel)
// ════════════════════════════════════════════════════════════════
const PerChannelTab = ({ periodId, branches, employees, channel, channelType, periodLocked }) => {
  const [salesList, setSalesList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selectedBranch, setBranch] = useState('');
  const [form, setForm] = useState({ total_amount: '', notes: '' });
  const [shares, setShares] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const fn  = channelType === 'MARKETPLACE' ? incentiveService.getMarketplaceSales : incentiveService.getWebSales;
      const res = await fn({ period_id: periodId });
      setSalesList(res.data.data.sales);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, [periodId, channelType]);

  useEffect(() => { fetch(); }, [fetch]);

  // When branch selected, init shares from employees of that branch
  useEffect(() => {
    if (!selectedBranch) { setShares([]); return; }

    // Check existing sale for this branch+period
    const existing = salesList.find(s => s.branch_id == selectedBranch);
    if (existing) {
      setForm({ total_amount: existing.total_amount, notes: existing.notes || '' });
      setShares(existing.shares?.map(sh => ({
        employee_id:      sh.employee_id,
        name:             sh.employee?.name,
        share_percentage: parseFloat(sh.share_percentage),
      })) || []);
    } else {
      setForm({ total_amount: '', notes: '' });
      const branchEmps = employees.filter(e => e.branch_id == selectedBranch && e.is_active);
      const equalShare = branchEmps.length > 0 ? parseFloat((100 / branchEmps.length).toFixed(3)) : 0;
      setShares(branchEmps.map(e => ({
        employee_id: e.id, name: e.name,
        share_percentage: equalShare,
      })));
    }
  }, [selectedBranch, salesList, employees]);

  const totalPct    = shares.reduce((s, r) => s + (parseFloat(r.share_percentage) || 0), 0);
  const pctValid    = Math.abs(totalPct - 100) < 0.01;
  const totalAmount = parseFloat(form.total_amount) || 0;

  const setSharePct = (idx, val) => {
    setShares(prev => prev.map((s, i) => i === idx ? { ...s, share_percentage: parseFloat(val) || 0 } : s));
  };

  const handleSave = async () => {
    if (!selectedBranch) { toast.error('Pilih cabang terlebih dahulu'); return; }
    if (!form.total_amount || totalAmount <= 0) { toast.error('Nominal penjualan wajib diisi'); return; }
    if (!pctValid) { toast.error(`Total pembagian harus 100%! Sekarang: ${totalPct.toFixed(2)}%`); return; }

    setSaving(true);
    try {
      const payload = {
        period_id:    periodId,
        branch_id:    selectedBranch,
        total_amount: totalAmount,
        notes:        form.notes,
        shares:       shares.map(s => ({ employee_id: s.employee_id, share_percentage: s.share_percentage })),
      };
      const fn = channelType === 'MARKETPLACE' ? incentiveService.upsertMarketplaceSale : incentiveService.upsertWebSale;
      await fn(payload);
      toast.success('Data berhasil disimpan!');
      fetch();
    } catch (e) {
      const msg = e.response?.data?.message || 'Gagal';
      if (e.response?.data?.code === 'SHARE_NOT_100') toast.error(msg);
      else toast.error(msg);
    } finally { setSaving(false); }
  };

  const icon  = channelType === 'MARKETPLACE' ? '🛒' : '🌐';
  const color = channelType === 'MARKETPLACE' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400';
  const bg    = channelType === 'MARKETPLACE' ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-900' : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900';

  return (
    <div className="space-y-4">
      {/* Channel info */}
      {channel && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${bg}`}>
          <span className="text-2xl">{icon}</span>
          <div>
            <p className={`text-xs font-bold ${color}`}>
              Insentif = Performance × {parseFloat(channel.percentage)}%
            </p>
            <p className={`text-xs ${color} opacity-70`}>Input total per periode, bagi % ke karyawan</p>
          </div>
        </div>
      )}

      {/* Existing data per branch */}
      {salesList.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Data Tersimpan</p>
          {salesList.map(s => (
            <div key={s.id} className="card p-3">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-bold text-[var(--text-primary)]">{s.branch?.name}</p>
                <p className="text-sm font-black text-[var(--text-primary)]">{toRpShort(s.total_amount)}</p>
              </div>
              <div className="space-y-1">
                {s.shares?.map(sh => (
                  <div key={sh.id} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{sh.employee?.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-muted)]">{parseFloat(sh.share_percentage)}%</span>
                      <span className="text-[var(--text-muted)]">→</span>
                      <span className="text-[var(--text-secondary)] font-semibold">{toRp(sh.performance_amount)}</span>
                      <span className={`font-bold ${color}`}>{toRp(sh.incentive_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
              {!periodLocked && (
                <button onClick={() => setBranch(String(s.branch_id))}
                  className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
                  Edit Data Ini
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Form */}
      {!periodLocked && (
        <div className="card p-4 space-y-4">
          <p className="text-xs font-bold text-[var(--text-primary)]">
            {salesList.length > 0 ? 'Input Cabang Lain / Edit' : 'Input Data'}
          </p>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Pilih Cabang</label>
            <select value={selectedBranch} onChange={e => setBranch(e.target.value)} className="input-base text-sm">
              <option value="">Pilih cabang...</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {selectedBranch && (
            <>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Total Penjualan</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">Rp</span>
                  <input type="number" value={form.total_amount}
                    onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
                    placeholder="100000000" className="input-base pl-10 text-sm" />
                </div>
                {form.total_amount && <p className="text-xs text-[var(--text-muted)] mt-1">{toRp(form.total_amount)}</p>}
              </div>

              {/* Share table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Pembagian %</label>
                  <span className={`text-xs font-bold ${pctValid ? 'text-emerald-600' : 'text-red-500'}`}>
                    Total: {totalPct.toFixed(2)}% {pctValid ? '✓' : '⚠ harus 100%'}
                  </span>
                </div>
                <div className="card overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[var(--bg-secondary)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    <span className="col-span-5">Karyawan</span>
                    <span className="col-span-3 text-center">%</span>
                    <span className="col-span-4 text-right">Performance</span>
                  </div>
                  {shares.map((sh, i) => {
                    const perf = totalAmount * (parseFloat(sh.share_percentage) || 0) / 100;
                    const inc  = perf * (parseFloat(channel?.percentage) || 0) / 100;
                    return (
                      <div key={sh.employee_id} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 border-t border-[var(--border-subtle)]">
                        <div className="col-span-5 min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{sh.name}</p>
                        </div>
                        <div className="col-span-3">
                          <div className="relative">
                            <input type="number" step="0.001" min="0" max="100"
                              value={sh.share_percentage || ''}
                              onChange={e => setSharePct(i, e.target.value)}
                              className="input-base text-xs text-center pr-5 h-8"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] font-bold">%</span>
                          </div>
                        </div>
                        <div className="col-span-4 text-right">
                          <p className="text-xs font-bold text-[var(--text-primary)]">{toRpShort(perf)}</p>
                          <p className={`text-[10px] font-semibold ${channelType === 'MARKETPLACE' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            {toRpShort(inc)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {/* Total row */}
                  <div className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                    <span className="col-span-5 text-xs font-bold text-[var(--text-primary)]">Total</span>
                    <span className={`col-span-3 text-xs font-black text-center ${pctValid ? 'text-emerald-600' : 'text-red-500'}`}>
                      {totalPct.toFixed(2)}%
                    </span>
                    <div className="col-span-4 text-right">
                      <p className="text-xs font-bold text-[var(--text-primary)]">{toRpShort(totalAmount)}</p>
                      <p className={`text-[10px] font-semibold ${channelType === 'MARKETPLACE' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {toRpShort(totalAmount * (parseFloat(channel?.percentage) || 0) / 100)}
                      </p>
                    </div>
                  </div>
                </div>
                {!pctValid && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> Total pembagian harus tepat 100%
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Catatan</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opsional" className="input-base text-sm" />
              </div>

              <button onClick={handleSave} disabled={saving || !pctValid} className="btn-primary w-full h-11 text-sm disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Simpan Data {channelType === 'MARKETPLACE' ? 'Marketplace' : 'Web'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// ACTIVITIES TAB
// ════════════════════════════════════════════════════════════════
const ActivitiesTab = ({ periodId, branches, employees, activityTypes, periodLocked }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    employee_id: '', branch_id: '',
    activity_type_id: '', qty: '', notes: '',
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await incentiveService.getActivities({ period_id: periodId });
      setActivities(res.data.data.activities);
    } catch { toast.error('Gagal memuat aktivitas'); }
    finally { setLoading(false); }
  }, [periodId]);

  useEffect(() => { fetch(); }, [fetch]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedActivity = activityTypes.find(a => a.id == form.activity_type_id);
  const filteredEmps     = employees.filter(e => !form.branch_id || e.branch_id == form.branch_id);
  const previewIncentive = form.qty && selectedActivity
    ? parseFloat(form.qty) * parseFloat(selectedActivity.nominal)
    : 0;

  const handleAdd = async () => {
    if (!form.employee_id || !form.activity_type_id || !form.qty) {
      toast.error('Karyawan, aktivitas, dan qty wajib diisi'); return;
    }
    setSaving(true);
    try {
      const res = await incentiveService.createActivity({ ...form, period_id: periodId });
      toast.success(`Aktivitas ditambahkan · Insentif: ${toRp(res.data.data.incentive)}`);
      setShowAdd(false);
      setForm(f => ({ ...f, employee_id:'', qty:'', notes:'' }));
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const totalIncentive = activities.reduce((s, a) => s + parseFloat(a.incentive_amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="card p-3 text-center">
          <p className="text-sm font-black text-[var(--text-primary)]">{activities.length}</p>
          <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">Total Aktivitas</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-sm font-black text-purple-600 dark:text-purple-400">{toRpShort(totalIncentive)}</p>
          <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">Total Insentif</p>
        </div>
      </div>

      {!periodLocked && (
        <button onClick={() => setShowAdd(true)} className="btn-primary w-full h-10 text-sm">
          <Plus className="w-4 h-4" /> Tambah Aktivitas
        </button>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-10">
          <Star className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada data aktivitas</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
          {activities.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{a.employee?.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {a.date} · {a.activityType?.name} · {a.qty} {a.activityType?.unit_label}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">{toRp(a.incentive_amount)}</p>
              </div>
              {!periodLocked && (
                <button onClick={() => { setDeleting(a.id); incentiveService.deleteActivity(a.id).then(() => { toast.success('Dihapus'); fetch(); setDeleting(null); }).catch(() => { toast.error('Gagal'); setDeleting(null); }); }}
                  disabled={deleting === a.id}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950 flex-shrink-0">
                  {deleting === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up p-5 space-y-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Tambah Aktivitas</h3>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"><X className="w-4 h-4" /></button>
            </div>

            {[
              { label:'Cabang', type:'select', field:'branch_id', options: [{value:'',label:'Pilih cabang...'}, ...branches.map(b=>({value:b.id,label:b.name}))], onChange: v => { sf('branch_id', v); sf('employee_id', ''); } },
              { label:'Karyawan *', type:'select', field:'employee_id', options: [{value:'',label:'Pilih karyawan...'}, ...filteredEmps.map(e=>({value:e.id,label:e.name}))] },
              { label:'Jenis Aktivitas *', type:'select', field:'activity_type_id', options: [{value:'',label:'Pilih aktivitas...'}, ...activityTypes.map(a=>({value:a.id,label:`${a.name} (${toRp(a.nominal)}/${a.unit_label})`}))] },
              { label:'Tanggal', type:'date', field:'date' },
            ].map(f => (
              <div key={f.field}>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{f.label}</label>
                {f.type === 'select' ? (
                  <select value={form[f.field]} onChange={e => (f.onChange || (v => sf(f.field, v)))(e.target.value)} className="input-base text-sm">
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={f.type} value={form[f.field]} onChange={e => sf(f.field, e.target.value)} className="input-base text-sm" />
                )}
              </div>
            ))}

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                {selectedActivity ? `${selectedActivity.calc_type === 'per_hour' ? 'Jumlah Jam' : 'Jumlah'} (${selectedActivity.unit_label}) *` : 'Qty *'}
              </label>
              <input type="number" step="0.5" value={form.qty} onChange={e => sf('qty', e.target.value)} placeholder="0" className="input-base text-sm" />
              {previewIncentive > 0 && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Insentif: {toRp(previewIncentive)}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Catatan</label>
              <input value={form.notes} onChange={e => sf('notes', e.target.value)} placeholder="Opsional" className="input-base text-sm" />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 h-10 text-sm">Batal</button>
              <button onClick={handleAdd} disabled={saving} className="btn-primary flex-1 h-10 text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN INPUT DATA PAGE
// ════════════════════════════════════════════════════════════════
const TABS = [
  { id:'wa',          label:'WA',          icon:'💬' },
  { id:'marketplace', label:'Marketplace', icon:'🛒' },
  { id:'web',         label:'Web',         icon:'🌐' },
  { id:'activities',  label:'Aktivitas',   icon:'⭐' },
];

export default function InputDataPage() {
  const { periodId } = useParams();
  const navigate     = useNavigate();
  const [activeTab, setActiveTab] = useState('wa');
  const [period, setPeriod]       = useState(null);
  const [branches, setBranches]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [channels, setChannels]   = useState([]);
  const [actTypes, setActTypes]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [calculating, setCalc]    = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [pRes, bRes, eRes, cRes, aRes] = await Promise.all([
          incentiveService.getPeriod(periodId),
          incentiveService.getBranches(),
          incentiveService.getEmployees({ is_active: true }),
          incentiveService.getChannels(),
          incentiveService.getActivityTypes({ active_only: true }),
        ]);
        setPeriod(pRes.data.data.period);
        setBranches(bRes.data.data.branches);
        setEmployees(eRes.data.data.employees);
        setChannels(cRes.data.data.channels);
        setActTypes(aRes.data.data.activity_types);
      } catch { toast.error('Gagal memuat data'); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [periodId]);

  const handleCalculate = async () => {
    if (!confirm('Hitung insentif sekarang?')) return;
    setCalc(true);
    try {
      const res = await incentiveService.calculatePeriod(periodId);
      const d   = res.data.data;
      toast.success(`✅ Kalkulasi selesai! Total: ${toRpShort(d.total_incentive_paid)}`);
      navigate(`/incentive/results/${periodId}`);
    } catch (e) { toast.error(e.response?.data?.message || 'Kalkulasi gagal'); }
    finally { setCalc(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
    </div>
  );

  const waChannel  = channels.find(c => c.code === 'WA');
  const mpChannel  = channels.find(c => c.code === 'MARKETPLACE');
  const webChannel = channels.find(c => c.code === 'WEB');
  const isLocked   = period?.status === 'locked';

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/incentive/periods')}
          className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-[var(--text-primary)] truncate">{period?.name}</h1>
          <div className="flex items-center gap-2">
            <p className="text-xs text-[var(--text-secondary)]">Input Data Penjualan & Aktivitas</p>
            {period && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${PERIOD_STATUS[period.status]?.bg} ${PERIOD_STATUS[period.status]?.color}`}>
                {PERIOD_STATUS[period.status]?.label}
              </span>
            )}
          </div>
        </div>
        {!isLocked && (
          <button onClick={handleCalculate} disabled={calculating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all active:scale-95 flex-shrink-0">
            {calculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
            Hitung
          </button>
        )}
      </div>

      {isLocked && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4" /> Periode terkunci — data tidak dapat diubah
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-secondary)] p-1 rounded-2xl border border-[var(--border)] mb-5 overflow-x-auto scrollbar-thin">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap
              ${activeTab === tab.id ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'wa' && (
        <WaTab periodId={periodId} branches={branches} employees={employees} channel={waChannel} periodLocked={isLocked} />
      )}
      {activeTab === 'marketplace' && (
        <PerChannelTab periodId={periodId} branches={branches} employees={employees} channel={mpChannel} channelType="MARKETPLACE" periodLocked={isLocked} />
      )}
      {activeTab === 'web' && (
        <PerChannelTab periodId={periodId} branches={branches} employees={employees} channel={webChannel} channelType="WEB" periodLocked={isLocked} />
      )}
      {activeTab === 'activities' && (
        <ActivitiesTab periodId={periodId} branches={branches} employees={employees} activityTypes={actTypes} periodLocked={isLocked} />
      )}
    </div>
  );
}
