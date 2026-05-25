import { useState, useEffect, useCallback } from 'react';
import {
  Truck, RefreshCw, Copy, Check, CheckCircle2,
  Download, MessageCircle, Calendar, Search, X,
  Package, ChevronRight, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable, { StatusBadge } from '../../components/DataTable';
import { erpService, toRpShort } from '../../utils/erp/erpService';

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoad]        = useState(true);
  const [copied, setCopied]       = useState(false);
  const [tab, setTab]             = useState('report'); // 'report' | 'all'

  const today = new Date().toISOString().split('T')[0];
  const [dateRange, setDate] = useState({ from: today, to: today });

  const fetch = useCallback(async () => {
    setLoad(true);
    try {
      const res = await erpService.getShipmentReport({
        date_from: dateRange.from,
        date_to:   dateRange.to,
      });
      setShipments(res.data.data.shipments || res.data.data.orders || []);
    } catch { toast.error('Gagal memuat data pengiriman'); }
    finally { setLoad(false); }
  }, [dateRange]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── Format laporan untuk copy ke WA ──────────────────────
  const generateReport = () => {
    const from = new Date(dateRange.from).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
    const to   = new Date(dateRange.to).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
    const title = from === to
      ? `Info Resi Pengiriman BRT ${from}`
      : `Info Resi Pengiriman BRT ${from} - ${to}`;

    const shipped = shipments.filter(s => s.shipment?.tracking_no || s.tracking_no);

    if (!shipped.length) return null;

    const lines = shipped.map((s, idx) => {
      const name     = s.customer_name || s.recipient_name || '—';
      const resi     = s.shipment?.tracking_no || s.tracking_no || '—';
      const courier  = s.shipment?.courier || s.courier || '';
      return `${idx + 1}.${name} : ${courier}${resi}`;
    });

    return `${title}\n${lines.join('\n')}`;
  };

  const handleCopy = () => {
    const text = generateReport();
    if (!text) { toast.error('Tidak ada data resi untuk disalin'); return; }
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success(`${shipments.filter(s=>s.shipment?.tracking_no||s.tracking_no).length} resi disalin ke clipboard!`);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => toast.error('Gagal menyalin'));
  };

  const shippedCount  = shipments.filter(s => s.shipment?.tracking_no || s.tracking_no).length;
  const pendingCount  = shipments.filter(s => !(s.shipment?.tracking_no || s.tracking_no)).length;

  const columns = [
    { key:'_no', label:'No', width:'48px', render:(_,row,idx)=><span className="text-[var(--text-muted)] font-mono text-xs">{idx+1}</span> },
    { key:'customer_name', label:'Nama Customer', render:(v,row)=>(
      <div>
        <p className="font-semibold text-sm">{v || row.recipient_name || '—'}</p>
        <p className="text-[11px] text-[var(--text-muted)]">{row.order_no || ''}</p>
      </div>
    )},
    { key:'order_date', label:'Tanggal', nowrap:true, render:v=><span className="text-[var(--text-secondary)]">{v}</span> },
    { key:'shipment', label:'Ekspedisi', nowrap:true, render:(v,row)=>{
      const courier = v?.courier || row.courier;
      return courier
        ? <span className="px-2 py-0.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-bold">{courier}</span>
        : <span className="text-[var(--text-muted)]">—</span>;
    }},
    { key:'shipment', label:'Nomor Resi', nowrap:true, render:(v,row)=>{
      const resi = v?.tracking_no || row.tracking_no;
      return resi ? (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-[var(--brand-600)]">{resi}</span>
          <button onClick={()=>{navigator.clipboard.writeText(resi);toast.success('Resi disalin!');}}
            className="btn-icon-sm"><Copy size={12}/></button>
        </div>
      ) : <span className="text-[11px] text-amber-600 font-semibold">Belum ada resi</span>;
    }},
    { key:'shipment', label:'Status', nowrap:true, render:(v,row)=>{
      const status = v?.status || row.shipment_status;
      const colors = {
        delivered: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200',
        shipped:   'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200',
        pending:   'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200',
      };
      const labels = { delivered:'Terkirim', shipped:'Dalam Pengiriman', pending:'Menunggu' };
      const s = status || 'pending';
      return <StatusBadge label={labels[s]||s} color={colors[s]||colors.pending}/>;
    }},
  ];

  // Render numbered list for preview
  const reportText = generateReport();
  const reportLines = reportText ? reportText.split('\n') : [];

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengiriman</h1>
          <p className="body-sm text-[var(--text-muted)]">Laporan resi & status pengiriman</p>
        </div>
        <button onClick={fetch} disabled={loading} className="btn-icon">
          <RefreshCw size={16} className={loading?'animate-spin':''}/>
        </button>
      </div>

      {/* Date filter */}
      <div className="card-sm mb-5 flex items-center gap-3 flex-wrap">
        <Calendar size={15} className="text-[var(--text-muted)] flex-shrink-0"/>
        <input type="date" value={dateRange.from}
          onChange={e=>setDate(r=>({...r,from:e.target.value}))}
          className="input-base h-9 text-sm flex-1 min-w-32"/>
        <span className="text-xs text-[var(--text-muted)]">s/d</span>
        <input type="date" value={dateRange.to}
          onChange={e=>setDate(r=>({...r,to:e.target.value}))}
          className="input-base h-9 text-sm flex-1 min-w-32"/>
        <div className="flex gap-2 ml-auto">
          {/* Quick filters */}
          {[
            { l:'Hari Ini', f:()=>setDate({from:today,to:today}) },
            { l:'7 Hari',   f:()=>{ const d=new Date(); d.setDate(d.getDate()-6); setDate({from:d.toISOString().split('T')[0],to:today}); }},
          ].map(q=>(
            <button key={q.l} onClick={q.f}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all">
              {q.l}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {l:'Total Order',        v:shipments.length,  color:'text-[var(--text-primary)]'},
          {l:'Sudah Ada Resi',     v:shippedCount,      color:'text-emerald-600'},
          {l:'Belum Ada Resi',     v:pendingCount,      color:'text-amber-600'},
        ].map(s=>(
          <div key={s.l} className="card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{s.l}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] mb-5 max-w-xs">
        {[{k:'report',l:'Laporan WA'},{k:'all',l:'Semua Data'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab===t.k?'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]':'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── Tab: Laporan WA ─────────────────────────────── */}
      {tab === 'report' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Preview */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle size={15} className="text-emerald-600"/>
                <h3 className="text-sm font-bold">Preview Laporan WA</h3>
              </div>
              <span className="text-xs text-[var(--text-muted)]">{shippedCount} resi</span>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-4 rounded"/>)}</div>
              ) : !reportText ? (
                <div className="text-center py-8">
                  <Truck size={32} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30"/>
                  <p className="text-sm text-[var(--text-muted)]">Tidak ada resi pada periode ini</p>
                </div>
              ) : (
                <div className="bg-[var(--bg-secondary)] rounded-xl p-4 font-mono text-[12px] space-y-0.5 max-h-80 overflow-y-auto scrollbar-thin">
                  {reportLines.map((line, i) => (
                    <div key={i} className={`${i===0?'font-bold text-[var(--text-primary)] mb-2':'text-[var(--text-secondary)]'}`}>
                      {i===0 ? (
                        <span className="text-[var(--brand-600)]">{line}</span>
                      ) : line}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {reportText && (
              <div className="px-5 pb-5">
                <button onClick={handleCopy}
                  className={`w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}>
                  {copied ? <><CheckCircle2 size={16}/> Disalin!</> : <><Copy size={16}/> Copy untuk WA</>}
                </button>
                <p className="text-[10px] text-[var(--text-muted)] text-center mt-2">
                  Paste langsung ke grup WhatsApp
                </p>
              </div>
            )}
          </div>

          {/* Detail resi list */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold">Detail Resi</h3>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] max-h-[480px] overflow-y-auto scrollbar-thin">
              {loading ? (
                [...Array(5)].map((_,i)=><div key={i} className="px-5 py-4"><div className="skeleton h-10 rounded"/></div>)
              ) : shipments.filter(s=>s.shipment?.tracking_no||s.tracking_no).length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <Package size={28} className="mx-auto mb-2 opacity-30"/>
                  <p className="text-sm">Tidak ada resi pada periode ini</p>
                </div>
              ) : (
                shipments.filter(s=>s.shipment?.tracking_no||s.tracking_no).map((s,idx)=>{
                  const resi    = s.shipment?.tracking_no || s.tracking_no;
                  const courier = s.shipment?.courier || s.courier || '';
                  const name    = s.customer_name || s.recipient_name || '—';
                  return (
                    <div key={s.id||idx} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors">
                      <span className="text-[11px] font-bold text-[var(--text-muted)] w-6 flex-shrink-0">{idx+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate">{name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {courier && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">{courier}</span>}
                          <span className="font-mono text-[11px] text-[var(--brand-600)] font-bold">{resi}</span>
                        </div>
                      </div>
                      <button onClick={()=>{navigator.clipboard.writeText(resi);toast.success('Resi disalin!');}}
                        className="btn-icon-sm flex-shrink-0"><Copy size={12}/></button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Semua Data ──────────────────────────────── */}
      {tab === 'all' && (
        <DataTable
          columns={columns.map((col, idx) => ({
            ...col,
            render: col.render
              ? (v, row) => col.render(v, row, shipments.indexOf(row))
              : undefined,
          }))}
          data={shipments}
          loading={loading}
          searchKeys={['customer_name','order_no']}
          searchPlaceholder="Cari nama customer, no. order..."
          emptyIcon={<Truck size={40}/>}
          emptyText="Tidak ada data pengiriman"
          pageSize={25}
          zebra
        />
      )}
    </div>
  );
}
