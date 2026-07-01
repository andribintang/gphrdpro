import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Building2, Upload, Save, Loader2, Image,
  Phone, Mail, Globe, MapPin, Palette,
  CheckCircle2, RefreshCw, X, Clock, Timer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useCompany } from '../context/CompanyContext';

// ── Color presets ─────────────────────────────────────────────
const COLOR_PRESETS = [
  { label:'Merah',   color:'#e11d48' },
  { label:'Biru',    color:'#0ba5ec' },
  { label:'Ungu',    color:'#7c3aed' },
  { label:'Hijau',   color:'#059669' },
  { label:'Oranye',  color:'#ea580c' },
  { label:'Navy',    color:'#1e3a8a' },
];

const SIDEBAR_THEMES = [
  { key:'default', label:'Default',  style:null },
  { key:'brand',   label:'Brand',    style:'brand' },
  { key:'dark',    label:'Gelap',    bg:'#18181b' },
  { key:'slate',   label:'Slate',    bg:'#1e293b' },
  { key:'navy',    label:'Navy',     bg:'#0f172a' },
];

const TOPBAR_THEMES = [
  { key:'default', label:'Putih',  bg:'#ffffff' },
  { key:'brand',   label:'Brand',  style:'brand' },
  { key:'dark',    label:'Gelap',  bg:'#18181b' },
  { key:'slate',   label:'Slate',  bg:'#1e293b' },
  { key:'glass',   label:'Glass',  bg:'rgba(255,255,255,0.85)' },
];

export default function CompanySettingsPage() {
  const { settings, refresh } = useCompany();

  const [activeTab, setActiveTab]     = useState('company');
  const [officeForm, setOfficeForm]   = useState({
    name:                'Kantor Pusat',
    address:             '',
    lat:                 '',
    lng:                 '',
    radius:              100,
    check_in_start:      '06:00',
    check_in_deadline:   '08:05',
    check_out_start:     '16:00',
    work_hours_required: 8,
    check_out_weekend:   '',
    check_out_holiday:   '',
    public_holidays:     [],
  });
  const [newHoliday, setNewHoliday]   = useState('');
  const [savingOffice, setSavingOffice] = useState(false);

  const [form, setForm] = useState({
    company_name:    settings.company_name    || 'GPDISTRO HR Pro',
    company_tagline: settings.company_tagline || 'Human Resource Management System',
    company_address: settings.company_address || '',
    company_phone:   settings.company_phone   || '',
    company_email:   settings.company_email   || '',
    company_website: settings.company_website || '',
    app_name:        settings.app_name        || 'GPDISTRO HR Pro',
    primary_color:   settings.primary_color   || '#e11d48',
    sidebar_color:   settings.sidebar_color   || 'default',
    topbar_color:    settings.topbar_color    || 'default',
  });
  const [logoPreview, setLogoPreview] = useState(settings.logo_url || '/logo-gpdistro.png');
  const [logoBase64, setLogoBase64]   = useState(null);
  const [saving, setSaving]           = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const fileRef = useRef(null);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) { toast.error('File harus berupa gambar'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Ukuran file maksimal 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target.result);
      setLogoBase64(e.target.result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };

  // Load office settings
  useEffect(() => {
    api.get('/attendance/office/settings').then(r => {
      const s = r.data?.data?.office || r.data?.data || r.data;
      if (s && typeof s === 'object' && s.id) setOfficeForm(prev => ({ ...prev, ...s,
        public_holidays: Array.isArray(s.public_holidays) ? s.public_holidays : [],
      }));
    }).catch(() => {});
  }, []);

  const handleSaveOffice = async () => {
    setSavingOffice(true);
    try {
      await api.put('/attendance/office/settings', officeForm);
      toast.success('Pengaturan absensi disimpan');
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSavingOffice(false); }
  };

  const sof = (k, v) => setOfficeForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.company_name.trim()) { toast.error('Nama perusahaan wajib diisi'); return; }
    setSaving(true);
    try {
      await api.put('/company/settings', { ...form, logo_base64: logoBase64 || undefined });
      toast.success('Pengaturan berhasil disimpan!');
      await refresh();
      setLogoBase64(null);
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const TABS = [
    { k:'company',    l:'Profil Perusahaan' },
    { k:'attendance', l:'⏰ Pengaturan Absensi' },
  ];

  return (
    <div className="w-full animate-fade-in">
      {/* Tab selector */}
      <div className="flex gap-2 mb-5">
        {TABS.map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              activeTab === t.k ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)] shadow-sm' : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}>
            {t.l}
          </button>
        ))}
      </div>

      {activeTab === 'attendance' && (
        <div className="space-y-5">
          <div className="page-header">
            <div>
              <h2 className="text-lg font-bold">Pengaturan Absensi</h2>
              <p className="text-sm text-[var(--text-muted)]">Jam kerja, batas toleransi, dan radius lokasi kantor</p>
            </div>
            <button onClick={handleSaveOffice} disabled={savingOffice} className="btn-primary gap-2 disabled:opacity-60">
              {savingOffice ? <Loader2 size={15} className="animate-spin"/> : <CheckCircle2 size={15}/>}
              Simpan Pengaturan
            </button>
          </div>

          <div className="table-wrapper p-5 space-y-6">
            {/* Jam kerja normal */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                <Clock size={13}/> Jam Kerja Hari Biasa
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { l:'Mulai Bisa Check-in',   k:'check_in_start',      t:'time',   note:'' },
                  { l:'Batas Jam Masuk ⚠️',     k:'check_in_deadline',   t:'time',   note:'Lewat jam ini = Terlambat' },
                  { l:'Mulai Bisa Check-out',   k:'check_out_start',     t:'time',   note:'' },
                  { l:'Jam Kerja Wajib (jam)',  k:'work_hours_required', t:'number', note:'' },
                ].map(({l,k,t,note}) => (
                  <div key={k}>
                    <label className="field-label">{l}</label>
                    <input type={t} value={officeForm[k]||''} min={t==='number'?0:undefined}
                      onChange={e => sof(k, t==='number' ? parseFloat(e.target.value)||0 : e.target.value)}
                      className={`input-base ${k==='check_in_deadline'?'border-amber-400 dark:border-amber-600':''}`}
                    />
                    {note && <p className="text-[10px] text-amber-600 mt-1">{note}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Jam kerja weekend & libur */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                <Timer size={13}/> Jam Khusus Weekend &amp; Libur Nasional
              </p>
              <p className="text-xs text-[var(--text-muted)] mb-3">Kosongkan jika sama dengan hari biasa.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Check-out Hari Sabtu</label>
                  <input type="time" value={officeForm.check_out_weekend||''} placeholder="—"
                    onChange={e => sof('check_out_weekend', e.target.value)}
                    className="input-base"/>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Contoh: 14:00 untuk pulang jam 2 siang di Sabtu</p>
                </div>
                <div>
                  <label className="field-label">Check-out Hari Libur Nasional</label>
                  <input type="time" value={officeForm.check_out_holiday||''} placeholder="—"
                    onChange={e => sof('check_out_holiday', e.target.value)}
                    className="input-base"/>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Berlaku untuk tanggal yang ada di daftar libur nasional di bawah</p>
                </div>
              </div>
            </div>

            {/* Daftar libur nasional */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                📅 Libur Nasional ({(officeForm.public_holidays||[]).length} tanggal)
              </p>
              <div className="flex gap-2 mb-3">
                <input type="date" value={newHoliday} onChange={e => setNewHoliday(e.target.value)} className="input-base h-9 text-sm"/>
                <button onClick={() => {
                  if (!newHoliday) return;
                  const list = officeForm.public_holidays||[];
                  if (!list.includes(newHoliday)) {
                    sof('public_holidays', [...list, newHoliday].sort());
                  }
                  setNewHoliday('');
                }} className="btn-primary h-9 px-4 text-sm gap-1.5 flex-shrink-0">
                  + Tambah
                </button>
              </div>
              {(officeForm.public_holidays||[]).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {(officeForm.public_holidays||[]).map(d => (
                    <div key={d} className="flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs">
                      <span className="font-mono">{d}</span>
                      <button onClick={() => sof('public_holidays', (officeForm.public_holidays||[]).filter(x => x !== d))}
                        className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Belum ada tanggal libur ditambahkan</p>
              )}
            </div>

            {/* Lokasi kantor */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                <MapPin size={13}/> Lokasi Kantor
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="field-label">Nama Kantor</label>
                  <input value={officeForm.name||''} onChange={e => sof('name',e.target.value)} className="input-base"/>
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Alamat</label>
                  <textarea value={officeForm.address||''} onChange={e => sof('address',e.target.value)} rows={2} className="input-base resize-none"/>
                </div>
                <div>
                  <label className="field-label">Latitude</label>
                  <input type="number" step="any" value={officeForm.lat||''} onChange={e => sof('lat',e.target.value)} className="input-base" placeholder="-7.123456"/>
                </div>
                <div>
                  <label className="field-label">Longitude</label>
                  <input type="number" step="any" value={officeForm.lng||''} onChange={e => sof('lng',e.target.value)} className="input-base" placeholder="110.123456"/>
                </div>
                <div>
                  <label className="field-label">Radius Geofence (meter)</label>
                  <input type="number" min={10} value={officeForm.radius||100} onChange={e => sof('radius',parseInt(e.target.value)||100)} className="input-base"/>
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                💡 Koordinat bisa dicopy dari Google Maps — klik kanan lokasi kantor → "Copy coordinates". Radius 100m = 1 gedung.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'company' && (<>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengaturan Perusahaan</h1>
          <p className="body-sm text-[var(--text-muted)]">Branding, logo & info perusahaan</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary gap-2 disabled:opacity-60">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin"/>Menyimpan...</> : <><Save className="w-4 h-4"/>Simpan</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Kolom Kiri ─────────────────────────────────── */}
        <div className="space-y-5">

          {/* Logo */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-[var(--brand-600)]"/>
              <h3 className="text-sm font-bold">Logo Perusahaan</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl border-2 border-[var(--border)] bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" onError={e=>{e.target.src='/logo-gpdistro.png';}}/>
                  : <Building2 className="w-8 h-8 text-[var(--text-muted)]"/>}
              </div>
              <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} onClick={()=>fileRef.current?.click()}
                className={`flex-1 border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${dragOver?'border-[var(--brand-600)] bg-[var(--brand-600)]/5':'border-[var(--border)] hover:border-[var(--brand-600)]/50 hover:bg-[var(--bg-secondary)]'}`}>
                <Upload className="w-5 h-5 text-[var(--text-muted)] mx-auto mb-1.5"/>
                <p className="text-xs font-semibold text-[var(--text-secondary)]">{dragOver?'Lepaskan untuk upload':'Klik atau drag & drop'}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">PNG, JPG, SVG · Maks 2MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files[0])handleFile(e.target.files[0]);}}/>
            </div>
            {logoBase64 && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0"/>
                Logo baru dipilih — klik Simpan untuk menerapkan
              </div>
            )}
          </div>

          {/* Warna Brand */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[var(--brand-600)]"/>
              <h3 className="text-sm font-bold">Warna Brand</h3>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PRESETS.map(p=>(
                <button key={p.color} onClick={()=>sf('primary_color',p.color)} className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-xl transition-all ${form.primary_color===p.color?'ring-2 ring-offset-2 ring-[var(--bg-primary)] scale-110 shadow-lg':'hover:scale-105'}`} style={{backgroundColor:p.color}}>
                    {form.primary_color===p.color&&<CheckCircle2 className="w-full h-full p-2 text-white"/>}
                  </div>
                  <span className="text-[9px] text-[var(--text-muted)] font-medium">{p.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Custom</label>
              <input type="color" value={form.primary_color} onChange={e=>sf('primary_color',e.target.value)} className="w-10 h-10 rounded-xl border border-[var(--border)] cursor-pointer bg-transparent"/>
              <input type="text" value={form.primary_color} onChange={e=>{if(/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value))sf('primary_color',e.target.value);}} placeholder="#e11d48" className="input-base text-sm font-mono flex-1 h-10"/>
            </div>
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-secondary)]">Preview</div>
              <div className="p-3 flex items-center gap-3">
                <div className="px-4 py-2 rounded-xl text-white text-xs font-semibold" style={{backgroundColor:form.primary_color}}>Tombol Utama</div>
                <div className="px-3 py-2 rounded-xl text-xs font-semibold border-2" style={{borderColor:form.primary_color,color:form.primary_color}}>Tombol Outline</div>
                <div className="px-3 py-2 rounded-xl text-xs font-semibold" style={{backgroundColor:`${form.primary_color}18`,color:form.primary_color}}>Badge</div>
              </div>
            </div>
          </div>

          {/* Tampilan Antarmuka */}
          <div className="card p-5 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-base">🎨</span>
              <h3 className="text-sm font-bold">Tampilan Antarmuka</h3>
            </div>

            {/* Sidebar */}
            <div>
              <label className="field-label mb-3">Warna Sidebar</label>
              <div className="grid grid-cols-5 gap-2">
                {SIDEBAR_THEMES.map(opt=>{
                  const bg = opt.style==='brand' ? form.primary_color : (opt.bg||'#ffffff');
                  return (
                    <button key={opt.key} type="button" onClick={()=>sf('sidebar_color',opt.key)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${form.sidebar_color===opt.key?'border-[var(--brand-600)] bg-[var(--brand-600)]/5':'border-transparent hover:border-[var(--border)]'}`}>
                      <div className="w-full h-12 rounded-lg overflow-hidden border border-[var(--border)] flex">
                        <div className="w-8 h-full flex flex-col gap-1 p-1" style={{background:bg}}>
                          {[0,1,2].map(i=><div key={i} className="h-1.5 rounded-full opacity-50" style={{background:opt.key==='default'?'#9ca3af':'rgba(255,255,255,0.7)',width:i===0?'80%':'60%'}}/>)}
                        </div>
                        <div className="flex-1" style={{background:'#f9fafb'}}/>
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Topbar */}
            <div>
              <label className="field-label mb-3">Warna Header / Topbar</label>
              <div className="grid grid-cols-5 gap-2">
                {TOPBAR_THEMES.map(opt=>{
                  const bg = opt.style==='brand' ? form.primary_color : (opt.bg||'#ffffff');
                  return (
                    <button key={opt.key} type="button" onClick={()=>sf('topbar_color',opt.key)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${form.topbar_color===opt.key?'border-[var(--brand-600)] bg-[var(--brand-600)]/5':'border-transparent hover:border-[var(--border)]'}`}>
                      <div className="w-full h-12 rounded-lg overflow-hidden border border-[var(--border)] flex flex-col">
                        <div className="h-4 w-full flex items-center px-2" style={{background:bg}}>
                          <div className="w-3 h-1.5 rounded-full opacity-50" style={{background:['dark','slate','brand'].includes(opt.key)?'rgba(255,255,255,0.8)':'#9ca3af'}}/>
                        </div>
                        <div className="flex-1" style={{background:'#f9fafb'}}/>
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-[var(--text-muted)]">💡 Perubahan diterapkan setelah klik Simpan & refresh</p>
          </div>
        </div>

        {/* ── Kolom Kanan ────────────────────────────────── */}
        <div className="space-y-5">

          {/* Identitas */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--brand-600)]"/>
              <h3 className="text-sm font-bold">Identitas Aplikasi</h3>
            </div>
            {[
              { label:'Nama Aplikasi',   key:'app_name',        placeholder:'GPDISTRO HR Pro',                    hint:'Tampil di header & login' },
              { label:'Nama Perusahaan', key:'company_name',    placeholder:'PT. GPDISTRO Racing Indonesia',      hint:'Tampil di slip gaji' },
              { label:'Tagline',         key:'company_tagline', placeholder:'ERP & HR Integrated System',         hint:'Sub-judul di halaman login' },
            ].map(f=>(
              <div key={f.key}>
                <label className="field-label">{f.label}</label>
                <input value={form[f.key]} onChange={e=>sf(f.key,e.target.value)} placeholder={f.placeholder} className="input-base text-sm"/>
                {f.hint&&<p className="text-[10px] text-[var(--text-muted)] mt-1">{f.hint}</p>}
              </div>
            ))}
          </div>

          {/* Kontak */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[var(--brand-600)]"/>
              <h3 className="text-sm font-bold">Informasi Kontak</h3>
            </div>
            {[
              { label:'Alamat',  key:'company_address', placeholder:'Jl. Tegar Beriman, Bogor',  icon:MapPin, multi:true },
              { label:'Telepon', key:'company_phone',   placeholder:'081282824979',              icon:Phone },
              { label:'Email',   key:'company_email',   placeholder:'info@gpdistro.com',         icon:Mail },
              { label:'Website', key:'company_website', placeholder:'https://gpracingstore.com', icon:Globe },
            ].map(f=>(
              <div key={f.key}>
                <label className="field-label">{f.label}</label>
                {f.multi
                  ? <textarea value={form[f.key]} onChange={e=>sf(f.key,e.target.value)} placeholder={f.placeholder} rows={2} className="input-base text-sm resize-none"/>
                  : <div className="relative">
                      <f.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"/>
                      <input value={form[f.key]} onChange={e=>sf(f.key,e.target.value)} placeholder={f.placeholder} className="input-base pl-10 text-sm"/>
                    </div>
                }
              </div>
            ))}
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full h-12 text-sm font-bold">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin"/>Menyimpan...</> : <><Save className="w-4 h-4"/>Simpan Semua Pengaturan</>}
          </button>
        </div>
      </div>
      </>)}
  </div>
  );
}
