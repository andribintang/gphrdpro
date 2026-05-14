import { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Users, Search, Plus, X, ChevronRight, Filter,
  Loader2, RefreshCw, Phone, MapPin, AlertTriangle,
  Briefcase, Building2, Calendar, DollarSign, Clock,
  CheckCircle2, UserX, UserCheck, Edit3, ArrowLeft,
  Mail, Shield, Eye, Camera, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  employeeService, EMP_STATUS, ROLE_CONFIG,
  toRupiah, formatJoinDate, avatarColor,
} from '../utils/employeeService';
import { attendanceService } from '../utils/attendanceService';

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
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${r.bg} ${r.color}`}>
      {r.label}
    </span>
  );
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
// FACE REGISTRATION MODAL — kamera untuk daftarkan wajah
// ════════════════════════════════════════════════════════════════
const FaceRegisterModal = ({ userId, userName, onClose, onSuccess }) => {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [phase, setPhase]   = useState('loading'); // loading | ready | captured | error
  const [errMsg, setErrMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [capturedImg, setCapturedImg] = useState(null);
  const [descriptor, setDescriptor]   = useState(null);

  const FACE_SCRIPT = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
  const FACE_MODELS = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

  useEffect(() => {
    let interval;
    const init = async () => {
      try {
        // Load face-api if needed
        if (!window.faceapi) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = FACE_SCRIPT;
            s.onload = resolve;
            s.onerror = () => reject(new Error('Gagal load face-api'));
            document.head.appendChild(s);
          });
        }
        const fa = window.faceapi;
        if (!fa.nets.tinyFaceDetector.isLoaded) {
          await Promise.all([
            fa.nets.tinyFaceDetector.loadFromUri(FACE_MODELS),
            fa.nets.faceLandmark68TinyNet.loadFromUri(FACE_MODELS),
            fa.nets.faceRecognitionNet.loadFromUri(FACE_MODELS),
          ]);
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPhase('ready');
      } catch (err) {
        setErrMsg(err.message || 'Gagal mengakses kamera');
        setPhase('error');
      }
    };
    init();
    return () => {
      clearInterval(interval);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || phase !== 'ready') return;
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const vw = videoRef.current.videoWidth, vh = videoRef.current.videoHeight;
    const size = Math.min(vw, vh);
    ctx.drawImage(videoRef.current, (vw-size)/2, (vh-size)/2, size, size, 0, 0, 400, 400);
    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    setCapturedImg(`data:image/jpeg;base64,${base64}`);

    try {
      const fa = window.faceapi;
      const det = await fa.detectSingleFace(videoRef.current,
        new fa.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
      ).withFaceLandmarks(true).withFaceDescriptor();
      if (det) setDescriptor(Array.from(det.descriptor));
    } catch {}

    streamRef.current?.getTracks().forEach(t => t.stop());
    setPhase('captured');
  };

  const handleSave = async () => {
    if (!capturedImg) return;
    if (!descriptor) {
      toast('⚠️ Wajah tidak terdeteksi jelas, tetap disimpan tanpa descriptor', { icon: '⚠️' });
    }
    setLoading(true);
    try {
      await attendanceService.registerFace({
        user_id: userId,
        face_descriptor: descriptor || Array(128).fill(0),
        selfie_base64: capturedImg.split(',')[1],
      });
      toast.success(`Wajah ${userName} berhasil didaftarkan!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mendaftarkan wajah');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-[var(--border2)]" /></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Daftarkan Wajah</h3>
            <p className="text-xs text-[var(--text-muted)]">{userName}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black" style={{ paddingBottom: '100%' }}>
          {phase === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
              <p className="text-white/60 text-xs">Memuat model AI & kamera...</p>
            </div>
          )}
          {phase === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
              <AlertTriangle className="w-10 h-10 text-red-400" />
              <p className="text-white/80 text-sm text-center">{errMsg}</p>
            </div>
          )}
          <video ref={videoRef} playsInline muted
            className={`absolute inset-0 w-full h-full object-cover ${phase === 'captured' ? 'hidden' : ''}`}
            style={{ transform: 'scaleX(-1)' }}
          />
          {capturedImg && (
            <img src={capturedImg} alt="captured"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
          {phase === 'ready' && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs><mask id="oval"><rect width="100" height="100" fill="white"/><ellipse cx="50" cy="50" rx="34" ry="42" fill="black"/></mask></defs>
              <rect width="100" height="100" fill="rgba(0,0,0,0.35)" mask="url(#oval)"/>
              <ellipse cx="50" cy="50" rx="34" ry="42" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5"/>
            </svg>
          )}
          {phase === 'captured' && (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20">
              <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            </div>
          )}
        </div>

        <div className="p-5 space-y-3">
          {phase === 'captured' ? (
            <>
              <p className="text-xs text-center text-[var(--text-muted)]">
                {descriptor ? '✅ Wajah terdeteksi' : '⚠️ Wajah kurang jelas, coba pencahayaan lebih baik'}
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setCapturedImg(null); setDescriptor(null); setPhase('loading');
                  // reinit camera
                  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                    .then(s => { streamRef.current = s; if(videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); } setPhase('ready'); })
                    .catch(() => setPhase('error'));
                }} className="btn-secondary flex-1 h-11 text-sm">
                  Ulangi
                </button>
                <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 h-11 text-sm">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Simpan
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-center text-[var(--text-muted)]">Posisikan wajah di tengah lingkaran</p>
              <button onClick={handleCapture} disabled={phase !== 'ready'}
                className="btn-primary w-full h-12 disabled:opacity-50">
                <Camera className="w-4 h-4" /> Ambil Foto
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── FieldInput — OUTSIDE EmployeeForm to prevent unmount on re-render ───────
const FieldInput = memo(({ label, fieldName, type, placeholder, required, defaultValue, inputRef, error, onClearError }) => (
  <div>
    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <input
      ref={inputRef}
      type={type || 'text'}
      defaultValue={defaultValue || ''}
      placeholder={placeholder}
      autoComplete="off"
      className={`input-base text-sm ${error ? 'border-red-400' : ''}`}
      onChange={() => { if (error) onClearError(); }}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
));

// ════════════════════════════════════════════════════════════════
// EMPLOYEE FORM — completely isolated, no parent dependencies
// Key fix: state is fully self-contained, no external triggers
// ════════════════════════════════════════════════════════════════
const EmployeeForm = memo(({ employee, onClose, onSuccess }) => {
  const isEdit = !!employee;
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const [departments, setDepts] = useState([]);

  // All form fields as individual refs to avoid re-render focus loss
  const refs = {
    name:              useRef(null),
    email:             useRef(null),
    password:          useRef(null),
    nip:               useRef(null),
    position:          useRef(null),
    phone:             useRef(null),
    address:           useRef(null),
    emergency_contact: useRef(null),
    emergency_phone:   useRef(null),
    salary_base:       useRef(null),
  };

  // Controlled state only for non-input fields (select, role buttons)
  const [role, setRole]     = useState(employee?.role || 'employee');
  const [dept, setDept]     = useState(employee?.employee?.department || '');
  const [status, setStatus] = useState(employee?.employee?.status || 'active');
  const [joinDate, setJoinDate] = useState(employee?.employee?.join_date || '');

  useEffect(() => {
    employeeService.getDepartments()
      .then(r => setDepts(r.data.data.departments))
      .catch(() => {});
  }, []);

  const getVal = (field) => refs[field]?.current?.value || '';

  const validateStep1 = () => {
    const e = {};
    if (!getVal('name').trim())     e.name     = 'Nama diperlukan';
    if (!getVal('email').trim())    e.email    = 'Email diperlukan';
    else if (!/\S+@\S+\.\S+/.test(getVal('email'))) e.email = 'Email tidak valid';
    if (!isEdit && !getVal('password')) e.password = 'Password diperlukan';
    if (!getVal('nip').trim())      e.nip      = 'NIP diperlukan';
    if (!getVal('position').trim()) e.position = 'Jabatan diperlukan';
    if (!dept.trim())               e.department = 'Departemen diperlukan';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    const sal = getVal('salary_base');
    if (!sal || isNaN(parseFloat(sal))) e.salary_base = 'Gaji harus berupa angka';
    if (!joinDate) e.join_date = 'Tanggal bergabung diperlukan';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const payload = {
        name:              getVal('name'),
        email:             getVal('email'),
        password:          getVal('password'),
        role,
        nip:               getVal('nip'),
        position:          getVal('position'),
        department:        dept,
        salary_base:       parseFloat(getVal('salary_base').replace(/\D/g, '')),
        join_date:         joinDate,
        status,
        phone:             getVal('phone'),
        address:           getVal('address'),
        emergency_contact: getVal('emergency_contact'),
        emergency_phone:   getVal('emergency_phone'),
      };
      if (isEdit && !payload.password) delete payload.password;

      if (isEdit) {
        await employeeService.update(employee.id, payload);
        toast.success('Data karyawan berhasil diperbarui');
      } else {
        await employeeService.create(payload);
        toast.success(`Karyawan ${payload.name} berhasil ditambahkan!`);
      }
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan data';
      toast.error(msg);
      if (err.response?.data?.errors) {
        const fe = {};
        err.response.data.errors.forEach(e => { fe[e.path || e.param] = e.msg; });
        setErrors(fe);
        setStep(1);
      }
    } finally { setLoading(false); }
  };

  // FieldInput is defined outside this component (prevents unmount on re-render)

  const ROLES    = ['employee', 'hr', 'supervisor'];
  const STATUSES = ['active', 'inactive', 'on_leave', 'terminated'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full sm:max-w-lg bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
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
            <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)] transition-colors ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {step === 1 && (
            <>
              {renderField('Nama Lengkap', 'name', 'text', 'Ahmad Fauzi', true, employee?.name || '')}
              {renderField('Email', 'email', 'email', 'ahmad@perusahaan.com', true, employee?.email || '')}
              {!isEdit && (
                {renderField('Password Default', 'password', 'password', 'Min 6 karakter', true)}
              )}
              {renderField('NIP', 'nip', 'text', 'NIP-005', true, employee?.employee?.nip || '')}

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => {
                    const rc = ROLE_CONFIG[r];
                    return (
                      <button key={r} type="button" onClick={() => setRole(r)}
                        className={`py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95
                          ${role === r ? `${rc.bg} ${rc.color} border-current` : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                        {rc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {renderField('Jabatan', 'position', 'text', 'Staff IT', true, employee?.employee?.position || '')}

              {/* Departemen */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Departemen <span className="text-red-500">*</span>
                </label>
                <select value={dept} onChange={e => { setDept(e.target.value); setErrors(er => ({...er, department:''})); }}
                  className={`input-base text-sm ${errors.department ? 'border-red-400' : ''}`}>
                  <option value="">Pilih departemen...</option>
                  {(departments.length ? departments : ['Technology','Human Resources','Finance','Operations','Marketing','Sales']).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
              </div>

              {renderField('Telepon', 'phone', 'tel', '08xxxxxxxxxx', false, employee?.employee?.phone || '')}
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
                    ref={refs.salary_base}
                    type="number"
                    defaultValue={employee?.employee?.salary_base || ''}
                    placeholder="5000000"
                    className={`input-base pl-10 text-sm ${errors.salary_base ? 'border-red-400' : ''}`}
                    onChange={() => { if (errors.salary_base) setErrors(e => ({...e, salary_base:''})); }}
                  />
                </div>
                {errors.salary_base && <p className="text-xs text-red-500 mt-1">{errors.salary_base}</p>}
              </div>

              {/* Tanggal bergabung */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Tanggal Bergabung <span className="text-red-500">*</span>
                </label>
                <input type="date" value={joinDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => { setJoinDate(e.target.value); setErrors(er => ({...er, join_date:''})); }}
                  className={`input-base text-sm ${errors.join_date ? 'border-red-400' : ''}`}
                />
                {errors.join_date && <p className="text-xs text-red-500 mt-1">{errors.join_date}</p>}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map(s => {
                    const sc = EMP_STATUS[s];
                    return (
                      <button key={s} type="button" onClick={() => setStatus(s)}
                        className={`py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95
                          ${status === s ? `${sc.bg} ${sc.color} border-current` : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {renderField('Alamat', 'address', 'text', 'Jl. Contoh No.1, Jakarta', false, employee?.employee?.address || '')}
              {renderField('Kontak Darurat', 'emergency_contact', 'text', 'Nama kontak darurat', false, employee?.employee?.emergency_contact || '')}
              {renderField('Telepon Darurat', 'emergency_phone', 'tel', '08xxxxxxxxxx', false, employee?.employee?.emergency_phone || '')}
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
            <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 h-11 text-sm">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                       : <><CheckCircle2 className="w-4 h-4" /> {isEdit ? 'Simpan' : 'Tambah Karyawan'}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ════════════════════════════════════════════════════════════════
// PROFILE DRAWER
// ════════════════════════════════════════════════════════════════
const ProfileDrawer = ({ userId, onClose, onEdit, onDeactivate, onReactivate, canManage }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [faceStatus, setFaceStatus] = useState(null);
  const [showFaceReg, setShowFaceReg] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      employeeService.getOne(userId),
      attendanceService.getFaceStatus(userId),
    ])
      .then(([r, fr]) => {
        setData(r.data.data);
        setFaceStatus(fr.data.data);
      })
      .catch(() => toast.error('Gagal memuat profil'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] p-8 flex items-center justify-center"
        onClick={e => e.stopPropagation()}>
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
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
        <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin"
          onClick={e => e.stopPropagation()}>
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-[var(--border2)]" />
          </div>

          {/* Header */}
          <div className="px-5 pt-4 pb-5 border-b border-[var(--border)]">
            <div className="flex items-start justify-between mb-4">
              <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]">
                <X className="w-4 h-4" />
              </button>
              {canManage && !isSelf && (
                <div className="flex gap-2 flex-wrap justify-end">
                  {/* Daftarkan Wajah button */}
                  <button onClick={() => setShowFaceReg(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                      ${faceStatus?.registered
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                        : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                      }`}>
                    <Camera className="w-3 h-3" />
                    {faceStatus?.registered ? '✓ Update Wajah' : 'Daftarkan Wajah'}
                  </button>
                  <button onClick={() => { onClose(); onEdit(user); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                  {user.is_active ? (
                    <button onClick={() => { onClose(); onDeactivate(user); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950">
                      <UserX className="w-3 h-3" /> Nonaktifkan
                    </button>
                  ) : (
                    <button onClick={() => { onClose(); onReactivate(user); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white">
                      <UserCheck className="w-3 h-3" /> Aktifkan
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar name={user.name} size="xl" />
                {faceStatus?.registered && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[var(--bg-card)] flex items-center justify-center">
                    <ShieldCheck className="w-3 h-3 text-white" />
                  </div>
                )}
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

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)]">
              <div className="p-3.5 text-center">
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.attendance_this_month?.present || 0}</p>
                <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">Hadir</p>
              </div>
              <div className="p-3.5 text-center">
                <p className="text-lg font-black text-amber-600 dark:text-amber-400">{stats.leave_quota?.remaining ?? '—'}</p>
                <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">Sisa Cuti</p>
              </div>
              <div className="p-3.5 text-center">
                <p className="text-lg font-black text-brand-600 dark:text-brand-400">
                  {stats.last_salary ? `${Math.round(stats.last_salary.amount/1000000)}jt` : '—'}
                </p>
                <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">Gaji</p>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Informasi Kerja</p>
              <div className="space-y-2.5">
                {[
                  { icon: Shield,     label: 'NIP',        value: emp?.nip },
                  { icon: Building2,  label: 'Departemen', value: emp?.department },
                  { icon: Briefcase,  label: 'Jabatan',    value: emp?.position },
                  { icon: Calendar,   label: 'Bergabung',  value: formatJoinDate(emp?.join_date) },
                  { icon: Clock,      label: 'Masa Kerja', value: stats?.tenure },
                  { icon: DollarSign, label: 'Gaji Pokok', value: toRupiah(emp?.salary_base), hide: !canManage },
                  { icon: Mail,       label: 'Email',      value: user.email },
                  { icon: Camera,     label: 'Wajah',      value: faceStatus?.registered ? '✅ Terdaftar' : '❌ Belum Didaftarkan' },
                ].filter(i => !i.hide).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wide">{item.label}</p>
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.value || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(emp?.phone || emp?.address || emp?.emergency_contact) && (
              <div>
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Kontak</p>
                <div className="space-y-2.5">
                  {emp.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                        <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wide">Telepon</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{emp.phone}</p>
                      </div>
                    </div>
                  )}
                  {emp.address && (
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wide">Alamat</p>
                        <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">{emp.address}</p>
                      </div>
                    </div>
                  )}
                  {emp.emergency_contact && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wide">Kontak Darurat</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {emp.emergency_contact}{emp.emergency_phone && ` · ${emp.emergency_phone}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Face registration modal */}
      {showFaceReg && (
        <FaceRegisterModal
          userId={userId}
          userName={user.name}
          onClose={() => setShowFaceReg(false)}
          onSuccess={() => {
            setFaceStatus({ registered: true });
          }}
        />
      )}
    </>
  );
};

// ════════════════════════════════════════════════════════════════
// STATS ROW
// ════════════════════════════════════════════════════════════════
const StatsRow = ({ stats }) => {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label:'Total',   value:stats.total,            color:'text-[var(--text-primary)]' },
        { label:'Aktif',   value:stats.active,           color:'text-emerald-600 dark:text-emerald-400' },
        { label:'Inactive',value:stats.inactive,         color:'text-red-600 dark:text-red-400' },
        { label:'Baru',    value:stats.new_this_month,   color:'text-brand-600 dark:text-brand-400' },
      ].map((s,i) => (
        <div key={i} className="card p-3 text-center">
          <p className={`text-lg font-bold ${s.color}`}>{s.value ?? 0}</p>
          <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN EMPLOYEES PAGE
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
  const [showAddForm, setShowAddForm]   = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [profileId, setProfileId]   = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const searchTimeout = useRef(null);

  // Stable fetch — no changing dependencies
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

  // Rebuild params and fetch when filters change
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
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Karyawan</h1>
          <p className="text-sm text-[var(--text-secondary)]">{employees.length} karyawan{deptFilter ? ` · ${deptFilter}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchEmployees({ status: statusFilter, department: deptFilter, search })}
            className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canManage && (
            <button onClick={() => setShowAddForm(true)} className="btn-primary h-9 px-3 text-sm">
              <Plus className="w-4 h-4" /> Tambah
            </button>
          )}
        </div>
      </div>

      {canManage && <div className="mb-4"><StatsRow stats={stats} /></div>}

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
            ${showFilters || deptFilter || statusFilter !== 'active'
              ? 'bg-brand-500 border-brand-500 text-white'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'}`}>
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card p-3 mb-3 space-y-3 animate-slide-down">
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Status</p>
            <div className="flex gap-1.5 flex-wrap">
              {[{v:'',l:'Semua'},{v:'active',l:'Aktif'},{v:'inactive',l:'Tidak Aktif'},{v:'terminated',l:'Berhenti'}].map(f => (
                <button key={f.v} onClick={() => setStatusFilter(f.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${statusFilter===f.v ? 'bg-brand-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>
          {departments.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Departemen</p>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setDeptFilter('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!deptFilter ? 'bg-brand-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
                  Semua
                </button>
                {departments.map(d => (
                  <button key={d} onClick={() => setDeptFilter(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${deptFilter===d ? 'bg-brand-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-18 rounded-2xl" style={{height:'72px'}} />)}</div>
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
                <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                  {emp.employee?.position} · {emp.employee?.department}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={emp.employee?.status} />
                  {emp.employee?.tenure && <span className="text-[10px] text-[var(--text-muted)]">{emp.employee.tenure}</span>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddForm && (
        <EmployeeForm
          key="add-form"
          onClose={() => setShowAddForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}
      {editEmployee && (
        <EmployeeForm
          key={`edit-${editEmployee.id}`}
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSuccess={handleFormSuccess}
        />
      )}
      {profileId && (
        <ProfileDrawer
          userId={profileId}
          onClose={() => setProfileId(null)}
          onEdit={(emp) => { setProfileId(null); setEditEmployee(emp); }}
          onDeactivate={(emp) => { setProfileId(null); setDeactivateTarget(emp); }}
          onReactivate={(emp) => handleReactivate(emp)}
          canManage={canManage}
        />
      )}
      {deactivateTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setDeactivateTarget(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 shadow-2xl animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
              <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] text-center mb-2">Nonaktifkan Karyawan</h3>
            <p className="text-sm text-[var(--text-secondary)] text-center mb-5">
              Akun <strong>{deactivateTarget.name}</strong> akan dinonaktifkan. Data tetap tersimpan.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeactivateTarget(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={() => handleDeactivate(deactivateTarget)}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95">
                <UserX className="w-4 h-4" /> Nonaktifkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
