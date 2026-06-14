import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users, Clock, CalendarOff, DollarSign, TrendingUp, TrendingDown,
  Building2, AlertTriangle, CheckCircle2, RefreshCw, ChevronRight,
  Award, UserCheck, UserX, Cake, Bell,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';
import { employeeService } from '../utils/employeeService';
import { attendanceService } from '../utils/attendanceService';
import { leaveService } from '../utils/leaveService';
import api from '../utils/api';

const toRpShort = v => {
  const n = parseFloat(v)||0;
  if (n>=1e9) return 'Rp '+(n/1e9).toFixed(1)+'M';
  if (n>=1e6) return 'Rp '+(n/1e6).toFixed(1)+'jt';
  if (n>=1e3) return 'Rp '+(n/1e3).toFixed(0)+'rb';
  return 'Rp '+n;
};
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isHRAdmin = ['admin','hr'].includes(user?.role);
  const now = new Date();

  const [empStats,    setEmpStats]    = useState(null);
  const [todayAtt,    setTodayAtt]    = useState(null);
  const [pendingLeaves,setPending]    = useState([]);
  const [attTrend,    setAttTrend]    = useState([]);
  const [deptData,    setDeptData]    = useState([]);
  const [leaveStatus, setLeaveStatus] = useState([]);
  const [birthdays,   setBirthdays]   = useState([]);
  const [payrollSum,  setPayrollSum]  = useState(null);
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, todayRes] = await Promise.all([
        employeeService.getStats(),
        attendanceService.getToday?.().catch(()=>null),
      ]);
      setEmpStats(statsRes.data.data);
      if (todayRes) setTodayAtt(todayRes.data.data);

      if (isHRAdmin) {
        // Pending leaves
        api.get('/leaves/admin/all', { params:{ status:'pending', limit:5 } })
          .then(r => setPending(r.data.data?.leaves||[])).catch(()=>{});

        // Attendance trend 6 months
        const trend = [];
        for (let i=5; i>=0; i--) {
          const d = new Date(); d.setMonth(d.getMonth()-i);
          trend.push({ year:d.getFullYear(), month:d.getMonth()+1, label:MONTHS[d.getMonth()] });
        }
        Promise.all(trend.map(async t => {
          try {
            const r = await api.get('/attendance/admin/all', { params:{ year:t.year, month:t.month, limit:500 } });
            const recs = r.data.data?.records||r.data.data?.attendances||[];
            return { ...t, hadir:recs.filter(a=>a.status==='present').length, terlambat:recs.filter(a=>a.status==='late').length, absen:recs.filter(a=>a.status==='absent').length };
          } catch { return { ...t, hadir:0, terlambat:0, absen:0 }; }
        })).then(setAttTrend);

        // Dept headcount
        employeeService.getAll({ limit:500 }).then(r => {
          const emps = r.data.data?.employees||[];
          const map = {};
          emps.forEach(e => {
            const d = e.employee?.department||'Lainnya';
            if (!map[d]) map[d] = { dept:d.length>12?d.slice(0,12)+'…':d, total:0, active:0 };
            map[d].total++;
            if (e.employee?.status==='active') map[d].active++;
          });
          setDeptData(Object.values(map).sort((a,b)=>b.total-a.total).slice(0,8));
          // Birthdays this month
          const mmdd = `${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
          const bdays = emps.filter(e => {
            const bd = e.employee?.birth_date;
            if (!bd) return false;
            const empMmdd = bd.slice(5,10);
            return empMmdd >= mmdd && empMmdd <= `${String(now.getMonth()+1).padStart(2,'0')}-31`;
          }).slice(0,5);
          setBirthdays(bdays);
        }).catch(()=>{});

        // Leave status pie
        api.get('/leaves/admin/all', { params:{ limit:200 } }).then(r => {
          const leaves = r.data.data?.leaves||[];
          const map = { pending:0, approved:0, rejected:0 };
          leaves.forEach(l => { if(map[l.status]!==undefined) map[l.status]++; });
          setLeaveStatus([
            { name:'Pending',   value:map.pending,  color:'#f59e0b' },
            { name:'Disetujui', value:map.approved, color:'#10b981' },
            { name:'Ditolak',   value:map.rejected, color:'#ef4444' },
          ].filter(s=>s.value>0));
        }).catch(()=>{});

        // Payroll summary current month
        api.get('/payroll-engine/runs', { params:{ type:'monthly', year:now.getFullYear(), limit:1 } })
          .then(r => { const run = r.data.data?.runs?.[0]; if(run) setPayrollSum(run); })
          .catch(()=>{});
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [isHRAdmin]);

  useEffect(() => { load(); }, [load]);

  const s = empStats?.summary || {};
  const today = todayAtt || {};

  const STAT_CARDS = [
    { label:'Total Karyawan', value:s.total||0,   icon:'👥', color:'text-blue-600',   bg:'bg-blue-50',    sub:`${s.active||0} aktif`, path:'/employees' },
    { label:'Hadir Hari Ini',  value:today.hadir||0, icon:'✅', color:'text-emerald-600', bg:'bg-emerald-50', sub:`dari ${s.active||0} aktif`, path:'/attendance-admin' },
    { label:'Terlambat',       value:today.telat||0, icon:'⚠️', color:'text-amber-600',   bg:'bg-amber-50',   sub:'hari ini', path:'/attendance-admin' },
    { label:'Absen',           value:today.absen||0, icon:'❌', color:'text-red-600',     bg:'bg-red-50',     sub:'hari ini', path:'/attendance-admin' },
    { label:'Cuti Pending',    value:pendingLeaves.length, icon:'📋', color:'text-purple-600', bg:'bg-purple-50', sub:'butuh approval', path:'/leaves' },
    { label:'Gaji Bulan Ini',  value:payrollSum?toRpShort(payrollSum.total_net):'—', icon:'💰', color:'text-[var(--brand-600)]', bg:'bg-[var(--brand-600)]/5', sub:payrollSum?.status||'belum generate', path:'/payroll-pro' },
  ];

  if (!isHRAdmin) return <EmployeeDashboard user={user} navigate={navigate}/>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard HRD</h1>
          <p className="page-subtitle">{now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
        <button onClick={load} className="btn-icon" title="Refresh">
          <RefreshCw size={15} className={loading?'animate-spin':''}/>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map(s => (
          <button key={s.label} onClick={()=>navigate(s.path)}
            className="table-wrapper p-3.5 text-center hover:scale-[1.02] transition-transform active:scale-95 group">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[11px] font-semibold text-[var(--text-primary)] mt-0.5">{s.label}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{s.sub}</p>
          </button>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Attendance trend */}
        {attTrend.length > 0 && (
          <div className="lg:col-span-2 table-wrapper p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-sm">Tren Absensi 6 Bulan</p>
                <p className="text-xs text-[var(--text-muted)]">Hadir · Terlambat · Absen</p>
              </div>
              <TrendingUp size={16} className="text-[var(--text-muted)]"/>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={attTrend}>
                <defs>
                  <linearGradient id="gHadir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="label" tick={{fontSize:11,fill:'var(--text-muted)'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'var(--text-muted)'}} axisLine={false} tickLine={false} width={25}/>
                <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,fontSize:12}}/>
                <Area type="monotone" dataKey="hadir" name="Hadir" stroke="#10b981" fill="url(#gHadir)" strokeWidth={2}/>
                <Area type="monotone" dataKey="terlambat" name="Terlambat" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4 2"/>
                <Area type="monotone" dataKey="absen" name="Absen" stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="4 2"/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Leave status donut */}
        <div className="table-wrapper p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-sm">Status Cuti</p>
              <p className="text-xs text-[var(--text-muted)]">Distribusi pengajuan</p>
            </div>
            <button onClick={()=>navigate('/leaves')} className="text-[10px] text-[var(--brand-600)] hover:underline font-semibold">Lihat Semua →</button>
          </div>
          {leaveStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={leaveStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                  {leaveStatus.map((s,i) => <Cell key={i} fill={s.color}/>)}
                </Pie>
                <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,fontSize:12}}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-[var(--text-muted)] text-sm">
              <div className="text-center"><CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-400"/><p>Tidak ada pengajuan cuti</p></div>
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Headcount per dept */}
        {deptData.length > 0 && (
          <div className="lg:col-span-2 table-wrapper p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-sm">Headcount per Departemen</p>
                <p className="text-xs text-[var(--text-muted)]">Total vs Aktif</p>
              </div>
              <button onClick={()=>navigate('/org-chart')} className="text-[10px] text-[var(--brand-600)] hover:underline font-semibold">Org Chart →</button>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={deptData} layout="vertical" barGap={2} barCategoryGap="30%">
                <XAxis type="number" tick={{fontSize:11,fill:'var(--text-muted)'}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="dept" tick={{fontSize:11,fill:'var(--text-muted)'}} axisLine={false} tickLine={false} width={85}/>
                <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,fontSize:12}} cursor={{fill:'var(--bg-secondary)'}}/>
                <Bar dataKey="total" name="Total" fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth={1} radius={[0,3,3,0]}/>
                <Bar dataKey="active" name="Aktif" fill="var(--brand-600)" radius={[0,3,3,0]}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Birthday & Pending panel */}
        <div className="space-y-4">
          {/* Pending leaves */}
          {pendingLeaves.length > 0 && (
            <div className="table-wrapper overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">🕐 Cuti Pending ({pendingLeaves.length})</p>
                <button onClick={()=>navigate('/leaves')} className="text-[10px] text-[var(--brand-600)] hover:underline font-semibold">Approve →</button>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {pendingLeaves.slice(0,3).map(l => (
                  <div key={l.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-secondary)]">
                    <div>
                      <p className="text-xs font-semibold">{l.user?.name||'—'}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{l.leave_type} · {l.days} hari</p>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Birthdays */}
          {birthdays.length > 0 && (
            <div className="table-wrapper overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">🎂 Ulang Tahun Bulan Ini</p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {birthdays.map((e,i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[var(--brand-600)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(e.name||'?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{e.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{e.employee?.birth_date?.slice(5,10).split('-').join(' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon:'👤', label:'Tambah Karyawan',   path:'/employees',       color:'bg-blue-50 text-blue-700' },
          { icon:'📋', label:'Approve Cuti',       path:'/leaves',          color:'bg-purple-50 text-purple-700' },
          { icon:'💰', label:'Generate Gaji',      path:'/payroll-pro',     color:'bg-emerald-50 text-emerald-700' },
          { icon:'🏢', label:'Org Chart',          path:'/org-chart',       color:'bg-amber-50 text-amber-700' },
        ].map(q => (
          <button key={q.label} onClick={()=>navigate(q.path)}
            className={`table-wrapper p-4 text-center hover:scale-[1.02] transition-transform active:scale-95 ${q.color}`}>
            <p className="text-2xl mb-2">{q.icon}</p>
            <p className="text-xs font-bold">{q.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Employee Dashboard (for non-HR) ──────────────────────────
function EmployeeDashboard({ user, navigate }) {
  const [myAtt, setMyAtt] = useState(null);
  useEffect(() => {
    api.get('/attendance/my/stats').then(r => setMyAtt(r.data.data)).catch(()=>{});
  }, []);
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">Halo, {user?.name?.split(' ')[0]}! 👋</h1>
        <p className="page-subtitle">{new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'})}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label:'Slip Gaji', icon:'💰', path:'/payroll-pro', color:'text-emerald-600' },
          { label:'Pengajuan Cuti', icon:'📋', path:'/leaves', color:'text-purple-600' },
          { label:'Riwayat Absensi', icon:'🕐', path:'/attendance', color:'text-blue-600' },
          user?.role === 'supervisor'
            ? { label:'Tim Saya', icon:'👥', path:'/employees', color:'text-amber-600' }
            : { label:'Profil Saya', icon:'👤', path:'/self-service', color:'text-amber-600' },
        ].map(q => (
          <button key={q.label} onClick={()=>navigate(q.path)}
            className="table-wrapper p-5 text-center hover:scale-[1.02] transition-transform">
            <p className="text-3xl mb-2">{q.icon}</p>
            <p className={`text-sm font-bold ${q.color}`}>{q.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
