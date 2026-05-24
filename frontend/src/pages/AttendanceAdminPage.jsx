import { useState, useEffect, useCallback } from 'react';
import { Calendar, Download, RefreshCw, Search, X, Eye, Clock, User, MapPin, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceService, STATUS_CONFIG, formatTime, formatDate } from '../utils/attendanceService';

// ── Photo Modal ───────────────────────────────────────────────
const PhotoModal = ({ record, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-backdrop"/>
    <div className="modal-box max-w-2xl" onClick={e=>e.stopPropagation()}>
      <div className="modal-header">
        <div>
          <h3 className="text-sm font-bold">{record.employee?.name || 'Karyawan'}</h3>
          <p className="text-xs text-[var(--text-muted)]">{formatDate(record.date)} · {record.status}</p>
        </div>
        <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
      </div>
      <div className="modal-body">
        <div className="grid grid-cols-2 gap-4">
          {/* Check-in photo */}
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Camera size={12}/> Foto Check-In
            </p>
            {record.check_in_photo ? (
              <img src={record.check_in_photo} alt="Check-in" className="w-full rounded-xl border border-[var(--border)] object-cover aspect-square"/>
            ) : (
              <div className="aspect-square rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-center">
                <div className="text-center"><Camera size={24} className="mx-auto mb-1 text-[var(--text-muted)] opacity-30"/><p className="text-xs text-[var(--text-muted)]">Tidak ada foto</p></div>
              </div>
            )}
            {record.check_in && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-semibold text-emerald-600">⏰ {formatTime(record.check_in)}</p>
                {record.check_in_location && <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1"><MapPin size={10}/>{record.check_in_location}</p>}
              </div>
            )}
          </div>
          {/* Check-out photo */}
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Camera size={12}/> Foto Check-Out
            </p>
            {record.check_out_photo ? (
              <img src={record.check_out_photo} alt="Check-out" className="w-full rounded-xl border border-[var(--border)] object-cover aspect-square"/>
            ) : (
              <div className="aspect-square rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-center">
                <div className="text-center"><Camera size={24} className="mx-auto mb-1 text-[var(--text-muted)] opacity-30"/><p className="text-xs text-[var(--text-muted)]">{record.check_out ? 'Tidak ada foto' : 'Belum check-out'}</p></div>
              </div>
            )}
            {record.check_out && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-semibold text-blue-600">⏰ {formatTime(record.check_out)}</p>
                {record.check_out_location && <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1"><MapPin size={10}/>{record.check_out_location}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Info tambahan */}
        <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] grid grid-cols-3 gap-3 text-center text-xs">
          <div>
            <p className="text-[var(--text-muted)]">Work Hours</p>
            <p className="font-bold text-[var(--text-primary)]">{record.work_hours ? `${record.work_hours}j` : '—'}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">Istirahat</p>
            <p className="font-bold text-[var(--text-primary)]">{record.break_duration ? `${record.break_duration}m` : '—'}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">Status</p>
            <p className={`font-bold ${STATUS_CONFIG[record.status]?.color || 'text-[var(--text-primary)]'}`}>
              {STATUS_CONFIG[record.status]?.label || record.status || '—'}
            </p>
          </div>
        </div>

        {record.notes && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
            <p className="text-xs font-semibold text-amber-700 mb-0.5">Catatan:</p>
            <p className="text-xs text-amber-600">{record.notes}</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
export default function AttendanceAdminPage() {
  const [records, setRecords]   = useState([]);
  const [loading, setLoad]      = useState(true);
  const [search, setSearch]     = useState('');
  const [viewPhoto, setPhoto]   = useState(null);
  const [exporting, setExp]     = useState(false);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [branch, setBranch] = useState('');
  const [status, setStatus] = useState('');

  const fetch = useCallback(async () => {
    setLoad(true);
    try {
      const res = await attendanceService.getAdminMonthly({
        month, year, branch_id: branch||undefined, status: status||undefined,
      });
      setRecords(res.data.data?.records || res.data.data?.attendances || []);
    } catch(e) {
      toast.error('Gagal memuat data absensi');
      console.error(e);
    }
    finally { setLoad(false); }
  }, [month, year, branch, status]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = records.filter(r => {
    if (!search) return true;
    const name = r.employee?.name || r.employee_name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  // Summary stats
  const stats = {
    total:    filtered.length,
    present:  filtered.filter(r => r.status === 'present').length,
    late:     filtered.filter(r => r.status === 'late').length,
    absent:   filtered.filter(r => r.status === 'absent').length,
    leave:    filtered.filter(r => r.status === 'leave').length,
  };

  const exportExcel = async () => {
    setExp(true);
    try {
      const XLSX = await import('xlsx');
      const rows = filtered.map((r, i) => ({
        'No':           i+1,
        'Nama':         r.employee?.name || r.employee_name || '—',
        'Cabang':       r.employee?.branch?.name || '—',
        'Tanggal':      r.date,
        'Status':       STATUS_CONFIG[r.status]?.label || r.status || '—',
        'Check In':     formatTime(r.check_in),
        'Check Out':    formatTime(r.check_out),
        'Jam Kerja':    r.work_hours ? `${r.work_hours} jam` : '—',
        'Istirahat':    r.break_duration ? `${r.break_duration} menit` : '—',
        'Foto CI':      r.check_in_photo ? 'Ada' : 'Tidak',
        'Foto CO':      r.check_out_photo ? 'Ada' : 'Tidak',
        'Lokasi CI':    r.check_in_location || '—',
        'Catatan':      r.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        {wch:4},{wch:22},{wch:15},{wch:12},{wch:14},{wch:10},{wch:10},{wch:10},{wch:10},{wch:8},{wch:8},{wch:25},{wch:20}
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Absensi');
      XLSX.writeFile(wb, `absensi_${year}_${String(month).padStart(2,'0')}.xlsx`);
      toast.success('Excel didownload!');
    } catch { toast.error('Gagal export'); }
    finally { setExp(false); }
  };

  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const years  = Array.from({length:5}, (_,i) => now.getFullYear()-i);

  return (
    <div className="section animate-fade-in">
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>HRD</span><span>›</span><span className="font-semibold text-[var(--text-primary)]">Data Absensi</span>
      </nav>

      <div className="page-header">
        <div>
          <h1 className="page-title">Data Absensi Karyawan</h1>
          <p className="body-sm text-[var(--text-muted)]">Rekap absensi harian termasuk foto check-in & check-out</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} disabled={loading} className="btn-icon"><RefreshCw size={16} className={loading?'animate-spin':''}/></button>
          <button onClick={exportExcel} disabled={!records.length||exporting} className="btn-secondary gap-2">
            <Download size={15}/> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-sm mb-5 flex gap-3 flex-wrap items-center">
        <select value={month} onChange={e=>setMonth(parseInt(e.target.value))} className="input-base h-9 text-sm min-w-32">
          {months.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e=>setYear(parseInt(e.target.value))} className="input-base h-9 text-sm min-w-24">
          {years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm min-w-36">
          <option value="">Semua Cabang</option>
          <option value="1">GP Racing</option>
          <option value="2">GP Distro</option>
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="input-base h-9 text-sm min-w-32">
          <option value="">Semua Status</option>
          {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama karyawan..." className="input-base pl-9 h-9 text-sm w-full"/>
          {search && <button onClick={()=>setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-icon-sm"><X size={13}/></button>}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {[
          {l:'Total',   v:stats.total,   color:'text-[var(--text-primary)]',   bg:'bg-[var(--bg-secondary)]'},
          {l:'Hadir',   v:stats.present, color:'text-emerald-600',              bg:'bg-emerald-50 dark:bg-emerald-950/30'},
          {l:'Terlambat',v:stats.late,   color:'text-amber-600',                bg:'bg-amber-50 dark:bg-amber-950/30'},
          {l:'Absen',   v:stats.absent,  color:'text-red-600',                  bg:'bg-red-50 dark:bg-red-950/30'},
          {l:'Cuti',    v:stats.leave,   color:'text-purple-600',               bg:'bg-purple-50 dark:bg-purple-950/30'},
        ].map(s=>(
          <div key={s.l} className={`card p-4 ${s.bg}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{s.l}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)] sticky top-0 z-10">
              <tr>
                {['Karyawan','Tanggal','Status','Check In','Check Out','Jam Kerja','Foto','Lokasi'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {loading ? (
                [...Array(8)].map((_,i)=>(
                  <tr key={i}>
                    {[...Array(8)].map((_,j)=>(
                      <td key={j} className="px-4 py-3"><div className="skeleton h-5 rounded"/></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16">
                  <Calendar size={36} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30"/>
                  <p className="text-sm text-[var(--text-muted)]">Belum ada data absensi periode ini</p>
                </td></tr>
              ) : filtered.map((r, idx) => {
                const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.absent;
                const hasPhoto = r.check_in_photo || r.check_out_photo;
                return (
                  <tr key={r.id || idx} className={`hover:bg-[var(--bg-secondary)] transition-colors ${idx%2===0?'':'bg-[var(--bg-secondary)]/30'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {r.check_in_photo ? (
                          <img src={r.check_in_photo} alt="" className="w-8 h-8 rounded-xl object-cover flex-shrink-0 border border-[var(--border)]"/>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {(r.employee?.name || r.employee_name || '?')[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[var(--text-primary)] text-sm">{r.employee?.name || r.employee_name || '—'}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{r.employee?.branch?.name || r.employee?.role || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.check_in ? (
                        <span className={`font-semibold ${r.status==='late'?'text-amber-600':'text-emerald-600'}`}>
                          {formatTime(r.check_in)}
                        </span>
                      ) : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.check_out ? (
                        <span className="font-semibold text-blue-600">{formatTime(r.check_out)}</span>
                      ) : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {r.work_hours ? (
                        <span className="font-semibold">{r.work_hours}<span className="text-[10px] text-[var(--text-muted)] font-normal"> jam</span></span>
                      ) : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => setPhoto(r)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          hasPhoto
                            ? 'bg-[var(--brand-50)] dark:bg-[var(--brand-100)] text-[var(--brand-600)] hover:bg-[var(--brand-600)] hover:text-white'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                        }`}>
                        <Camera size={12}/>
                        {hasPhoto ? 'Lihat Foto' : 'Tidak ada'}
                      </button>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {r.check_in_location ? (
                        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                          <MapPin size={11} className="flex-shrink-0"/>
                          <span className="truncate">{r.check_in_location}</span>
                        </div>
                      ) : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)] flex justify-between items-center text-xs text-[var(--text-muted)]">
            <span>Menampilkan {filtered.length} dari {records.length} data</span>
            <span>{months[month-1]} {year}</span>
          </div>
        )}
      </div>

      {viewPhoto && <PhotoModal record={viewPhoto} onClose={()=>setPhoto(null)}/>}
    </div>
  );
}
