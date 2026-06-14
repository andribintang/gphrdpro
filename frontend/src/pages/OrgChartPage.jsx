import { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, ChevronDown, ChevronRight, RefreshCw, ZoomIn, ZoomOut, Maximize2, Users } from 'lucide-react';
import api from '../utils/api';

const DEPT_COLORS = ['#f43f5e','#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1'];

const getRoleLabel  = r => ({admin:'Admin',hr:'HR',supervisor:'SPV',employee:'Staff'}[r]||r);
const getRoleColor  = r => ({admin:'bg-red-500',hr:'bg-purple-500',supervisor:'bg-blue-500',employee:'bg-emerald-500'}[r]||'bg-gray-400');
const getInitials   = n => (n||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

export default function OrgChartPage() {
  const [employees,  setEmployees]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [collapsed,  setCollapsed]  = useState({});
  const [zoom,       setZoom]       = useState(1);
  const [filterDept, setFilterDept] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get('/employees', { params: { limit: 500 } });
      const emps = r?.data?.data?.employees || r?.data?.employees || [];
      setEmployees(emps);
    } catch(e) {
      setError(e?.response?.data?.message || e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group by department
  const depts = {};
  employees.forEach(e => {
    const dept = e?.employee?.department || 'Umum';
    if (!depts[dept]) depts[dept] = [];
    depts[dept].push(e);
  });
  const deptList  = Object.keys(depts).sort();
  const filtered  = filterDept ? { [filterDept]: depts[filterDept] } : depts;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Org Chart</h1>
          <p className="page-subtitle">{employees.length} karyawan · {deptList.length} departemen</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterDept} onChange={e=>setFilterDept(e.target.value)}
            className="input-base h-9 text-sm w-44">
            <option value="">Semua Departemen</option>
            {deptList.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={()=>setZoom(z=>Math.min(1.5,+(z+0.1).toFixed(1)))} className="btn-icon"><ZoomIn size={14}/></button>
          <button onClick={()=>setZoom(z=>Math.max(0.5,+(z-0.1).toFixed(1)))} className="btn-icon"><ZoomOut size={14}/></button>
          <button onClick={()=>setZoom(1)} className="btn-icon"><Maximize2 size={14}/></button>
          <button onClick={load} className="btn-icon"><RefreshCw size={14} className={loading?'animate-spin':''}/></button>
        </div>
      </div>

      {/* Content */}
      <div className="table-wrapper overflow-auto" style={{maxHeight:'calc(100vh - 180px)'}}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin"/>
            <p className="text-sm text-[var(--text-muted)]">Memuat data karyawan...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <p className="text-2xl">⚠️</p>
            <p className="font-semibold">{error}</p>
            <button onClick={load} className="btn-secondary gap-2 mt-2"><RefreshCw size={14}/> Coba Lagi</button>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
            <Users size={40} className="opacity-30"/>
            <p className="font-semibold">Belum ada data karyawan</p>
          </div>
        ) : (
          <div style={{transform:`scale(${zoom})`,transformOrigin:'top left',transition:'transform .2s',
            minWidth:`${Object.keys(filtered).length*240}px`,padding:'24px'}}>

            {/* Company root */}
            <div className="flex justify-center mb-8">
              <div className="bg-[var(--brand-600)] text-white px-6 py-3 rounded-2xl shadow-lg text-center min-w-[200px]">
                <p className="font-black text-sm">GPDISTRO RACING ID</p>
                <p className="text-[10px] opacity-80">ERP & HRD Integrated System</p>
              </div>
            </div>

            {/* Departments */}
            <div className="flex gap-5 justify-center flex-wrap items-start">
              {Object.entries(filtered).map(([dept, emps], di) => {
                const color     = DEPT_COLORS[di % DEPT_COLORS.length];
                const isCollapsed = collapsed[dept];
                const leads     = emps.filter(e=>['admin','hr','supervisor'].includes(e.role));
                const staff     = emps.filter(e=>e.role==='employee');

                return (
                  <div key={dept} className="flex flex-col items-center">
                    <div className="w-px h-8 bg-[var(--border)]"/>
                    <div className="rounded-2xl border-2 overflow-hidden shadow-sm" style={{borderColor:color,minWidth:200,maxWidth:230}}>

                      {/* Dept header */}
                      <button onClick={()=>setCollapsed(p=>({...p,[dept]:!p[dept]}))}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-white font-bold text-xs"
                        style={{background:color}}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Building2 size={12} className="flex-shrink-0"/>
                          <span className="truncate">{dept}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                          <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full">{emps.length}</span>
                          {isCollapsed ? <ChevronRight size={12}/> : <ChevronDown size={12}/>}
                        </div>
                      </button>

                      {/* Members */}
                      {!isCollapsed && (
                        <div className="bg-[var(--bg-card)] divide-y divide-[var(--border)]">
                          {[...leads, ...staff].map(e => (
                            <div key={e.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--bg-secondary)]">
                              {e?.employee?.photo_url ? (
                                <img src={e.employee.photo_url} alt={e.name}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm"/>
                              ) : (
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm"
                                  style={{background: leads.includes(e) ? color : '#94a3b8'}}>
                                  {getInitials(e.name)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{e.name}</p>
                                <p className="text-[10px] text-[var(--text-muted)] truncate">{e?.employee?.position||'—'}</p>
                              </div>
                              {e.role !== 'employee' && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full text-white font-bold flex-shrink-0 ${getRoleColor(e.role)}`}>
                                  {getRoleLabel(e.role)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-[var(--text-muted)] px-1">
        {[['bg-red-500','Admin'],['bg-purple-500','HR'],['bg-blue-500','Supervisor'],['bg-slate-400','Staff']].map(([c,l])=>(
          <div key={l} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${c}`}/>
            <span>{l}</span>
          </div>
        ))}
        <span className="ml-auto hidden sm:block">Klik header dept untuk collapse · Zoom dengan tombol di atas</span>
      </div>
    </div>
  );
}
