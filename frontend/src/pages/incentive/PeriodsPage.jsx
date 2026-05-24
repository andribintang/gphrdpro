import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Plus, Play, CheckCircle2, Lock,
  ChevronRight, Loader2, X, RefreshCw,
  Calculator, Eye, AlertTriangle, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  incentiveService, toRp, toRpShort,
  MONTHS_ID, PERIOD_STATUS
} from '../../utils/incentive/incentiveService';

const StatusBadge = ({ status }) => {
  const s = PERIOD_STATUS[status] || PERIOD_STATUS.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

// ── Create Period Modal ────────────────────────────────────────
const CreateModal = ({ onClose, onSuccess }) => {
  const now = new Date();
  const [form, setForm] = useState({
    month: now.getMonth() + 1,
    year:  now.getFullYear(),
    name:  '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const name = form.name || `Insentif ${MONTHS_ID[form.month]} ${form.year}`;
    setLoading(true);
    try {
      await incentiveService.createPeriod({ ...form, name });
      toast.success(`Periode ${name} berhasil dibuat`);
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal membuat periode');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Buat Periode Baru</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Bulan</label>
              <select value={form.month} onChange={e => setForm(f => ({ ...f, month: parseInt(e.target.value) }))} className="input-base text-sm">
                {MONTHS_ID.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Tahun</label>
              <select value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))} className="input-base text-sm">
                {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Nama Periode (opsional)</label>
            <input value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={`Insentif ${MONTHS_ID[form.month]} ${form.year}`}
              className="input-base text-sm" />
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-xl p-3 text-xs text-[var(--text-muted)] space-y-1">
            <p>📅 Periode: 1 {MONTHS_ID[form.month]} {form.year} — {new Date(form.year, form.month, 0).getDate()} {MONTHS_ID[form.month]} {form.year}</p>
            <p>📊 Status awal: Draft</p>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 h-11 text-sm">Batal</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 h-11 text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Buat Periode
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PeriodsPage() {
  const [periods, setPeriods]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [calculating, setCalc]    = useState(null);
  const [approving, setApproving] = useState(null);
  const navigate = useNavigate();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await incentiveService.getPeriods({ year: new Date().getFullYear() });
      setPeriods(res.data.data.periods);
    } catch { toast.error('Gagal memuat periode'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCalculate = async (period) => {
    if (!confirm(`Hitung ulang insentif ${period.name}? Data hasil sebelumnya akan ditimpa.`)) return;
    setCalc(period.id);
    try {
      const res = await incentiveService.calculatePeriod(period.id);
      const d   = res.data.data;
      toast.success(`✅ Kalkulasi selesai! ${d.total_employees} karyawan · Total: ${toRpShort(d.total_incentive_paid)}`);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Kalkulasi gagal'); }
    finally { setCalc(null); }
  };

  const handleApprove = async (period) => {
    if (!confirm(`Approve insentif ${period.name}? Pastikan semua data sudah benar.`)) return;
    setApproving(period.id);
    try {
      await incentiveService.approvePeriod(period.id, {});
      toast.success(`${period.name} berhasil di-approve!`);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setApproving(null); }
  };

  const handleLock = async (period) => {
    if (!confirm(`Kunci periode ${period.name}? Data tidak bisa diubah setelah dikunci.`)) return;
    try {
      await incentiveService.lockPeriod(period.id);
      toast.success(`${period.name} dikunci`);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  const WORKFLOW_STEPS = ['draft','calculated','approved','locked'];

  return (
    <div className="w-full animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Periode Insentif</h1>
          <p className="text-sm text-[var(--text-secondary)]">Kelola periode bulanan insentif</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary h-9 px-3 text-sm">
            <Plus className="w-4 h-4" /> Buat Periode
          </button>
        </div>
      </div>

      {/* Flow guide */}
      <div className="card p-4 mb-4">
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Alur Periode</p>
        <div className="flex items-center gap-1">
          {WORKFLOW_STEPS.map((s, i) => {
            const cfg = PERIOD_STATUS[s];
            return (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex-1 text-center py-1.5 px-1 rounded-lg text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </div>
                {i < WORKFLOW_STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>
      ) : periods.length === 0 ? (
        <div className="text-center py-14">
          <Calendar className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada periode. Buat periode baru untuk mulai.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 px-6">
            <Plus className="w-4 h-4" /> Buat Periode Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map(period => (
            <div key={period.id} className="card overflow-hidden">
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{period.name}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {period.start_date} — {period.end_date}
                    </p>
                    <div className="mt-1.5"><StatusBadge status={period.status} /></div>
                  </div>
                  {(period.status === 'calculated' || period.status === 'approved' || period.status === 'locked') && (
                    <div className="text-right">
                      <p className="text-base font-black text-[var(--text-primary)]">{toRpShort(period.total_incentive_paid)}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Total Insentif</p>
                    </div>
                  )}
                </div>

                {/* Summary stats (if calculated) */}
                {parseFloat(period.total_all_sales) > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label:'WA',          value: toRpShort(period.total_wa_sales),          color:'text-emerald-600 dark:text-emerald-400' },
                      { label:'Marketplace', value: toRpShort(period.total_marketplace_sales),  color:'text-orange-600 dark:text-orange-400' },
                      { label:'Web',         value: toRpShort(period.total_web_sales),          color:'text-blue-600 dark:text-blue-400' },
                    ].map((s, i) => (
                      <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-2 text-center">
                        <p className={`text-xs font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  {/* Input Data — always visible for non-locked */}
                  {period.status !== 'locked' && (
                    <button onClick={() => navigate(`/incentive/input/${period.id}`)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">
                      <Clock className="w-3.5 h-3.5" /> Input Data
                    </button>
                  )}

                  {/* Calculate */}
                  {(period.status === 'draft' || period.status === 'calculated') && (
                    <button onClick={() => handleCalculate(period)} disabled={calculating === period.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900 transition-all">
                      {calculating === period.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Calculator className="w-3.5 h-3.5" />}
                      {period.status === 'calculated' ? 'Hitung Ulang' : 'Hitung Insentif'}
                    </button>
                  )}

                  {/* View Results */}
                  {(period.status === 'calculated' || period.status === 'approved' || period.status === 'locked') && (
                    <button onClick={() => navigate(`/incentive/results/${period.id}`)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-all">
                      <Eye className="w-3.5 h-3.5" /> Lihat Hasil
                    </button>
                  )}

                  {/* Approve */}
                  {period.status === 'calculated' && (
                    <button onClick={() => handleApprove(period)} disabled={approving === period.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all">
                      {approving === period.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                  )}

                  {/* Lock */}
                  {period.status === 'approved' && (
                    <button onClick={() => handleLock(period)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white transition-all">
                      <Lock className="w-3.5 h-3.5" /> Kunci
                    </button>
                  )}
                </div>

                {period.status === 'locked' && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
                    <Lock className="w-3 h-3" />
                    Disetujui: {period.approved_at ? new Date(period.approved_at).toLocaleDateString('id-ID') : '—'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSuccess={fetch} />}
    </div>
  );
}
