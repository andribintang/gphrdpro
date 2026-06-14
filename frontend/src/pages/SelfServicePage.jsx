import { useState, useEffect, useCallback, useRef } from 'react';
import {
  User, Phone, MapPin, AlertCircle, Camera, Save, Lock,
  Calendar, Clock, CheckCircle2, XCircle, TrendingUp,
  FileText, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  CreditCard, Eye, EyeOff, Edit3, X, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const MONTHS_ID = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const ATT_STATUS_STYLE = {
  present:  'bg-emerald-100 text-emerald-700',
  late:     'bg-amber-100 text-amber-700',
  absent:   'bg-red-100 text-red-700',
  leave:    'bg-blue-100 text-blue-700',
  holiday:  'bg-purple-100 text-purple-700',
};
const ATT_LABEL = { present:'Hadir', late:'Terlambat', absent:'Absen', leave:'Cuti', holiday:'Libur' };

export default function SelfServicePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('profile');

  const TABS = [
    { id:'profile',   icon:'👤', label:'Profil Saya'    },
    { id:'attendance', icon:'📅', label:'Absensi Saya'  },
    { id:'leave',     icon:'🌴', label:'Cuti Saya'      },
    { id:'payslip',   icon:'💰', label:'Slip Gaji'      },
    { id:'password',  icon:'🔐', label:'Ganti Password' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-600)] to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
          {(user?.name||'?')[0].toUpperCase()}
        </div>
        <div>
          <h1 className="page-title">{user?.name}</h1>
          <p className="page-subtitle capitalize">{user?.role} · Self Service Portal</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0 flex items-center gap-1.5
              ${tab===t.id ? 'border-[var(--brand-600)] text-[var(--brand-600)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tab === 'profile'    && <ProfileTab    userId={user?.id}/>}
      {tab === 'attendance' && <AttendanceTab userId={user?.id}/>}
      {tab === 'leave'      && <LeaveTab      userId={user?.id}/>}
      {tab === 'payslip'    && <PayslipTab    userId={user?.id}/>}
      {tab === 'password'   && <PasswordTab/>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PROFILE TAB
// ════════════════════════════════════════════════════════════════
const ProfileTab = ({ userId }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({});
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/employees/${userId}`);
      const d = r.data.data;
      setData(d);
      setForm({
        name:              d.user?.name || d.name || '',
        phone:             d.employee?.phone || '',
        address:           d.employee?.address || '',
        emergency_contact: d.employee?.emergency_contact || '',
        emergency_phone:   d.employee?.emergency_phone || '',
        bank_code:         d.employee?.bank_code || '',
        bank_account_number: d.employee?.bank_account_number || '',
        bank_account_name: d.employee?.bank_account_name || '',
      });
    } catch { toast.error('Gagal memuat profil'); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/employees/${userId}`, form);
      toast.success('Profil berhasil diperbarui');
      setEditing(false);
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Compress via canvas
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const MAX = 400;
      const ratio = Math.min(MAX/img.width, MAX/img.height);
      canvas.width  = img.width  * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      let quality = 0.8;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > 100_000 && quality > 0.3) { quality -= 0.1; dataUrl = canvas.toDataURL('image/jpeg', quality); }
      try {
        // Upload to Cloudinary
        const blob = await fetch(dataUrl).then(r=>r.blob());
        const fd = new FormData(); fd.append('file', blob, 'photo.jpg');
        const up = await api.post('/employees/upload-photo', fd, { headers:{'Content-Type':'multipart/form-data'} });
        const url = up.data.data?.url || up.data.url;
        await api.put(`/employees/${userId}`, { photo_url: url });
        toast.success('Foto diperbarui');
        load();
      } catch { toast.error('Gagal upload foto'); }
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin"/></div>;
  if (!data)   return null;

  const emp  = data.employee || data;
  const user = data.user || data;

  const INFO_ROWS = [
    { label:'NIP',           value:emp.nip,           icon:<FileText size={14}/> },
    { label:'Jabatan',       value:emp.position,       icon:<Building2 size={14}/> },
    { label:'Departemen',    value:emp.department,     icon:<Building2 size={14}/> },
    { label:'Tgl Bergabung', value:emp.join_date ? new Date(emp.join_date).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '—', icon:<Calendar size={14}/> },
    { label:'Status',        value:emp.status,         icon:<CheckCircle2 size={14}/> },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Left — photo + info kerja */}
      <div className="space-y-4">
        {/* Photo */}
        <div className="table-wrapper p-5 text-center">
          <div className="relative w-24 h-24 mx-auto mb-3">
            {emp.photo_url ? (
              <img src={emp.photo_url} alt={user.name} className="w-24 h-24 rounded-2xl object-cover border-2 border-[var(--border)] shadow-md"/>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--brand-600)] to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-md">
                {(user.name||'?')[0].toUpperCase()}
              </div>
            )}
            <button onClick={()=>fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--brand-600)] text-white flex items-center justify-center shadow-md hover:bg-[var(--brand-700)] transition-colors">
              <Camera size={14}/>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload}/>
          </div>
          <p className="font-bold text-base">{user.name}</p>
          <p className="text-sm text-[var(--text-muted)]">{emp.position||'—'}</p>
          <span className="inline-block mt-2 text-[11px] px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold capitalize">{emp.status||'active'}</span>
        </div>

        {/* Info pekerjaan */}
        <div className="table-wrapper overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Info Pekerjaan</p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {INFO_ROWS.map(r => (
              <div key={r.label} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-[var(--text-muted)] flex-shrink-0">{r.icon}</span>
                <div className="min-w-0">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{r.label}</p>
                  <p className="text-sm font-semibold capitalize">{r.value||'—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — editable fields */}
      <div className="lg:col-span-2 space-y-4">
        {/* Data pribadi */}
        <div className="table-wrapper overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Data Pribadi</p>
            {!editing ? (
              <button onClick={()=>setEditing(true)} className="flex items-center gap-1.5 text-xs text-[var(--brand-600)] font-semibold hover:underline">
                <Edit3 size={12}/> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={()=>{setEditing(false);load();}} className="text-xs text-[var(--text-muted)] hover:text-red-500 flex items-center gap-1">
                  <X size={12}/> Batal
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 text-xs text-white bg-[var(--brand-600)] px-3 py-1 rounded-lg font-semibold hover:bg-[var(--brand-700)] disabled:opacity-60">
                  {saving ? <Loader2 size={11} className="animate-spin"/> : <Save size={11}/>} Simpan
                </button>
              </div>
            )}
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key:'name',              label:'Nama Lengkap',       type:'text' },
              { key:'phone',             label:'No. HP',             type:'tel'  },
              { key:'address',           label:'Alamat',             type:'text', full:true },
              { key:'emergency_contact', label:'Kontak Darurat',     type:'text' },
              { key:'emergency_phone',   label:'HP Kontak Darurat',  type:'tel'  },
            ].map(f => (
              <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">{f.label}</label>
                {editing ? (
                  <input type={f.type} value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                    className="input-base text-sm w-full"/>
                ) : (
                  <p className="text-sm font-medium text-[var(--text-primary)]">{form[f.key]||<span className="text-[var(--text-muted)] italic">Belum diisi</span>}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rekening Bank */}
        <div className="table-wrapper overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Rekening Bank</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Digunakan untuk transfer gaji via Flip</p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key:'bank_code',           label:'Kode Bank',      placeholder:'bca, bni, mandiri...' },
              { key:'bank_account_number', label:'No. Rekening',   placeholder:'1234567890' },
              { key:'bank_account_name',   label:'Nama di Buku',   placeholder:'Nama sesuai rekening' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">{f.label}</label>
                {editing ? (
                  <input value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                    placeholder={f.placeholder} className="input-base text-sm w-full uppercase"/>
                ) : (
                  <p className="text-sm font-medium font-mono">{form[f.key] ? form[f.key].toUpperCase() : <span className="text-[var(--text-muted)] italic normal-case">Belum diisi</span>}</p>
                )}
              </div>
            ))}
          </div>
          {!emp.bank_code && (
            <div className="mx-4 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex gap-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5"/>
              <p>Rekening bank belum diisi. Isi sekarang agar gaji bisa ditransfer via Flip.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// ATTENDANCE TAB
// ════════════════════════════════════════════════════════════════
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
    } catch { toast.error('Gagal memuat data absensi'); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const stats = {
    hadir:    data.filter(a=>a.status==='present').length,
    terlambat:data.filter(a=>a.status==='late').length,
    absen:    data.filter(a=>a.status==='absent').length,
    cuti:     data.filter(a=>a.status==='leave').length,
  };

  const prevMonth = () => { if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  return (
    <div className="space-y-4">
      {/* Period nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 rounded-xl border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-secondary)]"><ChevronLeft size={14}/></button>
          <span className="font-bold w-44 text-center">{MONTHS_ID[month]} {year}</span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-xl border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-secondary)]"><ChevronRight size={14}/></button>
        </div>
        <button onClick={load} className="btn-icon"><RefreshCw size={14} className={loading?'animate-spin':''}/></button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:'Hadir',     value:stats.hadir,     color:'text-emerald-600', bg:'bg-emerald-50', icon:'✅' },
          { label:'Terlambat', value:stats.terlambat, color:'text-amber-600',   bg:'bg-amber-50',   icon:'⚠️' },
          { label:'Absen',     value:stats.absen,     color:'text-red-600',     bg:'bg-red-50',     icon:'❌' },
          { label:'Cuti',      value:stats.cuti,      color:'text-blue-600',    bg:'bg-blue-50',    icon:'🌴' },
        ].map(s => (
          <div key={s.label} className={`table-wrapper p-3 text-center ${s.bg}`}>
            <p className="text-lg mb-0.5">{s.icon}</p>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[var(--text-muted)] font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Records */}
      <div className="table-wrapper overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Riwayat Absensi</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin"/></div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-[var(--text-muted)] text-sm">Tidak ada data absensi bulan ini</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                  {['Tanggal','Jam Masuk','Jam Keluar','Status','Keterangan'].map(h=>(
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sort((a,b)=>new Date(b.date||b.created_at)-new Date(a.date||a.created_at)).map(a => (
                  <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]">
                    <td className="px-4 py-2.5 font-semibold text-xs">
                      {new Date(a.date||a.created_at).toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short'})}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{a.check_in?.slice(0,5)||'—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{a.check_out?.slice(0,5)||'—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ATT_STATUS_STYLE[a.status]||'bg-gray-100 text-gray-500'}`}>
                        {ATT_LABEL[a.status]||a.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">{a.notes||a.note||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// LEAVE TAB
// ════════════════════════════════════════════════════════════════
const LeaveTab = ({ userId }) => {
  const [leaves,  setLeaves]  = useState([]);
  const [quota,   setQuota]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,    setForm]    = useState({ leave_type:'annual', start_date:'', end_date:'', reason:'' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leavesRes, quotaRes] = await Promise.all([
        api.get('/leaves/my', { params:{ limit:50 } }),
        api.get('/leaves/my/quota').catch(()=>null),
      ]);
      setLeaves(leavesRes.data.data?.leaves || leavesRes.data.data || []);
      if (quotaRes) setQuota(quotaRes.data.data);
    } catch { toast.error('Gagal memuat data cuti'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.start_date||!form.end_date||!form.reason) { toast.error('Lengkapi semua field'); return; }
    setSubmitting(true);
    try {
      await api.post('/leaves', form);
      toast.success('Pengajuan cuti berhasil dikirim');
      setShowForm(false);
      setForm({ leave_type:'annual', start_date:'', end_date:'', reason:'' });
      load();
    } catch(e) { toast.error(e.response?.data?.message||'Gagal mengajukan cuti'); }
    finally { setSubmitting(false); }
  };

  const STATUS_STYLE = { pending:'bg-amber-100 text-amber-700', approved:'bg-emerald-100 text-emerald-700', rejected:'bg-red-100 text-red-700' };
  const STATUS_LABEL = { pending:'⏳ Menunggu', approved:'✅ Disetujui', rejected:'❌ Ditolak' };
  const LEAVE_TYPES  = { annual:'Cuti Tahunan', sick:'Sakit', personal:'Keperluan Pribadi', maternity:'Melahirkan', other:'Lainnya' };

  return (
    <div className="space-y-4">
      {/* Quota cards */}
      {quota && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Jatah Cuti',   value:quota.total_quota||12, color:'text-blue-600',    bg:'bg-blue-50' },
            { label:'Sudah Dipakai', value:quota.used||0,         color:'text-amber-600',   bg:'bg-amber-50' },
            { label:'Sisa Cuti',    value:quota.remaining||12,   color:'text-emerald-600', bg:'bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className={`table-wrapper p-4 text-center ${s.bg}`}>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">{s.label}</p>
              <p className="text-[10px] text-[var(--text-muted)]">hari</p>
            </div>
          ))}
        </div>
      )}

      {/* Action */}
      <div className="flex justify-end">
        <button onClick={()=>setShowForm(!showForm)}
          className={`btn-primary gap-2 ${showForm?'bg-red-500 hover:bg-red-600':''}`}>
          {showForm ? <><X size={14}/> Batal</> : <><Calendar size={14}/> Ajukan Cuti</>}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="table-wrapper p-5 space-y-4 border-2 border-[var(--brand-600)]/30">
          <p className="font-bold text-sm">📝 Pengajuan Cuti Baru</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">Jenis Cuti</label>
              <select value={form.leave_type} onChange={e=>setForm(p=>({...p,leave_type:e.target.value}))} className="input-base text-sm w-full">
                {Object.entries(LEAVE_TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div/>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">Tanggal Mulai</label>
              <input type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} className="input-base text-sm w-full"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">Tanggal Selesai</label>
              <input type="date" value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} className="input-base text-sm w-full"/>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">Alasan</label>
              <textarea value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))}
                placeholder="Jelaskan alasan pengajuan cuti..." rows={3} className="input-base text-sm w-full resize-none"/>
            </div>
          </div>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary gap-2 disabled:opacity-60">
            {submitting ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
            {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      )}

      {/* History */}
      <div className="table-wrapper overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Riwayat Pengajuan Cuti</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin"/></div>
        ) : leaves.length === 0 ? (
          <div className="py-10 text-center text-[var(--text-muted)] text-sm">Belum ada pengajuan cuti</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {leaves.map(l => (
              <div key={l.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{LEAVE_TYPES[l.leave_type]||l.leave_type}</p>
                    <span className="text-[10px] font-semibold text-[var(--text-muted)]">{l.days} hari</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {new Date(l.start_date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})} — {new Date(l.end_date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}
                  </p>
                  {l.reason && <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate max-w-xs">{l.reason}</p>}
                  {l.notes && <p className="text-[11px] text-blue-600 mt-0.5">HR: {l.notes}</p>}
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${STATUS_STYLE[l.status]||'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LABEL[l.status]||l.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// PAYSLIP TAB
// ════════════════════════════════════════════════════════════════
const PayslipTab = ({ userId }) => {
  const [slips,   setSlips]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/payroll-engine/my', { params:{ limit:24 } })
      .then(r => setSlips(r.data.data?.items||[]))
      .catch(()=>toast.error('Gagal memuat slip gaji'))
      .finally(()=>setLoading(false));
  }, []);

  const TYPE_ICON = { monthly:'💰', thr:'🎊', bonus:'🏆', incentive:'🚀' };
  const TYPE_LABEL = { monthly:'Gaji', thr:'THR', bonus:'Bonus', incentive:'Insentif' };
  const toRp = v => 'Rp '+(parseFloat(v)||0).toLocaleString('id-ID');

  const handlePrint = (slip) => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Slip Gaji</title><style>
      body{font-family:sans-serif;padding:32px;max-width:600px;margin:auto}
      h2{border-bottom:2px solid #333;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      td{padding:6px 8px;border-bottom:1px solid #eee}
      .right{text-align:right} .bold{font-weight:bold} .total{font-size:18px;color:#16a34a}
    </style></head><body>
      <h2>Slip ${TYPE_LABEL[slip.run?.type||'monthly']} — ${slip.run?.period_label||''}</h2>
      <p>${slip.employee_name} · ${slip.employee_position||''} · ${slip.employee_department||''}</p>
      <table>
        ${(slip.income_lines||[]).map(l=>`<tr><td>${l.name}</td><td class="right">${toRp(l.amount)}</td></tr>`).join('')}
        <tr><td class="bold">Total Pendapatan</td><td class="right bold">${toRp(slip.total_income)}</td></tr>
        ${(slip.deduction_lines||[]).map(l=>`<tr><td style="color:#dc2626">${l.name}</td><td class="right" style="color:#dc2626">-${toRp(l.amount)}</td></tr>`).join('')}
        <tr><td class="bold">Total Potongan</td><td class="right bold" style="color:#dc2626">-${toRp(slip.total_deductions)}</td></tr>
        <tr><td class="bold total">Gaji Bersih</td><td class="right bold total">${toRp(slip.net_salary)}</td></tr>
      </table>
      <p style="margin-top:32px;font-size:12px;color:#888">Dicetak ${new Date().toLocaleDateString('id-ID')}</p>
    </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin"/></div>
      ) : slips.length === 0 ? (
        <div className="table-wrapper p-12 text-center text-[var(--text-muted)]">
          <FileText size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="font-semibold">Belum ada slip gaji</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {slips.map(slip => (
            <div key={slip.id} className="table-wrapper p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TYPE_ICON[slip.run?.type]||'💰'}</span>
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase">{TYPE_LABEL[slip.run?.type]||'Gaji'}</span>
                  </div>
                  <p className="font-bold text-sm mt-1">{slip.run?.period_label||'—'}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                  {slip.run?.status||'—'}
                </span>
              </div>
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>Pendapatan</span><span className="font-semibold text-emerald-600">{toRp(slip.total_income)}</span>
                </div>
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>Potongan</span><span className="font-semibold text-red-500">-{toRp(slip.total_deductions)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-[var(--border)] pt-1.5">
                  <span>Bersih</span><span className="text-[var(--brand-600)]">{toRp(slip.net_salary)}</span>
                </div>
              </div>
              <button onClick={()=>handlePrint(slip)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--brand-600)] hover:text-white transition-colors border border-[var(--border)]">
                <FileText size={12}/> Cetak Slip
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// PASSWORD TAB
// ════════════════════════════════════════════════════════════════
const PasswordTab = () => {
  const [form, setForm] = useState({ current:'', newPw:'', confirm:'' });
  const [show, setShow] = useState({ current:false, newPw:false, confirm:false });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.current||!form.newPw||!form.confirm) { toast.error('Lengkapi semua field'); return; }
    if (form.newPw !== form.confirm) { toast.error('Password baru tidak cocok'); return; }
    if (form.newPw.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { current_password: form.current, new_password: form.newPw });
      toast.success('Password berhasil diubah');
      setForm({ current:'', newPw:'', confirm:'' });
    } catch(e) { toast.error(e.response?.data?.message||'Gagal mengubah password'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-md">
      <div className="table-wrapper p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[var(--border)]">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-600)]/10 flex items-center justify-center">
            <Lock size={18} className="text-[var(--brand-600)]"/>
          </div>
          <div>
            <p className="font-bold">Ganti Password</p>
            <p className="text-xs text-[var(--text-muted)]">Minimal 6 karakter</p>
          </div>
        </div>
        {[
          { key:'current', label:'Password Saat Ini' },
          { key:'newPw',   label:'Password Baru' },
          { key:'confirm', label:'Konfirmasi Password Baru' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">{f.label}</label>
            <div className="relative">
              <input type={show[f.key]?'text':'password'} value={form[f.key]}
                onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                className="input-base text-sm w-full pr-10"/>
              <button onClick={()=>setShow(p=>({...p,[f.key]:!p[f.key]}))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                {show[f.key] ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </div>
        ))}
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin"/> : <Lock size={14}/>}
          {saving ? 'Menyimpan...' : 'Ubah Password'}
        </button>
      </div>
    </div>
  );
};
