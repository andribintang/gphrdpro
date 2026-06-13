import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, ChevronDown, ChevronRight, RefreshCw, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import employeeService from '../utils/employeeService';

const DEPT_COLORS = [
  '#f43f5e','#3b82f6','#10b981','#f59e0b','#8b5cf6',
  '#06b6d4','#ec4899','#84cc16','#f97316','#6366f1',
];

export default function OrgChartPage() {
  const [employees, setEmployees]   = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [collapsed, setCollapsed]   = useState({});
  const [zoom,      setZoom]        = useState(1);
  const [filterDept, setFilterDept] = useState('');
  const chartRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await employeeService.getAll({ limit: 500, status: 'active' });
      setEmployees(r.data.data?.employees || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group by department
  const depts = {};
  employees.forEach(e => {
    const dept = e.employee?.department || 'Umum';
    if (!depts[dept]) depts[dept] = [];
    depts[dept].push(e);
  });

  const deptList = Object.keys(depts).sort();
  const filtered = filterDept ? { [filterDept]: depts[filterDept] } : depts;

  const handleExport = () => {
    if (!chartRef.current) return;
    import('html2canvas').then(({ default: h2c }) => {
      h2c(chartRef.current, { scale:2, backgroundColor: '#ffffff' }).then(canvas => {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = 'org-chart.png';
        a.click();
      });
    }).catch(() => alert('Export tidak tersedia'));
  };

  const getInitials = name => (name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const getRoleColor = role => ({
    admin:'bg-red-500', hr:'bg-purple-500', supervisor:'bg-blue-500', employee:'bg-emerald-500'
  }[role] || 'bg-gray-400');

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Org Chart</h1>
          <p className="page-subtitle">{employees.length} karyawan aktif · {deptList.length} departemen</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterDept} onChange={e=>setFilterDept(e.target.value)}
            className="input-base h-9 text-sm w-44">
            <option value="">Semua Departemen</option>
            {deptList.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => setZoom(z => Math.min(1.5, z+0.1))}
            className="btn-icon" title="Zoom In"><ZoomIn size={15}/></button>
          <button onClick={() => setZoom(z => Math.max(0.5, z-0.1))}
            className="btn-icon" title="Zoom Out"><ZoomOut size={15}/></button>
          <button onClick={() => setZoom(1)} className="btn-icon" title="Reset"><Maximize2 size={15}/></button>
          <button onClick={load} className="btn-icon"><RefreshCw size={15} className={loading?'animate-spin':''}/></button>
        </div>
      </div>

      {/* Chart */}
      <div className="table-wrapper overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <div ref={chartRef} className="p-6" style={{ transform:`scale(${zoom})`, transformOrigin:'top left', transition:'transform 0.2s', minWidth: `${Object.keys(filtered).length * 280}px` }}>
            {/* Company root */}
            <div className="flex justify-center mb-8">
              <div className="bg-[var(--brand-600)] text-white px-6 py-3 rounded-2xl shadow-lg text-center">
                <p className="font-black text-base">GPDISTRO RACING ID</p>
                <p className="text-xs opacity-80">ERP & HRD Integrated System</p>
              </div>
            </div>

            {/* Departments */}
            <div className="flex gap-6 justify-center flex-wrap">
              {Object.entries(filtered).map(([dept, emps], di) => {
                const color = DEPT_COLORS[di % DEPT_COLORS.length];
                const isCollapsed = collapsed[dept];
                const supervisors = emps.filter(e => ['admin','hr','supervisor'].includes(e.role));
                const staff = emps.filter(e => e.role === 'employee');

                return (
                  <div key={dept} className="flex flex-col items-center">
                    {/* Connector line */}
                    <div className="w-px h-8 bg-[var(--border)]"/>

                    {/* Dept card */}
                    <div className="rounded-2xl border-2 overflow-hidden shadow-sm" style={{ borderColor: color, minWidth: 220 }}>
                      {/* Dept header */}
                      <button
                        onClick={() => setCollapsed(p => ({...p, [dept]: !p[dept]}))}
                        className="w-full flex items-center justify-between px-4 py-3 text-white font-bold text-sm"
                        style={{ background: color }}>
                        <div className="flex items-center gap-2">
                          <Building2 size={14}/>
                          <span>{dept}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{emps.length}</span>
                          {isCollapsed ? <ChevronRight size={14}/> : <ChevronDown size={14}/>}
                        </div>
                      </button>

                      {/* Employees */}
                      {!isCollapsed && (
                        <div className="bg-[var(--bg-card)] divide-y divide-[var(--border)]">
                          {/* Supervisors first */}
                          {supervisors.map(e => (
                            <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-secondary)]">
                              {e.employee?.photo_url ? (
                                <img src={e.employee.photo_url} alt={e.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2" style={{borderColor:color}}/>
                              ) : (
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:color}}>
                                  {getInitials(e.name)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{e.name}</p>
                                <p className="text-[10px] text-[var(--text-muted)] truncate">{e.employee?.position||'—'}</p>
                              </div>
                              <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full text-white font-semibold flex-shrink-0 ${getRoleColor(e.role)}`}>
                                {e.role==='admin'?'Admin':e.role==='hr'?'HR':'SPV'}
                              </span>
                            </div>
                          ))}
                          {/* Staff */}
                          {staff.map(e => (
                            <div key={e.id} className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--bg-secondary)]">
                              {e.employee?.photo_url ? (
                                <img src={e.employee.photo_url} alt={e.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[var(--border)]"/>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] flex-shrink-0">
                                  {getInitials(e.name)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{e.name}</p>
                                <p className="text-[10px] text-[var(--text-muted)] truncate">{e.employee?.position||'Staff'}</p>
                              </div>
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
      <div className="flex items-center gap-4 flex-wrap px-2">
        {[['bg-red-500','Admin'],['bg-purple-500','HR'],['bg-blue-500','Supervisor'],['bg-emerald-500','Karyawan']].map(([c,l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${c}`}/>
            <span className="text-xs text-[var(--text-muted)]">{l}</span>
          </div>
        ))}
        <span className="text-xs text-[var(--text-muted)] ml-auto">Klik header departemen untuk collapse · Scroll untuk navigasi</span>
      </div>
    </div>
  );
}
