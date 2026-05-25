import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import PeriodFilter from '../../components/PeriodFilter';
import { erpService, toRp, toRpShort } from '../../utils/erp/erpService';

export default function ProfitLossPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(false);
  const [branch, setBranch] = useState('');
  const [dateRange, setDate]= useState(()=>{
    const n=new Date();
    return {from:`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`,to:n.toISOString().split('T')[0]};
  });

  const fetch = useCallback(async()=>{
    setLoad(true);
    try {
      const res = await erpService.getProfitLoss({branch_id:branch||undefined,date_from:dateRange.from,date_to:dateRange.to});
      setData(res.data.data);
    } catch { toast.error('Gagal memuat laporan'); } finally { setLoad(false); }
  },[branch,dateRange]);

  useEffect(()=>{fetch();},[fetch]);

  const Row = ({label,value,sub,bold,color,separator}) => (
    <div className={`flex justify-between items-center py-3 ${separator?'border-t-2 border-[var(--border)] mt-2 pt-4':'border-b border-[var(--border-subtle)]'}`}>
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
      <div className="card-sm mb-5 space-y-3">
        <PeriodFilter value={dateRange} onChange={setDate}/>
        <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm">
          <option value="">Semua Cabang</option><option value="1">GP Racing</option><option value="2">GP Distro</option>
        </select>
      </div>
      {loading ? <div className="skeleton h-64"/> : !data ? (
        <div className="card text-center py-14"><TrendingUp size={36} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30"/><p className="text-sm text-[var(--text-muted)]">Pilih periode</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">📈 PENDAPATAN</p>
            <Row label="Omzet Penjualan" value={toRp(data.revenue||0)} color="text-emerald-600"/>
            <Row label="Retur Penjualan" value={`- ${toRp(data.returns||0)}`} color="text-red-500"/>
            <Row label="Pendapatan Bersih" value={toRp(data.net_revenue||0)} bold color="text-emerald-600"/>
            <p className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2 mt-5">📉 BIAYA</p>
            <Row label="HPP (Harga Pokok)" value={`- ${toRp(data.cogs||0)}`} color="text-red-500"/>
            <Row label="Biaya Pengiriman" value={`- ${toRp(data.shipping||0)}`} color="text-red-500"/>
            <Row label="Biaya Admin Marketplace" value={`- ${toRp(data.admin_fee||0)}`} color="text-red-500"/>
            <Row label="Pengeluaran Operasional" value={`- ${toRp(data.expenses||0)}`} color="text-red-500"/>
            <Row label="LABA BERSIH" value={toRp(data.net_profit||0)} bold separator color={parseFloat(data.net_profit||0)>=0?'text-emerald-600':'text-red-600'}/>
            <Row label="Margin" value={data.margin||'0%'} color="text-blue-600"/>
          </div>
          <div className="space-y-3">
            {[
              {l:'Total Omzet',v:data.revenue,color:'from-emerald-500 to-emerald-600'},
              {l:'Laba Bersih',v:data.net_profit,color:parseFloat(data.net_profit||0)>=0?'from-blue-500 to-blue-600':'from-red-500 to-red-600'},
              {l:'Total Pengeluaran',v:(data.cogs||0)+(data.shipping||0)+(data.admin_fee||0)+(data.expenses||0),color:'from-orange-500 to-orange-600'},
              {l:'Total Retur',v:data.returns,color:'from-slate-500 to-slate-600'},
            ].map(s=>(
              <div key={s.l} className={`card p-5 bg-gradient-to-r ${s.color} text-white`}>
                <p className="text-xs font-bold uppercase tracking-wider opacity-80">{s.l}</p>
                <p className="text-2xl font-black mt-1">{toRpShort(s.v||0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
