import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Plus, Eye, CheckCircle2, XCircle, X, Loader2, RefreshCw, Search, PackageSearch } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable, { StatusBadge } from '../../components/DataTable';
import { erpService, toRp, toRpShort, ORDER_STATUS } from '../../utils/erp/erpService';

const RETURN_STATUS = {
  pending:   { label:'Menunggu',     color:'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  confirmed: { label:'Dikonfirmasi', color:'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  rejected:  { label:'Ditolak',      color:'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
};
const RETURN_REASONS = { barang_rusak:'Barang Rusak', salah_produk:'Salah Produk', tidak_sesuai:'Tidak Sesuai', cod_ditolak:'COD Ditolak', lainnya:'Lainnya' };
const RESOLUTIONS = {
  refund:   { label:'Refund',         color:'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
  exchange: { label:'Tukar Produk',   color:'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' },
  none:     { label:'Tanpa Resolusi', color:'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
};

const CreateModal = ({ onClose, onSuccess }) => {
  const [step,       setStep]    = useState(1);
  const [query,      setQuery]   = useState('');
  const [allOrders,  setAll]     = useState([]);
  const [loadingAll, setLoadAll] = useState(true);
  const [order,      setOrder]   = useState(null);
  const [loadDetail, setLoadDet] = useState(false);
  const [selItems,   setSel]     = useState({});
  const [reason,     setReason]  = useState('cod_ditolak');
  const [resolution, setRes]     = useState('refund');
  const [restock,    setRest]    = useState(true);
  const [notes,      setNotes]   = useState('');
  const [saving,     setSaving]  = useState(false);
  const [page,       setPage]    = useState(1);
  const PAGE = 8;

  // Load all eligible orders on mount
  useEffect(() => {
    erpService.getOrders({ limit: 500 })
      .then(r => {
        const orders = (r.data.data.orders || [])
          .filter(o => ['confirmed','processing','shipped','completed'].includes(o.status));
        setAll(orders);
      })
      .catch(() => toast.error('Gagal memuat daftar order'))
      .finally(() => setLoadAll(false));
  }, []);

  // Fuzzy filter
  const q = query.toLowerCase().trim();
  const filtered = q
    ? allOrders.filter(o =>
        (o.order_no||'').toLowerCase().includes(q) ||
        (o.customer_name||'').toLowerCase().includes(q) ||
        (o.customer_phone||'').includes(q)
      )
    : allOrders;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const paged = filtered.slice((page-1)*PAGE, page*PAGE);

  const selectOrder = async (o) => {
    setLoadDet(true);
    try {
      const detail = await erpService.getOrder(o.id);
      const od = detail.data.data.order;
      setOrder(od);
      const init = {}; (od.items||[]).forEach(i => { init[i.id] = i.qty; }); setSel(init);
      setStep(2);
    } catch { toast.error('Gagal memuat detail order'); }
    finally { setLoadDet(false); }
  };

  // Keep old searchOrder for compatibility
  const searchOrder = () => {};

  const totalReturn = (order?.items||[]).reduce((s,i)=>{const qty=selItems[i.id]||0;return s+(parseFloat(i.sell_price)*qty);},0);

  const handle = async () => {
    const items = Object.entries(selItems).filter(([_,qty])=>parseInt(qty)>0).map(([id,qty])=>({order_item_id:parseInt(id),qty_return:parseInt(qty)}));
    if (!items.length) { toast.error('Pilih minimal 1 item'); return; }
    setSaving(true);
    try { await erpService.createReturn({order_id:order.id,reason,resolution,restock,notes,items}); toast.success('Retur dibuat'); onSuccess(); onClose(); }
    catch(e){ toast.error(e.response?.data?.message||'Gagal'); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-backdrop"/>
      <div className="modal-box max-w-2xl" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3 className="text-sm font-bold">Buat Retur</h3><button onClick={onClose} className="btn-icon-sm"><X size={14}/></button></div>
        <div className="modal-body">
          {step===1 ? (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
                <input
                  value={query}
                  onChange={e => { setQuery(e.target.value); setPage(1); }}
                  placeholder="Cari no. order, nama pelanggan, no. HP..."
                  className="input-base pl-9 text-sm"
                  autoFocus
                />
              </div>

              {/* Order list */}
              <div className="text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                <span>{filtered.length} order tersedia untuk retur</span>
                {q && <span>Filter: "<b>{query}</b>"</span>}
              </div>

              {loadingAll ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-[var(--brand-500)]"/>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  <PackageSearch size={32} className="mx-auto mb-2 opacity-30"/>
                  <p className="text-sm">Tidak ada order ditemukan</p>
                </div>
              ) : (
                <>
                  <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                          <th className="px-3 py-2 text-left font-bold text-[var(--text-muted)] uppercase tracking-wide">No. Order</th>
                          <th className="px-3 py-2 text-left font-bold text-[var(--text-muted)] uppercase tracking-wide">Pelanggan</th>
                          <th className="px-3 py-2 text-left font-bold text-[var(--text-muted)] uppercase tracking-wide">Tgl</th>
                          <th className="px-3 py-2 text-right font-bold text-[var(--text-muted)] uppercase tracking-wide">Total</th>
                          <th className="px-3 py-2 text-center font-bold text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {paged.map(o => (
                          <tr key={o.id}
                            className="hover:bg-[var(--brand-600)]/5 cursor-pointer transition-colors"
                            onClick={() => !loadDetail && selectOrder(o)}>
                            <td className="px-3 py-2.5 font-mono font-semibold text-[var(--brand-600)]">
                              {o.order_no}
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="font-semibold text-[var(--text-primary)] truncate max-w-[120px]">{o.customer_name||'—'}</p>
                              {o.customer_phone && <p className="text-[10px] text-[var(--text-muted)]">{o.customer_phone}</p>}
                            </td>
                            <td className="px-3 py-2.5 text-[var(--text-muted)] whitespace-nowrap">{o.order_date}</td>
                            <td className="px-3 py-2.5 text-right font-semibold">{toRp(o.total_amount)}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                o.status==='completed' ? 'bg-emerald-100 text-emerald-700' :
                                o.status==='shipped'   ? 'bg-purple-100 text-purple-700' :
                                o.status==='processing'? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {ORDER_STATUS[o.status]?.label || o.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {loadDetail
                                ? <Loader2 size={13} className="animate-spin text-[var(--brand-500)] mx-auto"/>
                                : <button className="text-[10px] text-[var(--brand-600)] font-semibold hover:underline px-2 py-1 rounded-lg hover:bg-[var(--brand-600)]/10">
                                    Pilih →
                                  </button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>{(page-1)*PAGE+1}–{Math.min(page*PAGE, filtered.length)} dari {filtered.length}</span>
                      <div className="flex gap-1">
                        <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                          className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-secondary)] disabled:opacity-40">
                          ‹
                        </button>
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                          const p = totalPages <= 5 ? i+1 : Math.max(1, Math.min(page-2, totalPages-4))+i;
                          return (
                            <button key={p} onClick={() => setPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors
                                ${p===page ? 'bg-[var(--brand-600)] text-white' : 'border border-[var(--border)] hover:bg-[var(--bg-secondary)]'}`}>
                              {p}
                            </button>
                          );
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                          className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-secondary)] disabled:opacity-40">
                          ›
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <p className="text-sm font-bold">{order.order_no}</p>
                <p className="text-xs text-[var(--text-muted)]">{order.customer_name} · {order.channel}</p>
              </div>
              <div><label className="field-label">Item Retur</label>
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {(order.items||[]).map(item=>(
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                      <input type="checkbox" checked={(selItems[item.id]||0)>0} onChange={e=>setSel(p=>({...p,[item.id]:e.target.checked?item.qty:0}))} className="rounded"/>
                      <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{item.product_name}</p><p className="text-[10px] text-[var(--text-muted)]">{toRp(item.sell_price)} × {item.qty}</p></div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[var(--text-muted)]">Qty:</span>
                        <input type="number" min={0} max={item.qty} value={selItems[item.id]||0} onChange={e=>setSel(p=>({...p,[item.id]:Math.min(item.qty,Math.max(0,parseInt(e.target.value)||0))}))} className="input-base w-16 h-8 text-xs text-center"/>
                        <span className="text-xs text-[var(--text-muted)]">/{item.qty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div><label className="field-label">Alasan</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(RETURN_REASONS).map(([k,l])=>(
                    <button key={k} onClick={()=>setReason(k)} className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left transition-all ${reason===k?'bg-[var(--brand-600)] text-white border-[var(--brand-600)]':'border-[var(--border)] text-[var(--text-secondary)]'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div><label className="field-label">Resolusi</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(RESOLUTIONS).map(([k,v])=>(
                    <button key={k} onClick={()=>setRes(k)} className={`py-2 rounded-xl text-xs font-semibold border transition-all ${resolution===k?'bg-[var(--brand-600)] text-white border-[var(--brand-600)]':'border-[var(--border)] text-[var(--text-secondary)]'}`}>{v.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <input type="checkbox" id="restock" checked={restock} onChange={e=>setRest(e.target.checked)} className="rounded w-4 h-4"/>
                <div><label htmlFor="restock" className="text-sm font-semibold cursor-pointer">Kembalikan Stok</label><p className="text-xs text-[var(--text-muted)]">Centang jika barang bisa dijual kembali</p></div>
              </div>
              <div><label className="field-label">Catatan</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} className="input-base resize-none text-sm"/></div>
              <div className="flex justify-between p-3 rounded-xl bg-[var(--brand-50)] dark:bg-[var(--brand-100)] border border-[var(--brand-600)]/20">
                <span className="text-sm font-semibold">Total Retur</span>
                <span className="text-lg font-bold text-[var(--brand-600)]">{toRp(totalReturn)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {step===2 && <button onClick={()=>setStep(1)} className="btn-ghost">← Kembali</button>}
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          {step===2 && <button onClick={handle} disabled={saving} className="btn-primary flex-1">{saving?<Loader2 size={15} className="animate-spin"/>:<RotateCcw size={15}/>} Buat Retur</button>}
        </div>
      </div>
    </div>
  );
};

const DetailModal = ({ returnId, onClose, onSuccess }) => {
  const [ret, setRet]   = useState(null);
  const [acting, setAct]= useState(false);
  useEffect(()=>{ erpService.getReturn(returnId).then(r=>setRet(r.data.data.return)).catch(()=>toast.error('Gagal')); },[returnId]);
  const confirm = async()=>{ setAct(true); try{ await erpService.confirmReturn(returnId); toast.success('Dikonfirmasi'); onSuccess(); onClose(); }catch(e){toast.error(e.response?.data?.message||'Gagal');}finally{setAct(false);} };
  const reject  = async()=>{ if(!window.confirm('Tolak retur?')) return; setAct(true); try{ await erpService.rejectReturn(returnId,{}); toast.success('Ditolak'); onSuccess(); onClose(); }catch(e){toast.error('Gagal');}finally{setAct(false);} };
  if (!ret) return <div className="modal-overlay"><div className="modal-backdrop"/><div className="modal-box max-w-md items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--text-muted)] mx-auto"/></div></div>;
  const st=RETURN_STATUS[ret.status]; const res=RESOLUTIONS[ret.resolution];
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-backdrop"/>
      <div className="modal-box max-w-md" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div><h3 className="text-sm font-bold">{ret.return_no}</h3><p className="text-xs text-[var(--text-muted)]">{ret.order?.order_no} · {ret.order?.customer_name}</p></div>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body">
          <div className="flex gap-2 flex-wrap">
            <StatusBadge label={st.label} color={st.color}/>
            <StatusBadge label={RETURN_REASONS[ret.reason]} color="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border)]"/>
            <StatusBadge label={res.label} color={res.color}/>
            {ret.restock && <StatusBadge label="Stok Kembali" color="bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border-emerald-200"/>}
          </div>
          <div><p className="field-label mb-2">Item Retur</p>
            <div className="space-y-2">
              {(ret.items||[]).map(item=>(
                <div key={item.id} className="flex justify-between p-3 rounded-xl bg-[var(--bg-secondary)]">
                  <div><p className="text-xs font-semibold">{item.product_name}</p><p className="text-[10px] text-[var(--text-muted)]">{toRp(item.sell_price)} × {item.qty_return}</p></div>
                  <span className="text-sm font-bold text-[var(--brand-600)]">{toRpShort(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between font-bold p-3 rounded-xl bg-[var(--bg-tertiary)]">
            <span>Total Retur</span><span className="text-[var(--brand-600)]">{toRp(ret.total_return)}</span>
          </div>
          {ret.notes && <div className="p-3 rounded-xl bg-[var(--bg-secondary)]"><p className="text-xs text-[var(--text-muted)] mb-0.5">Catatan:</p><p className="text-sm">{ret.notes}</p></div>}
        </div>
        {ret.status==='pending' && (
          <div className="modal-footer">
            <button onClick={reject} disabled={acting} className="btn-danger flex-1"><XCircle size={15}/> Tolak</button>
            <button onClick={confirm} disabled={acting} className="btn-primary flex-1">{acting?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>} Konfirmasi</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setCreate]= useState(false);
  const [detailId, setDetail]  = useState(null);
  const [statusFilter, setSF]  = useState('');

  const fetch = useCallback(async()=>{
    setLoading(true);
    try{ const res=await erpService.getReturns({status:statusFilter||undefined,limit:100}); setReturns(res.data.data.returns||[]); }
    catch{ toast.error('Gagal'); } finally{ setLoading(false); }
  },[statusFilter]);

  useEffect(()=>{fetch();},[fetch]);

  const pendingCount = returns.filter(r=>r.status==='pending').length;

  const columns = [
    { key:'return_no', label:'No. Retur', sortable:true, nowrap:true, render:v=><span className="font-mono text-xs font-semibold">{v}</span> },
    { key:'order', label:'No. Order', nowrap:true, render:v=><span className="font-mono text-xs text-[var(--text-secondary)]">{v?.order_no||'—'}</span> },
    { key:'order', label:'Pelanggan', render:v=><span className="font-medium">{v?.customer_name||'—'}</span> },
    { key:'reason', label:'Alasan', nowrap:true, exportValue:row=>RETURN_REASONS[row.reason]||row.reason, render:v=><span className="text-[var(--text-secondary)]">{RETURN_REASONS[v]||v}</span> },
    { key:'resolution', label:'Resolusi', nowrap:true, exportValue:row=>(RESOLUTIONS[row.resolution]||RESOLUTIONS.none).label, render:v=>{ const r=RESOLUTIONS[v]||RESOLUTIONS.none; return <StatusBadge label={r.label} color={`${r.color} border-transparent`}/>; } },
    { key:'restock', label:'Stok', align:'center', nowrap:true, exportValue:row=>row.restock?'Ya':'Tidak', render:v=>v?<span className="text-xs font-semibold text-emerald-600">✓</span>:<span className="text-xs text-[var(--text-muted)]">—</span> },
    { key:'status', label:'Status', nowrap:true, exportValue:row=>(RETURN_STATUS[row.status]||RETURN_STATUS.pending).label, render:v=>{ const s=RETURN_STATUS[v]||RETURN_STATUS.pending; return <StatusBadge label={s.label} color={s.color}/>; } },
    { key:'total_return', label:'Total', align:'right', sortable:true, nowrap:true, exportValue:row=>parseFloat(row.total_return||0), render:v=><span className="font-semibold text-[var(--brand-600)]">{toRpShort(v)}</span> },
  ];

  return (
    <div className="section animate-fade-in">
      <nav className="flex items-center gap-1.5 mb-5 text-xs text-[var(--text-muted)] select-none">
        <span>ERP</span><span>›</span><span>Penjualan</span><span>›</span>
        <span className="font-semibold text-[var(--text-primary)]">Retur</span>
      </nav>
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2">Retur Penjualan{pendingCount>0&&<span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">{pendingCount}</span>}</h1><p className="body-sm text-[var(--text-muted)]">{returns.length} total retur</p></div>
        <div className="flex gap-2"><button onClick={fetch} className="btn-icon"><RefreshCw size={16}/></button><button onClick={()=>setCreate(true)} className="btn-primary"><Plus size={16}/> Buat Retur</button></div>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{v:'',l:'Semua'},{v:'pending',l:`Menunggu${pendingCount>0?` (${pendingCount})`:''}`},{v:'confirmed',l:'Dikonfirmasi'},{v:'rejected',l:'Ditolak'}].map(f=>(
          <button key={f.v} onClick={()=>setSF(f.v)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${statusFilter===f.v?'bg-[var(--brand-600)] text-white border-[var(--brand-600)]':'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]'}`}>{f.l}</button>
        ))}
      </div>
      <DataTable columns={columns} data={returns} loading={loading}
        searchKeys={['return_no']} searchPlaceholder="Cari no. retur..."
        emptyIcon={<RotateCcw size={40}/>} emptyText="Belum ada retur"
        emptyAction={<button onClick={()=>setCreate(true)} className="btn-primary">Buat Retur Pertama</button>}
        actions={(row)=><button onClick={()=>setDetail(row.id)} className="btn-icon-sm"><Eye size={14}/></button>}
        exportable exportFilename="retur"
        pageSizeOptions={[10,25,50,100]}
        pageSize={25} zebra />
      {showCreate && <CreateModal onClose={()=>setCreate(false)} onSuccess={fetch}/>}
      {detailId   && <DetailModal returnId={detailId} onClose={()=>setDetail(null)} onSuccess={fetch}/>}
    </div>
  );
}
