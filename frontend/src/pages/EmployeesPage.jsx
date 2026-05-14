import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Search, Plus, X, ChevronRight, Filter,
  Loader2, RefreshCw, Phone, MapPin, AlertTriangle,
  Briefcase, Building2, Calendar, DollarSign,
  CheckCircle2, UserX, UserCheck, Edit3, ArrowLeft,
  Mail, Shield, Camera, ShieldCheck, Link2
} from 'lucide-react';
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
const Avatar = ({ name, size = 'md' }) => {
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
  const [syncInsentif, setSyncInsentif] = useState(true);
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
      employeeService.getDepartments().then(r => setDepts(r.data.data.departments)).catch(() => {}),
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
      <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={e => { set(field, e.target.value); clearErr(field); }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={`input-base text-sm ${errors[field] ? 'border-red-400' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full sm:max-w-lg bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[92vh] flex flex-col"
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
              {renderF("Nama Lengkap", "name", "text", "Ahmad Fauzi", true, false)}
              {renderF("Email", "email", "email", "ahmad@perusahaan.com", true, false)}
              {!isEdit && renderF("Password Default", "password", "password", "Min 6 karakter", true, false)}
              {renderF("NIP", "nip", "text", "NIP-005", true, false)}

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

              {renderF("Jabatan", "position", "text", "Staff IT", true, false)}

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

              {renderF("Telepon", "phone", "tel", "08xxxxxxxxxx", false, false)}
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
              {renderF("Kontak Darurat", "emergency_contact", "text", "Nama kontak darurat", false, false)}
              {renderF("Telepon Darurat", "emergency_phone", "tel", "08xxxxxxxxxx", false, false)}

              {/* ── Sync ke Sistem Insentif ─────────────────── */}
              {!isEdit && (
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
                        Tambah ke Sistem Insentif
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">Karyawan ini akan muncul di modul insentif</p>
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
  const { user: currentUser } = useAuth();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      employeeService.getOne(userId),
      attendanceService.getFaceStatus(userId),
      incentiveService.getEmployees({ limit: 1 }).then(r => {
        // Get all inc employees and find by user_id
        return api.get('/incentive/employees').then(er => er.data.data.employees.find(e => e.user_id === userId));
      }).catch(() => null),
    ]).then(([r, fr, incEmp]) => {
      setData({ ...r.data.data, inc_employee: incEmp || null });
      setFaceStatus(fr.data.data);
    }).catch(() => toast.error('Gagal memuat profil'))
      .finally(() => setLoading(false));
  }, [userId]);

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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
        <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin"
          onClick={e => e.stopPropagation()}>
          <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
          <div className="px-5 pt-4 pb-5 border-b border-[var(--border)]">
            <div className="flex items-start justify-between mb-4">
              <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
              {canManage && !isSelf && (
                <div className="flex gap-2 flex-wrap justify-end">
                  <button onClick={() => setShowFaceReg(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                      ${faceStatus?.registered ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400'}`}>
                    <Camera className="w-3 h-3" />{faceStatus?.registered ? '✓ Update Wajah' : 'Daftarkan Wajah'}
                  </button>
                  <button onClick={() => { onClose(); onEdit(user); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                  {user.is_active
                    ? <button onClick={() => { onClose(); onDeactivate(user); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"><UserX className="w-3 h-3" /> Nonaktifkan</button>
                    : <button onClick={() => { onClose(); onReactivate(user); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"><UserCheck className="w-3 h-3" /> Aktifkan</button>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar name={user.name} size="xl" />
                {faceStatus?.registered && <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[var(--bg-card)] flex items-center justify-center"><ShieldCheck className="w-3 h-3 text-white" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-[var(--text-primary)] truncate">{user.name}</h2>
                <p className="text-sm text-[var(--text-secondary)] truncate">{emp?.position}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <StatusBadge status={emp?.status || 'inactive'} />
                  <RoleBadge role={user.role} />
                </div>
              </div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)]">
              {[
                { v: stats.attendance_this_month?.present || 0, l:'Hadir', c:'text-emerald-600 dark:text-emerald-400' },
                { v: stats.leave_quota?.remaining ?? '—',       l:'Sisa Cuti', c:'text-amber-600 dark:text-amber-400' },
                { v: stats.last_salary ? `${Math.round(stats.last_salary.amount/1000000)}jt` : '—', l:'Gaji', c:'text-brand-600 dark:text-brand-400' },
              ].map((s,i) => (
                <div key={i} className="p-3.5 text-center">
                  <p className={`text-lg font-black ${s.c}`}>{s.v}</p>
                  <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          )}

          <div className="p-5 space-y-3">
            {[
              { icon: Shield,    l:'NIP',        v: emp?.nip },
              { icon: Building2, l:'Departemen', v: emp?.department },
              { icon: Briefcase, l:'Jabatan',    v: emp?.position },
              { icon: Calendar,  l:'Bergabung',  v: formatJoinDate(emp?.join_date) },
              { icon: Mail,      l:'Email',      v: user.email },
              { icon: Camera,    l:'Wajah',      v: faceStatus?.registered ? '✅ Terdaftar' : '❌ Belum' },
            { icon: Link2,     l:'Sistem Insentif', v: data?.inc_employee ? `✅ Terhubung (${data.inc_employee.branch?.name || 'Cabang'})` : '❌ Belum terhubung' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wide">{item.l}</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.v || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showFaceReg && <FaceRegisterModal userId={userId} userName={user.name} onClose={() => setShowFaceReg(false)} onSuccess={() => setFaceStatus({ registered: true })} />}
    </>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
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
    <div className="max-w-lg lg:max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Karyawan</h1>
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

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-[72px] rounded-2xl" />)}</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-14">
          <Users className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-[var(--text-muted)]">Tidak ada karyawan ditemukan</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
          {employees.map(emp => (
            <button key={emp.id} onClick={() => setProfileId(emp.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors text-left">
              <Avatar name={emp.name} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">{emp.name}</p>
                  <RoleBadge role={emp.role} />
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{emp.employee?.position} · {emp.employee?.department}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={emp.employee?.status} />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

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
