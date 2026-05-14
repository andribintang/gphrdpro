import { useState, useEffect, useCallback } from 'react';
import {
  CalendarOff, Plus, X, ChevronRight,
  CheckCircle2, XCircle, Clock, Loader2, AlertTriangle,
  RefreshCw, FileText, Users, TrendingDown, Calendar,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  leaveService, LEAVE_TYPES, LEAVE_STATUS,
  getLeaveType, formatLeaveDates,
} from '../utils/leaveService';

// ── Shared: Status Badge ───────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = LEAVE_STATUS[status] || LEAVE_STATUS.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

// ── Reject Modal ───────────────────────────────────────────────
const RejectModal = ({ leave, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const lt = getLeaveType(leave.type);

  const handleReject = async () => {
    setLoading(true);
    try {
      await leaveService.reject(leave.id, reason);
      toast.success('Pengajuan cuti berhasil ditolak');
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menolak cuti');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative w-full sm:max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl
          border border-[var(--border)] shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--border2)]" />
        </div>

        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-4.5 h-4.5 text-red-600 dark:text-red-400" size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Tolak Pengajuan Cuti</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {leave.user?.name} · {lt.icon} {lt.label} · {leave.total_days} hari
            </p>
          </div>
          <button onClick={onClose}
            className="ml-auto w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center
              text-[var(--text-muted)] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Alasan Penolakan <span className="text-[var(--text-muted)] font-normal normal-case">(opsional)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Contoh: Jadwal bentrok dengan karyawan lain di divisi yang sama..."
              rows={3}
              className="input-base resize-none text-sm"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary flex-1 h-10 text-sm">
              Batal
            </button>
            <button onClick={handleReject} disabled={loading}
              className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold
                bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95 disabled:opacity-50">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Tolak Cuti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Shared: Leave Card ─────────────────────────────────────────
const LeaveCard = ({ leave, onCancel, onApprove, onReject, showUser = false }) => {
  const lt = getLeaveType(leave.type);
  const [actionLoading, setActionLoading] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const handleAction = async (action) => {
    if (action === 'reject') { setShowRejectModal(true); return; }
    setActionLoading(action);
    try {
      if (action === 'cancel')  { await leaveService.cancel(leave.id);  toast.success('Cuti dibatalkan'); onCancel?.(); }
      if (action === 'approve') { await leaveService.approve(leave.id); toast.success('Cuti disetujui ✅'); onApprove?.(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Aksi gagal');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div className="card overflow-hidden transition-all hover:border-[var(--border2)]">
        {/* Status stripe */}
        <div className={`h-1 w-full ${
          leave.status === 'approved'  ? 'bg-emerald-500' :
          leave.status === 'rejected'  ? 'bg-red-500'     :
          leave.status === 'cancelled' ? 'bg-slate-400'   :
          'bg-amber-400'
        }`} />

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${lt.bg}`}>
                {lt.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{lt.label}</p>
                {showUser && leave.user && (
                  <p className="text-xs text-[var(--text-muted)]">{leave.user.name}
                    {leave.user.employee && <span className="ml-1 opacity-60">· {leave.user.employee.department}</span>}
                  </p>
                )}
              </div>
            </div>
            <StatusBadge status={leave.status} />
          </div>

          {/* Date range */}
          <div className="flex items-center justify-between bg-[var(--bg-secondary)] rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {formatLeaveDates(leave.start_date, leave.end_date)}
              </span>
            </div>
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
              {leave.total_days} hari kerja
            </span>
          </div>

          {/* Reason */}
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {leave.reason}
          </p>

          {/* Rejection reason */}
          {leave.status === 'rejected' && leave.rejection_reason && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900">
              <MessageSquare className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400">{leave.rejection_reason}</p>
            </div>
          )}

          {/* Approver info */}
          {leave.approver && leave.status !== 'pending' && leave.status !== 'cancelled' && (
            <p className="text-[10px] text-[var(--text-muted)]">
              {leave.status === 'approved' ? '✓ Disetujui' : '✗ Ditolak'} oleh {leave.approver.name}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {leave.status === 'pending' && !showUser && (
              <button onClick={() => handleAction('cancel')} disabled={!!actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold
                  border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-950 transition-all active:scale-95 disabled:opacity-50">
                {actionLoading === 'cancel' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                Batalkan
              </button>
            )}
            {leave.status === 'pending' && showUser && (
              <>
                <button onClick={() => handleAction('approve')} disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold
                    bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-95 disabled:opacity-50">
                  {actionLoading === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Setujui
                </button>
                <button onClick={() => handleAction('reject')} disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold
                    border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400
                    hover:bg-red-50 dark:hover:bg-red-950 transition-all active:scale-95 disabled:opacity-50">
                  <XCircle className="w-3 h-3" />
                  Tolak
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && (
        <RejectModal
          leave={leave}
          onClose={() => setShowRejectModal(false)}
          onDone={() => { setShowRejectModal(false); onReject?.(); }}
        />
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
// QUOTA CARD COMPONENT
// ═══════════════════════════════════════════════════════════════
const QuotaCard = ({ quota, loading }) => {
  if (loading) return <div className="skeleton h-28 rounded-2xl" />;
  if (!quota) return null;

  const pct = quota.annual_quota > 0
    ? Math.round((quota.annual_used / (quota.annual_quota + quota.carry_over)) * 100)
    : 0;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
          Kuota Cuti {quota.year}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {quota.annual_remaining} hari tersisa
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-medium">
          <span>Terpakai: {quota.annual_used} hari</span>
          <span>Total: {quota.annual_quota + quota.carry_over} hari</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[var(--bg-secondary)] rounded-xl p-2.5 text-center">
          <p className="text-base font-bold text-[var(--text-primary)]">{quota.annual_remaining}</p>
          <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">Sisa Tahunan</p>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-xl p-2.5 text-center">
          <p className="text-base font-bold text-[var(--text-primary)]">{quota.carry_over}</p>
          <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">Carry Over</p>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-xl p-2.5 text-center">
          <p className="text-base font-bold text-[var(--text-primary)]">{quota.sick_used}</p>
          <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">Sakit Dipakai</p>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// APPLY LEAVE FORM (bottom sheet style)
// ═══════════════════════════════════════════════════════════════
const ApplyForm = ({ onClose, onSuccess, quota }) => {
  const [form, setForm] = useState({
    type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [previewDays, setPreviewDays] = useState(null);

  // Calculate preview days when dates change
  useEffect(() => {
    if (form.start_date && form.end_date && form.start_date <= form.end_date) {
      let count = 0;
      const cur = new Date(form.start_date);
      const end = new Date(form.end_date);
      while (cur <= end) {
        const d = cur.getDay();
        if (d !== 0 && d !== 6) count++;
        cur.setDate(cur.getDate() + 1);
      }
      setPreviewDays(count);
    } else {
      setPreviewDays(null);
    }
  }, [form.start_date, form.end_date]);

  const validate = () => {
    const e = {};
    if (!form.type)       e.type       = 'Pilih tipe cuti';
    if (!form.start_date) e.start_date = 'Tanggal mulai diperlukan';
    if (!form.end_date)   e.end_date   = 'Tanggal selesai diperlukan';
    if (form.start_date && form.end_date && form.start_date > form.end_date)
      e.end_date = 'Tanggal selesai harus setelah tanggal mulai';
    if (!form.reason || form.reason.length < 10) e.reason = 'Alasan minimal 10 karakter';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await leaveService.create(form);
      toast.success('Pengajuan cuti berhasil dikirim!');
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal mengajukan cuti';
      toast.error(msg);
      if (err.response?.data?.errors) {
        const fieldErrors = {};
        err.response.data.errors.forEach(e => { fieldErrors[e.param] = e.msg; });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

      {/* Sheet */}
      <div
        className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl
          border border-[var(--border)] shadow-2xl animate-slide-up max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--border2)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Ajukan Cuti</h3>
            <p className="text-xs text-[var(--text-muted)]">Isi semua kolom dengan benar</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-[var(--bg-secondary)] flex items-center justify-center
              text-[var(--text-muted)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quota reminder */}
          {quota && form.type === 'annual' && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
              bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-900">
              <TrendingDown className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <p className="text-xs text-brand-700 dark:text-brand-400 font-medium">
                Sisa kuota tahunan: <strong>{quota.annual_remaining} hari</strong>
              </p>
            </div>
          )}

          {/* Type selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Tipe Cuti
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LEAVE_TYPES.map(lt => (
                <button key={lt.value}
                  onClick={() => { setForm(f => ({ ...f, type: lt.value })); setErrors(e => ({ ...e, type: '' })); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold
                    transition-all active:scale-95
                    ${form.type === lt.value
                      ? `${lt.bg} ${lt.color} border-current`
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    }`}>
                  <span className="text-base">{lt.icon}</span>
                  {lt.label}
                </button>
              ))}
            </div>
            {errors.type && <p className="text-xs text-red-500 mt-1.5">{errors.type}</p>}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Mulai
              </label>
              <input type="date" value={form.start_date} min={today}
                onChange={e => { setForm(f => ({ ...f, start_date: e.target.value })); setErrors(e2 => ({ ...e2, start_date: '' })); }}
                className={`input-base text-sm ${errors.start_date ? 'border-red-400' : ''}`} />
              {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Selesai
              </label>
              <input type="date" value={form.end_date} min={form.start_date || today}
                onChange={e => { setForm(f => ({ ...f, end_date: e.target.value })); setErrors(e2 => ({ ...e2, end_date: '' })); }}
                className={`input-base text-sm ${errors.end_date ? 'border-red-400' : ''}`} />
              {errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
            </div>
          </div>

          {/* Days preview */}
          {previewDays !== null && (
            <div className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
              form.type === 'annual' && quota && previewDays > quota.annual_remaining
                ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900'
                : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900'
            }`}>
              <span className={`text-xs font-semibold ${
                form.type === 'annual' && quota && previewDays > quota.annual_remaining
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}>
                {form.type === 'annual' && quota && previewDays > quota.annual_remaining
                  ? `⚠️ Melebihi kuota (${quota.annual_remaining} hari tersisa)`
                  : `✓ ${previewDays} hari kerja`}
              </span>
              {form.type === 'annual' && quota && (
                <span className="text-xs text-[var(--text-muted)]">
                  Sisa setelah: {Math.max(0, quota.annual_remaining - previewDays)} hari
                </span>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Alasan
            </label>
            <textarea value={form.reason}
              onChange={e => { setForm(f => ({ ...f, reason: e.target.value })); setErrors(e2 => ({ ...e2, reason: '' })); }}
              placeholder="Tuliskan alasan pengajuan cuti (minimal 10 karakter)..."
              rows={3}
              className={`input-base resize-none text-sm ${errors.reason ? 'border-red-400' : ''}`} />
            <div className="flex justify-between mt-1">
              {errors.reason
                ? <p className="text-xs text-red-500">{errors.reason}</p>
                : <span />
              }
              <span className="text-[10px] text-[var(--text-muted)]">{form.reason.length}/1000</span>
            </div>
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading}
            className="btn-primary w-full h-12 text-sm">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
              : <><FileText className="w-4 h-4" /> Kirim Pengajuan</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MY LEAVES TAB
// ═══════════════════════════════════════════════════════════════
const MyLeavesTab = ({ quota, quotaLoading, onRefreshQuota }) => {
  const [leaves, setLeaves]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter]     = useState('all');

  const FILTERS = [
    { v: 'all',       l: 'Semua'    },
    { v: 'pending',   l: 'Menunggu' },
    { v: 'approved',  l: 'Disetujui'},
    { v: 'rejected',  l: 'Ditolak'  },
  ];

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      const res = await leaveService.getMyLeaves(params);
      setLeaves(res.data.data.leaves);
    } catch { toast.error('Gagal memuat data cuti'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleRefresh = () => { fetch(); onRefreshQuota(); };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Quota card */}
      <QuotaCard quota={quota} loading={quotaLoading} />

      {/* New leave button */}
      <button onClick={() => setShowForm(true)}
        className="btn-primary w-full h-12">
        <Plus className="w-4 h-4" /> Ajukan Cuti Baru
      </button>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {FILTERS.map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all
              ${filter === f.v
                ? 'bg-brand-500 dark:bg-brand-400 text-white'
                : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-brand-300'
              }`}>
            {f.l}
          </button>
        ))}
        <button onClick={fetch} className="flex-shrink-0 w-8 h-8 rounded-full border border-[var(--border)]
          flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-all ml-auto">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-14">
          <CalendarOff className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-[var(--text-muted)]">Belum ada pengajuan cuti</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Klik tombol di atas untuk mengajukan cuti</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map(l => (
            <LeaveCard key={l.id} leave={l} onCancel={handleRefresh} />
          ))}
        </div>
      )}

      {showForm && (
        <ApplyForm quota={quota} onClose={() => setShowForm(false)} onSuccess={handleRefresh} />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// APPROVALS TAB (Admin/HR/Supervisor)
// ═══════════════════════════════════════════════════════════════
const ApprovalsTab = () => {
  const [leaves, setLeaves]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewAll, setViewAll] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = viewAll ? leaveService.getAll : leaveService.getPending;
      const params   = viewAll ? { limit: 30 } : {};
      const res = await endpoint(params);
      setLeaves(res.data.data.leaves);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, [viewAll]);

  useEffect(() => { fetch(); }, [fetch]);

  const pendingCount = leaves.filter(l => l.status === 'pending').length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3.5">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">Menunggu Persetujuan</p>
        </div>
        <div className="card p-3.5">
          <p className="text-2xl font-bold text-[var(--text-primary)]">{leaves.length}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">{viewAll ? 'Total Ditampilkan' : 'Pending Aktif'}</p>
        </div>
      </div>

      {/* Toggle view */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          {viewAll ? 'Semua Pengajuan' : 'Menunggu Persetujuan'}
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewAll(v => !v)}
            className="text-xs text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1
              hover:underline">
            {viewAll ? 'Lihat pending saja' : 'Lihat semua'}
            <ChevronRight className="w-3 h-3" />
          </button>
          <button onClick={fetch}
            className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center
              text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-all">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
        </div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-14">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium text-[var(--text-muted)]">Tidak ada pengajuan pending</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Semua pengajuan sudah diproses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map(l => (
            <LeaveCard key={l.id} leave={l} showUser onApprove={fetch} onReject={fetch} />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN LEAVE PAGE
// ═══════════════════════════════════════════════════════════════
export default function LeavesPage() {
  const { user, isHR, isSupervisor } = useAuth();
  const canApprove = isHR || isSupervisor || user?.role === 'admin';

  const TABS = [
    { id: 'mine',      label: 'Cuti Saya', icon: CalendarOff },
    ...(canApprove ? [{ id: 'approvals', label: 'Persetujuan', icon: Users }] : []),
  ];

  const [activeTab, setActiveTab] = useState('mine');
  const [quota, setQuota]         = useState(null);
  const [quotaLoading, setQL]     = useState(true);

  const fetchQuota = useCallback(async () => {
    setQL(true);
    try {
      const res = await leaveService.getMyQuota(new Date().getFullYear());
      setQuota(res.data.data);
    } catch {} finally { setQL(false); }
  }, []);

  useEffect(() => { fetchQuota(); }, [fetchQuota]);

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Cuti</h1>
          <p className="text-sm text-[var(--text-secondary)]">Kelola pengajuan & persetujuan cuti</p>
        </div>
        <CalendarOff className="w-5 h-5 text-[var(--text-muted)]" />
      </div>

      {/* Tabs */}
      {TABS.length > 1 && (
        <div className="flex p-1 gap-1 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)] mb-5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
                  transition-all duration-200
                  ${active
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === 'mine' && (
        <MyLeavesTab quota={quota} quotaLoading={quotaLoading} onRefreshQuota={fetchQuota} />
      )}
      {activeTab === 'approvals' && <ApprovalsTab />}
    </div>
  );
}
