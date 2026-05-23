import { useState, useEffect, useCallback } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import PeriodFilter from '../../components/PeriodFilter';
import { erpService, toRp, toRpShort, CHANNELS } from '../../utils/erp/erpService';

export default function SalesReportPage() {
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
      const res = await erpService.getSalesReport({branch_id:branch||undefined,date_from:dateRange.from,date_to:dateRange.to});
      setData(res.data.data);
    } catch { toast.error('Gagal memuat laporan'); } finally { setLoad(false); }
  },[branch,dateRange]);

  useEffect(()=>{fetch();},[fetch]);

  const summary=data?.summary; const orders=data?.orders||[];

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Laporan Sales</h1><p className="body-sm text-[var(--text-muted)]">Ringkasan penjualan per periode</p></div>
        <button onClick={fetch} disabled={loading} className="btn-icon"><RefreshCw size={16} className={loading?'animate-spin':''}/></button>
      </div>
      <div className="card-sm mb-5 space-y-3">
        <PeriodFilter value={dateRange} onChange={setDate}/>
        <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm">
          <option value="">Semua Cabang</option><option value="1">GP Racing</option><option value="2">GP Distro</option>
        </select>
      </div>
      {loading ? <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="skeleton h-24"/>)}</div> : summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              {l:'Total Order',v:summary.total_orders,fmt:false,color:'text-[var(--brand-600)]'},
              {l:'Total Omzet',v:summary.total_revenue,fmt:true,color:'text-emerald-600'},
              {l:'Total Profit',v:summary.total_profit,fmt:true,color:'text-blue-600'},
              {l:'Margin',v:summary.total_revenue>0?((summary.total_profit/summary.total_revenue)*100).toFixed(1)+'%':'0%',fmt:false,color:'text-purple-600'},
            ].map(s=>(
              <div key={s.l} className="card p-5">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">{s.l}</p>
                <p className={`text-xl font-black ${s.color}`}>{s.fmt?toRpShort(s.v):s.v}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {Object.entries(summary.by_channel||{}).map(([ch,d])=>{
              const info=CHANNELS[ch]||CHANNELS.direct;
              return (
                <div key={ch} className="card p-5 border-l-4 border-[var(--brand-600)]">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${info.bg} ${info.color}`}>{info.label}</span>
                  <p className="text-lg font-black mt-2">{toRpShort(d.revenue)}</p>
                  <p className="text-xs text-[var(--text-muted)]">{d.orders} order</p>
                </div>
              );
            })}
          </div>
          <div className="table-wrapper">
            <div className="px-5 py-3 border-b border-[var(--border)] font-bold text-sm">Detail Order ({orders.length})</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                  <tr>{['Tanggal','Channel','Subtotal','Diskon','Ongkir','Total'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {orders.map((o,i)=>(
                    <tr key={i} className="hover:bg-[var(--bg-secondary)]">
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{o.order_date}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CHANNELS[o.channel]?.bg} ${CHANNELS[o.channel]?.color}`}>{CHANNELS[o.channel]?.label||o.channel}</span></td>
                      <td className="px-4 py-3 text-right">{toRpShort(o.subtotal)}</td>
                      <td className="px-4 py-3 text-right text-red-500">{parseFloat(o.discount_amount)>0?'-'+toRpShort(o.discount_amount):'—'}</td>
                      <td className="px-4 py-3 text-right">{parseFloat(o.shipping_cost)>0?toRpShort(o.shipping_cost):'—'}</td>
                      <td className="px-4 py-3 text-right font-bold">{toRpShort(o.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
