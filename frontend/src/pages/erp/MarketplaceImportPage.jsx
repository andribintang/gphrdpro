import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { erpService, toRpShort } from '../../utils/erp/erpService';
import {
  Upload, AlertTriangle, Check, Loader2, X, ChevronDown, ChevronUp,
  Package, Search, ShoppingBag, Info, Truck, RotateCcw,
} from 'lucide-react';

// ── Identitas visual per platform ────────────────────────────
const PLATFORM = {
  tiktok: {
    label: 'TikTok Shop', color: '#010101', badge: 'bg-black text-white',
    accent: '#fe2c55', icon: '🎵',
    detect: (cols) => cols.includes('Order ID') && cols.includes('Seller SKU'),
  },
  shopee: {
    label: 'Shopee', color: '#ee4d2d', badge: 'bg-orange-500 text-white',
    accent: '#ee4d2d', icon: '🛍️',
    detect: (cols) => cols.includes('No. Pesanan') && cols.includes('Nomor Referensi SKU'),
  },
};

// ── Komponen SKU Resolver — untuk produk yang tidak ketemu otomatis ──
function SkuResolverRow({ item, branchId, onResolve }) {
  const [search, setSearch]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoad]    = useState(false);
  const [resolved, setResolved] = useState(null);
  const [variants, setVariants] = useState([]);
  const [variantId, setVariantId] = useState(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoad(true);
    try {
      const res = await erpService.getProducts({ search: q, branch_id: branchId, limit: 8 });
      setResults(res.data.data.products || []);
    } catch {}
    finally { setLoad(false); }
  }, [branchId]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  const selectProduct = async (p) => {
    setResolved(p);
    setResults([]);
    setSearch('');
    try {
      const res = await erpService.getProductVariants(p.id);
      const active = (res.data?.data?.variants || []).filter(v => v.is_active);
      setVariants(active);
      if (active.length === 0) {
        setVariantId(null);
        onResolve(item.item_key, { product_id: p.id, variant_id: null });
      }
    } catch {
      setVariants([]);
      onResolve(item.item_key, { product_id: p.id, variant_id: null });
    }
  };

  const selectVariant = (v) => {
    setVariantId(v.id);
    onResolve(item.item_key, { product_id: resolved.id, variant_id: v.id });
  };

  const isComplete = resolved && (variants.length === 0 || variantId);
  const fromSaved = item._from_saved_map;

  return (
    <div className={`p-3 rounded-xl border-2 transition-all ${isComplete ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20'}`}>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isComplete ? 'bg-emerald-500' : 'bg-amber-400'}`}>
          {isComplete ? <Check size={14} className="text-white"/> : <AlertTriangle size={12} className="text-white"/>}
        </div>

        <div className="flex-1 min-w-0">
          {/* Produk dari marketplace */}
          <div className="mb-2">
            <p className="text-xs font-bold text-[var(--text-primary)] truncate">{item._raw_product || item.product_name}</p>
            <p className="text-[10px] text-[var(--text-muted)]">
              Order: <span className="font-mono">{item.order_ref}</span>
              {item.seller_sku && <> · SKU marketplace: <span className="font-mono text-amber-600">{item.seller_sku}</span></>}
              · Qty: {item.qty} · Rp {(item.sell_price||0).toLocaleString('id')}
            </p>
          </div>

          {/* Tampilkan produk yang sudah dipilih */}
          {resolved ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded-full">
                ✓ {resolved.name}
              </span>
              {variants.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {variants.map(v => (
                    <button key={v.id} onClick={() => selectVariant(v)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all ${
                        variantId === v.id
                          ? 'bg-[var(--brand-600)] border-[var(--brand-600)] text-white'
                          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand-600)]'
                      }`}>
                      {v.name}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => { setResolved(null); setVariants([]); setVariantId(null); onResolve(item.item_key, null); }}
                className="text-[10px] text-red-500 hover:text-red-700">
                <RotateCcw size={11}/> ganti
              </button>
            </div>
          ) : (
            /* Search box */
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`Cari produk di sistem... ${item.seller_sku ? `(SKU: ${item.seller_sku})` : ''}`}
                className="input-base h-8 pl-7 text-xs"/>
              {(results.length > 0 || loading) && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">
                  {loading && <p className="text-xs text-[var(--text-muted)] p-3">Mencari...</p>}
                  {results.map(p => (
                    <button key={p.id} onClick={() => selectProduct(p)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-secondary)] text-left">
                      <Package size={12} className="text-[var(--text-muted)] flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{p.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">SKU: {p.sku || '—'} · Stok: {p.stock?.qty || 0}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Komponen: Card ringkasan 1 order ─────────────────────────
function OrderPreviewCard({ order, platform, idx }) {
  const [open, setOpen] = useState(idx < 3); // 3 pertama auto-expand
  const p = PLATFORM[platform];
  const hasTracking = !!order.tracking_no;

  return (
    <div className="table-wrapper overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-secondary)] transition-colors text-left">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.badge}`}>{p.icon} {p.label}</span>
        <div className="flex-1 min-w-0">
          <span className="font-mono text-xs font-bold text-[var(--brand-600)]">{order.order_ref}</span>
          <span className="text-xs text-[var(--text-muted)] ml-2">{order.customer_name || '—'}</span>
          {hasTracking && <span className="text-[10px] ml-2 text-emerald-600">🚚 {order.tracking_no}</span>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-bold text-[var(--brand-600)]">{toRpShort(order.items?.reduce((s,i) => s + i.sell_price * i.qty, 0) || 0)}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{order.items?.length} produk</p>
        </div>
        {open ? <ChevronUp size={14} className="text-[var(--text-muted)] flex-shrink-0"/> : <ChevronDown size={14} className="text-[var(--text-muted)] flex-shrink-0"/>}
      </button>

      {open && (
        <div className="px-4 pb-3 border-t border-[var(--border)] space-y-2">
          {/* Info biaya */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {[
              { l:'Ongkir', v: `Rp ${(order.shipping_cost||0).toLocaleString('id')}` },
              { l:'Admin Fee', v: `Rp ${(order.admin_fee||0).toLocaleString('id')}` },
              { l:'Pembayaran', v: order.payment_method?.toUpperCase() },
              { l:'Tanggal', v: order.order_date },
            ].map(({ l, v }) => (
              <div key={l} className="bg-[var(--bg-secondary)] rounded-lg p-2">
                <p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)] font-bold">{l}</p>
                <p className="text-xs font-semibold">{v || '—'}</p>
              </div>
            ))}
          </div>

          {/* Detail biaya admin (tooltip-style) */}
          {order.admin_fee > 0 && order.admin_fee_detail && (
            <details className="text-[10px]">
              <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]">Detail biaya admin</summary>
              <div className="mt-1 pl-2 space-y-0.5 text-[var(--text-muted)]">
                {Object.entries(order.admin_fee_detail).filter(([,v]) => v > 0).map(([k,v]) => (
                  <div key={k} className="flex justify-between"><span>{k.replace(/_/g,' ')}</span><span>Rp {v.toLocaleString('id')}</span></div>
                ))}
              </div>
            </details>
          )}

          {/* Item list */}
          <div className="space-y-1 mt-1">
            {order.items?.map((item, j) => (
              <div key={j} className="flex items-center gap-2 text-xs py-1 border-b border-[var(--border)] last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item._resolved ? (item._resolved.from_saved_map ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-amber-400'}`} title={item._resolved?.from_saved_map ? 'Dari mapping tersimpan' : ''}/>
                <span className="flex-1 truncate text-[var(--text-primary)]">{item._raw_product || item.product_name}</span>
                {item.seller_sku && <span className="font-mono text-[10px] text-[var(--text-muted)]">{item.seller_sku}</span>}
                <span className="font-semibold flex-shrink-0">×{item.qty}</span>
                <span className="text-[var(--brand-600)] font-bold flex-shrink-0">{toRpShort(item.sell_price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
export default function MarketplaceImportPage() {
  const [step, setStep]           = useState('upload');  // upload | resolve | confirm | result
  const [platform, setPlatform]   = useState(null);
  const [branch, setBranch]       = useState('1');
  const [subChannels, setSubCh]   = useState([]);
  const [subChannelId, setSubChId]= useState('');
  const [rawRows, setRawRows]     = useState([]);
  const [parsed, setParsed]       = useState(null);      // { orders, unresolved_skus, summary }
  const [resolutions, setResolutions] = useState({});   // { [item_key]: { product_id, variant_id } }
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [showMappings, setShowMappings] = useState(false);
  const [savedMappings, setSavedMappings] = useState([]);
  const [loadingMappings, setLoadMappings] = useState(false);

  const loadMappings = async () => {
    setLoadMappings(true);
    try {
      const r = await erpService.getMarketplaceMappings({ branch_id: branch });
      setSavedMappings(r.data.data.mappings || []);
    } catch {}
    finally { setLoadMappings(false); }
  };

  const deleteMapping = async (id) => {
    if (!confirm('Hapus mapping ini? Import berikutnya akan perlu pilih manual lagi.')) return;
    try {
      await erpService.deleteMarketplaceMapping(id);
      setSavedMappings(prev => prev.filter(m => m.id !== id));
      toast.success('Mapping dihapus');
    } catch { toast.error('Gagal menghapus'); }
  };

  // Load sub channels
  useEffect(() => {
    erpService.getSubChannels({ channel: 'marketplace' })
      .then(r => setSubCh(r.data?.data?.sub_channels || []))
      .catch(() => {});
  }, []);

  const resolvedCount = Object.values(resolutions).filter(Boolean).length;
  const allResolved   = parsed && (parsed.unresolved_skus.length === 0 || resolvedCount >= parsed.unresolved_skus.length);

  // ── Baca file Excel ─────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb  = XLSX.read(ev.target.result, { type: 'array', raw: false });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!raw.length) { toast.error('File kosong'); return; }

        const cols = Object.keys(raw[0]);
        const detectedPlatform = PLATFORM.tiktok.detect(cols) ? 'tiktok'
          : PLATFORM.shopee.detect(cols) ? 'shopee'
          : null;

        if (!detectedPlatform) {
          toast.error('Format file tidak dikenali. Pastikan file adalah export asli dari TikTok Shop atau Shopee.');
          return;
        }

        setPlatform(detectedPlatform);
        setRawRows(raw);
        toast.success(`File ${PLATFORM[detectedPlatform].label} terdeteksi — ${raw.length} baris`);
      } catch (err) { toast.error('Gagal baca file: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // ── Step 1: Kirim ke backend untuk parse + resolve SKU ──────
  const handleParse = async () => {
    if (!rawRows.length || !platform) return;
    if (!subChannelId) { toast.error('Pilih toko marketplace dulu'); return; }
    setLoading(true);
    try {
      const r = await erpService.parseMarketplaceExport({
        platform, branch_id: parseInt(branch), rows: rawRows,
      });
      const data = r.data.data;
      setParsed(data);
      setResolutions({});
      if (data.unresolved_skus.length > 0) {
        setStep('resolve');
        toast(`${data.summary.unresolved_count} produk perlu dipilih manual`, { icon: '⚠️' });
      } else {
        setStep('confirm');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memproses file');
    } finally { setLoading(false); }
  };

  // ── Step 2 callback: staff resolve 1 SKU ────────────────────
  const handleResolve = useCallback((itemKey, resolution) => {
    setResolutions(prev => {
      const next = { ...prev };
      if (resolution) next[itemKey] = resolution;
      else delete next[itemKey];
      return next;
    });
  }, []);

  // ── Step 3: Konfirmasi & buat order ─────────────────────────
  const handleConfirm = async () => {
    if (!allResolved) { toast.error('Selesaikan semua SKU yang belum di-mapping dulu'); return; }
    setLoading(true);
    try {
      // Merge resolutions ke dalam parsed orders sebelum dikirim
      const ordersWithResolutions = parsed.orders.map(order => ({
        ...order,
        items: order.items.map(item => {
          const itemKey = `${order.order_ref}::${item.seller_sku || item._raw_product}`;
          const res = resolutions[itemKey];
          if (res) return { ...item, _resolved: res };
          return item;
        }),
      }));

      // Sertakan _mp_key dari unresolved_skus supaya backend tahu kunci yang harus disimpan
      const resolutionsWithMpKey = {};
      Object.entries(resolutions).forEach(([itemKey, res]) => {
        if (!res) return;
        const unresolvedItem = parsed.unresolved_skus.find(u => u.item_key === itemKey);
        resolutionsWithMpKey[itemKey] = {
          ...res,
          _mp_key: unresolvedItem?._mp_key || null,
        };
      });

      const r = await erpService.confirmMarketplaceImport({
        orders: ordersWithResolutions,
        branch_id: parseInt(branch),
        sub_channel_id: parseInt(subChannelId),
        sub_channel_name: subChannels.find(s => s.id == subChannelId)?.name || platform,
        resolutions: resolutionsWithMpKey,
      });
      setResult(r.data.data);
      setStep('result');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal membuat order');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStep('upload'); setPlatform(null); setRawRows([]); setParsed(null);
    setResolutions({}); setResult(null);
  };

  const p = platform ? PLATFORM[platform] : null;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Import Order Marketplace</h1>
          <p className="page-subtitle">Upload file export asli dari TikTok Shop atau Shopee — mapping otomatis ke sistem</p>
        </div>
        <button onClick={() => { setShowMappings(true); loadMappings(); }}
          className="btn-secondary gap-2 text-sm">
          <Package size={15}/> Kelola Mapping SKU
        </button>
      </div>

      {/* ── UPLOAD ─────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kiri: settings */}
          <div className="space-y-4">
            <div className="table-wrapper p-4">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Cabang</label>
              <select value={branch} onChange={e => setBranch(e.target.value)} className="input-base text-sm">
                <option value="1">GP Racing Store</option>
                <option value="2">GP Distro</option>
              </select>
            </div>

            <div className="table-wrapper p-4">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Toko Marketplace</label>
              <select value={subChannelId} onChange={e => setSubChId(e.target.value)} className="input-base text-sm">
                <option value="">Pilih toko...</option>
                {subChannels.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </select>
              {subChannels.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1.5">⚠ Belum ada toko. Tambah di Master Data → Sub Channel.</p>
              )}
            </div>

            {/* Platform legend */}
            <div className="table-wrapper p-4">
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Platform Didukung</p>
              <div className="space-y-3">
                {Object.entries(PLATFORM).map(([key, pl]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${pl.badge}`}>{pl.icon} {pl.label}</span>
                    <p className="text-[10px] text-[var(--text-muted)]">Export dari menu Pesanan → Export</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <p className="text-[10px] text-blue-700 dark:text-blue-400 flex items-start gap-1">
                  <Info size={11} className="flex-shrink-0 mt-0.5"/>
                  Platform terdeteksi otomatis dari kolom file — tidak perlu pilih manual.
                </p>
              </div>
            </div>
          </div>

          {/* Kanan: drop area */}
          <div className="lg:col-span-2">
            {!rawRows.length ? (
              <label className="block border-2 border-dashed border-[var(--border)] rounded-2xl p-16 text-center cursor-pointer hover:border-[var(--brand-500)] hover:bg-[var(--brand-500)]/5 transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                  <Upload size={32} className="text-white"/>
                </div>
                <p className="font-bold text-base mb-1">Upload File Export Marketplace</p>
                <p className="text-sm text-[var(--text-muted)]">TikTok Shop atau Shopee — format .xlsx/.xls</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Drag & drop atau klik untuk pilih file</p>
                <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={handleFile}/>
              </label>
            ) : (
              <div className="table-wrapper p-6 space-y-4">
                {/* File terdeteksi */}
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${p.accent}15` }}>
                  <span className="text-3xl">{p.icon}</span>
                  <div>
                    <p className="font-bold text-sm">{p.label} terdeteksi</p>
                    <p className="text-xs text-[var(--text-muted)]">{rawRows.length} baris data siap diproses</p>
                  </div>
                  <button onClick={reset} className="ml-auto btn-icon-sm"><X size={14}/></button>
                </div>

                {/* Mapping preview (biaya) */}
                <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Mapping Biaya Admin Fee</p>
                  {platform === 'tiktok' ? (
                    <div className="text-xs space-y-0.5 text-[var(--text-secondary)]">
                      <p>• <span className="font-semibold">Handling Fee</span> + <span className="font-semibold">Buyer Service Fee</span> → Admin Fee (per order)</p>
                      <p className="text-[10px] text-amber-600">⚠ Seller SKU di TikTok sering kosong — produk tanpa SKU perlu dipilih manual</p>
                    </div>
                  ) : (
                    <div className="text-xs space-y-0.5 text-[var(--text-secondary)]">
                      <p>• Voucher Ditanggung Penjual + Voucher Ditanggung Shopee</p>
                      <p>• + Estimasi Potongan Biaya Pengiriman + Cashback Koin</p>
                      <p>• + Diskon Kartu Kredit + Paket Diskon</p>
                      <p>→ <span className="font-semibold">Total Admin Fee</span></p>
                    </div>
                  )}
                </div>

                <button onClick={handleParse} disabled={loading || !subChannelId}
                  className="btn-primary w-full h-12 text-sm gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin"/> : <Package size={16}/>}
                  {loading ? 'Memproses file...' : `Proses ${rawRows.length} Baris`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RESOLVE SKU ─────────────────────────────────────── */}
      {step === 'resolve' && parsed && (
        <div className="space-y-5">
          {/* Header status */}
          <div className="table-wrapper p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3 flex-wrap">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0"/>
              <div className="flex-1">
                <p className="font-bold text-sm text-amber-800 dark:text-amber-300">
                  {parsed.unresolved_skus.length} produk tidak ditemukan otomatis — pilih manual
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {resolvedCount} dari {parsed.unresolved_skus.length} sudah dipilih
                  {platform === 'tiktok' && ' · TikTok sering tidak isi Seller SKU, produk perlu dicari manual'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-amber-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${parsed.unresolved_skus.length ? (resolvedCount/parsed.unresolved_skus.length)*100 : 100}%` }}/>
                </div>
                <span className="text-xs font-bold text-amber-700">{resolvedCount}/{parsed.unresolved_skus.length}</span>
              </div>
            </div>
          </div>

          {/* SKU resolver rows */}
          <div className="space-y-2">
            {parsed.unresolved_skus.map(item => (
              <SkuResolverRow key={item.item_key} item={item} branchId={parseInt(branch)} onResolve={handleResolve}/>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="btn-secondary h-11 px-5">Mulai Ulang</button>
            <button onClick={() => setStep('confirm')} disabled={!allResolved}
              className="btn-primary flex-1 h-11 text-sm gap-2 disabled:opacity-50">
              <Check size={16}/> Lanjut ke Konfirmasi ({parsed.summary.total_orders} order)
            </button>
          </div>
        </div>
      )}

      {/* ── KONFIRMASI ──────────────────────────────────────── */}
      {step === 'confirm' && parsed && (
        <div className="space-y-5">
          {/* Summary banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l:'Total Order', v: parsed.summary.total_orders, c:'blue', i:'🛒' },
              { l:'Total Item', v: parsed.summary.total_items, c:'purple', i:'📦' },
              { l:'Total Admin Fee', v: `Rp ${parsed.orders.reduce((s,o)=>s+(o.admin_fee||0),0).toLocaleString('id')}`, c:'amber', i:'💳' },
              { l:'Total Ongkir', v: `Rp ${parsed.orders.reduce((s,o)=>s+(o.shipping_cost||0),0).toLocaleString('id')}`, c:'green', i:'🚚' },
            ].map(({ l, v, c, i }) => (
              <div key={l} className={`table-wrapper p-4 text-center border-t-2 border-${c}-400`}>
                <p className="text-xl mb-1">{i}</p>
                <p className={`text-lg font-black text-${c}-600`}>{v}</p>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">{l}</p>
              </div>
            ))}
          </div>

          {/* Info bahwa semua masuk Draft */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-2">
            <Info size={15} className="text-blue-600 flex-shrink-0"/>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Semua order akan masuk sebagai <strong>Draft</strong> — stok belum dipotong.
              Setelah import, buka halaman Order untuk bulk-konfirmasi sekaligus.
              {parsed.orders.some(o => o.tracking_no) && <> · Resi yang sudah ada akan tersimpan otomatis.</>}
            </p>
          </div>

          {/* Preview cards */}
          <div className="space-y-2 max-h-[55vh] overflow-y-auto scrollbar-thin pr-1">
            {parsed.orders.map((order, i) => (
              <OrderPreviewCard key={order.order_ref} order={order} platform={platform} idx={i}/>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => parsed.unresolved_skus.length > 0 ? setStep('resolve') : setStep('upload')}
              className="btn-secondary h-12 px-5">← Kembali</button>
            <button onClick={handleConfirm} disabled={loading}
              className="btn-primary flex-1 h-12 text-sm gap-2 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin"/> : <ShoppingBag size={16}/>}
              {loading ? 'Membuat order...' : `Buat ${parsed.summary.total_orders} Order Draft`}
            </button>
          </div>
        </div>
      )}

      {/* ── HASIL ───────────────────────────────────────────── */}
      {step === 'result' && result && (
        <div className="max-w-2xl mx-auto">
          <div className="table-wrapper p-8 space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={40} className="text-green-600"/>
              </div>
              <h3 className="font-bold text-xl">Import Berhasil!</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">Semua order sudah masuk ke sistem sebagai Draft</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { l:'Order Dibuat',        v: result.success,     c:'green' },
                { l:'Dilewati (Duplikat)', v: result.skipped||0,  c:'amber' },
                { l:'Gagal',              v: result.failed,       c:'red'   },
              ].map(({ l, v, c }) => (
                <div key={l} className={`bg-${c}-50 dark:bg-${c}-950/30 border border-${c}-200 dark:border-${c}-800 rounded-xl p-4 text-center`}>
                  <p className={`text-3xl font-black text-${c}-700 dark:text-${c}-300`}>{v}</p>
                  <p className={`text-xs text-${c}-600 dark:text-${c}-400 mt-1`}>{l}</p>
                </div>
              ))}
            </div>

            {result.notes?.length > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                <p className="text-xs font-bold text-emerald-700 mb-2">Order yang Berhasil Dibuat:</p>
                {result.notes.map((n,i) => <p key={i} className="text-xs text-emerald-700 mb-0.5 font-mono">• {n}</p>)}
              </div>
            )}

            {(result.saved_mappings?.added > 0 || result.saved_mappings?.updated > 0) && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
                <Info size={14} className="text-blue-600 flex-shrink-0"/>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>{(result.saved_mappings.added||0) + (result.saved_mappings.updated||0)} mapping SKU disimpan</strong> — import berikutnya dengan produk yang sama akan otomatis ter-resolve tanpa input manual.
                  {' '}<button onClick={() => { setShowMappings(true); loadMappings(); }}
                    className="underline hover:no-underline">Kelola mapping →</button>
                </p>
              </div>
            )}

            {result.errors?.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                <p className="text-xs font-bold text-red-700 mb-2">Detail Masalah:</p>
                {result.errors.map((e,i) => <p key={i} className="text-xs text-red-600 mb-0.5">• {e}</p>)}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={reset} className="btn-secondary flex-1 h-11 text-sm gap-1.5">
                <Upload size={14}/> Import Lagi
              </button>
              <button onClick={() => window.location.href = '/erp/orders'}
                className="btn-primary flex-1 h-11 text-sm gap-1.5">
                <Truck size={14}/> Lihat di Halaman Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PANEL KELOLA MAPPING (overlay) ──────────────────── */}
      {showMappings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMappings(false)}/>
          <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div>
                <h3 className="font-bold text-sm">Mapping SKU Marketplace</h3>
                <p className="text-xs text-[var(--text-muted)]">Produk yang pernah dipilih manual — otomatis dipakai di import berikutnya</p>
              </div>
              <button onClick={() => setShowMappings(false)} className="btn-icon-sm"><X size={14}/></button>
            </div>

            {/* Filter bar */}
            <div className="px-4 pt-3 flex gap-2">
              <select value={branch} onChange={e => { setBranch(e.target.value); loadMappings(); }}
                className="input-base h-8 text-xs w-36">
                <option value="1">GP Racing Store</option>
                <option value="2">GP Distro</option>
              </select>
              <button onClick={loadMappings} disabled={loadingMappings} className="btn-secondary h-8 px-3 text-xs gap-1">
                {loadingMappings ? <Loader2 size={12} className="animate-spin"/> : <RotateCcw size={12}/>} Refresh
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {loadingMappings && <p className="text-xs text-center text-[var(--text-muted)] py-8">Memuat...</p>}
              {!loadingMappings && savedMappings.length === 0 && (
                <p className="text-xs text-center text-[var(--text-muted)] py-8">Belum ada mapping tersimpan untuk cabang ini</p>
              )}
              {savedMappings.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <div className="flex-1 min-w-0">
                    {/* Marketplace key — tampilkan lebih bersih */}
                    <p className="text-xs font-mono text-[var(--text-muted)] truncate">
                      {m.marketplace_key.replace('__name__:', '📦 ').replace('__sku__:', '🏷️ SKU: ')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${m.platform === 'tiktok' ? 'bg-black text-white' : 'bg-orange-500 text-white'}`}>
                        {m.platform === 'tiktok' ? '🎵 TikTok' : '🛍️ Shopee'}
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">→ {m.product_name}</span>
                      {m.variant_name && <span className="text-[10px] text-[var(--brand-600)] bg-[var(--brand-600)]/10 px-1.5 py-0.5 rounded-full">{m.variant_name}</span>}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">SKU sistem: {m.product_sku} · Updated: {new Date(m.updated_at).toLocaleDateString('id')}</p>
                  </div>
                  <button onClick={() => deleteMapping(m.id)} className="btn-icon-sm text-red-500 hover:text-red-700 flex-shrink-0">
                    <X size={13}/>
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-blue-50 dark:bg-blue-950/30">
              <p className="text-[11px] text-blue-700 dark:text-blue-400">
                💡 Mapping disimpan per platform + cabang. Menghapus mapping tidak membatalkan order yang sudah terbuat — hanya membuat import berikutnya perlu pilih manual lagi.
              </p>
            </div>
          </div>
        </div>
      )};
    </div>
  );
}
