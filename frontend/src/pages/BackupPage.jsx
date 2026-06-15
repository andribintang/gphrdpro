import { useState, useEffect, useCallback } from 'react';
import {
  Download, Upload, Clock, RefreshCw, Trash2, CheckCircle2,
  AlertTriangle, Loader2, Database, Calendar, Shield, Play,
  HardDrive, FileJson,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const BACKUP_SECRET = 'BACKUP-GPDISTRO-2024';
const FREQ_LABELS = { daily:'Harian', weekly:'Mingguan', monthly:'Bulanan' };
const FREQ_DESC   = {
  daily:   'Setiap hari pada jam yang ditentukan',
  weekly:  'Setiap Senin pada jam yang ditentukan',
  monthly: 'Setiap tanggal 1 pada jam yang ditentukan',
};

export default function BackupPage() {
  const [backups,   setBackups]   = useState([]);
  const [schedule,  setSchedule]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [running,   setRunning]   = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [schedForm, setSchedForm] = useState({ frequency:'daily', hour:2, enabled:true });
  const [savingSched, setSavingSched] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([
        api.get('/backup'),
        api.get('/backup/schedule'),
      ]);
      setBackups(bRes.data.data?.backups || []);
      const sched = sRes.data.data?.schedule;
      if (sched) {
        setSchedule(sched);
        setSchedForm({ frequency: sched.frequency, hour: sched.hour, enabled: !!sched.enabled });
      }
    } catch { toast.error('Gagal memuat data backup'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBackup = async () => {
    setRunning(true);
    const toastId = toast.loading('Membuat backup... (bisa beberapa menit)');
    try {
      const r = await api.post('/backup/run');
      toast.success(r.data.message, { id: toastId });
      load();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Backup gagal', { id: toastId });
    } finally { setRunning(false); }
  };

  const handleRestore = async () => {
    if (confirmText !== 'RESTORE') { toast.error('Ketik RESTORE untuk konfirmasi'); return; }
    if (!confirmRestore) return;
    setRestoring(confirmRestore.id);
    const toastId = toast.loading('Memulihkan data...');
    try {
      const r = await api.post('/backup/restore', {
        url: confirmRestore.url,
        secret: BACKUP_SECRET,
      }, { headers: { 'x-backup-secret': BACKUP_SECRET } });
      toast.success(r.data.message, { id: toastId });
      setConfirmRestore(null);
      setConfirmText('');
    } catch(e) {
      toast.error(e.response?.data?.message || 'Restore gagal', { id: toastId });
    } finally { setRestoring(null); }
  };

  const handleDeleteBackup = async (id) => {
    if (!confirm('Hapus backup ini dari log?')) return;
    try {
      await api.delete(`/backup/${id}`);
      toast.success('Backup dihapus dari log');
      load();
    } catch { toast.error('Gagal hapus'); }
  };

  const handleSaveSchedule = async () => {
    setSavingSched(true);
    try {
      await api.put('/backup/schedule', schedForm);
      toast.success('Jadwal backup disimpan');
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSavingSched(false); }
  };

  const fmtSize = (kb) => kb > 1024 ? `${(kb/1024).toFixed(1)} MB` : `${kb} KB`;
  const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">💾 Backup & Restore</h1>
          <p className="page-subtitle">Backup otomatis dan manual seluruh data sistem</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-icon"><RefreshCw size={15} className={loading?'animate-spin':''}/></button>
          <button onClick={handleBackup} disabled={running}
            className="btn-primary gap-2 disabled:opacity-60">
            {running ? <Loader2 size={15} className="animate-spin"/> : <Database size={15}/>}
            {running ? 'Membuat Backup...' : 'Backup Sekarang'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — Schedule settings */}
        <div className="space-y-4">
          {/* Auto backup schedule */}
          <div className="table-wrapper p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
              <Calendar size={16} className="text-[var(--brand-600)]"/>
              <p className="font-bold text-sm">Auto Backup</p>
              <label className="ml-auto flex items-center gap-2 cursor-pointer">
                <div onClick={()=>setSchedForm(p=>({...p,enabled:!p.enabled}))}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${schedForm.enabled?'bg-[var(--brand-600)]':'bg-[var(--border)]'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${schedForm.enabled?'right-0.5':'left-0.5'}`}/>
                </div>
                <span className="text-xs font-medium">{schedForm.enabled?'Aktif':'Nonaktif'}</span>
              </label>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-2">Frekuensi</label>
              <div className="space-y-2">
                {(['daily','weekly','monthly']).map(f => (
                  <button key={f} onClick={()=>setSchedForm(p=>({...p,frequency:f}))}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                      schedForm.frequency===f
                        ? 'border-[var(--brand-600)] bg-[var(--brand-600)]/5'
                        : 'border-[var(--border)] hover:border-[var(--brand-600)]/50'
                    }`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      schedForm.frequency===f ? 'border-[var(--brand-600)]' : 'border-[var(--border)]'
                    }`}>
                      {schedForm.frequency===f && <div className="w-2 h-2 rounded-full bg-[var(--brand-600)]"/>}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{FREQ_LABELS[f]}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{FREQ_DESC[f]}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Hour */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
                Jam Backup (WIB)
              </label>
              <select value={schedForm.hour} onChange={e=>setSchedForm(p=>({...p,hour:parseInt(e.target.value)}))}
                className="input-base text-sm w-full">
                {Array.from({length:24},(_,i)=>i).map(h => (
                  <option key={h} value={h}>
                    {String(h).padStart(2,'0')}:00 WIB {h < 6 ? '(dini hari)' : h < 12 ? '(pagi)' : h < 18 ? '(siang)' : '(malam)'}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                💡 Disarankan jam 02:00 (dini hari) agar tidak mengganggu operasional
              </p>
            </div>

            <button onClick={handleSaveSchedule} disabled={savingSched}
              className="btn-primary w-full gap-2 disabled:opacity-60">
              {savingSched ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
              Simpan Jadwal
            </button>

            {/* Current schedule info */}
            {schedule && (
              <div className="bg-[var(--bg-secondary)] rounded-xl p-3 text-xs space-y-1">
                <p className="font-semibold text-[var(--text-muted)] uppercase tracking-wide">Jadwal Aktif</p>
                <p className="font-bold">{FREQ_LABELS[schedule.frequency]} pukul {String(schedule.hour).padStart(2,'0')}:00</p>
                <p className={`font-semibold ${schedule.enabled ? 'text-emerald-600' : 'text-red-500'}`}>
                  {schedule.enabled ? '✅ Aktif' : '⏸ Nonaktif'}
                </p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="table-wrapper p-4 space-y-2">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Statistik</p>
            {[
              { l:'Total Backup', v: backups.length },
              { l:'Backup Sukses', v: backups.filter(b=>b.status==='success').length },
              { l:'Total Size', v: fmtSize(backups.reduce((s,b)=>s+parseInt(b.size_kb||0),0)) },
              { l:'Backup Terbaru', v: backups[0] ? fmtDate(backups[0].created_at).split(',')[0] : '—' },
            ].map(s => (
              <div key={s.l} className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">{s.l}</span>
                <span className="font-semibold">{s.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Backup list */}
        <div className="lg:col-span-2">
          <div className="table-wrapper overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Riwayat Backup ({backups.length}/{30} maks)
              </p>
            </div>

            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 size={20} className="animate-spin text-[var(--text-muted)]"/></div>
            ) : backups.length === 0 ? (
              <div className="p-12 text-center">
                <HardDrive size={36} className="mx-auto mb-3 text-[var(--text-muted)] opacity-30"/>
                <p className="font-semibold text-[var(--text-primary)]">Belum ada backup</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Klik "Backup Sekarang" untuk membuat backup pertama</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {backups.map(b => (
                  <div key={b.id} className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-secondary)]">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      b.status==='success' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {b.status==='success'
                        ? <FileJson size={16} className="text-emerald-600"/>
                        : <AlertTriangle size={16} className="text-red-500"/>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{b.filename}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          b.triggered_by?.startsWith('auto') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {b.triggered_by?.startsWith('auto') ? '🤖 Auto' : '👤 Manual'}
                        </span>
                        {b.status==='failed' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Gagal</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-[var(--text-muted)]">{fmtDate(b.created_at)}</span>
                        {b.size_kb > 0 && <span className="text-xs text-[var(--text-muted)]">{fmtSize(b.size_kb)}</span>}
                        {b.total_rows > 0 && <span className="text-xs text-[var(--text-muted)]">{parseInt(b.total_rows).toLocaleString('id-ID')} rows</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    {b.status === 'success' && b.url && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <a href={b.url} target="_blank" rel="noreferrer"
                          className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--brand-600)] hover:text-white hover:border-[var(--brand-600)] transition-colors"
                          title="Download">
                          <Download size={13}/>
                        </a>
                        <button
                          onClick={() => { setConfirmRestore(b); setConfirmText(''); }}
                          disabled={!!restoring}
                          className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors disabled:opacity-40"
                          title="Restore">
                          {restoring === b.id ? <Loader2 size={13} className="animate-spin"/> : <Upload size={13}/>}
                        </button>
                        <button onClick={() => handleDeleteBackup(b.id)}
                          className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                          title="Hapus dari log">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restore confirm modal */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-2xl border-2 border-amber-400 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Upload size={22} className="text-amber-600"/>
              </div>
              <div>
                <p className="font-black text-base text-amber-700">Konfirmasi Restore</p>
                <p className="text-sm text-[var(--text-muted)] truncate max-w-xs">{confirmRestore.filename}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
              <p><strong>⚠️ Perhatian:</strong></p>
              <p>Restore akan menimpa data yang ada dengan data dari backup ini ({fmtDate(confirmRestore.created_at)}).</p>
              <p>Data users & karyawan <strong>tidak akan diubah</strong> untuk keamanan.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
                Ketik <strong className="text-amber-600">RESTORE</strong> untuk konfirmasi
              </label>
              <input value={confirmText} onChange={e=>setConfirmText(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleRestore()}
                placeholder="Ketik: RESTORE" autoFocus
                className={`input-base w-full text-center font-bold tracking-widest ${confirmText==='RESTORE'?'border-amber-400':''}`}/>
            </div>

            <div className="flex gap-3">
              <button onClick={()=>{setConfirmRestore(null);setConfirmText('');}}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold">
                Batal
              </button>
              <button onClick={handleRestore} disabled={confirmText!=='RESTORE'||!!restoring}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {restoring ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}
                Ya, Restore!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
