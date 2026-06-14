import { useState, useEffect, useCallback, useRef } from 'react';
import {
  User, Phone, MapPin, AlertCircle, Camera, Save, Lock,
  Calendar, CheckCircle2, FileText, Loader2, RefreshCw,
  Eye, EyeOff, Edit3, X, Building2, CreditCard,
  ChevronLeft, ChevronRight, Bell, Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const MONTHS_ID = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MONTHS_FULL = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function SelfServicePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('profile');

  const TABS = [
    { id:'profile',    icon:'👤', label:'Profil'     },
    { id:'attendance', icon:'📅', label:'Absensi'    },
    { id:'leave',      icon:'🌴', label:'Cuti'       },
    { id:'payslip',    icon:'💰', label:'Slip Gaji'  },
    { id:'password',   icon:'🔐', label:'Password'   },
  ];

  return (
    <div className="lg:hidden hrd-mobile-page">
      {/* Profile header card */}
      <MobileProfileHeader user={user} onTabChange={setTab}/>

      {/* Swipe tabs */}
      <div className="swipe-tabs mt-4 mb-4">
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`swipe-tab ${tab===t.id?'active':''}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile'    && <ProfileTab    userId={user?.id}/>}
      {tab === 'attendance' && <AttendanceTab userId={user?.id}/>}
      {tab === 'leave'      && <LeaveTab      userId={user?.id}/>}
      {tab === 'payslip'    && <PayslipTab/>}
      {tab === 'password'   && <PasswordTab/>}
    </div>
  );
}

// ── Mobile Profile Header ─────────────────────────────────────
const MobileProfileHeader = ({ user, onTabChange }) => {
  const [empData, setEmpData] = useState(null);
  useEffect(() => {
    api.get(`/employees/${user?.id}`).then(r => setEmpData(r.data.data)).catch(()=>{});
  }, [user?.id]);

  const emp = empData?.employee || {};
  const needsBank = !emp.bank_code;

  return (
    <div className="mobile-card mb-2 overflow-visible">
      {/* Gradient header */}
      <div className="h-24 relative" style={{background:'linear-gradient(135deg, var(--brand-600), var(--brand-800))'}}>
        <div className="absolute inset-0 opacity-10"
          style={{backgroundImage:'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',backgroundSize:'20px 20px'}}/>
      </div>

      {/* Avatar + info */}
      <div className="px-4 pb-4">
        <div className="flex items-end gap-4 -mt-10 mb-3">
          <div className="relative">
            {emp.photo_url ? (
              <img src={emp.photo_url} alt={user?.name}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-[var(--bg-card)] shadow-lg"/>
            ) : (
              <div className="w-20 h-20 rounded-2xl border-4 border-[var(--bg-card)] shadow-lg flex items-center justify-center text-white text-2xl font-black"
                style={{background:'linear-gradient(135deg,var(--brand-500),var(--brand-700))'}}>
                {(user?.name||'?')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="pb-1 flex-1 min-w-0">
            <p className="font-black text-base truncate text-[var(--text-primary)]">{user?.name}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{emp.position || '—'} · {emp.department || '—'}</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label:'Status',   value: emp.status==='active'?'Aktif':'Nonaktif', color: emp.status==='active'?'text-emerald-600':'text-red-500' },
            { label:'Join',     value: emp.join_date ? new Date(emp.join_date).toLocaleDateString('id-ID',{month:'short',year:'numeric'}) : '—', color:'text-[var(--text-primary)]' },
            { label:'NIP',      value: emp.nip||'—', color:'text-[var(--text-primary)]' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--bg-secondary)] rounded-xl p-2.5 text-center">
              <p className={`text-xs font-bold truncate ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Alert rekening bank */}
        {needsBank && (
          <button onClick={()=>onTabChange('profile')}
            className="w-full flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
            <AlertCircle size={15} className="text-amber-500 flex-shrink-0"/>
            <p className="text-xs text-amber-700 font-medium">Rekening bank belum diisi — tap untuk lengkapi</p>
          </button>
        )}
      </div>
    </div>
  );
};

// ── PROFILE TAB ───────────────────────────────────────────────
const ProfileTab = ({ userId }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState(null); // which field is being edited
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/employees/${userId}`);
      const d = r.data.data;
      setData(d);
      const emp = d.employee || {};
      setForm({
        name:                d.user?.name || d.name || '',
        phone:               emp.phone || '',
        address:             emp.address || '',
        emergency_contact:   emp.emergency_contact || '',
        emergency_phone:     emp.emergency_phone || '',
        bank_code:           emp.bank_code || '',
        bank_account_number: emp.bank_account_number || '',
        bank_account_name:   emp.bank_account_name || '',
      });
    } catch { toast.error('Gagal memuat profil'); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const saveField = async (key) => {
    setSaving(true);
    try {
      await api.put(`/employees/${userId}`, { [key]: form[key] });
      toast.success('Tersimpan!');
      setEditField(null);
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const saveBank = async () => {
    setSaving(true);
    try {
      await api.put(`/employees/${userId}`, {
        bank_code: form.bank_code,
        bank_account_number: form.bank_account_number,
        bank_account_name: form.bank_account_name,
      });
      toast.success('Rekening bank disimpan!');
      setEditField(null);
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const toastId = toast.loading('Mengupload foto...');
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const MAX = 400;
      const ratio = Math.min(MAX/img.width, MAX/img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      let q = 0.8, dataUrl = canvas.toDataURL('image/jpeg', q);
      while (dataUrl.length > 100_000 && q > 0.3) { q -= 0.1; dataUrl = canvas.toDataURL('image/jpeg', q); }
      try {
        const blob = await fetch(dataUrl).then(r=>r.blob());
        const fd = new FormData(); fd.append('file', blob, 'photo.jpg');
        const up = await api.post('/employees/upload-photo', fd, { headers:{'Content-Type':'multipart/form-data'} });
        const url = up.data.data?.url || up.data.url;
        await api.put(`/employees/${userId}`, { photo_url: url });
        toast.success('Foto diperbarui!', { id: toastId });
        load();
      } catch { toast.error('Gagal upload', { id: toastId }); }
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(5)].map((_,i)=><div key={i} className="skeleton h-14 rounded-xl"/>)}
    </div>
  );

  const EDITABLE_FIELDS = [
    { key:'name',              label:'Nama Lengkap',      type:'text', icon:<User size={16}/> },
    { key:'phone',             label:'No. HP',            type:'tel',  icon:<Phone size={16}/> },
    { key:'address',           label:'Alamat',            type:'text', icon:<MapPin size={16}/> },
    { key:'emergency_contact', label:'Kontak Darurat',    type:'text', icon:<Bell size={16}/> },
    { key:'emergency_phone',   label:'HP Kontak Darurat', type:'tel',  icon:<Phone size={16}/> },
  ];

  return (
    <div className="space-y-3">
      {/* Photo upload */}
      <button onClick={()=>fileRef.current?.click()}
        className="w-full mobile-card flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity">
        <Camera size={18} className="text-[var(--brand-600)]"/>
        <span className="text-sm font-semibold text-[var(--text-primary)]">Ganti Foto Profil</span>
        <ChevronRight size={16} className="ml-auto text-[var(--text-muted)]"/>
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="user" className="sr-only" onChange={handlePhotoUpload}/>

      {/* Editable fields */}
      <div className="mobile-section-header">Data Pribadi</div>
      <div className="mobile-card divide-y divide-[var(--border)]">
        {EDITABLE_FIELDS.map(f => (
          <div key={f.key}>
            {editField === f.key ? (
              <div className="p-4 space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">{f.label}</label>
                <input type={f.type} value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                  autoFocus className="input-base w-full text-sm" style={{fontSize:'16px'}}/>
                <div className="flex gap-2">
                  <button onClick={()=>setEditField(null)} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-muted)]">Batal</button>
                  <button onClick={()=>saveField(f.key)} disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-[var(--brand-600)] text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
                    {saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>} Simpan
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={()=>setEditField(f.key)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[var(--bg-secondary)] transition-colors">
                <span className="text-[var(--text-muted)] flex-shrink-0">{f.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-medium">{f.label}</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {form[f.key] || <span className="text-[var(--text-muted)] italic font-normal">Belum diisi</span>}
                  </p>
                </div>
                <Edit3 size={14} className="text-[var(--text-muted)] flex-shrink-0"/>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Bank account */}
      <div className="mobile-section-header">Rekening Bank (untuk transfer gaji)</div>
      <div className="mobile-card p-4">
        {editField === 'bank' ? (
          <div className="space-y-3">
            {[
              { key:'bank_code',           label:'Kode Bank',    placeholder:'bca / bni / mandiri' },
              { key:'bank_account_number', label:'No. Rekening', placeholder:'1234567890' },
              { key:'bank_account_name',   label:'Nama di Buku', placeholder:'Nama sesuai rekening' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">{f.label}</label>
                <input value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                  placeholder={f.placeholder} className="input-base w-full text-sm uppercase" style={{fontSize:'16px'}}/>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={()=>setEditField(null)} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-muted)]">Batal</button>
              <button onClick={saveBank} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[var(--brand-600)] text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
                {saving ? <Loader2 size={13} className="animate-spin"/> : <CreditCard size={13}/>} Simpan
              </button>
            </div>
          </div>
        ) : (
          <button onClick={()=>setEditField('bank')} className="w-full text-left">
            {form.bank_code ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <CreditCard size={18} className="text-blue-600"/>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm uppercase">{form.bank_code}</p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">{form.bank_account_number}</p>
                  <p className="text-xs text-[var(--text-muted)]">{form.bank_account_name}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">✅ Terisi</span>
                  <Edit3 size={14} className="text-[var(--text-muted)]"/>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-1">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={18} className="text-amber-600"/>
                </div>
                <div>
                  <p className="font-semibold text-sm text-amber-700">Rekening belum diisi</p>
                  <p className="text-xs text-[var(--text-muted)]">Tap untuk mengisi rekening bank</p>
                </div>
                <ChevronRight size={16} className="ml-auto text-[var(--text-muted)]"/>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// ── ATTENDANCE TAB ────────────────────────────────────────────
const AttendanceTab = ({ userId }) => {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()+1);
  const [data,  setData]  = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/attendance/my', { params: { year, month, limit:100 } });
      setData(r.data.data?.records || r.data.data?.attendances || []);
    } catch {}
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const stats = {
    hadir:    data.filter(a=>a.status==='present').length,
    terlambat:data.filter(a=>a.status==='late').length,
    absen:    data.filter(a=>a.status==='absent').length,
    cuti:     data.filter(a=>a.status==='leave').length,
  };

  const STATUS_CONFIG = {
    present:  { label:'Hadir',      bg:'bg-emerald-100', text:'text-emerald-700', dot:'bg-emerald-500' },
    late:     { label:'Terlambat',  bg:'bg-amber-100',   text:'text-amber-700',   dot:'bg-amber-500'   },
    absent:   { label:'Absen',      bg:'bg-red-100',     text:'text-red-700',     dot:'bg-red-500'     },
    leave:    { label:'Cuti',       bg:'bg-blue-100',    text:'text-blue-700',    dot:'bg-blue-500'    },
  };

  const sorted = [...data].sort((a,b)=>new Date(b.date||b.created_at)-new Date(a.date||a.created_at));

  return (
    <div className="space-y-3">
      {/* Period nav */}
      <div className="flex items-center justify-between px-1">
        <button onClick={prevMonth} className="w-9 h-9 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center active:scale-90 transition-transform">
          <ChevronLeft size={18}/>
        </button>
        <p className="font-bold text-base">{MONTHS_FULL[month]} {year}</p>
        <button onClick={nextMonth} className="w-9 h-9 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center active:scale-90 transition-transform">
          <ChevronRight size={18}/>
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { k:'hadir',     icon:'✅', label:'Hadir',     v:stats.hadir,     c:'emerald' },
          { k:'terlambat', icon:'⚠️', label:'Terlambat', v:stats.terlambat, c:'amber'   },
          { k:'absen',     icon:'❌', label:'Absen',     v:stats.absen,     c:'red'     },
          { k:'cuti',      icon:'🌴', label:'Cuti',      v:stats.cuti,      c:'blue'    },
        ].map(s => (
          <div key={s.k} className={`mobile-card p-2.5 text-center bg-${s.c}-50`}>
            <p className="text-base">{s.icon}</p>
            <p className={`text-lg font-black text-${s.c}-600`}>{s.v}</p>
            <p className="text-[9px] text-[var(--text-muted)] font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Records list */}
      <div className="mobile-section-header">Riwayat</div>
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      ) : sorted.length === 0 ? (
        <div className="mobile-card p-10 text-center text-[var(--text-muted)]">
          <Calendar size={32} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">Tidak ada data absensi</p>
        </div>
      ) : (
        <div className="mobile-card divide-y divide-[var(--border)]">
          {sorted.map(a => {
            const sc = STATUS_CONFIG[a.status] || { label:a.status, bg:'bg-gray-100', text:'text-gray-600', dot:'bg-gray-400' };
            const d = new Date(a.date||a.created_at);
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex flex-col items-center justify-center flex-shrink-0">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase leading-none">
                    {d.toLocaleDateString('id-ID',{month:'short'})}
                  </p>
                  <p className="text-base font-black text-[var(--text-primary)] leading-tight">{d.getDate()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`}/>
                    <span className="text-sm font-semibold">{sc.label}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {a.check_in ? `Masuk ${a.check_in.slice(0,5)}` : ''}
                    {a.check_out ? ` · Pulang ${a.check_out.slice(0,5)}` : ''}
                    {!a.check_in && !a.check_out ? 'Tidak ada catatan' : ''}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sc.bg} ${sc.text}`}>
                  {d.toLocaleDateString('id-ID',{weekday:'short'})}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── LEAVE TAB ─────────────────────────────────────────────────
const LeaveTab = ({ userId }) => {
  const [leaves,   setLeaves]   = useState([]);
  const [quota,    setQuota]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ leave_type:'annual', start_date:'', end_date:'', reason:'' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lr, qr] = await Promise.all([
        api.get('/leaves/my', { params:{limit:50} }),
        api.get('/leaves/my/quota').catch(()=>null),
      ]);
      setLeaves(lr.data.data?.leaves || lr.data.data || []);
      if (qr) setQuota(qr.data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.start_date||!form.end_date||!form.reason) { toast.error('Lengkapi semua field'); return; }
    setSubmitting(true);
    try {
      await api.post('/leaves', form);
      toast.success('Pengajuan cuti terkirim! 🌴');
      setShowForm(false);
      setForm({ leave_type:'annual', start_date:'', end_date:'', reason:'' });
      load();
    } catch(e) { toast.error(e.response?.data?.message||'Gagal'); }
    finally { setSubmitting(false); }
  };

  const STATUS = {
    pending:  { label:'Menunggu', bg:'bg-amber-100',   text:'text-amber-700',   icon:'⏳' },
    approved: { label:'Disetujui', bg:'bg-emerald-100', text:'text-emerald-700', icon:'✅' },
    rejected: { label:'Ditolak',  bg:'bg-red-100',     text:'text-red-700',     icon:'❌' },
  };
  const LEAVE_TYPES = { annual:'Cuti Tahunan', sick:'Sakit', personal:'Keperluan', maternity:'Melahirkan', other:'Lainnya' };

  return (
    <div className="space-y-3">
      {/* Quota */}
      {quota && (
        <div className="mobile-card p-4">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-3">Kuota Cuti Tahunan</p>
          <div className="flex items-center gap-4 mb-2">
            <div className="text-center">
              <p className="text-3xl font-black text-[var(--brand-600)]">{quota.remaining||12}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Sisa</p>
            </div>
            <div className="flex-1">
              <div className="h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--brand-600)] rounded-full transition-all"
                  style={{width:`${Math.min(100,(quota.used||0)/(quota.total_quota||12)*100)}%`}}/>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-[var(--text-muted)]">Terpakai: {quota.used||0} hari</span>
                <span className="text-[10px] text-[var(--text-muted)]">Total: {quota.total_quota||12} hari</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ajukan cuti button */}
      <button onClick={()=>setShowForm(true)}
        className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-98 transition-transform"
        style={{background:'linear-gradient(135deg,var(--brand-500),var(--brand-700))'}}>
        <Calendar size={16}/> Ajukan Cuti Baru
      </button>

      {/* Bottom sheet form */}
      {showForm && (
        <div className="bottom-sheet" onClick={()=>setShowForm(false)}>
          <div className="bottom-sheet-content" onClick={e=>e.stopPropagation()}>
            <div className="bottom-sheet-handle"/>
            <div className="px-5 pb-2 pt-1">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-base">🌴 Ajukan Cuti</p>
                <button onClick={()=>setShowForm(false)} className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
                  <X size={16}/>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-2">Jenis Cuti</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(LEAVE_TYPES).map(([k,v]) => (
                      <button key={k} onClick={()=>setForm(p=>({...p,leave_type:k}))}
                        className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.leave_type===k ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)]' : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)]'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1.5">Tanggal Mulai</label>
                    <input type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))}
                      className="input-base text-sm w-full" style={{fontSize:'16px'}}/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1.5">Tanggal Selesai</label>
                    <input type="date" value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))}
                      className="input-base text-sm w-full" style={{fontSize:'16px'}}/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1.5">Alasan</label>
                  <textarea value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))}
                    placeholder="Jelaskan alasan pengajuan cuti..." rows={3}
                    className="input-base text-sm w-full resize-none" style={{fontSize:'16px'}}/>
                </div>
                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 active:scale-98 transition-transform"
                  style={{background:'linear-gradient(135deg,var(--brand-500),var(--brand-700))'}}>
                  {submitting ? <Loader2 size={16} className="animate-spin"/> : <Calendar size={16}/>}
                  {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="mobile-section-header">Riwayat Cuti</div>
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_,i)=><div key={i} className="skeleton h-20 rounded-xl"/>)}</div>
      ) : leaves.length === 0 ? (
        <div className="mobile-card p-10 text-center text-[var(--text-muted)]">
          <p className="text-3xl mb-2">🌴</p>
          <p className="text-sm font-medium">Belum ada pengajuan cuti</p>
        </div>
      ) : (
        <div className="mobile-card divide-y divide-[var(--border)]">
          {leaves.map(l => {
            const sc = STATUS[l.status] || STATUS.pending;
            return (
              <div key={l.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="font-bold text-sm">{LEAVE_TYPES[l.leave_type]||l.leave_type}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(l.start_date).toLocaleDateString('id-ID',{day:'numeric',month:'short'})} —{' '}
                      {new Date(l.end_date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}
                      {' '}· {l.days} hari
                    </p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold flex-shrink-0 ${sc.bg} ${sc.text}`}>
                    {sc.icon} {sc.label}
                  </span>
                </div>
                {l.reason && <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{l.reason}</p>}
                {l.notes && <p className="text-xs text-blue-600 mt-1">💬 HR: {l.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── PAYSLIP TAB ───────────────────────────────────────────────
const PayslipTab = () => {
  const [slips,   setSlips]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/payroll-engine/my', { params:{limit:24} })
      .then(r => setSlips(r.data.data?.items||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  const toRp = v => 'Rp '+(parseFloat(v)||0).toLocaleString('id-ID');
  const TYPE  = { monthly:'💰 Gaji', thr:'🎊 THR', bonus:'🏆 Bonus', incentive:'🚀 Insentif' };

  const handlePrint = (slip) => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Slip</title><style>
      body{font-family:sans-serif;padding:24px;max-width:480px;margin:auto;font-size:14px}
      h3{margin:0 0 4px}p{margin:0;color:#666;font-size:12px}
      table{width:100%;margin-top:16px;border-collapse:collapse}
      td{padding:6px 0;border-bottom:1px solid #f0f0f0}
      .r{text-align:right}.b{font-weight:700}.g{color:#16a34a}.re{color:#dc2626}
    </style></head><body>
      <h3>${slip.run?.period_label||'Slip Gaji'}</h3>
      <p>${slip.employee_name} · ${slip.employee_position||''}</p>
      <table>
        ${(slip.income_lines||[]).map(l=>`<tr><td>${l.name}</td><td class="r g">${toRp(l.amount)}</td></tr>`).join('')}
        ${(slip.deduction_lines||[]).map(l=>`<tr><td class="re">${l.name}</td><td class="r re">-${toRp(l.amount)}</td></tr>`).join('')}
        <tr><td class="b">Gaji Bersih</td><td class="r b g" style="font-size:18px">${toRp(slip.net_salary)}</td></tr>
      </table>
    </body></html>`);
    w.document.close(); w.print();
  };

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-28 rounded-2xl"/>)}</div>;

  return (
    <div className="space-y-3">
      {slips.length === 0 ? (
        <div className="mobile-card p-10 text-center text-[var(--text-muted)]">
          <p className="text-3xl mb-2">💰</p>
          <p className="text-sm">Belum ada slip gaji</p>
        </div>
      ) : slips.map(slip => (
        <div key={slip.id} className="mobile-card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase">{TYPE[slip.run?.type]||'💰 Gaji'}</p>
              <p className="font-bold text-sm mt-0.5">{slip.run?.period_label||'—'}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${slip.run?.status==='paid'?'bg-emerald-100 text-emerald-700':'bg-blue-100 text-blue-700'}`}>
              {slip.run?.status==='paid'?'✅ Dibayar':'📋 '+slip.run?.status}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { l:'Pendapatan',  v:slip.total_income,      c:'text-emerald-600' },
              { l:'Potongan',    v:slip.total_deductions,  c:'text-red-500' },
              { l:'Bersih',      v:slip.net_salary,        c:'text-[var(--brand-600)]' },
            ].map(s => (
              <div key={s.l} className="bg-[var(--bg-secondary)] rounded-xl p-2 text-center">
                <p className={`text-xs font-bold ${s.c} truncate`}>{toRp(s.v)}</p>
                <p className="text-[9px] text-[var(--text-muted)]">{s.l}</p>
              </div>
            ))}
          </div>
          <button onClick={()=>handlePrint(slip)}
            className="w-full py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-center gap-1.5 active:bg-[var(--bg-secondary)] transition-colors">
            <FileText size={13}/> Cetak Slip
          </button>
        </div>
      ))}
    </div>
  );
};

// ── PASSWORD TAB ──────────────────────────────────────────────
const PasswordTab = () => {
  const [form, setForm] = useState({ current:'', newPw:'', confirm:'' });
  const [show, setShow] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.current||!form.newPw||!form.confirm) { toast.error('Lengkapi semua field'); return; }
    if (form.newPw !== form.confirm) { toast.error('Password tidak cocok'); return; }
    if (form.newPw.length < 6) { toast.error('Minimal 6 karakter'); return; }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { current_password:form.current, new_password:form.newPw });
      toast.success('Password berhasil diubah! 🔐');
      setForm({ current:'', newPw:'', confirm:'' });
    } catch(e) { toast.error(e.response?.data?.message||'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="mobile-card p-4">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-600)]/10 flex items-center justify-center">
            <Shield size={18} className="text-[var(--brand-600)]"/>
          </div>
          <div>
            <p className="font-bold">Ganti Password</p>
            <p className="text-xs text-[var(--text-muted)]">Minimal 6 karakter</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { key:'current', label:'Password Saat Ini' },
            { key:'newPw',   label:'Password Baru' },
            { key:'confirm', label:'Konfirmasi Password' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">{f.label}</label>
              <div className="relative">
                <input type={show[f.key]?'text':'password'} value={form[f.key]}
                  onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                  className="input-base text-sm w-full pr-10" style={{fontSize:'16px'}}/>
                <button onClick={()=>setShow(p=>({...p,[f.key]:!p[f.key]}))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  {show[f.key] ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
          ))}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            style={{background:'linear-gradient(135deg,var(--brand-500),var(--brand-700))'}}>
            {saving ? <Loader2 size={16} className="animate-spin"/> : <Lock size={16}/>}
            {saving ? 'Menyimpan...' : 'Ubah Password'}
          </button>
        </div>
      </div>
    </div>
  );
};
