import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Loader2, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService } from '../../utils/erp/erpService';
import PeriodFilter from '../../components/PeriodFilter';

const fmt = (n) => {
  if (!n || n === 0) return '-';
  return new Intl.NumberFormat('id-ID').format(Math.round(n));
};

const CH_STYLE = {
  marketplace: { total: 'bg-[#1565C0] text-white', sub: 'bg-[#E3F2FD]' },
  direct:      { total: 'bg-[#1565C0] text-white', sub: 'bg-[#F3F9FF]' },
  wa:          { total: 'bg-[#1565C0] text-white', sub: 'bg-[#F0F7FF]' },
};

export default function ChannelReportPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch]   = useState('');
  const [exporting, setExp]   = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpService.getChannelReport({ branch_id: branch || undefined });
      setData(res.data.data);
    } catch { toast.error('Gagal memuat laporan'); }
    finally { setLoading(false); }
  }, [branch]);

  useEffect(() => { fetch(); }, [fetch]);

  const exportExcel = async () => {
    if (!data) return;
    setExp(true);
    try {
      const XLSX = await import('xlsx');
      const { rows, meta } = data;
      const branchName = branch === '1' ? 'GP Racing' : branch === '2' ? 'GP Distro' : 'Semua Cabang';

      const wsData = [
        [`LAPORAN HARIAN BY CHANNEL — ${branchName}`],
        [`Periode bulan`, meta.curr_month, '', '', `Tgl Laporan`, meta.report_date],
        [],
        ['NO', 'SALES CHANNEL', meta.prev_month, 'HARI INI', 'TOTAL MTD', 'FORECAST', 'RETUR HARI INI', 'RETUR TOTAL'],
      ];

      let no = 1;
      rows.forEach(row => {
        if (row.is_grand_total || row.is_subtotal) {
          wsData.push(['', row.label,
            row.prev||0, row.today||0, row.mtd||0, row.forecast||0,
            row.ret_today||0, row.ret_total||0]);
        } else {
          wsData.push([no++, row.sub_channel,
            row.prev||0, row.today||0, row.mtd||0, row.forecast||0,
            row.ret_today||0, row.ret_total||0]);
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch:4 },{ wch:22 },{ wch:14 },{ wch:13 },{ wch:14 },{ wch:14 },{ wch:15 },{ wch:14 }];
      ws['!merges'] = [
        { s:{r:0,c:0}, e:{r:0,c:7} },
        { s:{r:1,c:1}, e:{r:1,c:4} },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan Channel');
      XLSX.writeFile(wb, `laporan_channel_${meta.curr_month.toLowerCase()}_${meta.today}.xlsx`);
      toast.success('Excel didownload!');
    } catch (e) { toast.error('Gagal export'); }
    finally { setExp(false); }
  };

  const meta = data?.meta;
  const rows = data?.rows || [];
  const grandRow = rows.find(r => r.is_grand_total);

  return (
    <div className="section animate-fade-in">
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>ERP</span><span>›</span><span>Keuangan</span><span>›</span>
        <span className="font-semibold text-[var(--text-primary)]">Laporan By Channel</span>
      </nav>

      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan Harian By Channel</h1>
          <p className="body-sm text-[var(--text-muted)]">
            {meta ? `${meta.curr_month} — per ${meta.report_date} (hari ke-${meta.days_passed} dari ${meta.days_in_month})` : 'Memuat...'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} disabled={loading} className="btn-icon">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportExcel} disabled={!data||exporting} className="btn-secondary gap-2">
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Export Excel
          </button>
        </div>
      </div>

      {/* Filter cabang */}
      <div className="card-sm mb-5 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-[var(--text-secondary)]">Cabang:</span>
        {[{v:'',l:'Semua Cabang'},{v:'1',l:'GP Racing'},{v:'2',l:'GP Distro'}].map(b => (
          <button key={b.v} onClick={() => setBranch(b.v)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${branch===b.v ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)]' : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
            {b.l}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      {grandRow && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { l: meta?.prev_month || 'Bulan Lalu',  v: grandRow.prev,      color:'text-[var(--text-secondary)]' },
            { l: 'Hari Ini',                          v: grandRow.today,     color:'text-[var(--brand-600)]' },
            { l: 'Total MTD',                         v: grandRow.mtd,       color:'text-emerald-600 dark:text-emerald-400' },
            { l: 'Forecast EOM',                      v: grandRow.forecast,  color:'text-blue-600 dark:text-blue-400' },
          ].map(s => (
            <div key={s.l} className="card p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{s.l}</p>
              <p className={`text-lg font-bold ${s.color}`}>
                {s.v ? `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(s.v))}` : '-'}
              </p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_,i) => <div key={i} className="skeleton h-12" />)}</div>
      ) : !data || rows.length === 0 ? (
        <div className="card text-center py-14">
          <BarChart3 size={36} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada data penjualan bulan ini</p>
        </div>
      ) : (
        <div className="table-wrapper">
          {/* Report header info */}
          <div className="px-5 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-[var(--text-muted)]">Periode bulan:</span>
              <span className="font-bold text-[var(--text-primary)]">{meta?.curr_month}</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-[var(--text-muted)]">Tgl Laporan:</span>
              <span className="font-bold text-[var(--text-primary)]">{meta?.report_date}</span>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm border-collapse" style={{ minWidth: '800px' }}>
              <thead>
                {/* Row 1: group headers */}
                <tr className="bg-[#1a1a2e] text-white">
                  <th className="border border-[#333] px-3 py-3 text-center w-10" rowSpan={2}>NO</th>
                  <th className="border border-[#333] px-4 py-3 text-left min-w-44" rowSpan={2}>SALES CHANNEL</th>
                  <th className="border border-[#333] px-3 py-3 text-center w-32" rowSpan={2}>{meta?.prev_month}</th>
                  <th className="border border-[#333] px-3 py-3 text-center" colSpan={3}>{meta?.curr_month}</th>
                  <th className="border border-[#333] px-3 py-3 text-center" colSpan={2}>RETUR</th>
                </tr>
                <tr className="bg-[#1a1a2e] text-white">
                  <th className="border border-[#333] px-3 py-2.5 text-center w-28 text-xs">HARI INI</th>
                  <th className="border border-[#333] px-3 py-2.5 text-center w-32 text-xs">TOTAL MTD</th>
                  <th className="border border-[#333] px-3 py-2.5 text-center w-32 text-xs">FORECAST</th>
                  <th className="border border-[#333] px-3 py-2.5 text-center w-24 text-xs">Hari ini</th>
                  <th className="border border-[#333] px-3 py-2.5 text-center w-28 text-xs">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  if (row.is_grand_total) {
                    return (
                      <tr key="grand" className="bg-[#1a1a2e] text-white font-bold">
                        <td className="border border-[#333] px-3 py-3 text-center"></td>
                        <td className="border border-[#333] px-4 py-3">GRAND TOTAL</td>
                        <td className="border border-[#333] px-3 py-3 text-right">{fmt(row.prev)}</td>
                        <td className="border border-[#333] px-3 py-3 text-right">{fmt(row.today)}</td>
                        <td className="border border-[#333] px-3 py-3 text-right">{fmt(row.mtd)}</td>
                        <td className="border border-[#333] px-3 py-3 text-right">{fmt(row.forecast)}</td>
                        <td className="border border-[#333] px-3 py-3 text-right">{row.ret_today > 0 ? fmt(row.ret_today) : '-'}</td>
                        <td className="border border-[#333] px-3 py-3 text-right">{row.ret_total > 0 ? fmt(row.ret_total) : '-'}</td>
                      </tr>
                    );
                  }

                  if (row.is_subtotal) {
                    return (
                      <tr key={`sub-${row.channel}`} className="bg-[#1565C0] text-white font-bold">
                        <td className="border border-[#1976D2] px-3 py-3 text-center"></td>
                        <td className="border border-[#1976D2] px-4 py-3">{row.label}</td>
                        <td className="border border-[#1976D2] px-3 py-3 text-right">{fmt(row.prev)}</td>
                        <td className="border border-[#1976D2] px-3 py-3 text-right font-black">{fmt(row.today)}</td>
                        <td className="border border-[#1976D2] px-3 py-3 text-right font-black">{fmt(row.mtd)}</td>
                        <td className="border border-[#1976D2] px-3 py-3 text-right">{fmt(row.forecast)}</td>
                        <td className="border border-[#1976D2] px-3 py-3 text-right">{row.ret_today > 0 ? fmt(row.ret_today) : '-'}</td>
                        <td className="border border-[#1976D2] px-3 py-3 text-right">{row.ret_total > 0 ? fmt(row.ret_total) : '-'}</td>
                      </tr>
                    );
                  }

                  const isEven = idx % 2 === 0;
                  return (
                    <tr key={idx} className={`border-b border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors ${isEven ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-secondary)]/40'}`}>
                      <td className="border border-[var(--border)] px-3 py-3 text-center text-[var(--text-muted)]">{row.no}</td>
                      <td className="border border-[var(--border)] px-4 py-3 font-semibold text-[var(--text-primary)]">{row.sub_channel}</td>
                      <td className="border border-[var(--border)] px-3 py-3 text-right text-[var(--text-secondary)]">{fmt(row.prev)}</td>
                      <td className="border border-[var(--border)] px-3 py-3 text-right font-semibold text-[var(--text-primary)]">
                        {row.today > 0 ? <span className="text-[var(--brand-600)] font-bold">{fmt(row.today)}</span> : <span className="text-[var(--text-muted)]">-</span>}
                      </td>
                      <td className="border border-[var(--border)] px-3 py-3 text-right font-semibold text-[var(--text-primary)]">
                        {row.mtd > 0 ? fmt(row.mtd) : <span className="text-[var(--text-muted)]">-</span>}
                      </td>
                      <td className="border border-[var(--border)] px-3 py-3 text-right text-blue-600 dark:text-blue-400">
                        {row.forecast > 0 ? fmt(row.forecast) : <span className="text-[var(--text-muted)]">-</span>}
                      </td>
                      <td className="border border-[var(--border)] px-3 py-3 text-right text-red-600 dark:text-red-400">
                        {row.ret_today > 0 ? fmt(row.ret_today) : <span className="text-[var(--text-muted)]">-</span>}
                      </td>
                      <td className="border border-[var(--border)] px-3 py-3 text-right text-red-600 dark:text-red-400">
                        {row.ret_total > 0 ? fmt(row.ret_total) : <span className="text-[var(--text-muted)]">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between text-xs text-[var(--text-muted)] flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span>* Angka dalam Rupiah (Rp)</span>
              <span>* FORECAST = MTD ÷ hari berjalan × total hari bulan</span>
            </div>
            <span>Data per: {meta?.report_date}</span>
          </div>
        </div>
      )}
    </div>
  );
}
