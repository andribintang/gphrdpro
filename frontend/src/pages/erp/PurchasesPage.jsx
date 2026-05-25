import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingBag, Plus, Eye, Edit3, X, Loader2, CheckCircle2,
  RefreshCw, Package, Printer, Search, ChevronDown, Truck
} from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable, { StatusBadge } from '../../components/DataTable';
import PeriodFilter from '../../components/PeriodFilter';
import { erpService, toRp, toRpShort, PURCHASE_STATUS } from '../../utils/erp/erpService';

const STATUS_COLORS = {
  draft:    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200',
  ordered:  'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200',
  partial:  'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200',
  received: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200',
  cancelled:'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200',
};

// ── Supplier Autocomplete ────────────────────────────────────
const SupplierInput = ({ value, onChange, onSelect }) => {
  const [results, setResults] = useState([]);
  const [show, setShow]       = useState(false);

  useEffect(() => {
    if (!value?.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      erpService.getSuppliers({ search: value })
        .then(r => setResults(r.data.data.suppliers || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="relative">
      <input value={value} onChange={e => { onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)} onBlur={() => setTimeout(() => setShow(false), 200)}
        placeholder="Nama supplier..." className="input-base" autoFocus/>
      {show && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
          {results.map((s, i) => (
            <button key={i} onMouseDown={() => { onSelect(s); setShow(false); }}
              className="w-full text-left px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
              <p className="text-sm font-semibold">{s.supplier_name}</p>
              {s.supplier_phone && <p className="text-xs text-[var(--text-muted)]">{s.supplier_phone}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Product Search ───────────────────────────────────────────
const ProductSearch = ({ onAdd, branch_id }) => {
  const [q, setQ]         = useState('');
  const [results, setRes] = useState([]);
  const [show, setShow]   = useState(false);

  useEffect(() => {
    if (!q.trim()) { setRes([]); return; }
    const t = setTimeout(() => {
      erpService.getProducts({ search: q, branch_id, limit: 8 })
        .then(r => setRes(r.data.data.products || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q, branch_id]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Search size={14} className="absolute left-3 text-[var(--text-muted)]"/>
        <input value={q} onChange={e => { setQ(e.target.value); setShow(true); }}
          onFocus={() => setShow(true)} onBlur={() => setTimeout(() => setShow(false), 200)}
          placeholder="Cari produk untuk ditambahkan..." className="input-base pl-9 text-sm"/>
      </div>
      {show && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto scrollbar-thin">
          {results.map(p => (
            <button key={p.id} onMouseDown={() => { onAdd(p); setQ(''); setRes([]); setShow(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors text-left">
              <Package size={14} className="text-[var(--text-muted)] flex-shrink-0"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{p.name}</p>
                <p className="text-xs text-[var(--text-muted)]">SKU: {p.sku||'—'} · Harga Beli: {toRpShort(p.buy_price)}</p>
              </div>
              <span className="text-xs text-[var(--brand-600)] font-semibold flex-shrink-0">Stok: {p.stock?.qty||0}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── PO Form Modal (Create/Edit) ───────────────────────────────
const POFormModal = ({ po, onClose, onSuccess }) => {
  const isEdit = !!po;
  const today  = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    branch_id:         po?.branch_id      || 1,
    supplier_name:     po?.supplier_name  || '',
    supplier_phone:    po?.supplier_phone || '',
    supplier_email:    po?.supplier_email || '',
    supplier_address:  po?.supplier_address || '',
    order_date:        po?.order_date     || today,
    expected_date:     po?.expected_date  || '',
    shipping_cost:     po?.shipping_cost  || 0,
    notes:             po?.notes          || '',
  });
  const [items, setItems] = useState(
    po?.items?.map(i => ({ product_id: i.product_id, product_name: i.product_name, qty_ordered: i.qty_ordered, buy_price: i.buy_price })) ||
    []
  );
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addProduct = (p) => {
    if (items.find(i => i.product_id === p.id)) { toast('Produk sudah ada di list'); return; }
    setItems(prev => [...prev, { product_id: p.id, product_name: p.name, qty_ordered: 1, buy_price: parseFloat(p.buy_price||0) }]);
  };
  const updateItem = (idx, k, v) => setItems(p => p.map((it, i) => i===idx ? { ...it, [k]: v } : it));
  const removeItem = (idx) => setItems(p => p.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.buy_price)||0) * (parseInt(i.qty_ordered)||0), 0);
  const total    = subtotal + (parseFloat(form.shipping_cost)||0);

  const handle = async () => {
    if (!form.supplier_name.trim()) { toast.error('Nama supplier wajib'); return; }
    if (!items.length) { toast.error('Minimal 1 produk'); return; }
    setSaving(true);
    try {
      const payload = { ...form, items };
      if (isEdit) await erpService.updatePurchase(po.id, payload);
      else        await erpService.createPurchase(payload);
      toast.success(isEdit ? 'PO diperbarui' : `PO berhasil dibuat`);
      onSuccess(); onClose();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-sm font-bold">{isEdit ? `Edit PO: ${po.po_no}` : 'Buat Purchase Order'}</h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Cabang</label>
              <select value={form.branch_id} onChange={e=>sf('branch_id',parseInt(e.target.value))} className="input-base text-sm" disabled={isEdit}>
                <option value={1}>GP Racing</option><option value={2}>GP Distro</option>
              </select>
            </div>
            <div><label className="field-label">Tanggal PO</label><input type="date" value={form.order_date} onChange={e=>sf('order_date',e.target.value)} className="input-base"/></div>
          </div>

          {/* Supplier section */}
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Informasi Supplier</p>
            <div>
              <label className="field-label">Nama Supplier *</label>
              <SupplierInput
                value={form.supplier_name}
                onChange={v => sf('supplier_name', v)}
                onSelect={s => setForm(f => ({ ...f, supplier_name: s.supplier_name, supplier_phone: s.supplier_phone||'', supplier_email: s.supplier_email||'', supplier_address: s.supplier_address||'' }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">No. HP</label><input value={form.supplier_phone} onChange={e=>sf('supplier_phone',e.target.value)} className="input-base text-sm" placeholder="08xxx"/></div>
              <div><label className="field-label">Email</label><input type="email" value={form.supplier_email} onChange={e=>sf('supplier_email',e.target.value)} className="input-base text-sm" placeholder="supplier@email.com"/></div>
            </div>
            <div><label className="field-label">Alamat</label><textarea value={form.supplier_address} onChange={e=>sf('supplier_address',e.target.value)} rows={2} className="input-base resize-none text-sm" placeholder="Alamat supplier (opsional)"/></div>
          </div>

          {/* Products */}
          <div>
            <label className="field-label mb-2">Produk</label>
            <ProductSearch onAdd={addProduct} branch_id={form.branch_id}/>
            {items.length > 0 && (
              <div className="mt-2 space-y-2 max-h-52 overflow-y-auto scrollbar-thin">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.product_name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[var(--text-muted)]">Qty</span>
                        <input type="number" min={1} value={item.qty_ordered}
                          onChange={e=>updateItem(idx,'qty_ordered',parseInt(e.target.value)||1)}
                          className="input-base h-7 w-16 text-xs text-center"/>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[var(--text-muted)]">Harga Beli</span>
                        <input type="number" min={0} value={item.buy_price}
                          onChange={e=>updateItem(idx,'buy_price',parseFloat(e.target.value)||0)}
                          className="input-base h-7 w-28 text-xs text-right"/>
                      </div>
                      <span className="text-xs font-bold text-[var(--brand-600)] min-w-16 text-right">{toRpShort((item.buy_price||0)*(item.qty_ordered||0))}</span>
                      <button onClick={()=>removeItem(idx)} className="btn-icon-sm text-red-500"><X size={12}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer info */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Estimasi Tiba</label><input type="date" value={form.expected_date} onChange={e=>sf('expected_date',e.target.value)} className="input-base"/></div>
            <div><label className="field-label">Biaya Kirim</label><input type="number" value={form.shipping_cost} onChange={e=>sf('shipping_cost',e.target.value)} className="input-base" min={0}/></div>
          </div>
          <div><label className="field-label">Catatan</label><textarea value={form.notes} onChange={e=>sf('notes',e.target.value)} rows={2} className="input-base resize-none text-sm" placeholder="Catatan untuk supplier..."/></div>

          {/* Total */}
          <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <div className="text-sm space-y-0.5">
              <div className="flex gap-8"><span className="text-[var(--text-muted)]">Subtotal</span><span className="font-semibold">{toRp(subtotal)}</span></div>
              {parseFloat(form.shipping_cost) > 0 && <div className="flex gap-8"><span className="text-[var(--text-muted)]">Ongkir</span><span className="font-semibold">{toRp(form.shipping_cost)}</span></div>}
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-muted)]">TOTAL</p>
              <p className="text-xl font-black text-[var(--brand-600)]">{toRp(total)}</p>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1">
            {saving?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>}
            {isEdit?'Simpan Perubahan':'Buat PO'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Receive Modal (Partial) ───────────────────────────────────
const ReceiveModal = ({ po, onClose, onSuccess }) => {
  const today = new Date().toISOString().split('T')[0];
  const [receivedDate, setDate] = useState(today);
  const [qtys, setQtys]         = useState(() => {
    const init = {};
    (po.items||[]).forEach(i => { init[i.id] = i.qty_ordered - (i.qty_received||0); });
    return init;
  });
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    const items = Object.entries(qtys)
      .filter(([_, qty]) => parseInt(qty) > 0)
      .map(([id, qty]) => ({ purchase_item_id: parseInt(id), qty_received: parseInt(qty) }));
    if (!items.length) { toast.error('Masukkan qty yang diterima'); return; }
    setSaving(true);
    try {
      await erpService.receivePurchase(po.id, { items, received_date: receivedDate });
      toast.success('Penerimaan berhasil — stok bertambah');
      onSuccess(); onClose();
    } catch(e) { toast.error(e.response?.data?.message||'Gagal'); }
    finally { setSaving(false); }
  };

  const totalReceiving = (po.items||[]).reduce((s,i) => s + (toNum(i.buy_price) * (parseInt(qtys[i.id])||0)), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-lg" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div><h3 className="text-sm font-bold">Terima Barang — {po.po_no}</h3><p className="text-xs text-[var(--text-muted)]">{po.supplier_name}</p></div>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body">
          <div><label className="field-label">Tanggal Penerimaan</label><input type="date" value={receivedDate} onChange={e=>setDate(e.target.value)} className="input-base"/></div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="field-label">Item yang Diterima</label>
              <button onClick={()=>setQtys(q=>{const n={...q};(po.items||[]).forEach(i=>{n[i.id]=i.qty_ordered-(i.qty_received||0);});return n;})}
                className="text-xs text-[var(--brand-600)] font-semibold">Pilih Semua</button>
            </div>
            <div className="space-y-2">
              {(po.items||[]).map(item => {
                const remaining = item.qty_ordered - (item.qty_received||0);
                return (
                  <div key={item.id} className={`p-3 rounded-xl border ${remaining===0?'opacity-50 bg-[var(--bg-secondary)]':'bg-[var(--bg-secondary)] border-[var(--border)]'}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{item.product_name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Pesan: {item.qty_ordered} · Sudah terima: {item.qty_received||0} · Sisa: {remaining}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-[var(--text-muted)]">Qty terima:</span>
                        <input type="number" min={0} max={remaining} value={qtys[item.id]||0}
                          onChange={e=>setQtys(q=>({...q,[item.id]:Math.min(remaining,Math.max(0,parseInt(e.target.value)||0))}))}
                          disabled={remaining===0}
                          className="input-base h-8 w-20 text-sm text-center"/>
                        <span className="text-xs text-[var(--text-muted)]">/ {remaining}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between p-3 rounded-xl bg-[var(--brand-50)] dark:bg-[var(--brand-100)] border border-[var(--brand-600)]/20">
            <span className="text-sm font-semibold">Nilai Penerimaan</span>
            <span className="text-lg font-bold text-[var(--brand-600)]">{toRp(totalReceiving)}</span>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1">
            {saving?<Loader2 size={15} className="animate-spin"/>:<Truck size={15}/>} Konfirmasi Penerimaan
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Print PO ─────────────────────────────────────────────────
const printPO = (po) => {
  const items = (po.items||[]).map((i,idx) => `
    <tr>
      <td>${idx+1}</td>
      <td>${i.product_name}</td>
      <td style="text-align:center">${i.qty_ordered}</td>
      <td style="text-align:right">${new Intl.NumberFormat('id-ID').format(i.buy_price)}</td>
      <td style="text-align:right">${new Intl.NumberFormat('id-ID').format(i.subtotal)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>PO ${po.po_no}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; padding: 30px; color: #111; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; border-bottom:2px solid #111; padding-bottom:16px; }
    .company { font-size:20px; font-weight:bold; color:#e11d48; }
    .po-info { text-align:right; }
    .po-number { font-size:18px; font-weight:bold; }
    .section { margin-bottom:16px; }
    .section-title { font-weight:bold; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#666; margin-bottom:6px; border-bottom:1px solid #eee; padding-bottom:4px; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    th { background:#111; color:#fff; padding:8px 10px; text-align:left; font-size:11px; }
    td { padding:7px 10px; border-bottom:1px solid #eee; }
    tr:nth-child(even) td { background:#f9f9f9; }
    .totals { margin-left:auto; width:280px; }
    .total-row { display:flex; justify-content:space-between; padding:4px 0; }
    .total-final { font-weight:bold; font-size:14px; border-top:2px solid #111; padding-top:8px; margin-top:4px; }
    .footer { margin-top:40px; display:flex; justify-content:space-between; }
    .sign-box { text-align:center; width:180px; }
    .sign-line { border-top:1px solid #333; margin-top:60px; padding-top:6px; font-size:11px; }
    .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:bold; background:#fff3cd; color:#856404; }
    @media print { body { padding:15px; } }
  </style>
  </head><body>
  <div class="header">
    <div>
      <div class="company">GPDISTRO</div>
      <div style="font-size:11px;color:#666;margin-top:2px">GP Racing & GP Distro</div>
    </div>
    <div class="po-info">
      <div style="font-size:11px;color:#666;font-weight:bold;text-transform:uppercase;">Purchase Order</div>
      <div class="po-number">${po.po_no}</div>
      <div style="font-size:11px;color:#666;margin-top:4px">Tanggal: ${po.order_date}</div>
      ${po.expected_date?`<div style="font-size:11px;color:#666;">Estimasi tiba: ${po.expected_date}</div>`:''}
    </div>
  </div>

  <div style="display:flex;gap:40px;margin-bottom:20px;">
    <div class="section" style="flex:1">
      <div class="section-title">Kepada / Supplier</div>
      <div style="font-weight:bold;font-size:13px;">${po.supplier_name||'—'}</div>
      ${po.supplier_phone?`<div>${po.supplier_phone}</div>`:''}
      ${po.supplier_email?`<div>${po.supplier_email}</div>`:''}
      ${po.supplier_address?`<div style="color:#666;margin-top:4px;">${po.supplier_address}</div>`:''}
    </div>
    <div class="section" style="flex:1">
      <div class="section-title">Dari</div>
      <div style="font-weight:bold;font-size:13px;">GPDISTRO</div>
      <div>GP Racing / GP Distro</div>
    </div>
  </div>

  <table>
    <thead><tr><th style="width:30px">No</th><th>Nama Produk</th><th style="width:70px;text-align:center">Qty</th><th style="width:110px;text-align:right">Harga Beli</th><th style="width:120px;text-align:right">Subtotal</th></tr></thead>
    <tbody>${items}</tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>Rp ${new Intl.NumberFormat('id-ID').format(po.subtotal)}</span></div>
    ${parseFloat(po.shipping_cost)>0?`<div class="total-row"><span>Biaya Kirim</span><span>Rp ${new Intl.NumberFormat('id-ID').format(po.shipping_cost)}</span></div>`:''}
    <div class="total-row total-final"><span>TOTAL</span><span>Rp ${new Intl.NumberFormat('id-ID').format(po.total_amount)}</span></div>
  </div>

  ${po.notes?`<div class="section" style="margin-top:16px;"><div class="section-title">Catatan</div><div>${po.notes}</div></div>`:''}

  <div class="footer">
    <div class="sign-box"><div class="sign-line">Supplier</div></div>
    <div class="sign-box"><div class="sign-line">Dibuat oleh</div></div>
    <div class="sign-box"><div class="sign-line">Disetujui oleh</div></div>
  </div>
  </body></html>`;

  const w = window.open('', '_blank', 'width=800,height=600');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
};

// ── Detail Modal ──────────────────────────────────────────────
const DetailModal = ({ poId, onClose, onSuccess }) => {
  const [po, setPo]         = useState(null);
  const [loading, setLoad]  = useState(true);
  const [showReceive, setRec] = useState(false);

  useEffect(() => {
    erpService.getPurchase(poId)
      .then(r => setPo(r.data.data.purchase))
      .catch(() => toast.error('Gagal'))
      .finally(() => setLoad(false));
  }, [poId]);

  if (loading) return <div className="modal-overlay"><div className="modal-backdrop"/><div className="modal-box max-w-md items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--text-muted)] mx-auto"/></div></div>;
  if (!po) return null;

  const st = PURCHASE_STATUS[po.status] || PURCHASE_STATUS.draft;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}><div className="modal-backdrop"/>
        <div className="modal-box max-w-lg" onClick={e=>e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h3 className="text-sm font-bold font-mono">{po.po_no}</h3>
              <p className="text-xs text-[var(--text-muted)]">{po.supplier_name} · {po.order_date}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => printPO(po)} className="btn-secondary h-7 px-2.5 text-xs gap-1.5"><Printer size={13}/> Print PO</button>
              <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
            </div>
          </div>
          <div className="modal-body">
            <div className="flex gap-2 flex-wrap">
              <StatusBadge label={st.label} color={STATUS_COLORS[po.status]}/>
              {po.received_date && <StatusBadge label={`Diterima: ${po.received_date}`} color="bg-emerald-50 text-emerald-700 border-emerald-200"/>}
              {po.expected_date && <StatusBadge label={`Estimasi: ${po.expected_date}`} color="bg-blue-50 text-blue-700 border-blue-200"/>}
            </div>

            {/* Supplier info */}
            <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text-muted)] mb-1">SUPPLIER</p>
              <p className="font-semibold">{po.supplier_name}</p>
              {po.supplier_phone && <p className="text-xs text-[var(--text-muted)]">📱 {po.supplier_phone}</p>}
              {po.supplier_email && <p className="text-xs text-[var(--text-muted)]">✉ {po.supplier_email}</p>}
              {po.supplier_address && <p className="text-xs text-[var(--text-muted)] mt-1">📍 {po.supplier_address}</p>}
            </div>

            {/* Items */}
            <div>
              <p className="field-label mb-2">Item ({po.items?.length||0})</p>
              <div className="space-y-1.5">
                {(po.items||[]).map(item => {
                  const remaining = item.qty_ordered - (item.qty_received||0);
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)]">
                      <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{item.product_name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{toRp(item.buy_price)} × {item.qty_ordered}
                          {item.qty_received>0 && <span className="text-emerald-600"> · Terima: {item.qty_received}</span>}
                          {remaining>0 && <span className="text-amber-600"> · Sisa: {remaining}</span>}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[var(--brand-600)] flex-shrink-0">{toRpShort(item.subtotal)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] space-y-1">
              <div className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">Subtotal</span><span>{toRp(po.subtotal)}</span></div>
              {parseFloat(po.shipping_cost)>0 && <div className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">Biaya Kirim</span><span>{toRp(po.shipping_cost)}</span></div>}
              <div className="flex justify-between font-bold border-t border-[var(--border)] pt-1"><span>Total</span><span className="text-[var(--brand-600)]">{toRp(po.total_amount)}</span></div>
            </div>

            {po.notes && <div className="p-3 rounded-xl bg-[var(--bg-secondary)]"><p className="text-xs text-[var(--text-muted)] mb-0.5">Catatan:</p><p className="text-sm">{po.notes}</p></div>}
          </div>

          {['ordered','partial'].includes(po.status) && (
            <div className="modal-footer">
              <button onClick={() => setRec(true)} className="btn-primary w-full gap-2"><Truck size={15}/> Terima Barang</button>
            </div>
          )}
        </div>
      </div>
      {showReceive && <ReceiveModal po={po} onClose={() => setRec(false)} onSuccess={() => { onSuccess(); onClose(); }}/>}
    </>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function PurchasesPage() {
  const [purchases, setPO]  = useState([]);
  const [loading, setLoad]  = useState(true);
  const [showForm, setForm] = useState(null); // null | 'new' | po obj
  const [detailId, setDetail] = useState(null);
  const [dateRange, setDate]= useState(()=>{
    const n=new Date();
    return {from:`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`,to:n.toISOString().split('T')[0]};
  });
  const [branch, setBranch] = useState('');

  const fetch = useCallback(async () => {
    setLoad(true);
    try {
      const r = await erpService.getPurchases({ limit:200, branch_id:branch||undefined, date_from:dateRange.from, date_to:dateRange.to });
      setPO(r.data.data.purchases||[]);
    } catch { toast.error('Gagal memuat pembelian'); }
    finally { setLoad(false); }
  }, [branch, dateRange]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalValue = purchases.reduce((s, p) => s + parseFloat(p.total_amount||0), 0);
  const pendingCount = purchases.filter(p => ['ordered','partial'].includes(p.status)).length;

  const columns = [
    { key:'po_no', label:'No. PO', nowrap:true, render:v=><span className="font-mono text-xs font-semibold">{v}</span> },
    { key:'order_date', label:'Tanggal', sortable:true, nowrap:true, render:v=><span className="text-[var(--text-secondary)]">{v}</span> },
    { key:'supplier_name', label:'Supplier', render:v=><span className="font-medium">{v||'—'}</span> },
    { key:'expected_date', label:'Est. Tiba', nowrap:true, render:v=>v?<span className="text-blue-600 text-xs">{v}</span>:<span className="text-[var(--text-muted)]">—</span> },
    { key:'status', label:'Status', nowrap:true, render:v=>{const s=PURCHASE_STATUS[v]||PURCHASE_STATUS.draft;return <StatusBadge label={s.label} color={STATUS_COLORS[v]||STATUS_COLORS.draft}/>;} },
    { key:'total_amount', label:'Total', sortable:true, align:'right', nowrap:true, render:v=><span className="font-bold">{toRpShort(v)}</span> },
  ];

  return (
    <div className="section animate-fade-in">
      {/* Filters */}
      <div className="card-sm mb-5 space-y-3">
        <PeriodFilter value={dateRange} onChange={setDate}/>
        <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm">
          <option value="">Semua Cabang</option><option value="1">GP Racing</option><option value="2">GP Distro</option>
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {l:'Total PO',v:purchases.length,fmt:false,color:'text-[var(--text-primary)]'},
          {l:'Menunggu Penerimaan',v:pendingCount,fmt:false,color:'text-amber-600'},
          {l:'Total Nilai',v:totalValue,fmt:true,color:'text-[var(--brand-600)]'},
        ].map(s=>(
          <div key={s.l} className="card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{s.l}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.fmt?toRpShort(s.v):s.v}</p>
          </div>
        ))}
      </div>

      <div className="page-header">
        <div><h1 className="page-title">Pembelian</h1><p className="body-sm text-[var(--text-muted)]">{purchases.length} purchase order</p></div>
        <div className="flex gap-2">
          <button onClick={fetch} className="btn-icon"><RefreshCw size={16}/></button>
          <button onClick={()=>setForm('new')} className="btn-primary"><Plus size={16}/> Buat PO</button>
        </div>
      </div>

      <DataTable columns={columns} data={purchases} loading={loading}
        searchKeys={['po_no','supplier_name']} searchPlaceholder="Cari no. PO, supplier..."
        filters={[{key:'status',label:'Status',options:Object.entries(PURCHASE_STATUS).map(([k,v])=>({value:k,label:v.label}))}]}
        emptyIcon={<ShoppingBag size={40}/>} emptyText="Belum ada purchase order"
        emptyAction={<button onClick={()=>setForm('new')} className="btn-primary">Buat PO Pertama</button>}
        actions={(row) => (
          <div className="flex gap-1">
            <button onClick={()=>setDetail(row.id)} className="btn-icon-sm" title="Lihat detail"><Eye size={13}/></button>
            {['ordered','partial'].includes(row.status) && (
              <button onClick={()=>setForm(row)} className="btn-icon-sm" title="Edit"><Edit3 size={13}/></button>
            )}
            <button onClick={()=>printPO(row)} className="btn-icon-sm" title="Print PO"><Printer size={13}/></button>
          </div>
        )}
        pageSize={25} zebra/>

      {showForm && (
        <POFormModal
          po={showForm==='new'?null:showForm}
          onClose={()=>setForm(null)}
          onSuccess={fetch}/>
      )}
      {detailId && (
        <DetailModal poId={detailId} onClose={()=>setDetail(null)} onSuccess={fetch}/>
      )}
    </div>
  );
}
