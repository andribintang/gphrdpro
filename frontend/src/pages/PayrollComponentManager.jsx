import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit3, Trash2, X, Loader2, CheckCircle2,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Settings, DollarSign, TrendingDown, AlertTriangle,
  Users, RefreshCw, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { payrollEngineService } from '../utils/payrollEngineService';

const toRp = n => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const CATEGORY_OPTIONS = [
  { value:'basic_salary',        label:'Gaji Pokok',          type:'income',    system:true  },
  { value:'position_allowance',  label:'Tunjangan Jabatan',   type:'income',    system:false },
  { value:'attendance_bonus',    label:'Uang Kerajinan',      type:'income',    system:false },
  { value:'meal_allowance',      label:'Uang Makan/hari',     type:'income',    system:false },
  { value:'transport_allowance', label:'Transport/hari',      type:'income',    system:false },
  { value:'flat',                label:'Flat (custom)',       type:'income',    system:false },
  { value:'percentage',          label:'% dari Gaji Pokok',   type:'income',    system:false },
  { value:'bpjs',                label:'BPJS (auto)',         type:'deduction', system:true  },
  { value:'late_deduction',      label:'Potongan Telat',      type:'deduction', system:true  },
  { value:'alpha_deduction',     label:'Potongan Alpha',      type:'deduction', system:true  },
  { value:'loan_installment',    label:'Cicilan Pinjaman',    type:'deduction', system:true  },
  { value:'pph21',               label:'PPH21 (auto)',        type:'deduction', system:true  },
  { value:'flat',                label:'Flat (custom)',       type:'deduction', system:false },
  { value:'percentage',          label:'% dari Gaji Pokok',  type:'deduction', system:false },
];

const APPLICABLE_OPTIONS = [
  { value:'monthly',   label:'Gaji Bulanan' },
  { value:'thr',       label:'THR' },
  { value:'bonus',     label:'Bonus' },
  { value:'incentive', label:'Insentif' },
];

// ── Component Form Modal ───────────────────────────────────────
const ComponentModal = ({ component, onClose, onSuccess }) => {
  const isEdit = !!component;
  const [form, setForm] = useState({
    code:            component?.code           || '',
    name:            component?.name           || '',
    type:            component?.type           || 'income',
    category:        component?.category       || 'flat',
    default_value:   component?.default_value  || '',
    percentage_of_base: component?.percentage_of_base || '',
    applicable_to:   Array.isArray(component?.applicable_to) ? component.applicable_to : ['monthly'],
    is_taxable:      component?.is_taxable !== false,
    sort_order:      component?.sort_order     || 100,
    description:     component?.description    || '',
  });
  const [saving, setSaving] = useState(false);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleApplicable = (val) => {
    setForm(f => ({
      ...f,
      applicable_to: f.applicable_to.includes(val)
        ? f.applicable_to.filter(x => x !== val)
        : [...f.applicable_to, val],
    }));
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Kode dan nama wajib diisi'); return;
    }
    if (form.applicable_to.length === 0) {
      toast.error('Pilih minimal 1 jenis payroll'); return;
    }
    setSaving(true);
    try {
      // Fix: kirim null bukan string kosong untuk DECIMAL fields
      const payload = {
        ...form,
        default_value:      form.default_value === '' ? 0 : parseFloat(form.default_value) || 0,
        percentage_of_base: form.percentage_of_base === '' || form.percentage_of_base == null
          ? null
          : parseFloat(form.percentage_of_base) || null,
      };
      if (isEdit) {
        await payrollEngineService.updateComponent(component.id, payload);
        toast.success(`Komponen ${form.name} berhasil diperbarui`);
      } else {
        await payrollEngineService.createComponent(payload);
        toast.success(`Komponen ${form.name} berhasil ditambahkan`);
      }
      onSuccess();
      onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const filteredCategories = CATEGORY_OPTIONS.filter(c => c.type === form.type);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-lg bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 sm:hidden flex-shrink-0"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {isEdit ? `Edit: ${component.name}` : 'Tambah Komponen Baru'}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {isEdit ? 'Ubah nama, nilai, atau pengaturan komponen' : 'Tambah komponen pendapatan atau potongan'}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Tipe</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v:'income',    l:'💚 Pendapatan', c:'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' },
                { v:'deduction', l:'❤️ Potongan',   c:'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800' },
              ].map(t => (
                <button key={t.v} onClick={() => { sf('type', t.v); sf('category', 'flat'); }}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition-all
                    ${form.type === t.v ? t.c : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* Code */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Kode Unik <span className="text-red-500">*</span>
            </label>
            <input value={form.code}
              onChange={e => sf('code', e.target.value.toUpperCase().replace(/\s/g,'_'))}
              placeholder="TUNJANGAN_KHUSUS" disabled={isEdit && component?.is_system}
              className="input-base text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed" />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Hanya huruf kapital dan underscore</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Nama Komponen <span className="text-red-500">*</span>
            </label>
            <input value={form.name} onChange={e => sf('name', e.target.value)}
              placeholder="Tunjangan Khusus" className="input-base text-sm" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Kategori</label>
            <select value={form.category} onChange={e => sf('category', e.target.value)}
              disabled={isEdit && component?.is_system}
              className="input-base text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {filteredCategories.map((c, i) => (
                <option key={i} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Value */}
          {!['bpjs','late_deduction','alpha_deduction','loan_installment','pph21','basic_salary'].includes(form.category) && (
            <>
              {form.category === 'percentage' ? (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Persentase dari Gaji Pokok
                  </label>
                  <div className="relative">
                    <input type="number" step="0.01" min="0" max="100"
                      value={form.percentage_of_base}
                      onChange={e => sf('percentage_of_base', e.target.value)}
                      placeholder="5.00" className="input-base text-sm pr-10" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">%</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Nilai Default
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">Rp</span>
                    <input type="number" value={form.default_value}
                      onChange={e => sf('default_value', e.target.value)}
                      placeholder="0" className="input-base pl-10 text-sm" />
                  </div>
                  {form.default_value > 0 && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">{toRp(form.default_value)}</p>
                  )}
                  {['meal_allowance','transport_allowance'].includes(form.category) && (
                    <p className="text-[10px] text-blue-500 mt-1">💡 Dikalikan hari hadir otomatis</p>
                  )}
                  {form.category === 'attendance_bonus' && (
                    <p className="text-[10px] text-blue-500 mt-1">💡 Proporsional dengan kehadiran</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Applicable to */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Berlaku Untuk
            </label>
            <div className="grid grid-cols-2 gap-2">
              {APPLICABLE_OPTIONS.map(o => (
                <button key={o.value} onClick={() => toggleApplicable(o.value)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all
                    ${form.applicable_to.includes(o.value)
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Taxable */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Kena Pajak (PPH21)</p>
              <p className="text-xs text-[var(--text-muted)]">Masuk perhitungan pajak penghasilan</p>
            </div>
            <button onClick={() => sf('is_taxable', !form.is_taxable)}>
              {form.is_taxable
                ? <ToggleRight className="w-6 h-6 text-brand-500" />
                : <ToggleLeft  className="w-6 h-6 text-[var(--text-muted)]" />}
            </button>
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Urutan Tampil di Slip (1 = paling atas)
            </label>
            <input type="number" value={form.sort_order} onChange={e => sf('sort_order', parseInt(e.target.value))}
              min="1" max="999" className="input-base text-sm w-24" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Keterangan (opsional)
            </label>
            <textarea value={form.description} onChange={e => sf('description', e.target.value)}
              rows={2} placeholder="Keterangan tambahan..."
              className="input-base text-sm resize-none" />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--border)] flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 h-11 text-sm">Batal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-11 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isEdit ? 'Simpan Perubahan' : 'Tambah Komponen'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Employee Allowance Modal ───────────────────────────────────
const AllowanceModal = ({ component, employees, onClose }) => {
  const [values, setValues]   = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      const results = {};
      for (const emp of employees) {
        try {
          const res = await payrollEngineService.getEmployeeAllowances(emp.id);
          const found = res.data.data.allowances.find(a => a.component_id === component.id);
          results[emp.id] = found ? parseFloat(found.amount) : parseFloat(component.default_value) || 0;
        } catch { results[emp.id] = parseFloat(component.default_value) || 0; }
      }
      setValues(results);
      setLoading(false);
    };
    fetchAll();
  }, [component, employees]);

  const handleSave = async (empId) => {
    setSaving(empId);
    try {
      await payrollEngineService.upsertAllowance(empId, {
        component_id: component.id,
        amount:       values[empId] || 0,
      });
      toast.success('Nilai disimpan');
    } catch { toast.error('Gagal menyimpan'); }
    finally { setSaving(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 sm:hidden flex-shrink-0"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Nilai per Karyawan</h3>
            <p className="text-xs text-[var(--text-muted)]">{component.name} · Default: {toRp(component.default_value)}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : employees.map(emp => (
            <div key={emp.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {emp.name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{emp.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{emp.employee?.department}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">Rp</span>
                  <input type="number"
                    value={values[emp.id] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [emp.id]: parseFloat(e.target.value) || 0 }))}
                    className="input-base pl-8 text-xs h-9 w-32"
                  />
                </div>
                <button onClick={() => handleSave(emp.id)} disabled={saving === emp.id}
                  className="w-9 h-9 rounded-xl bg-brand-500 hover:bg-brand-600 flex items-center justify-center text-white transition-all flex-shrink-0">
                  {saving === emp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT MANAGER
// ════════════════════════════════════════════════════════════════
export default function PayrollComponentManager() {
  const [components, setComponents] = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filterType, setFilterType] = useState('');
  const [editComp, setEditComp]     = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [allowanceComp, setAllowanceComp] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, eRes] = await Promise.all([
        payrollEngineService.getComponents({ type: filterType || undefined }),
        api.get('/employees?status=active&limit=100'),
      ]);
      setComponents(cRes.data.data.components);
      setEmployees(eRes.data.data.employees || []);
    } catch { toast.error('Gagal memuat komponen'); }
    finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggle = async (comp) => {
    if (comp.is_system) { toast('Komponen sistem tidak bisa dinonaktifkan', { icon:'ℹ️' }); return; }
    try {
      await payrollEngineService.toggleComponent(comp.id);
      toast.success(`${comp.name} ${comp.is_active ? 'dinonaktifkan' : 'diaktifkan'}`);
      fetchAll();
    } catch { toast.error('Gagal'); }
  };

  const handleDelete = async (comp) => {
    if (comp.is_system) { toast('Komponen sistem tidak bisa dihapus', { icon:'ℹ️' }); return; }
    if (!confirm(`Hapus komponen "${comp.name}"? Aksi ini tidak bisa dibatalkan.`)) return;
    try {
      await payrollEngineService.toggleComponent(comp.id); // soft disable
      toast.success(`${comp.name} dihapus`);
      fetchAll();
    } catch { toast.error('Gagal'); }
  };

  const incomes    = components.filter(c => c.type === 'income');
  const deductions = components.filter(c => c.type === 'deduction');

  const CompGroup = ({ title, items, colorClass, dotColor }) => (
    <div>
      <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${colorClass}`}>{title} ({items.length})</p>
      <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
        {items.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-4">Tidak ada komponen</p>
        ) : items.map(comp => (
          <div key={comp.id} className={`${!comp.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${comp.is_active ? dotColor : 'bg-slate-300 dark:bg-slate-600'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-mono font-bold text-[var(--text-muted)]">{comp.code}</p>
                  {comp.is_system && (
                    <span className="text-[9px] bg-[var(--bg-tertiary)] text-[var(--text-muted)] px-1.5 py-0.5 rounded font-bold uppercase">sistem</span>
                  )}
                  {!comp.is_active && (
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">nonaktif</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{comp.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {comp.category}
                  {comp.default_value > 0 && ` · ${toRp(comp.default_value)}`}
                  {comp.percentage_of_base > 0 && ` · ${comp.percentage_of_base}% dari gapok`}
                </p>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Set per-employee */}
                {!comp.is_system && ['flat','position_allowance','attendance_bonus','meal_allowance','transport_allowance'].includes(comp.category) && (
                  <button onClick={() => setAllowanceComp(comp)}
                    title="Set nilai per karyawan"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all">
                    <Users className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Edit */}
                <button onClick={() => setEditComp(comp)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-all">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                {/* Toggle */}
                <button onClick={() => handleToggle(comp)}>
                  {comp.is_active
                    ? <ToggleRight className="w-5 h-5 text-brand-500" />
                    : <ToggleLeft  className="w-5 h-5 text-[var(--text-muted)]" />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Komponen Gaji</h1>
          <p className="text-sm text-[var(--text-secondary)]">Kelola pendapatan & potongan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary h-9 px-3 text-sm">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 mb-4 text-xs text-blue-700 dark:text-blue-300">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <strong>Komponen Sistem</strong> tidak bisa dihapus tapi bisa diedit namanya.
          Klik ikon <strong>👥</strong> untuk set nilai berbeda per karyawan.
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 mb-4">
        {[{v:'',l:'Semua'},{v:'income',l:'💚 Pendapatan'},{v:'deduction',l:'❤️ Potongan'}].map(f => (
          <button key={f.v} onClick={() => setFilterType(f.v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
              ${filterType === f.v ? 'bg-brand-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_,i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-4">
          {(!filterType || filterType === 'income') && (
            <CompGroup title="💚 Komponen Pendapatan" items={incomes}
              colorClass="text-emerald-600 dark:text-emerald-400" dotColor="bg-emerald-500" />
          )}
          {(!filterType || filterType === 'deduction') && (
            <CompGroup title="❤️ Komponen Potongan" items={deductions}
              colorClass="text-red-600 dark:text-red-400" dotColor="bg-red-500" />
          )}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <ComponentModal onClose={() => setShowAdd(false)} onSuccess={fetchAll} />
      )}
      {editComp && (
        <ComponentModal component={editComp} onClose={() => setEditComp(null)} onSuccess={fetchAll} />
      )}
      {allowanceComp && (
        <AllowanceModal
          component={allowanceComp}
          employees={employees}
          onClose={() => setAllowanceComp(null)}
        />
      )}
    </div>
  );
}
