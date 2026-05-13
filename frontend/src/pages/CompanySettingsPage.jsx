import { useState, useRef, useCallback } from 'react';
import {
  Building2, Upload, Save, Loader2, Image,
  Phone, Mail, Globe, MapPin, Palette,
  CheckCircle2, RefreshCw, X, Eye
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

export default function CompanySettingsPage() {
  const { settings, refresh } = useCompany();

  const [form, setForm] = useState({
    company_name:    settings.company_name    || 'GPDISTRO HR Pro',
    company_tagline: settings.company_tagline || 'Human Resource Management System',
    company_address: settings.company_address || '',
    company_phone:   settings.company_phone   || '',
    company_email:   settings.company_email   || '',
    company_website: settings.company_website || '',
    app_name:        settings.app_name        || 'GPDISTRO HR Pro',
    primary_color:   settings.primary_color   || '#e11d48',
  });
  const [logoPreview, setLogoPreview] = useState(settings.logo_url || '/logo-gpdistro.png');
  const [logoBase64, setLogoBase64]   = useState(null);
  const [saving, setSaving]           = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const fileRef = useRef(null);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (PNG, JPG, SVG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      setLogoPreview(result);
      setLogoBase64(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      toast.error('Nama perusahaan wajib diisi');
      return;
    }
    setSaving(true);
    try {
      await api.put('/company/settings', {
        ...form,
        logo_base64: logoBase64 || undefined,
      });
      toast.success('Pengaturan berhasil disimpan!');
      await refresh(); // Reload branding globally
      setLogoBase64(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Pengaturan Perusahaan</h1>
          <p className="text-sm text-[var(--text-secondary)]">Branding, logo & info perusahaan</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="btn-primary h-9 px-4 text-sm disabled:opacity-60">
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
            : <><Save className="w-4 h-4" /> Simpan</>}
        </button>
      </div>

      {/* ── Logo Upload ─────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Image className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Logo Perusahaan</h3>
        </div>

        <div className="flex items-center gap-4">
          {/* Preview */}
          <div className="w-20 h-20 rounded-2xl border-2 border-[var(--border)] bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview"
                className="w-full h-full object-contain p-1"
                onError={e => { e.target.src = '/logo-gpdistro.png'; }}
              />
            ) : (
              <Building2 className="w-8 h-8 text-[var(--text-muted)]" />
            )}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex-1 border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all
              ${dragOver
                ? 'border-brand-400 bg-brand-50 dark:bg-brand-950'
                : 'border-[var(--border)] hover:border-brand-300 hover:bg-[var(--bg-secondary)]'}`}>
            <Upload className="w-5 h-5 text-[var(--text-muted)] mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              {dragOver ? 'Lepaskan untuk upload' : 'Klik atau drag & drop'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">PNG, JPG, SVG · Maks 2MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
        </div>

        {logoBase64 && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            Logo baru dipilih — klik Simpan untuk menerapkan
          </div>
        )}
      </div>

      {/* ── Brand Color ─────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Warna Brand</h3>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-6 gap-2">
          {COLOR_PRESETS.map((p) => (
            <button key={p.color} onClick={() => sf('primary_color', p.color)}
              className={`flex flex-col items-center gap-1 group`}>
              <div
                className={`w-9 h-9 rounded-xl transition-all ${form.primary_color === p.color ? 'ring-2 ring-offset-2 ring-[var(--bg-primary)] scale-110 shadow-lg' : 'hover:scale-105'}`}
                style={{ backgroundColor: p.color }}
              >
                {form.primary_color === p.color && (
                  <CheckCircle2 className="w-full h-full p-2 text-white" />
                )}
              </div>
              <span className="text-[9px] text-[var(--text-muted)] font-medium">{p.label}</span>
            </button>
          ))}
        </div>

        {/* Custom color picker */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
            Custom
          </label>
          <div className="flex items-center gap-2 flex-1">
            <input type="color" value={form.primary_color}
              onChange={e => sf('primary_color', e.target.value)}
              className="w-10 h-10 rounded-xl border border-[var(--border)] cursor-pointer bg-transparent" />
            <input type="text" value={form.primary_color}
              onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) sf('primary_color', e.target.value); }}
              placeholder="#e11d48"
              className="input-base text-sm font-mono flex-1 h-10" />
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-secondary)]">
            Preview
          </div>
          <div className="p-3 flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all"
              style={{ backgroundColor: form.primary_color }}>
              Tombol Utama
            </div>
            <div className="px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all"
              style={{ borderColor: form.primary_color, color: form.primary_color }}>
              Tombol Outline
            </div>
            <div className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ backgroundColor: `${form.primary_color}18`, color: form.primary_color }}>
              Badge
            </div>
          </div>
        </div>
      </div>

      {/* ── App Identity ────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Identitas Aplikasi</h3>
        </div>

        {[
          { label:'Nama Aplikasi',  key:'app_name',        placeholder:'GPDISTRO HR Pro',          hint:'Tampil di header & login' },
          { label:'Nama Perusahaan',key:'company_name',    placeholder:'PT. GPDISTRO Indonesia',   hint:'Tampil di slip gaji' },
          { label:'Tagline',        key:'company_tagline', placeholder:'Human Resource Management System', hint:'Sub-judul di halaman login' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              {f.label}
            </label>
            <input value={form[f.key]} onChange={e => sf(f.key, e.target.value)}
              placeholder={f.placeholder} className="input-base text-sm" />
            {f.hint && <p className="text-[10px] text-[var(--text-muted)] mt-1">{f.hint}</p>}
          </div>
        ))}
      </div>

      {/* ── Contact Info ────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Phone className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Informasi Kontak</h3>
        </div>

        {[
          { label:'Alamat',  key:'company_address', placeholder:'Jl. Contoh No.1, Jakarta',   icon:MapPin, multi:true },
          { label:'Telepon', key:'company_phone',   placeholder:'021-xxxx-xxxx',               icon:Phone },
          { label:'Email',   key:'company_email',   placeholder:'info@gpdistro.com',           icon:Mail },
          { label:'Website', key:'company_website', placeholder:'https://gpdistro.com',        icon:Globe },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              {f.label}
            </label>
            {f.multi ? (
              <textarea value={form[f.key]} onChange={e => sf(f.key, e.target.value)}
                placeholder={f.placeholder} rows={2}
                className="input-base text-sm resize-none" />
            ) : (
              <div className="relative">
                <f.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input value={form[f.key]} onChange={e => sf(f.key, e.target.value)}
                  placeholder={f.placeholder} className="input-base pl-10 text-sm" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save button bottom */}
      <button onClick={handleSave} disabled={saving}
        className="btn-primary w-full h-12 text-sm font-bold">
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan Pengaturan...</>
          : <><Save className="w-4 h-4" /> Simpan Semua Pengaturan</>}
      </button>

      <p className="text-xs text-[var(--text-muted)] text-center pb-4">
        Perubahan warna brand berlaku setelah halaman di-refresh
      </p>
    </div>
  );
}
