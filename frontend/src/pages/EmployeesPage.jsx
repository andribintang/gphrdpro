import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Search, Plus, X, ChevronRight, Filter, Eye,
  Loader2, RefreshCw, Phone, MapPin, AlertTriangle,
  Briefcase, Building2, Calendar, DollarSign,
  CheckCircle2, UserX, UserCheck, Edit3, ArrowLeft,
  Mail, Shield, Camera, ShieldCheck, Link2
, CreditCard, History, ChevronLeft, Upload, ChevronRight} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  employeeService, EMP_STATUS, ROLE_CONFIG,
  toRupiah, formatJoinDate, avatarColor,
} from '../utils/employeeService';
import { attendanceService } from '../utils/attendanceService';
import { incentiveService } from '../utils/incentive/incentiveService';
import api from '../utils/api';

// ── Shared ────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = EMP_STATUS[status] || EMP_STATUS.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};
const RoleBadge = ({ role }) => {
  const r = ROLE_CONFIG[role] || ROLE_CONFIG.employee;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${r.bg} ${r.color}`}>{r.label}</span>;
};
// ── Photo compression + upload ───────────────────────────────
const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'hrd_attendance';

const compressPhoto = (file, maxKB = 100) => new Promise((resolve) => {
  if (file.size <= maxKB * 1024) { resolve(file); return; }
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(url);
    const canvas = document.createElement('canvas');
    let { width, height } = img;
    const MAX = 800;
    if (width > MAX || height > MAX) {
      if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
      else { width = Math.round(width * MAX / height); height = MAX; }
    }
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    const tryQ = (q) => new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
    const search = async () => {
      let lo = 0.1, hi = 0.9, best = null;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        const blob = await tryQ(mid);
        if (blob.size <= maxKB * 1024) { best = blob; lo = mid; }
        else hi = mid;
        if (hi - lo < 0.02) break;
      }
      if (!best) best = await tryQ(0.1);
      resolve(new File([best], 'photo.jpg', { type: 'image/jpeg' }));
    };
    search();
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
  img.src = url;
});

const uploadPhoto = async (file) => {
  const compressed = await compressPhoto(file, 100);
  if (!CLOUD_NAME) throw new Error('Cloudinary belum dikonfigurasi');
  const fd = new FormData();
  fd.append('file', compressed);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', 'employee_photos');
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST', body: fd,
  });
  const d = await r.json();
  if (!d.secure_url) throw new Error(d.error?.message || 'Upload gagal');
  return d.secure_url;
};

const Avatar = ({ name, size = 'md', photoUrl }) => {
  const sizes = { sm:'w-8 h-8 text-sm', md:'w-10 h-10 text-base', lg:'w-14 h-14 text-xl', xl:'w-20 h-20 text-3xl' };
  return (
    <div className={`${sizes[size]} rounded-2xl bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
      <span className="text-white font-black leading-none">{name?.[0]?.toUpperCase() || '?'}</span>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// EMPLOYEE FORM — menggunakan controlled inputs dengan useReducer
// Tidak ada sub-component di dalam — semua inline untuk stabilitas
// ════════════════════════════════════════════════════════════════
const EmployeeForm = ({ employee, onClose, onSuccess }) => {
  const isEdit = !!employee;
  const [step, setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [departments, setDepts] = useState([]);
  const [syncInsentif, setSyncInsentif] = useState(!isEdit); // default true for new, false for edit
  const [isLinked, setIsLinked]         = useState(false);   // already linked to incentive?

  // Check if employee is already linked to incentive system
  useEffect(() => {
    if (isEdit && employee?.id) {
      api.get('/incentive/employees')
        .then(r => {
          const linked = r.data.data.employees.find(e => e.user_id === employee.id);
          setIsLinked(!!linked);
        }).catch(() => {});
    }
  }, [isEdit, employee?.id]);
  const [branches, setBranches] = useState([]);
  const [positions, setPositions] = useState([]);

  // ── Single form state object — stable, no sub-components ──
  const [form, setForm] = useState({
    name:              employee?.name                        || '',
    email:             employee?.email                       || '',
    password:          '',
    nip:               employee?.employee?.nip               || '',
    position:          employee?.employee?.position          || '',
    role:              employee?.role                        || 'employee',
    department:        employee?.employee?.department        || '',
    phone:             employee?.employee?.phone             || '',
    address:           employee?.employee?.address           || '',
    emergency_contact: employee?.employee?.emergency_contact || '',
    emergency_phone:   employee?.employee?.emergency_phone   || '',
    salary_base:       employee?.employee?.salary_base       || '',
    join_date:         employee?.employee?.join_date         || '',
    status:            employee?.employee?.status            || 'active',
    // Incentive fields
    inc_branch_id:     '',
    inc_position_id:   '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const clearErr = (k) => setErrors(e => ({ ...e, [k]: '' }));

  useEffect(() => {
    Promise.all([
      // Try master departments table first, fallback to employee departments
      import('../utils/api').then(({default: api}) => {
        api.get('/departments', { params: { is_active: true } })
          .then(r => {
            const names = (r.data.data.departments || []).map(d => d.name);
            if (names.length) setDepts(names);
            else employeeService.getDepartments().then(r2 => setDepts(r2.data.data.departments || [])).catch(() => {});
          })
          .catch(() => employeeService.getDepartments().then(r2 => setDepts(r2.data.data.departments || [])).catch(() => {}));
      }),
      incentiveService.getBranches().then(r => setBranches(r.data.data.branches)).catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    if (form.inc_branch_id) {
      incentiveService.getPositions({ branch_id: form.inc_branch_id })
        .then(r => setPositions(r.data.data.positions))
        .catch(() => {});
    } else {
      setPositions([]);
    }
  }, [form.inc_branch_id]);

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim())     e.name     = 'Nama diperlukan';
    if (!form.email.trim())    e.email    = 'Email diperlukan';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Format email tidak valid';
    if (!isEdit && !form.password) e.password = 'Password diperlukan';
    if (!form.nip.trim())      e.nip      = 'NIP diperlukan';
    if (!form.position.trim()) e.position = 'Jabatan diperlukan';
    if (!form.department)      e.department = 'Departemen diperlukan';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.salary_base || isNaN(parseFloat(form.salary_base))) e.salary_base = 'Gaji harus berupa angka';
    if (!form.join_date) e.join_date = 'Tanggal bergabung diperlukan';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setSaving(true);
    try {
      const payload = {
        name:              form.name.trim(),
        email:             form.email.trim(),
        role:              form.role,
        nip:               form.nip.trim(),
        position:          form.position.trim(),
        department:        form.department,
        salary_base:       parseFloat(form.salary_base),
        join_date:         form.join_date,
        status:            form.status,
        phone:             form.phone,
        address:           form.address,
        emergency_contact: form.emergency_contact,
        emergency_phone:   form.emergency_phone,
      };
      if (!isEdit) payload.password = form.password;

      let userId;
      if (isEdit) {
        await employeeService.update(employee.id, payload);
        userId = employee.id;
        toast.success('Data karyawan berhasil diperbarui');
      } else {
        const res = await employeeService.create(payload);
        userId = res.data.data?.user?.id || res.data.data?.id;
        toast.success(`${form.name} berhasil ditambahkan!`);
      }

      // Sync ke sistem insentif jika dipilih
      if (syncInsentif && form.inc_branch_id) {
        try {
          await incentiveService.createEmployee({
            user_id:     userId,
            branch_id:   form.inc_branch_id,
            position_id: form.inc_position_id || null,
            name:        form.name.trim(),
            email:       form.email.trim(),
            phone:       form.phone,
            join_date:   form.join_date,
            is_active:   true,
          });
          toast.success('✅ Karyawan juga ditambahkan ke Sistem Insentif');
        } catch (e) {
          toast(`⚠️ Gagal sync ke insentif: ${e.response?.data?.message || e.message}`, { icon: '⚠️' });
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const ROLES    = ['employee', 'hr', 'supervisor'];
  const STATUSES = ['active', 'inactive', 'on_leave', 'terminated'];
  const STATUS_LABELS = { active:'Aktif', inactive:'Tidak Aktif', on_leave:'Cuti', terminated:'Berhenti' };

  // Simple field renderer — inline, no sub-component
  // renderF is a FUNCTION not a component — called as renderF(...)
  // This prevents React from unmounting/remounting the input on re-render
  const renderF = (label, field, type = 'text', placeholder, required = false, disabled = false) => (
    <div key={field}>
      <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={e => { set(field, e.target.value); clearErr(field); }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={`w-full h-10 px-3.5 rounded-xl border text-[13.5px] text-[var(--text-primary)]
          bg-[var(--bg-secondary)] placeholder:text-[var(--text-muted)]
          focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)]/20 focus:border-[var(--brand-600)]/60
          transition-all duration-150
          ${errors[field] ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : 'border-[var(--border)]'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {errors[field] && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">⚠ {errors[field]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full sm:max-w-2xl bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border2)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {isEdit ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Langkah {step} dari 2 — {step === 1 ? 'Info Utama' : 'Detail Pekerjaan'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1,2].map(s => <div key={s} className={`w-2 h-2 rounded-full transition-colors ${s === step ? 'bg-brand-500' : 'bg-[var(--border)]'}`} />)}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)] ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {step === 1 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderF("Nama Lengkap", "name", "text", "Ahmad Fauzi", true, false)}
                {renderF("Email", "email", "email", "ahmad@perusahaan.com", true, false)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!isEdit && renderF("Password Default", "password", "password", "Min 6 karakter", true, false)}
                {renderF("NIP", "nip", "text", "NIP-005", true, false)}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => {
                    const rc = ROLE_CONFIG[r];
                    return (
                      <button key={r} type="button" onClick={() => set('role', r)}
                        className={`py-2.5 rounded-xl text-xs font-semibold border transition-all
                          ${form.role === r ? `${rc.bg} ${rc.color} border-current` : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                        {rc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderF("Jabatan", "position", "text", "Staff IT", true, false)}
                {renderF("Telepon", "phone", "tel", "08xxxxxxxxxx", false, false)}
              </div>

              {/* Departemen */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Departemen <span className="text-red-500">*</span>
                </label>
                <select value={form.department}
                  onChange={e => { set('department', e.target.value); clearErr('department'); }}
                  className={`input-base text-sm ${errors.department ? 'border-red-400' : ''}`}>
                  <option value="">Pilih departemen...</option>
                  {(departments.length ? departments : ['Technology','Human Resources','Finance','Operations','Marketing','Sales']).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
              </div>

            </>
          )}

          {step === 2 && (
            <>
              {/* Gaji */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Gaji Pokok <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)] font-medium">Rp</span>
                  <input
                    type="number"
                    value={form.salary_base}
                    onChange={e => { set('salary_base', e.target.value); clearErr('salary_base'); }}
                    placeholder="5000000"
                    className={`input-base pl-10 text-sm ${errors.salary_base ? 'border-red-400' : ''}`}
                  />
                </div>
                {form.salary_base > 0 && <p className="text-xs text-[var(--text-muted)] mt-1">{toRupiah(form.salary_base)}</p>}
                {errors.salary_base && <p className="text-xs text-red-500 mt-1">{errors.salary_base}</p>}
              </div>

              {/* Tanggal bergabung */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Tanggal Bergabung <span className="text-red-500">*</span>
                </label>
                <input type="date" value={form.join_date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => { set('join_date', e.target.value); clearErr('join_date'); }}
                  className={`input-base text-sm ${errors.join_date ? 'border-red-400' : ''}`}
                />
                {errors.join_date && <p className="text-xs text-red-500 mt-1">{errors.join_date}</p>}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map(s => (
                    <button key={s} type="button" onClick={() => set('status', s)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-all
                        ${form.status === s
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {renderF("Alamat", "address", "text", "Jl. Contoh No.1, Jakarta", false, false)}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderF("Kontak Darurat", "emergency_contact", "text", "Nama kontak darurat", false, false)}
                {renderF("Telepon Darurat", "emergency_phone", "tel", "08xxxxxxxxxx", false, false)}
              </div>

              {/* ── Sync ke Sistem Insentif ─────────────────── */}
              {(!isEdit || (isEdit && !isLinked)) && (
                <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
                  <button type="button"
                    onClick={() => setSyncInsentif(v => !v)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all
                      ${syncInsentif ? 'bg-brand-50 dark:bg-brand-950' : 'bg-[var(--bg-secondary)]'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                      ${syncInsentif ? 'bg-brand-100 dark:bg-brand-900' : 'bg-[var(--bg-tertiary)]'}`}>
                      <Link2 className={`w-4 h-4 ${syncInsentif ? 'text-brand-600 dark:text-brand-400' : 'text-[var(--text-muted)]'}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-semibold ${syncInsentif ? 'text-brand-700 dark:text-brand-300' : 'text-[var(--text-secondary)]'}`}>
                        {isEdit ? 'Hubungkan ke Sistem Insentif' : 'Tambah ke Sistem Insentif'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {isEdit ? 'Karyawan belum terhubung — hubungkan sekarang' : 'Karyawan ini akan muncul di modul insentif'}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                      ${syncInsentif ? 'bg-brand-500 border-brand-500' : 'border-[var(--border2)]'}`}>
                      {syncInsentif && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                  </button>

                  {syncInsentif && (
                    <div className="px-4 pb-4 pt-2 space-y-3 bg-brand-50 dark:bg-brand-950 border-t border-brand-100 dark:border-brand-900">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                          Cabang Insentif <span className="text-red-500">*</span>
                        </label>
                        <select value={form.inc_branch_id}
                          onChange={e => { set('inc_branch_id', e.target.value); set('inc_position_id', ''); }}
                          className="input-base text-sm">
                          <option value="">Pilih cabang...</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      {form.inc_branch_id && (
                        <div>
                          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                            Jabatan Insentif
                          </label>
                          <select value={form.inc_position_id}
                            onChange={e => set('inc_position_id', e.target.value)}
                            className="input-base text-sm">
                            <option value="">Pilih jabatan...</option>
                            {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--border)] flex gap-2 flex-shrink-0">
          {step === 2 && (
            <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 h-11 text-sm">
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
          )}
          {step === 1 ? (
            <button type="button" onClick={() => validateStep1() && setStep(2)} className="btn-primary flex-1 h-11 text-sm">
              Lanjut <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={saving} className="btn-primary flex-1 h-11 text-sm">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                : <><CheckCircle2 className="w-4 h-4" /> {isEdit ? 'Simpan' : 'Tambah Karyawan'}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// FACE REGISTRATION MODAL
// ════════════════════════════════════════════════════════════════
const FaceRegisterModal = ({ userId, userName, onClose, onSuccess }) => {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [phase, setPhase]   = useState('loading');
  const [errMsg, setErrMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [capturedImg, setCapturedImg] = useState(null);
  const [descriptor, setDescriptor]   = useState(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        if (!window.faceapi) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
          });
        }
        const fa = window.faceapi;
        if (!fa.nets.tinyFaceDetector.isLoaded) {
          await Promise.all([
            fa.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
            fa.nets.faceLandmark68TinyNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
            fa.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
          ]);
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } } });
        streamRef.current = stream;
        if (videoRef.current && mounted) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setPhase('ready');
        }
      } catch (err) { setErrMsg(err.message || 'Gagal mengakses kamera'); setPhase('error'); }
    };
    init();
    return () => { mounted = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || phase !== 'ready') return;
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const vw = videoRef.current.videoWidth, vh = videoRef.current.videoHeight;
    const size = Math.min(vw, vh);
    ctx.drawImage(videoRef.current, (vw-size)/2, (vh-size)/2, size, size, 0, 0, 400, 400);
    const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    setCapturedImg(`data:image/jpeg;base64,${b64}`);
    try {
      const fa = window.faceapi;
      const det = await fa.detectSingleFace(videoRef.current, new fa.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })).withFaceLandmarks(true).withFaceDescriptor();
      if (det) setDescriptor(Array.from(det.descriptor));
    } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop());
    setPhase('captured');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await attendanceService.registerFace({ user_id: userId, face_descriptor: descriptor || Array(128).fill(0), selfie_base64: capturedImg.split(',')[1] });
      toast.success(`Wajah ${userName} berhasil didaftarkan!`);
      onSuccess?.(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal mendaftarkan wajah'); }
    finally { setLoading(false); }
  };

  const retake = () => {
    setCapturedImg(null); setDescriptor(null); setPhase('loading');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(s => { streamRef.current = s; if(videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); } setPhase('ready'); })
      .catch(() => setPhase('error'));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div><h3 className="text-sm font-bold text-[var(--text-primary)]">Daftarkan Wajah</h3><p className="text-xs text-[var(--text-muted)]">{userName}</p></div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
        </div>
        <div className="relative bg-black" style={{ paddingBottom: '100%' }}>
          {phase === 'loading' && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-brand-400" /><p className="text-white/60 text-xs">Memuat kamera...</p></div>}
          {phase === 'error'   && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6"><AlertTriangle className="w-10 h-10 text-red-400" /><p className="text-white/80 text-sm text-center">{errMsg}</p></div>}
          <video ref={videoRef} playsInline muted className={`absolute inset-0 w-full h-full object-cover ${phase === 'captured' ? 'hidden' : ''}`} style={{ transform: 'scaleX(-1)' }} />
          {capturedImg && <img src={capturedImg} alt="captured" className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />}
          {phase === 'ready' && <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><mask id="oval2"><rect width="100" height="100" fill="white"/><ellipse cx="50" cy="50" rx="34" ry="42" fill="black"/></mask></defs><rect width="100" height="100" fill="rgba(0,0,0,0.35)" mask="url(#oval2)"/><ellipse cx="50" cy="50" rx="34" ry="42" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5"/></svg>}
          {phase === 'captured' && <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20"><CheckCircle2 className="w-16 h-16 text-emerald-400" /></div>}
        </div>
        <div className="p-5 space-y-3">
          {phase === 'captured' ? (
            <><p className="text-xs text-center text-[var(--text-muted)]">{descriptor ? '✅ Wajah terdeteksi' : '⚠️ Wajah kurang jelas'}</p>
            <div className="flex gap-2"><button onClick={retake} className="btn-secondary flex-1 h-11 text-sm">Ulangi</button><button onClick={handleSave} disabled={loading} className="btn-primary flex-1 h-11 text-sm">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Simpan</button></div></>
          ) : (
            <><p className="text-xs text-center text-[var(--text-muted)]">Posisikan wajah di tengah lingkaran</p>
            <button onClick={handleCapture} disabled={phase !== 'ready'} className="btn-primary w-full h-12 disabled:opacity-50"><Camera className="w-4 h-4" /> Ambil Foto</button></>
          )}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// PROFILE DRAWER
// ════════════════════════════════════════════════════════════════
const ProfileDrawer = ({ userId, onClose, onEdit, onDeactivate, onReactivate, canManage }) => {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [faceStatus, setFaceStatus] = useState(null);
  const [showFaceReg, setShowFaceReg] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const { user: currentUser } = useAuth();

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      employeeService.getOne(userId),
      attendanceService.getFaceStatus(userId),
      incentiveService.getEmployees({ limit: 1 }).then(r => {
        return api.get('/incentive/employees').then(er => er.data.data.employees.find(e => e.user_id === userId));
      }).catch(() => null),
    ]).then(([r, fr, incEmp]) => {
      setData({ ...r.data.data, inc_employee: incEmp || null });
      setFaceStatus(fr.data.data);
    }).catch(() => toast.error('Gagal memuat profil'))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] p-8 flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    </div>
  );

  if (!data) return null;
  const { user, stats } = data;
  const emp    = user.employee;
  const isSelf = currentUser.id === user.id;

  const TABS = [
    { id: 'personal',    label: 'Personal',          icon: Shield },
    { id: 'employment',  label: 'Data Kerja',         icon: Briefcase },
    { id: 'allowance',   label: 'Komponen Khusus',    icon: DollarSign },
    { id: 'bank',        label: 'Rekening Bank',      icon: CreditCard },
    { id: 'attendance',  label: 'Absensi',            icon: Calendar },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <div className="relative w-full max-w-3xl bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}>

          {/* ── Header ── */}
          <div className="px-6 pt-5 pb-4 border-b border-[var(--border)] flex-shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar name={user.name} size="xl" photoUrl={emp?.photo_url}/>
                  {faceStatus?.registered && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[var(--bg-card)] flex items-center justify-center">
                      <ShieldCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <label className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" title="Upload foto">
                    <Upload className="w-4 h-4 text-white" />
                    <input type="file" accept="image/*" className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        try {
                          toast.loading('Upload foto...', { id: 'photo-upload' });
                          const url = await uploadPhoto(file);
                          const API2 = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
                          await fetch(`${API2}/employees/${emp.user_id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
                            body: JSON.stringify({ photo_url: url }),
                          });
                          toast.success('Foto berhasil diupload!', { id: 'photo-upload' });
                          fetchData();
                        } catch(err) {
                          toast.error('Gagal: ' + err.message, { id: 'photo-upload' });
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <div>
                  <h2 className="text-xl font-black text-[var(--text-primary)]">{user.name}</h2>
                  <p className="text-sm text-[var(--text-secondary)]">{emp?.position} · {emp?.department}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={emp?.status || 'inactive'} />
                    <RoleBadge role={user.role} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage && !isSelf && (
                  <>
                    <button onClick={() => setShowFaceReg(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                        ${faceStatus?.registered ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                      <Camera className="w-3 h-3" />{faceStatus?.registered ? 'Update Wajah' : 'Daftarkan Wajah'}
                    </button>
                    <button onClick={() => { onClose(); onEdit(user); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    {user.is_active
                      ? <button onClick={() => { onClose(); onDeactivate(user); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50">
                          <UserX className="w-3 h-3" /> Nonaktifkan
                        </button>
                      : <button onClick={() => { onClose(); onReactivate(user); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white">
                          <UserCheck className="w-3 h-3" /> Aktifkan
                        </button>}
                  </>
                )}
                <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: stats.attendance_this_month?.present || 0, l:'Hadir Bulan Ini', c:'text-emerald-600' },
                  { v: stats.leave_quota?.remaining ?? '—',       l:'Sisa Cuti',       c:'text-amber-600' },
                  { v: stats.last_salary ? `Rp ${Math.round(stats.last_salary.amount/1000000)}jt` : '—', l:'Gaji Terakhir', c:'text-blue-600' },
                ].map((s,i) => (
                  <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-3 text-center">
                    <p className={`text-lg font-black ${s.c}`}>{s.v}</p>
                    <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-[var(--border)] flex-shrink-0 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all
                  ${activeTab === tab.id
                    ? 'border-[var(--brand-600)] text-[var(--brand-600)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab Content ── */}
          <div className="flex-1 overflow-y-auto">

            {/* Tab: Personal */}
            {activeTab === 'personal' && (
              <div className="p-6 space-y-4">
                {isSelf && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                    <p className="text-xs text-blue-700">Kamu dapat mengedit biodata pribadi kamu</p>
                    <button onClick={() => { onClose(); onEdit(user); }}
                      className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1">
                      <Edit3 className="w-3 h-3"/> Edit Biodata
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { l:'Email',       v: user.email },
                  { l:'NIP',         v: emp?.nip },
                  { l:'No. HP',      v: emp?.phone },
                  { l:'Alamat',      v: emp?.address },
                  { l:'Kontak Darurat', v: emp?.emergency_contact },
                  { l:'No. Darurat',    v: emp?.emergency_phone },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{item.l}</p>
                    <p className="text-sm text-[var(--text-primary)]">{item.v || '—'}</p>
                  </div>
                ))}
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Sistem Insentif</p>
                  <p className="text-sm">{data?.inc_employee ? `✅ Terhubung (${data.inc_employee.branch?.name || 'Cabang'})` : '❌ Belum terhubung'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Wajah</p>
                  <p className="text-sm">{faceStatus?.registered ? '✅ Terdaftar' : '❌ Belum'}</p>
                </div>
                </div>
              </div>
            )}

            {/* Tab: Employment */}
            {activeTab === 'employment' && (
              <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { l:'Departemen',   v: emp?.department },
                  { l:'Jabatan',      v: emp?.position },
                  { l:'Tanggal Bergabung', v: formatJoinDate(emp?.join_date) },
                  { l:'Status',       v: emp?.status },
                  { l:'Role',         v: user.role },
                  { l:'Gaji Pokok',   v: emp?.salary_base ? `Rp ${parseInt(emp.salary_base).toLocaleString('id-ID')}` : '—' },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{item.l}</p>
                    <p className="text-sm text-[var(--text-primary)]">{item.v || '—'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Komponen Khusus */}
            {activeTab === 'allowance' && (
              <div className="p-4">
                {canManage ? <AllowanceSection userId={userId} /> : (
                  <p className="text-sm text-[var(--text-muted)] text-center py-8">Tidak ada akses</p>
                )}
              </div>
            )}

            {/* Tab: Rekening Bank */}
            {activeTab === 'bank' && (
              <div className="p-4">
                {canManage ? <BankAccountSection employee={emp} onSaved={fetchData} /> : (
                  <p className="text-sm text-[var(--text-muted)] text-center py-8">Tidak ada akses</p>
                )}
              </div>
            )}

            {/* Tab: Absensi */}
            {activeTab === 'attendance' && (
              <AttendanceTab userId={userId} />
            )}

          </div>
        </div>
      </div>
      {showFaceReg && <FaceRegisterModal userId={userId} userName={user.name} onClose={() => setShowFaceReg(false)} onSuccess={() => setFaceStatus({ registered: true })} />}
    </>
  );
};

// ── Allowance Section ─────────────────────────────────────────
const AllowanceSection = ({ userId }) => {
  const API = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
  const [allowances,   setAllowances]   = useState([]);
  const [incomeComps,  setIncomeComps]  = useState([]);
  const [deductComps,  setDeductComps]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showAdd,      setShowAdd]      = useState(null); // null | 'income' | 'deduction'
  const [addForm,      setAddForm]      = useState({ component_id: '', amount: '', notes: '' });
  const [saving,       setSaving]       = useState(false);

  const token = () => localStorage.getItem('accessToken');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, incRes, dedRes] = await Promise.all([
        fetch(`${API}/payroll-engine/allowances/${userId}`,      { headers: { Authorization: 'Bearer ' + token() } }).then(r => r.json()),
        fetch(`${API}/payroll-engine/components?type=income`,    { headers: { Authorization: 'Bearer ' + token() } }).then(r => r.json()),
        fetch(`${API}/payroll-engine/components?type=deduction`, { headers: { Authorization: 'Bearer ' + token() } }).then(r => r.json()),
      ]);
      setAllowances(aRes.data?.allowances || []);
      setIncomeComps((incRes.data?.components || []).filter(c => c.is_active));
      setDeductComps((dedRes.data?.components || []).filter(c => c.is_active));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = (type) => {
    setShowAdd(type);
    setAddForm({ component_id: '', amount: '', notes: '' });
  };

  const handleSave = async () => {
    if (!addForm.component_id || !addForm.amount) { toast.error('Komponen dan nominal wajib diisi'); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API}/payroll-engine/allowances/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify({ component_id: parseInt(addForm.component_id), amount: parseFloat(addForm.amount), notes: addForm.notes }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success(showAdd === 'income' ? 'Tunjangan disimpan' : 'Potongan disimpan');
      setShowAdd(null);
      load();
    } catch(e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(n||0);

  const incomeAllowances   = allowances.filter(a => a.component?.type === 'income');
  const deductAllowances   = allowances.filter(a => a.component?.type === 'deduction');
  const activeComps        = showAdd === 'income' ? incomeComps : deductComps;

  const AddForm = ({ type }) => (
    <div className="bg-[var(--bg)] rounded-xl p-3 mb-3 space-y-2 border border-[var(--border)]">
      <div>
        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
          {type === 'income' ? 'Komponen Pendapatan' : 'Komponen Potongan'}
        </label>
        <select value={addForm.component_id}
          onChange={e => setAddForm(f => ({...f, component_id: e.target.value}))}
          className="input-base text-sm">
          <option value="">-- Pilih Komponen --</option>
          {activeComps.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Nominal (Rp)</label>
        <input type="number" value={addForm.amount}
          onChange={e => setAddForm(f => ({...f, amount: e.target.value}))}
          placeholder="150000" className="input-base text-sm" />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Keterangan</label>
        <input value={addForm.notes}
          onChange={e => setAddForm(f => ({...f, notes: e.target.value}))}
          placeholder={type === 'income' ? 'Tunjangan pulsa bulanan' : 'Potongan ketidakhadiran'}
          className="input-base text-sm" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => setShowAdd(null)} className="btn-secondary flex-1 h-9 text-sm">Batal</button>
        <button onClick={handleSave} disabled={saving}
          className={`btn-primary flex-1 h-9 text-sm gap-1 disabled:opacity-60 ${type === 'deduction' ? 'bg-red-600 hover:bg-red-700' : ''}`}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5"/>}
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="border-t border-[var(--border)]">
      {/* ── Tunjangan Khusus ───────────────── */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">💰 Tunjangan Khusus</p>
          {showAdd !== 'income' && (
            <button onClick={() => openAdd('income')}
              className="text-xs font-semibold text-emerald-600 hover:underline">+ Tambah</button>
          )}
        </div>
        {showAdd === 'income' && <AddForm type="income" />}
        {loading ? (
          <div className="space-y-1">{[...Array(2)].map((_,i) => <div key={i} className="skeleton h-10 rounded-lg"/>)}</div>
        ) : incomeAllowances.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-1">Belum ada tunjangan khusus</p>
        ) : (
          <div className="space-y-1.5">
            {incomeAllowances.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-[var(--bg)] rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-semibold">{a.component?.name || '—'}</p>
                  {a.notes && <p className="text-[10px] text-[var(--text-muted)]">{a.notes}</p>}
                </div>
                <p className="text-sm font-bold text-emerald-600">{fmt(a.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Potongan Khusus ────────────────── */}
      <div className="px-5 pb-4 border-t border-[var(--border)] pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-red-500 uppercase tracking-wider">✂️ Potongan Khusus</p>
          {showAdd !== 'deduction' && (
            <button onClick={() => openAdd('deduction')}
              className="text-xs font-semibold text-red-500 hover:underline">+ Tambah</button>
          )}
        </div>
        {showAdd === 'deduction' && <AddForm type="deduction" />}
        {loading ? (
          <div className="space-y-1">{[...Array(1)].map((_,i) => <div key={i} className="skeleton h-10 rounded-lg"/>)}</div>
        ) : deductAllowances.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-1">Belum ada potongan khusus</p>
        ) : (
          <div className="space-y-1.5">
            {deductAllowances.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-[var(--bg)] rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-semibold">{a.component?.name || '—'}</p>
                  {a.notes && <p className="text-[10px] text-[var(--text-muted)]">{a.notes}</p>}
                </div>
                <p className="text-sm font-bold text-red-500">{fmt(a.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════


// ── Attendance Tab in ProfileDrawer ──────────────────────────
const AttendanceTab = ({ userId }) => {
  const API = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [month,    setMonth]    = useState(new Date().toISOString().slice(0,7));

  useEffect(() => {
    setLoading(true);
    const [y, m] = month.split('-');
    fetch(`${API}/attendance/admin/all?year=${y}&month=${m}&limit=200`, {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('accessToken') }
    }).then(r => r.json()).then(d => {
      const all = d.data?.records || d.data?.attendances || [];
      setRecords(all.filter(a => a.user_id === userId));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [userId, month]);

  const STATUS_STYLE = {
    present:  'bg-green-100 text-green-700',
    late:     'bg-yellow-100 text-yellow-700',
    absent:   'bg-red-100 text-red-600',
    half_day: 'bg-orange-100 text-orange-600',
    leave:    'bg-blue-100 text-blue-600',
    holiday:  'bg-purple-100 text-purple-600',
  };
  const STATUS_LABEL = { present:'Hadir', late:'Terlambat', absent:'Absen', half_day:'Setengah Hari', leave:'Cuti', holiday:'Libur' };

  const summary = {
    hadir:     records.filter(r => ['present','late'].includes(r.status)).length,
    terlambat: records.filter(r => r.status === 'late').length,
    absen:     records.filter(r => r.status === 'absent').length,
    cuti:      records.filter(r => r.status === 'leave').length,
  };

  return (
    <div className="p-4 space-y-4">
      {/* Filter bulan */}
      <div className="flex items-center gap-3">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="input-base text-sm h-9 w-40" />
        <div className="flex gap-2 text-xs">
          {[
            { l:'Hadir', v: summary.hadir, c:'text-green-600' },
            { l:'Terlambat', v: summary.terlambat, c:'text-yellow-600' },
            { l:'Absen', v: summary.absen, c:'text-red-500' },
            { l:'Cuti', v: summary.cuti, c:'text-blue-600' },
          ].map(s => (
            <div key={s.l} className="bg-[var(--bg-secondary)] rounded-lg px-2.5 py-1.5 text-center">
              <p className={`font-bold ${s.c}`}>{s.v}</p>
              <p className="text-[9px] text-[var(--text-muted)]">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[var(--brand-500)]"/></div>
      ) : records.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-8">Tidak ada data absensi bulan ini</p>
      ) : (
        <div className="table-wrapper overflow-hidden">
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                  {['Tanggal','Status','Masuk','Pulang','Jam Kerja'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {records.map((r, i) => (
                  <tr key={i} className="hover:bg-[var(--bg)]">
                    <td className="px-3 py-2 font-mono">{r.date}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono">{r.check_in ? r.check_in.slice(0,5) : '—'}</td>
                    <td className="px-3 py-2 font-mono">{r.check_out ? r.check_out.slice(0,5) : '—'}</td>
                    <td className="px-3 py-2">{r.work_hours ? `${parseFloat(r.work_hours).toFixed(1)} jam` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Bank Account Section ──────────────────────────────────────
const BANK_LIST = [
  { code:'bca',      name:'BCA' },
  { code:'bni',      name:'BNI' },
  { code:'bri',      name:'BRI' },
  { code:'mandiri',  name:'Mandiri' },
  { code:'bsi',      name:'BSI' },
  { code:'cimb',     name:'CIMB Niaga' },
  { code:'danamon',  name:'Danamon' },
  { code:'permata',  name:'Permata' },
  { code:'btn',      name:'BTN' },
  { code:'mega',     name:'Bank Mega' },
  { code:'bukopin',  name:'Bukopin' },
  { code:'sinarmas', name:'Sinar Mas' },
  { code:'ocbc',     name:'OCBC NISP' },
  { code:'jago',     name:'Bank Jago' },
  { code:'seabank',  name:'SeaBank' },
  { code:'gopay',    name:'GoPay' },
  { code:'ovo',      name:'OVO' },
  { code:'dana',     name:'DANA' },
  { code:'shopeepay',name:'ShopeePay' },
];

const BankAccountSection = ({ employee: emp, onSaved }) => {
  const API = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
  const [editing,    setEditing]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [validating, setValidating] = useState(false);
  const [validated,  setValidated]  = useState(null); // { account_number, bank_code, account_holder }
  const [form, setForm] = useState({
    bank_code:           emp?.bank_code           || '',
    bank_account_number: emp?.bank_account_number || '',
    bank_account_name:   emp?.bank_account_name   || '',
  });
  const sf = (k,v) => { setForm(f=>({...f,[k]:v})); setValidated(null); };

  const handleValidate = async () => {
    if (!form.bank_code || !form.bank_account_number) { toast.error('Pilih bank dan isi nomor rekening'); return; }
    setValidating(true);
    try {
      const r = await fetch(`${API}/flip/validate-account`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:'Bearer '+localStorage.getItem('accessToken') },
        body: JSON.stringify({ bank_code: form.bank_code, account_number: form.bank_account_number }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setValidated(d.data);
      setForm(f => ({ ...f, bank_account_name: d.data.account_holder || f.bank_account_name }));
      toast.success('Rekening valid: ' + d.data.account_holder);
    } catch(e) { toast.error('Validasi gagal: ' + e.message); }
    finally { setValidating(false); }
  };

  const handleSave = async () => {
    if (!form.bank_code || !form.bank_account_number || !form.bank_account_name) {
      toast.error('Semua field rekening wajib diisi'); return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/employees/${emp.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', Authorization:'Bearer '+localStorage.getItem('accessToken') },
        body: JSON.stringify({ bank_code: form.bank_code, bank_account_number: form.bank_account_number, bank_account_name: form.bank_account_name }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success('Data rekening disimpan');
      setEditing(false);
      if (onSaved) onSaved();
    } catch(e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const hasBank = emp?.bank_code && emp?.bank_account_number;

  return (
    <div className="border-t border-[var(--border)] px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          🏦 Rekening Bank
        </p>
        <button onClick={() => setEditing(v=>!v)}
          className="text-xs font-semibold text-[var(--brand-600)] hover:underline">
          {editing ? '✕ Tutup' : (hasBank ? '✏️ Edit' : '+ Tambah')}
        </button>
      </div>

      {/* Current data */}
      {!editing && (
        hasBank ? (
          <div className="bg-[var(--bg)] rounded-xl px-3 py-2.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold uppercase">
                {BANK_LIST.find(b=>b.code===emp.bank_code)?.name || emp.bank_code}
              </span>
              <span className="text-sm font-mono font-semibold">{emp.bank_account_number}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{emp.bank_account_name}</p>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)] text-center py-1">
            Belum ada data rekening bank
          </p>
        )
      )}

      {/* Edit form */}
      {editing && (
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Bank</label>
            <select value={form.bank_code} onChange={e => sf('bank_code', e.target.value)} className="input-base text-sm">
              <option value="">-- Pilih Bank --</option>
              {BANK_LIST.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Nomor Rekening</label>
            <div className="flex gap-2">
              <input value={form.bank_account_number}
                onChange={e => sf('bank_account_number', e.target.value)}
                placeholder="Nomor rekening" className="input-base text-sm flex-1" />
              <button onClick={handleValidate} disabled={validating}
                className="btn-secondary text-xs h-9 px-3 flex-shrink-0 disabled:opacity-60">
                {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'Validasi'}
              </button>
            </div>
            {validated && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                ✅ Valid: {validated.account_holder}
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Nama Pemilik Rekening</label>
            <input value={form.bank_account_name}
              onChange={e => sf('bank_account_name', e.target.value)}
              placeholder="Nama sesuai buku tabungan" className="input-base text-sm" />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Klik "Validasi" untuk mengisi otomatis dari data bank
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setEditing(false)} className="btn-secondary flex-1 h-9 text-sm">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-9 text-sm gap-1 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : '💾'}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


// ── Premium Employee Table ────────────────────────────────────
const PremiumEmployeeTable = ({ employees, loading, canManage, onView, onEdit, onDeactivate, onAdd }) => {
  const [sortKey, setSortKey]   = useState('name');
  const [sortDir, setSortDir]   = useState('asc');
  const [page,    setPage]      = useState(1);
  const PAGE_SIZE = 10;

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const sorted = [...employees].sort((a, b) => {
    let va, vb;
    if (sortKey === 'name')       { va = a.name;                      vb = b.name; }
    else if (sortKey === 'dept')  { va = a.employee?.department || ''; vb = b.employee?.department || ''; }
    else if (sortKey === 'pos')   { va = a.employee?.position || '';   vb = b.employee?.position || ''; }
    else if (sortKey === 'join')  { va = a.employee?.join_date || '';  vb = b.employee?.join_date || ''; }
    else if (sortKey === 'status'){ va = a.employee?.status || '';     vb = b.employee?.status || ''; }
    else { va = ''; vb = ''; }
    const cmp = String(va).localeCompare(String(vb));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged      = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const SortBtn = ({ col, label }) => (
    <button onClick={() => handleSort(col)}
      className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors select-none">
      {label}
      <span className={`text-[10px] ${sortKey === col ? 'text-[var(--brand-600)]' : 'opacity-30'}`}>
        {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );

  if (loading) return (
    <div className="table-wrapper overflow-hidden">
      <div className="p-4 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="skeleton w-10 h-10 rounded-2xl flex-shrink-0"/>
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-44 rounded"/>
              <div className="skeleton h-3 w-32 rounded opacity-60"/>
            </div>
            <div className="skeleton h-6 w-20 rounded-full hidden md:block"/>
            <div className="skeleton h-6 w-24 rounded-full hidden md:block"/>
            <div className="skeleton h-5 w-16 rounded hidden lg:block"/>
          </div>
        ))}
      </div>
    </div>
  );

  if (employees.length === 0) return (
    <div className="table-wrapper text-center py-16">
      <Users className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Tidak ada karyawan ditemukan</p>
      <p className="text-xs text-[var(--text-muted)] mb-4">Coba ubah filter atau tambah karyawan baru</p>
      {canManage && <button onClick={onAdd} className="btn-primary text-sm"><Plus className="w-4 h-4"/> Tambah Karyawan</button>}
    </div>
  );

  return (
    <div className="table-wrapper overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
              <th className="px-4 py-3 text-left w-12">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">#</span>
              </th>
              <th className="px-4 py-3 text-left"><SortBtn col="name" label="Karyawan" /></th>
              <th className="px-4 py-3 text-left hidden md:table-cell"><SortBtn col="pos" label="Jabatan" /></th>
              <th className="px-4 py-3 text-left hidden md:table-cell"><SortBtn col="dept" label="Departemen" /></th>
              <th className="px-4 py-3 text-left hidden md:table-cell"><SortBtn col="status" label="Status" /></th>
              <th className="px-4 py-3 text-left hidden lg:table-cell"><SortBtn col="join" label="Bergabung" /></th>
              <th className="px-4 py-3 text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {paged.map((emp, idx) => {
              const no    = (page - 1) * PAGE_SIZE + idx + 1;
              const photo = emp.employee?.photo_url;
              return (
                <tr key={emp.id}
                  className="hover:bg-[var(--bg-secondary)]/40 transition-colors cursor-pointer group"
                  onClick={() => onView(emp)}>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)] font-mono">{no}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.name} size="md" photoUrl={photo} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{emp.name}</p>
                          <RoleBadge role={emp.role} />
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-sm text-[var(--text-secondary)] truncate max-w-[130px]">{emp.employee?.position || '—'}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)]">
                      {emp.employee?.department || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <StatusBadge status={emp.employee?.status} />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-xs text-[var(--text-muted)]">
                      {emp.employee?.join_date
                        ? new Date(emp.employee.join_date).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
                        : '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onView(emp)} title="Lihat Profil"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--brand-600)] hover:bg-[var(--brand-600)]/10 transition-all">
                        <Eye className="w-3.5 h-3.5"/>
                      </button>
                      {canManage && (
                        <button onClick={() => onEdit(emp)} title="Edit"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-amber-600 hover:bg-amber-50 transition-all">
                          <Edit3 className="w-3.5 h-3.5"/>
                        </button>
                      )}
                      {canManage && emp.employee?.status === 'active' && (
                        <button onClick={() => onDeactivate(emp)} title="Nonaktifkan"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-all">
                          <UserX className="w-3.5 h-3.5"/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--bg)]">
          <p className="text-xs text-[var(--text-muted)]">
            {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, sorted.length)} dari <span className="font-semibold text-[var(--text-primary)]">{sorted.length}</span> karyawan
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page===1}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs hover:bg-[var(--bg-secondary)] disabled:opacity-30">«</button>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-secondary)] disabled:opacity-30">
              <ChevronLeft className="w-3.5 h-3.5"/>
            </button>
            {[...Array(totalPages)].map((_, i) => {
              const p = i + 1;
              if (p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors
                      ${p === page ? 'bg-[var(--brand-600)] text-white' : 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
                    {p}
                  </button>
                );
              if (Math.abs(p - page) === 2) return <span key={p} className="text-[var(--text-muted)] text-xs">…</span>;
              return null;
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-secondary)] disabled:opacity-30">
              <ChevronRight className="w-3.5 h-3.5"/>
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page===totalPages}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs hover:bg-[var(--bg-secondary)] disabled:opacity-30">»</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function EmployeesPage() {
  const { user: currentUser, isHR } = useAuth();
  const canManage = isHR || currentUser?.role === 'admin';

  const [employees, setEmployees]   = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [profileId, setProfileId]   = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimeout = useRef(null);

  const fetchEmployees = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const [empRes, statsRes] = await Promise.all([
        employeeService.getAll(params),
        canManage ? employeeService.getStats() : Promise.resolve(null),
      ]);
      setEmployees(empRes.data.data.employees);
      if (statsRes) setStats(statsRes.data.data.stats);
      setDepartments(Object.keys(empRes.data.data.departments || {}).sort());
    } catch { toast.error('Gagal memuat data karyawan'); }
    finally   { setLoading(false); }
  }, [canManage]);

  useEffect(() => {
    const params = {};
    if (search)       params.search     = search;
    if (deptFilter)   params.department = deptFilter;
    if (statusFilter) params.status     = statusFilter;
    fetchEmployees(params);
  }, [search, deptFilter, statusFilter, fetchEmployees]);

  const handleSearch = (v) => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(v), 350);
  };

  const handleDeactivate = async (emp) => {
    try {
      await employeeService.deactivate(emp.id, { status: 'terminated' });
      toast.success(`${emp.name} dinonaktifkan`);
      setDeactivateTarget(null);
      fetchEmployees({ status: statusFilter, department: deptFilter, search });
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
  };

  const handleReactivate = async (emp) => {
    try {
      await employeeService.reactivate(emp.id);
      toast.success(`${emp.name} diaktifkan kembali`);
      fetchEmployees({ status: statusFilter, department: deptFilter, search });
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
  };

  const handleFormSuccess = () => {
    const params = {};
    if (search)       params.search     = search;
    if (deptFilter)   params.department = deptFilter;
    if (statusFilter) params.status     = statusFilter;
    fetchEmployees(params);
  };

  return (
    <div className="w-full">
      <div className="page-header">
        <div>
          <h1 className="page-title">Karyawan</h1>
          <p className="text-sm text-[var(--text-secondary)]">{employees.length} karyawan{deptFilter ? ` · ${deptFilter}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchEmployees({ status: statusFilter, department: deptFilter, search })}
            className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canManage && (
            <button onClick={() => setShowAddForm(true)} className="btn-primary h-9 px-3 text-sm">
              <Plus className="w-4 h-4" /> Tambah
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {canManage && stats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { l:'Total',   v:stats.total,          c:'text-[var(--text-primary)]' },
            { l:'Aktif',   v:stats.active,          c:'text-emerald-600 dark:text-emerald-400' },
            { l:'Inactive',v:stats.inactive,         c:'text-red-600 dark:text-red-400' },
            { l:'Baru',    v:stats.new_this_month,   c:'text-brand-600 dark:text-brand-400' },
          ].map((s,i) => (
            <div key={i} className="card p-3 text-center">
              <p className={`text-lg font-bold ${s.c}`}>{s.v ?? 0}</p>
              <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input type="text" placeholder="Cari nama, NIP, jabatan..."
            onChange={e => handleSearch(e.target.value)}
            className="input-base pl-9 text-sm h-10" />
        </div>
        <button onClick={() => setShowFilters(f => !f)}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all
            ${showFilters || deptFilter || statusFilter !== 'active' ? 'bg-brand-500 border-brand-500 text-white' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'}`}>
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {showFilters && (
        <div className="card p-3 mb-3 space-y-3 animate-slide-down">
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Status</p>
            <div className="flex gap-1.5 flex-wrap">
              {[{v:'',l:'Semua'},{v:'active',l:'Aktif'},{v:'inactive',l:'Tidak Aktif'},{v:'terminated',l:'Berhenti'}].map(f => (
                <button key={f.v} onClick={() => setStatusFilter(f.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter===f.v ? 'bg-brand-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>
          {departments.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Departemen</p>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setDeptFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!deptFilter ? 'bg-brand-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>Semua</button>
                {departments.map(d => (
                  <button key={d} onClick={() => setDeptFilter(d)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${deptFilter===d ? 'bg-brand-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>{d}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Premium Employee Table ── */}
      <PremiumEmployeeTable
        employees={employees}
        loading={loading}
        canManage={canManage}
        onView={(emp) => setProfileId(emp.id)}
        onEdit={(emp) => setEditEmployee(emp)}
        onDeactivate={(emp) => setDeactivateTarget(emp)}
        onAdd={() => setShowAddForm(true)}
      />

      {/* Modals */}
      {showAddForm && <EmployeeForm key="add-form" onClose={() => setShowAddForm(false)} onSuccess={handleFormSuccess} />}
      {editEmployee && <EmployeeForm key={`edit-${editEmployee.id}`} employee={editEmployee} onClose={() => setEditEmployee(null)} onSuccess={handleFormSuccess} />}
      {profileId && <ProfileDrawer userId={profileId} onClose={() => setProfileId(null)} onEdit={emp => { setProfileId(null); setEditEmployee(emp); }} onDeactivate={emp => { setProfileId(null); setDeactivateTarget(emp); }} onReactivate={emp => handleReactivate(emp)} canManage={canManage} />}

      {deactivateTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setDeactivateTarget(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4"><UserX className="w-6 h-6 text-red-600 dark:text-red-400" /></div>
            <h3 className="text-base font-bold text-[var(--text-primary)] text-center mb-2">Nonaktifkan Karyawan</h3>
            <p className="text-sm text-[var(--text-secondary)] text-center mb-5">Akun <strong>{deactivateTarget.name}</strong> akan dinonaktifkan.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeactivateTarget(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={() => handleDeactivate(deactivateTarget)} className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all"><UserX className="w-4 h-4" /> Nonaktifkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
