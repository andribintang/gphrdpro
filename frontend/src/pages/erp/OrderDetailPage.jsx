import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw, Loader2, Package, CheckCircle2, XCircle, Truck, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRp, toRpShort, ORDER_STATUS, CHANNELS } from '../../utils/erp/erpService';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder]   = useState(null);
  const [loading, setLoad]  = useState(true);
  const [acting, setAct]    = useState(false);

  const fetch = async () => {
    setLoad(true);
    try { const res = await erpService.getOrder(id); setOrder(res.data.data.order); }
    catch { toast.error('Gagal memuat order'); }
    finally { setLoad(false); }
  };

  useEffect(() => { fetch(); }, [id]);

  const action = async (fn, msg) => {
    setAct(true);
    try { await fn(); toast.success(msg); fetch(); }
    catch(e) { toast.error(e.response?.data?.message||'Gagal'); }
    finally { setAct(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin text-[var(--text-muted)]"/></div>;
  if (!order)  return <div className="text-center py-24"><p className="text-[var(--text-muted)]">Order tidak ditemukan</p></div>;

  const ch = CHANNELS[order.channel] || CHANNELS.direct;
  const st = ORDER_STATUS[order.status] || ORDER_STATUS.draft;

  return (
    <div className="section animate-fade-in">
      <button onClick={()=>navigate('/erp/orders')} className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4 transition-colors">
        <ChevronLeft size={16}/> Kembali ke Order
      </button>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono">{order.order_no}</h1>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ch.bg} ${ch.color}`}>{ch.label}</span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">{order.order_date}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="btn-icon"><RefreshCw size={15}/></button>
          {order.status==='draft' && <>
            <button onClick={()=>action(()=>erpService.confirmOrder(id),'Order dikonfirmasi')} disabled={acting} className="btn-primary gap-1.5"><CheckCircle2 size={15}/> Konfirmasi & Kurangi Stok</button>
            <button onClick={()=>action(()=>erpService.cancelOrder(id),'Order dibatalkan')} disabled={acting} className="btn-danger gap-1.5"><XCircle size={15}/> Batal</button>
          </>}
          {order.status==='confirmed'&&<button onClick={()=>action(()=>erpService.completeOrder(id),'Order selesai')} disabled={acting} className="btn-primary"><CheckCircle2 size={15}/> Selesai</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          {/* Products */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]"><h3 className="text-sm font-bold">Produk ({order.items?.length||0})</h3></div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {(order.items||[]).map(item=>(
                <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0"><Package size={15} className="text-[var(--text-muted)]"/></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold">{item.product_name}</p><p className="text-xs text-[var(--text-muted)]">{item.qty} × {toRp(item.sell_price)}</p></div>
                  <div className="text-right"><p className="text-sm font-bold">{toRpShort(item.subtotal)}</p>{parseFloat(item.profit)>0&&<p className="text-[10px] text-emerald-600">+{toRpShort(item.profit)}</p>}</div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--bg-secondary)] space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">Subtotal ({order.items?.length||0} produk)</span><span>{toRp(order.subtotal)}</span></div>
              {parseFloat(order.discount_amount)>0&&<div className="flex justify-between text-sm text-red-600"><span>Diskon</span><span>-{toRp(order.discount_amount)}</span></div>}
              {parseFloat(order.shipping_cost)>0&&<div className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">Ongkir</span><span>{toRp(order.shipping_cost)}</span></div>}
              {parseFloat(order.admin_fee)>0&&<div className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">Biaya Admin</span><span>{toRp(order.admin_fee)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-[var(--border)]"><span>Total</span><span className="text-[var(--brand-600)]">{toRp(order.total_amount)}</span></div>
            </div>
          </div>

          {/* Shipment */}
          {order.shipment && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)]"><h3 className="text-sm font-bold">Pengiriman</h3></div>
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-bold">{order.shipment.courier} — {order.shipment.service}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-mono text-sm text-[var(--brand-600)]">{order.shipment.tracking_no}</p>
                    <button onClick={()=>{navigator.clipboard.writeText(order.shipment.tracking_no);toast.success('Disalin!');}} className="btn-icon-sm"><Copy size={12}/></button>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${order.shipment.status==='delivered'?'bg-emerald-100 text-emerald-700':'bg-blue-100 text-blue-700'}`}>{order.shipment.status}</span>
              </div>
            </div>
          )}

          {/* Payments */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center">
              <h3 className="text-sm font-bold">Pembayaran</h3>
            </div>
            {(order.payments||[]).length===0 ? <p className="text-sm text-[var(--text-muted)] px-5 py-4">Belum ada pembayaran</p> :
              order.payments.map(p=>(
                <div key={p.id} className="flex items-center justify-between px-5 py-4">
                  <div><p className="text-sm font-semibold capitalize">{p.method}</p><p className={`text-xs font-semibold ${p.status==='verified'?'text-emerald-600':'text-amber-600'}`}>{p.status==='verified'?'Terverifikasi':'Verifikasi'}</p></div>
                  <div className="text-right">
                    <p className="font-bold">{toRp(p.amount)}</p>
                    {p.status==='pending'&&<button onClick={()=>action(()=>erpService.verifyPayment(id,p.id),'Pembayaran terverifikasi')} className="text-xs text-[var(--brand-600)] font-semibold">Verifikasi</button>}
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        <div className="space-y-4">
          {/* Aksi */}
          <div className="card p-5"><h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Aksi</h3>
            <div className="space-y-2">
              {order.status==='confirmed'&&!order.shipment&&(
                <button onClick={()=>{const courier=prompt('Ekspedisi (JNE/J&T/dll):');if(!courier)return;const no=prompt('Nomor Resi:');if(!no)return;action(()=>erpService.addShipment(id,{courier,tracking_no:no,service:'REG',status:'shipped',shipped_at:new Date().toISOString()}),'Resi ditambahkan');}} className="btn-secondary w-full gap-2"><Truck size={14}/> Input Resi</button>
              )}
            </div>
          </div>

          {/* Customer */}
          <div className="card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Pelanggan</h3>
            <p className="font-semibold text-sm">{order.customer_name||'—'}</p>
            {order.customer_phone&&<p className="text-xs text-[var(--text-muted)] mt-0.5">📱 {order.customer_phone}</p>}
            {order.customer_city&&<p className="text-xs text-[var(--text-muted)]">📍 {order.customer_city}</p>}
          </div>

          {/* Info */}
          <div className="card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Info Order</h3>
            <div className="space-y-2 text-xs">
              {[
                ['No. Order', order.order_no],
                ['Tanggal', order.order_date],
                ['Channel', ch.label],
                ['Sub Channel', order.sub_channel_name||'—'],
                ['Cabang', order.branch_id===1?'GP Racing':'GP Distro'],
                ['Dibuat oleh', order.created_by],
              ].map(([l,v])=>(
                <div key={l} className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{l}</span>
                  <span className="font-semibold text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
