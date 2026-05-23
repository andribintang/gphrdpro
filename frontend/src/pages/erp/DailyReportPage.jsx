import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, RefreshCw, Loader2, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService } from '../../utils/erp/erpService';

const fmt = (n) => { if (!n||n===0) return '—'; return new Intl.NumberFormat('id-ID').format(Math.round(n)); };

const CH_STYLE = {
  marketplace: { total:'bg-orange-500 text-white', sub:'bg-orange-50 dark:bg-orange-950/40' },
  direct:      { total:'bg-blue-500 text-white',   sub:'bg-blue-50 dark:bg-blue-950/40' },
  wa:          { total:'bg-emerald-500 text-white', sub:'bg-emerald-50 dark:bg-emerald-950/40' },
};

export default function DailyReportPage() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [branch, setBranch]     = useState('');
  const [exporting, setExp]     = useState(false);
  const [dateRange, setDate]    = useState(() => {
    const now = new Date();
    return { from:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, to:now.toISOString().split('T')[0] };
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpService.getDailyReport({ branch_id:branch||undefined, date_from:dateRange.from, date_to:dateRange.to });
      setData(res.data.data);
    } catch { toast.error('Gagal memuat laporan'); }
    finally { setLoading(false); }
  }, [branch, dateRange]);

  useEffect(() => { fetch(); }, [fetch]);

  const exportExcel = async () => {
    if (!data) return;
    setExp(true);
    try {
      const XLSX = await import('xlsx');
      const { dates, rows } = data;
      const dateLabels = dates.map(d => { const dt=new Date(d); return `${String(dt.getDate()).padStart(2,'0')}-${dt.toLocaleString('en',{month:'short'})}`; });
      const wsData = [[`LAPORAN SALES HARIAN — ${dateRange.from} s/d ${dateRange.to}`],[],['NO','SALES CHANNEL',...dateLabels,'TOTAL MTD']];
      let rowNo = 1;
      rows.forEach(row => {
        const vals = dates.map(d => row.by_date[d]||0);
        if (row.is_grand_total||row.is_subtotal) wsData.push(['',row.label,...vals,row.total]);
        else wsData.push([rowNo++,row.sub_channel,...vals,row.total]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{wch:4},{wch:22},...dates.map(()=>({wch:12})),{wch:14}];
      ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:dates.length+2}}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan Harian');
      XLSX.writeFile(wb, `laporan_harian_${dateRange.from}_${dateRange.to}.xlsx`);
      toast.success('Excel didownload!');
    } catch { toast.error('Gagal export'); }
    finally { setExp(false); }
  };

  const dates = data?.dates || [];
  const rows  = data?.rows  || [];

  return (
    <div className="section animate-fade-in">
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>ERP</span><span>›</span><span>Keuangan</span><span>›</span>
        <span className="font-semibold text-[var(--text-primary)]">Laporan Harian</span>
      </nav>
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan Sales Harian</h1>
          <p className="body-sm text-[var(--text-muted)]">Per sub channel per hari</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} disabled={loading} className="btn-icon"><RefreshCw size={16} className={loading?'animate-spin':''}/></button>
          <button onClick={exportExcel} disabled={!data||exporting} className="btn-secondary gap-2">
            {exporting?<Loader2 size={15} className="animate-spin"/>:<Download size={15}/>} Export Excel
          </button>
        </div>
      </div>
      <div className="card-sm mb-5 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {[{l:'Bulan Ini',f:()=>{const n=new Date();setDate({from:`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`,to:n.toISOString().split('T')[0]})}},
            {l:'Bulan Lalu',f:()=>{const n=new Date();setDate({from:new Date(n.getFullYear(),n.getMonth()-1,1).toISOString().split('T')[0],to:new Date(n.getFullYear(),n.getMonth(),0).toISOString().split('T')[0]})}},
          ].map(q=>(<button key={q.l} onClick={q.f} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all">{q.l}</button>))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="date" value={dateRange.from} onChange={e=>setDate(r=>({...r,from:e.target.value}))} className="input-base h-9 text-sm flex-1 min-w-28"/>
          <span className="text-xs text-[var(--text-muted)]">s/d</span>
          <input type="date" value={dateRange.to} onChange={e=>setDate(r=>({...r,to:e.target.value}))} className="input-base h-9 text-sm flex-1 min-w-28"/>
          <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm min-w-36">
            <option value="">Semua Cabang</option><option value="1">GP Racing</option><option value="2">GP Distro</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-12"/>)}</div>
      ) : !data||rows.length===0 ? (
        <div className="card text-center py-14"><BarChart3 size={36} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30"/><p className="text-sm text-[var(--text-muted)]">Belum ada data</p></div>
      ) : (
        <div className="table-wrapper">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="text-xs border-collapse" style={{minWidth:`${200+dates.length*85}px`}}>
              <thead>
                <tr className="sticky top-0 z-20">
                  <th className="sticky left-0 z-30 bg-gray-800 text-white px-3 py-3 text-left w-8 border-r border-gray-600">NO</th>
                  <th className="sticky left-8 z-30 bg-gray-800 text-white px-4 py-3 text-left min-w-44 border-r border-gray-600">SALES CHANNEL</th>
                  {dates.map(d=>{
                    const dt=new Date(d); const isToday=d===new Date().toISOString().split('T')[0];
                    return <th key={d} className={`px-2 py-3 text-center w-20 border-r border-gray-600 font-bold whitespace-nowrap ${isToday?'bg-red-600 text-white':'bg-gray-800 text-white'}`}>{String(dt.getDate()).padStart(2,'0')}-{dt.toLocaleString('en',{month:'short'})}</th>;
                  })}
                  <th className="sticky right-0 z-30 bg-gray-900 text-white px-4 py-3 text-right min-w-28 font-bold border-l-2 border-gray-500">TOTAL MTD</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row,idx)=>{
                  if (row.is_grand_total) return (
                    <tr key="grand" className="border-t-2 border-gray-400">
                      <td className="sticky left-0 z-10 bg-gray-900 text-white px-3 py-3 font-bold border-r border-gray-600"/>
                      <td className="sticky left-8 z-10 bg-gray-900 text-white px-4 py-3 font-bold border-r border-gray-600">{row.label}</td>
                      {dates.map(d=><td key={d} className="px-2 py-3 text-right bg-gray-900 text-white font-bold border-r border-gray-700 whitespace-nowrap">{row.by_date[d]?fmt(row.by_date[d]):'—'}</td>)}
                      <td className="sticky right-0 z-10 bg-gray-900 text-white px-4 py-3 text-right font-bold border-l-2 border-gray-500 whitespace-nowrap">{fmt(row.total)}</td>
                    </tr>
                  );
                  if (row.is_subtotal) {
                    const st=CH_STYLE[row.channel]||CH_STYLE.direct;
                    return (
                      <tr key={`sub-${row.channel}`}>
                        <td className={`sticky left-0 z-10 px-3 py-3 border-r border-white/20 ${st.total}`}/>
                        <td className={`sticky left-8 z-10 px-4 py-3 border-r border-white/20 uppercase tracking-wide text-xs ${st.total}`}>{row.label}</td>
                        {dates.map(d=><td key={d} className={`px-2 py-3 text-right border-r border-white/20 whitespace-nowrap ${st.total}`}>{row.by_date[d]?fmt(row.by_date[d]):'—'}</td>)}
                        <td className={`sticky right-0 z-10 px-4 py-3 text-right border-l-2 border-white/20 whitespace-nowrap ${st.total}`}>{fmt(row.total)}</td>
                      </tr>
                    );
                  }
                  const isEven=idx%2===0;
                  return (
                    <tr key={idx} className={`border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors`}>
                      <td className={`sticky left-0 z-10 px-3 py-2.5 text-center border-r border-[var(--border)] text-[var(--text-muted)] ${isEven?'bg-[var(--bg-card)]':'bg-[var(--bg-secondary)]'}`}>{row.no}</td>
                      <td className={`sticky left-8 z-10 px-4 py-2.5 font-semibold border-r border-[var(--border)] text-[var(--text-primary)] ${CH_STYLE[row.channel]?.sub||''} whitespace-nowrap`}>{row.sub_channel}</td>
                      {dates.map(d=>{const val=row.by_date[d];return(<td key={d} className={`px-2 py-2.5 text-right border-r border-[var(--border-subtle)] whitespace-nowrap ${val?'text-[var(--text-primary)] font-medium':'text-[var(--text-muted)]'}`}>{val?fmt(val):'—'}</td>);})}
                      <td className={`sticky right-0 z-10 px-4 py-2.5 text-right font-bold border-l-2 border-[var(--border)] whitespace-nowrap ${isEven?'bg-[var(--bg-card)]':'bg-[var(--bg-secondary)]'} text-[var(--text-primary)]`}>{fmt(row.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
