import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRp, toRpShort } from '../../utils/erp/erpService';

export default function ProfitLossPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(false);
  const [branch, setBranch] = useState('');
  const [dateRange, setDate]= useState(()=>{
    const n=new Date();
    return { from:`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`, to:n.toISOString().split('T')[0] };
  });

  const fetch = useCallback(async()=>{
    setLoad(true);
    try {
      const res = await erpService.getProfitLoss({ branch_id:branch||undefined, date_from:dateRange.from, date_to:dateRange.to });
      setData(res.data.data);
    } catch { toast.error('Gagal memuat laporan'); }
    finally { setLoad(false); }
  },[branch, dateRange]);

  useEffect(()=>{fetch();},[fetch]);

  const Row = ({label, value, sub, bold, color}) => (
    <div className={`flex justify-between items-center py-3 border-b border-[var(--border-subtle)] ${bold?'font-bold':''}`}>
      <div><p className={`text-sm ${bold?'font-bold text-[var(--text-primary)]':'text-[var(--text-secondary)]'}`}>{label}</p>{sub&&<p className="text-xs text-[var(--text-muted)]">{sub}</p>}</div>
      <p className={`text-sm font-semibold ${color||'text-[var(--text-primary)]'}`}>{value}</p>
    </div>
  );

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Laporan Laba Rugi</h1><p className="body-sm text-[var(--text-muted)]">Ringkasan keuangan per periode</p></div>
        <button onClick={fetch} disabled={loading} className="btn-icon"><RefreshCw size={16} className={loading?'animate-spin':''}/></button>
      </div>

      <div className="card-sm mb-5 flex items-center gap-3 flex-wrap">
        <input type="date" value={dateRange.from} onChange={e=>setDate(r=>({...r,from:e.target.value}))} className="input-base h-9 text-sm flex-1 min-w-28"/>
        <span className="text-xs text-[var(--text-muted)]">s/d</span>
        <input type="date" value={dateRange.to} onChange={e=>setDate(r=>({...r,to:e.target.value}))} className="input-base h-9 text-sm flex-1 min-w-28"/>
        <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm min-w-36">
          <option value="">Semua Cabang</option><option value="1">GP Racing</option><option value="2">GP Distro</option>
        </select>
      </div>

      {loading ? <div className="skeleton h-64"/> : data ? (
        <div className="max-w-2xl">
          <div className="card p-6 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">PENDAPATAN</p>
            <Row label="Omzet Penjualan" value={toRp(data.revenue||0)} color="text-emerald-600"/>
            <Row label="Retur Penjualan" value={`- ${toRp(data.returns||0)}`} color="text-red-500"/>
            <Row label="Pendapatan Bersih" value={toRp((data.revenue||0)-(data.returns||0))} bold color="text-emerald-600"/>

            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1 mt-4">BIAYA</p>
            <Row label="HPP (Harga Pokok Penjualan)" value={`- ${toRp(data.cogs||0)}`} color="text-red-500"/>
            <Row label="Biaya Pengiriman" value={`- ${toRp(data.shipping||0)}`} color="text-red-500"/>
            <Row label="Biaya Admin Marketplace" value={`- ${toRp(data.admin_fee||0)}`} color="text-red-500"/>
            <Row label="Pengeluaran Operasional" value={`- ${toRp(data.expenses||0)}`} color="text-red-500"/>

            <div className="border-t-2 border-[var(--border)] mt-4 pt-4">
              <Row label="LABA BERSIH" value={toRp(data.net_profit||0)} bold color={parseFloat(data.net_profit||0)>=0?'text-emerald-600':'text-red-600'}/>
              <Row label="Margin" value={data.margin||'0%'} color="text-blue-600"/>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-14">
          <TrendingUp size={36} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30"/>
          <p className="text-sm text-[var(--text-muted)]">Pilih periode untuk melihat laporan</p>
        </div>
      )}
    </div>
  );
}
