import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, RefreshCw, Loader2, BarChart3, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService } from '../../utils/erp/erpService';

// ── Format number ─────────────────────────────────────────────
const fmt = (n) => {
  if (!n) return '—';
  return new Intl.NumberFormat('id-ID').format(Math.round(n));
};

const fmtShort = (n) => {
  if (!n || n === 0) return '—';
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(0)}rb`;
  return n;
};

// ── Channel colors ────────────────────────────────────────────
const CH_STYLE = {
  marketplace: { header:'bg-orange-500', sub:'bg-orange-50 dark:bg-orange-950/40', total:'bg-orange-500 text-white font-bold' },
  direct:      { header:'bg-blue-500',   sub:'bg-blue-50 dark:bg-blue-950/40',     total:'bg-blue-500 text-white font-bold' },
  wa:          { header:'bg-emerald-500',sub:'bg-emerald-50 dark:bg-emerald-950/40',total:'bg-emerald-500 text-white font-bold' },
};

export default function DailyReportPage() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [branch, setBranch]     = useState('');
  const [exporting, setExp]     = useState(false);
  const tableRef = useRef(null);

  const [dateRange, setDate] = useState(() => {
    const now = new Date();
    return {
      from: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`,
      to:   now.toISOString().split('T')[0],
    };
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpService.getDailyReport({
        branch_id: branch || undefined,
        date_from: dateRange.from,
        date_to:   dateRange.to,
      });
      setData(res.data.data);
    } catch { toast.error('Gagal memuat laporan'); }
    finally { setLoading(false); }
  }, [branch, dateRange]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── Quick date shortcuts ──────────────────────────────────────
  const setThisMonth = () => {
    const n = new Date();
    setDate({ from:`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`, to:n.toISOString().split('T')[0] });
  };
  const setLastMonth = () => {
    const n = new Date();
    setDate({
      from: new Date(n.getFullYear(),n.getMonth()-1,1).toISOString().split('T')[0],
      to:   new Date(n.getFullYear(),n.getMonth(),0).toISOString().split('T')[0],
    });
  };
  const setThisWeek = () => {
    const n = new Date();
    const mon = new Date(n); mon.setDate(n.getDate() - n.getDay() + 1);
    setDate({ from: mon.toISOString().split('T')[0], to: n.toISOString().split('T')[0] });
  };

  // ── Export Excel ──────────────────────────────────────────────
  const exportExcel = async () => {
    if (!data) return;
    setExp(true);
    try {
      const XLSX = await import('xlsx');
      const { dates, rows } = data;

      // Header row 1: title
      const branchName = branch === '1' ? 'GP Racing' : branch === '2' ? 'GP Distro' : 'Semua Cabang';
      const title = `LAPORAN SALES HARIAN — ${branchName} — ${dateRange.from} s/d ${dateRange.to}`;

      // Header row 2: columns
      const dateLabels = dates.map(d => {
        const dt = new Date(d);
        return `${String(dt.getDate()).padStart(2,'0')}-${dt.toLocaleString('en',{month:'short'})}`;
      });
      const headerRow = ['NO', 'SALES CHANNEL', ...dateLabels, 'TOTAL MTD'];

      const wsData = [
        [title],
        [],
        headerRow,
      ];

      let rowNo = 1;
      rows.forEach(row => {
        if (row.is_grand_total) {
          const vals = dates.map(d => row.by_date[d] || 0);
          wsData.push(['', row.label, ...vals, row.total]);
        } else if (row.is_subtotal) {
          const vals = dates.map(d => row.by_date[d] || 0);
          wsData.push(['', row.label, ...vals, row.total]);
        } else {
          const vals = dates.map(d => row.by_date[d] || 0);
          wsData.push([rowNo++, row.sub_channel, ...vals, row.total]);
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Column widths
      ws['!cols'] = [
        { wch: 4 }, { wch: 22 },
        ...dates.map(() => ({ wch: 13 })),
        { wch: 16 },
      ];

      // Merge title cell
      ws['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:dates.length+2} }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan Harian');

      const fname = `laporan_sales_harian_${dateRange.from}_${dateRange.to}.xlsx`;
      XLSX.writeFile(wb, fname);
      toast.success('Excel didownload!');
    } catch (e) { toast.error('Gagal export'); console.error(e); }
    finally { setExp(false); }
  };

  const dates = data?.dates || [];
  const rows  = data?.rows  || [];

  // Split dates into chunks for horizontal scroll readability
  const CHUNK = 16; // show max 16 dates per view (scrollable)

  return (
    <div className="section animate-fade-in">
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>ERP</span><span>›</span><span>Keuangan</span><span>›</span>
        <span className="font-semibold text-[var(--text-primary)]">Laporan Harian</span>
      </nav>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan Sales Harian</h1>
          <p className="body-sm text-[var(--text-muted)]">Per sub channel & channel</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} disabled={loading} className="btn-icon">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportExcel} disabled={!data || exporting} className="btn-secondary gap-2">
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-sm mb-5 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {[{l:'Bulan Ini',f:setThisMonth},{l:'Bulan Lalu',f:setLastMonth},{l:'Minggu Ini',f:setThisWeek}].map(q=>(
            <button key={q.l} onClick={q.f}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all">
              {q.l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="date" value={dateRange.from} onChange={e=>setDate(r=>({...r,from:e.target.value}))}
            className="input-base h-9 text-sm flex-1 min-w-28" />
          <span className="text-xs text-[var(--text-muted)]">s/d</span>
          <input type="date" value={dateRange.to} onChange={e=>setDate(r=>({...r,to:e.target.value}))}
            className="input-base h-9 text-sm flex-1 min-w-28" />
          <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm min-w-36">
            <option value="">Semua Cabang</option>
            <option value="1">GP Racing</option>
            <option value="2">GP Distro</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { l:'Total Omzet MTD', v: data.grand_total, color:'text-[var(--brand-600)]' },
            { l:'Hari Aktif', v: `${dates.length} hari`, color:'text-blue-600', raw:true },
            { l:'Periode', v: `${dateRange.from} – ${dateRange.to}`, color:'text-[var(--text-secondary)]', raw:true, small:true },
          ].map(s => (
            <div key={s.l} className="card p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{s.l}</p>
              <p className={`font-bold ${s.small ? 'text-xs mt-1' : 'text-lg'} ${s.color}`}>
                {s.raw ? s.v : `Rp ${fmt(s.v)}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-12"/>)}</div>
      ) : !data || rows.length === 0 ? (
        <div className="card text-center py-14">
          <BarChart3 size={36} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30"/>
          <p className="text-sm text-[var(--text-muted)]">Belum ada data penjualan pada periode ini</p>
        </div>
      ) : (
        <div className="table-wrapper" ref={tableRef}>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="text-xs border-collapse" style={{ minWidth: `${220 + dates.length * 90}px` }}>

              {/* ── THEAD ── */}
              <thead>
                <tr className="sticky top-0 z-20">
                  <th className="sticky left-0 z-30 bg-gray-800 text-white px-3 py-3 text-left w-8 border-r border-gray-600">NO</th>
                  <th className="sticky left-8 z-30 bg-gray-800 text-white px-4 py-3 text-left min-w-44 border-r border-gray-600">SALES CHANNEL</th>
                  {dates.map(d => {
                    const dt = new Date(d);
                    const dd = String(dt.getDate()).padStart(2,'0');
                    const mm = dt.toLocaleString('en',{month:'short'});
                    const isToday = d === new Date().toISOString().split('T')[0];
                    return (
                      <th key={d} className={`px-2 py-3 text-center w-20 border-r border-gray-600 font-bold whitespace-nowrap
                        ${isToday ? 'bg-brand-600 text-white' : 'bg-gray-800 text-white'}`}>
                        {dd}-{mm}
                      </th>
                    );
                  })}
                  <th className="sticky right-0 z-30 bg-gray-900 text-white px-4 py-3 text-right min-w-28 font-bold border-l-2 border-gray-500">
                    TOTAL MTD
                  </th>
                </tr>
              </thead>

              {/* ── TBODY ── */}
              <tbody>
                {rows.map((row, idx) => {
                  if (row.is_grand_total) {
                    return (
                      <tr key="grand" className="border-t-2 border-gray-400">
                        <td className="sticky left-0 z-10 bg-gray-900 text-white px-3 py-3 font-bold border-r border-gray-600" />
                        <td className="sticky left-8 z-10 bg-gray-900 text-white px-4 py-3 font-bold border-r border-gray-600">
                          {row.label}
                        </td>
                        {dates.map(d => (
                          <td key={d} className="px-2 py-3 text-right bg-gray-900 text-white font-bold border-r border-gray-700 whitespace-nowrap">
                            {row.by_date[d] ? fmt(row.by_date[d]) : '—'}
                          </td>
                        ))}
                        <td className="sticky right-0 z-10 bg-gray-900 text-white px-4 py-3 text-right font-bold border-l-2 border-gray-500 whitespace-nowrap">
                          {fmt(row.total)}
                        </td>
                      </tr>
                    );
                  }

                  if (row.is_subtotal) {
                    const st = CH_STYLE[row.channel] || CH_STYLE.direct;
                    return (
                      <tr key={`sub-${row.channel}`} className="border-t border-b border-gray-300 dark:border-gray-600">
                        <td className={`sticky left-0 z-10 px-3 py-3 border-r border-white/20 ${st.total}`} />
                        <td className={`sticky left-8 z-10 px-4 py-3 border-r border-white/20 ${st.total} uppercase tracking-wide text-xs`}>
                          {row.label}
                        </td>
                        {dates.map(d => (
                          <td key={d} className={`px-2 py-3 text-right border-r border-white/20 whitespace-nowrap ${st.total}`}>
                            {row.by_date[d] ? fmt(row.by_date[d]) : '—'}
                          </td>
                        ))}
                        <td className={`sticky right-0 z-10 px-4 py-3 text-right border-l-2 border-white/20 whitespace-nowrap ${st.total}`}>
                          {fmt(row.total)}
                        </td>
                      </tr>
                    );
                  }

                  // Regular row
                  const st  = CH_STYLE[row.channel] || CH_STYLE.direct;
                  const isEven = idx % 2 === 0;
                  return (
                    <tr key={idx} className={`border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors`}>
                      <td className={`sticky left-0 z-10 px-3 py-2.5 text-center border-r border-[var(--border)] text-[var(--text-muted)] ${isEven ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-secondary)]'}`}>
                        {row.no}
                      </td>
                      <td className={`sticky left-8 z-10 px-4 py-2.5 font-semibold border-r border-[var(--border)] text-[var(--text-primary)] ${st.sub} whitespace-nowrap`}>
                        {row.sub_channel}
                      </td>
                      {dates.map(d => {
                        const val = row.by_date[d];
                        return (
                          <td key={d} className={`px-2 py-2.5 text-right border-r border-[var(--border-subtle)] whitespace-nowrap
                            ${val ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>
                            {val ? fmt(val) : '—'}
                          </td>
                        );
                      })}
                      <td className={`sticky right-0 z-10 px-4 py-2.5 text-right font-bold border-l-2 border-[var(--border)] whitespace-nowrap
                        ${isEven ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-secondary)]'} text-[var(--text-primary)]`}>
                        {fmt(row.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)] flex-wrap">
            {Object.entries({marketplace:'Marketplace',direct:'Langsung',wa:'WhatsApp'}).map(([k,l])=>{
              const st = CH_STYLE[k];
              return (
                <div key={k} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${st.total.split(' ')[0]}`} />
                  <span className="text-xs text-[var(--text-muted)]">{l}</span>
                </div>
              );
            })}
            <span className="text-xs text-[var(--text-muted)] ml-auto">
              * Angka dalam Rupiah (Rp)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
