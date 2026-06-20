import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package, Plus, Edit3, X, Loader2, CheckCircle2, AlertTriangle, Trash2,
  Store, ChevronDown, ChevronUp, ChevronsUpDown, Upload, Image as ImageIcon,
  Search, MoreHorizontal, Copy, ChevronLeft, ChevronRight, Eye,
  Layers, Sparkles, RefreshCw, Power, PowerOff, Check, Wrench, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import { erpService, toRpShort } from '../../utils/erp/erpService';
import { createStoreProduct, updateStoreProduct, getStoreCategories } from '../../utils/storeService';

// ── Helpers ───────────────────────────────────────────────────
const toSlug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const calcMargin = (sell, buy) => {
  if (!sell || !buy || buy <= 0) return null;
  return Math.round(((sell - buy) / buy) * 100);
};

const toBase64 = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

// ── Variant Editor ────────────────────────────────────────────
function VariantEditor({ variants, onChange, brand }) {
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState({});

  const PRESETS = brand === 'gpdistro'
    ? [{ k: 'Ukuran', v: ['S','M','L','XL','XXL'] }, { k: 'Warna', v: ['Hitam','Putih','Abu'] }]
    : [{ k: 'Tipe Motor', v: ['Vario 125','Vario 150','Beat','Nmax','Aerox'] }];

  const addPreset = (p) => {
    if (variants[p.k]) return;
    onChange({ ...variants, [p.k]: p.v });
  };

  const addKey = () => {
    if (!newKey.trim() || variants[newKey.trim()]) return;
    onChange({ ...variants, [newKey.trim()]: [] });
    setNewKey('');
  };

  const addVal = (k) => {
    const v = (newVal[k] || '').trim();
    if (!v || (variants[k] || []).includes(v)) return;
    onChange({ ...variants, [k]: [...(variants[k] || []), v] });
    setNewVal(prev => ({ ...prev, [k]: '' }));
  };

  const removeVal = (k, v) => {
    const arr = variants[k].filter(x => x !== v);
    if (!arr.length) { const n = { ...variants }; delete n[k]; onChange(n); }
    else onChange({ ...variants, [k]: arr });
  };

  return (
    <div className="space-y-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-[var(--text-muted)] self-center">Preset:</span>
        {PRESETS.map(p => (
          <button key={p.k} type="button" onClick={() => addPreset(p)}
            disabled={!!variants[p.k]}
            className="text-xs px-3 py-1 border border-dashed border-[var(--border)] rounded hover:border-[var(--brand-600)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            + {p.k}
          </button>
        ))}
      </div>

      {/* Existing variant groups */}
      {Object.entries(variants).map(([k, vals]) => (
        <div key={k} className="border border-[var(--border)] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wide">{k}</span>
            <button type="button" onClick={() => { const n={...variants}; delete n[k]; onChange(n); }}
              className="text-xs text-red-400 hover:text-red-600">Hapus</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
            {vals.map(v => (
              <span key={v}
                className="inline-flex items-center gap-1 bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 rounded text-xs">
                {v}
                <button type="button" onClick={() => removeVal(k, v)}>
                  <X size={10} className="text-[var(--text-muted)] hover:text-red-500"/>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input value={newVal[k] || ''}
              onChange={e => setNewVal(p => ({ ...p, [k]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVal(k))}
              placeholder={`Tambah opsi ${k}...`}
              className="input-base text-xs py-1.5 flex-1"/>
            <button type="button" onClick={() => addVal(k)}
              className="btn-primary text-xs py-1.5 px-3">+</button>
          </div>
        </div>
      ))}

      {/* Add new group */}
      <div className="flex gap-1.5">
        <input value={newKey}
          onChange={e => setNewKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKey())}
          placeholder="Nama varian baru..."
          className="input-base text-xs py-1.5 flex-1"/>
        <button type="button" onClick={addKey}
          className="btn-outline text-xs py-1.5 px-3">+ Grup</button>
      </div>
    </div>
  );
}

// ── Image Uploader ────────────────────────────────────────────
function ImageUploader({ images, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const inputRef = useRef();

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'hrd_attendance';

  // Compress image before upload
  const compressImage = (file, maxKB = 100) => new Promise((resolve) => {
    if (file.size <= maxKB * 1024) { resolve(file); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const MAX = 1200;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const tryQ = (q) => new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
      const search = async () => {
        let lo = 0.1, hi = 0.9, best = null;
        for (let i = 0; i < 8; i++) {
          const mid = (lo + hi) / 2;
          const blob = await tryQ(mid);
          if (blob.size <= maxKB * 1024) { best = blob; lo = mid; }
          else hi = mid;
          if (hi - lo < 0.02) break;
        }
        if (!best) best = await tryQ(0.1);
        resolve(new File([best], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
      };
      search();
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });

  const uploadToCloudinary = async (file) => {
    if (!CLOUD_NAME) throw new Error('Cloudinary belum dikonfigurasi (VITE_CLOUDINARY_CLOUD_NAME)');
    const compressed = await compressImage(file, 100);
    const fd = new FormData();
    fd.append('file', compressed);
    fd.append('upload_preset', UPLOAD_PRESET);
    // No folder param - let preset handle it to avoid conflict
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST', body: fd,
    });
    const d = await r.json();
    if (!d.secure_url) throw new Error(d.error?.message || 'Upload gagal');
    return d.secure_url;
  };

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    setProgress(0);
    try {
      const urls = [];
      for (let i = 0; i < Math.min(files.length, 6 - images.length); i++) {
        const url = await uploadToCloudinary(files[i]);
        urls.push(url);
        setProgress(Math.round((i + 1) / files.length * 100));
      }
      onChange([...images, ...urls].slice(0, 6));
      toast.success(`${urls.length} foto berhasil diupload`);
    } catch(e) { toast.error('Gagal upload: ' + e.message); }
    finally { setUploading(false); setProgress(0); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
        {images.map((img, i) => (
          <div key={i} className="relative group aspect-square bg-[var(--bg)] border border-[var(--border)] rounded overflow-hidden">
            <img src={img} alt="" className="w-full h-full object-cover"/>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center">
                <Trash2 size={13} className="text-white"/>
              </button>
            </div>
            {i === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-[var(--brand-600)] text-white text-[9px] text-center py-0.5">
                Utama
              </span>
            )}
          </div>
        ))}
        {images.length < 6 && (
          <button type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="aspect-square border-2 border-dashed border-[var(--border)] rounded flex flex-col items-center justify-center gap-1 hover:border-[var(--brand-600)] hover:bg-[var(--brand-600)]/5 transition-colors text-[var(--text-muted)] cursor-pointer">
            {uploading
              ? <>
                  <Loader2 size={18} className="animate-spin text-[var(--brand-600)]"/>
                  <span className="text-[9px] text-[var(--brand-600)]">{progress}%</span>
                </>
              : <>
                  <Upload size={18}/>
                  <span className="text-[10px]">Upload</span>
                  <span className="text-[9px] text-[var(--text-muted)]">max 100KB</span>
                </>}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only"
        onChange={e => handleFiles(e.target.files)}/>
      <p className="text-[10px] text-[var(--text-muted)] mt-1">
        📐 Gambar otomatis dikompres maks 100KB · Maks 6 foto · JPG, PNG, WebP
      </p>
      <p className="text-[10px] text-[var(--text-muted)]">
        Maks 6 foto · JPG, PNG, WebP · Foto pertama = foto utama
      </p>
    </div>
  );
}

// ── Unified Product Modal ─────────────────────────────────────
const TABS = [
  { id: 'basic',   label: 'Info Dasar' },
  { id: 'pricing', label: 'Harga & Stok' },
  { id: 'media',   label: 'Foto & Varian' },
  { id: 'store',   label: 'Toko Online' },
];

const EMPTY = {
  // ERP fields
  branch_id: 1, category_id: '', name: '', sku: '', barcode: '',
  unit: 'pcs', buy_price: 0, sell_price: 0,
  sell_price_mp: '', sell_price_wa: '',
  stock_min: 0, weight: 0.5, notes: '',
  // Store fields
  images: [], variants: {},
  publish_gpdistro: false, publish_gpracing: false,
  store_price_gpdistro: '', store_price_compare_gpdistro: '',
  store_price_gpracing: '', store_price_compare_gpracing: '',
  store_category_gpdistro: '', store_category_gpracing: '',
  short_desc: '', description: '',
  meta_title: '', meta_desc: '', tags: '',
};

// ════════════════════════════════════════════════════════════════════
// VariantCombinationsManager — kelola kombinasi varian (Phase 1)
// Hanya tampil jika product sudah disave (punya id)
// ════════════════════════════════════════════════════════════════════
function VariantCombinationsManager({ productId, attributeSchema, sellPrice, branchId }) {
  const [variants, setVariants]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [generating, setGen]      = useState(false);
  const [editing, setEditing]     = useState(null);    // variant being edited
  const [adjusting, setAdjusting] = useState(null);    // variant for stock adjust

  const fetchVariants = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await erpService.getProductVariants(productId);
      setVariants(res.data?.data?.variants || []);
    } catch (e) {
      toast.error('Gagal memuat varian');
    } finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { fetchVariants(); }, [fetchVariants]);

  const hasValidSchema = attributeSchema &&
    Object.keys(attributeSchema).length > 0 &&
    Object.values(attributeSchema).every(arr => Array.isArray(arr) && arr.length > 0);

  const expectedCount = hasValidSchema
    ? Object.values(attributeSchema).reduce((acc, arr) => acc * arr.length, 1)
    : 0;

  const handleGenerate = async (overwrite = false) => {
    if (!hasValidSchema) {
      toast.error('Definisikan atribut varian dulu di atas');
      return;
    }
    if (variants.length > 0 && !overwrite) {
      if (!confirm(`Sudah ada ${variants.length} varian. Generate akan menambahkan kombinasi yang belum ada, BUKAN menimpa. Lanjut?`)) return;
    }
    setGen(true);
    try {
      const res = await erpService.generateVariants(productId, {
        schema: attributeSchema,
        overwrite,
      });
      toast.success(res.data?.message || 'Berhasil');
      await fetchVariants();
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === 'VARIANTS_USED_IN_ORDERS') {
        toast.error(e.response.data.message);
      } else {
        toast.error(e.response?.data?.message || 'Gagal generate');
      }
    } finally { setGen(false); }
  };

  const handleDelete = async (v) => {
    if (!confirm(`Hapus varian "${v.name}"?`)) return;
    try {
      await erpService.deleteVariant(v.id);
      toast.success('Varian dihapus');
      await fetchVariants();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal hapus');
    }
  };

  const handleToggle = async (v) => {
    try {
      await erpService.toggleVariant(v.id);
      await fetchVariants();
    } catch { toast.error('Gagal toggle'); }
  };

  if (!productId) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <span>Simpan produk dulu (klik "Simpan" di bawah), lalu buka kembali untuk mengelola kombinasi varian.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header & Generator */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-xs font-bold text-[var(--text-primary)]">Kombinasi Varian</p>
          <p className="text-[10px] text-[var(--text-muted)]">
            {variants.length} kombinasi
            {hasValidSchema && expectedCount > variants.length && ` · ${expectedCount - variants.length} kombinasi baru dapat di-generate`}
            {hasValidSchema && expectedCount === variants.length && variants.length > 0 && ' · semua kombinasi ter-generate'}
          </p>
        </div>
        {hasValidSchema && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleGenerate(false)} disabled={generating}
              className="btn-secondary text-xs h-8 px-3 gap-1">
              {generating ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
              Generate Kombinasi
            </button>
            {variants.length > 0 && (
              <button type="button"
                onClick={() => { if (confirm('OVERWRITE akan hapus semua varian existing dan stock-nya. Lanjut?')) handleGenerate(true); }}
                disabled={generating}
                className="btn-icon-sm hover:text-red-600" title="Overwrite (reset)">
                <RefreshCw size={12}/>
              </button>
            )}
          </div>
        )}
      </div>

      {/* List varian */}
      {loading ? (
        <div className="space-y-1.5">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-12 rounded-lg"/>)}</div>
      ) : variants.length === 0 ? (
        <div className="text-center py-6 bg-[var(--bg-secondary)] rounded-xl">
          <Layers size={28} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30"/>
          <p className="text-xs text-[var(--text-muted)]">
            {hasValidSchema
              ? 'Belum ada kombinasi. Klik "Generate Kombinasi" untuk membuat otomatis dari atribut di atas.'
              : 'Definisikan atribut varian di atas dulu (mis. Ukuran, Warna), lalu generate kombinasi.'}
          </p>
        </div>
      ) : (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-secondary)]">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-[var(--text-muted)] uppercase tracking-wide">Varian</th>
                  <th className="px-3 py-2 text-left font-bold text-[var(--text-muted)] uppercase tracking-wide">SKU</th>
                  <th className="px-3 py-2 text-right font-bold text-[var(--text-muted)] uppercase tracking-wide">Harga</th>
                  <th className="px-3 py-2 text-center font-bold text-[var(--text-muted)] uppercase tracking-wide">Stok</th>
                  <th className="px-3 py-2 text-center font-bold text-[var(--text-muted)] uppercase tracking-wide">Min</th>
                  <th className="px-3 py-2 text-right font-bold text-[var(--text-muted)] uppercase tracking-wide">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {variants.map(v => {
                  const price = v.price_override != null ? parseFloat(v.price_override) : parseFloat(sellPrice || 0);
                  const totalStock = v.stock_total || 0;
                  const isLow = v.stock_min > 0 && totalStock <= v.stock_min;
                  return (
                    <tr key={v.id} className={!v.is_active ? 'opacity-40' : ''}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Tag size={11} className="text-[var(--text-muted)] flex-shrink-0"/>
                          <span className="font-semibold">{v.name}</span>
                          {!v.is_active && (
                            <span className="text-[9px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">Nonaktif</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-[var(--text-muted)]">{v.sku || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {v.price_override != null
                          ? <span className="text-emerald-600 font-semibold">{toRpShort(price)}</span>
                          : <span className="text-[var(--text-muted)]">{toRpShort(price)} <span className="text-[9px]">(default)</span></span>}
                      </td>
                      <td className={`px-3 py-2 text-center font-bold ${isLow ? 'text-red-600' : ''}`}>{totalStock}</td>
                      <td className="px-3 py-2 text-center text-[var(--text-muted)]">{v.stock_min || 0}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => setAdjusting(v)}
                            className="btn-icon-sm" title="Adjust stok">
                            <Wrench size={11}/>
                          </button>
                          <button type="button" onClick={() => setEditing(v)}
                            className="btn-icon-sm" title="Edit">
                            <Edit3 size={11}/>
                          </button>
                          <button type="button" onClick={() => handleToggle(v)}
                            className="btn-icon-sm" title={v.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                            {v.is_active ? <Power size={11}/> : <PowerOff size={11}/>}
                          </button>
                          <button type="button" onClick={() => handleDelete(v)}
                            className="btn-icon-sm hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" title="Hapus">
                            <Trash2 size={11}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <VariantEditModal
          variant={editing}
          defaultPrice={sellPrice}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchVariants(); }}
        />
      )}

      {/* Adjust stock modal */}
      {adjusting && (
        <VariantStockAdjustModal
          variant={adjusting}
          defaultBranch={branchId}
          onClose={() => setAdjusting(null)}
          onSaved={() => { setAdjusting(null); fetchVariants(); }}
        />
      )}
    </div>
  );
}

// ── Modal: Edit single variant ────────────────────────────────
function VariantEditModal({ variant, defaultPrice, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: variant.name || '',
    sku: variant.sku || '',
    barcode: variant.barcode || '',
    price_override: variant.price_override ?? '',
    stock_min: variant.stock_min ?? 0,
    notes: variant.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    setSaving(true);
    try {
      await erpService.updateVariant(variant.id, form);
      toast.success('Varian diperbarui');
      onSaved?.();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-sm font-bold">Edit Varian</h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body space-y-3">
          <div>
            <label className="field-label">Nama Varian</label>
            <input value={form.name} onChange={e => sf('name', e.target.value)} className="input-base" autoFocus/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">SKU</label>
              <input value={form.sku} onChange={e => sf('sku', e.target.value)} className="input-base font-mono text-xs"/>
            </div>
            <div>
              <label className="field-label">Barcode</label>
              <input value={form.barcode} onChange={e => sf('barcode', e.target.value)} className="input-base font-mono text-xs"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Harga Override</label>
              <input type="number" value={form.price_override}
                onChange={e => sf('price_override', e.target.value)}
                className="input-base" placeholder={`Default: ${defaultPrice || 0}`}/>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Kosongkan = pakai harga produk</p>
            </div>
            <div>
              <label className="field-label">Stok Minimum</label>
              <input type="number" value={form.stock_min}
                onChange={e => sf('stock_min', e.target.value)}
                className="input-base"/>
            </div>
          </div>
          <div>
            <label className="field-label">Catatan</label>
            <textarea value={form.notes} onChange={e => sf('notes', e.target.value)}
              rows={2} className="input-base resize-none"/>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Adjust stock per variant per branch ─────────────────
function VariantStockAdjustModal({ variant, defaultBranch, onClose, onSaved }) {
  const [branch, setBranch] = useState(defaultBranch || 1);
  const [delta, setDelta]   = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  const current = (variant.stock_branches || []).find(s => s.branch_id == branch);
  const currentQty = current?.qty || 0;
  const after = currentQty + (parseInt(delta) || 0);

  const handle = async () => {
    const d = parseInt(delta);
    if (!Number.isFinite(d) || d === 0) { toast.error('Masukkan jumlah perubahan (boleh +/-)'); return; }
    setSaving(true);
    try {
      await erpService.adjustVariantStock(variant.id, { branch_id: parseInt(branch), qty_change: d, notes });
      toast.success(`Stok berubah ${d > 0 ? '+' : ''}${d}`);
      onSaved?.();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-sm font-bold">Adjust Stok</h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body space-y-3">
          <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Varian</p>
            <p className="text-sm font-bold">{variant.name}</p>
          </div>
          <div>
            <label className="field-label">Cabang</label>
            <select value={branch} onChange={e => setBranch(e.target.value)} className="input-base">
              <option value="1">GP Racing</option>
              <option value="2">GP Distro</option>
            </select>
          </div>
          <div>
            <label className="field-label">Perubahan Qty (boleh negatif)</label>
            <input type="number" value={delta} onChange={e => setDelta(e.target.value)}
              placeholder="+10 atau -5" className="input-base text-center text-base font-bold" autoFocus/>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[10px] text-[var(--text-muted)]">Sebelum</p><p className="text-sm font-bold">{currentQty}</p></div>
            <div className="text-[var(--brand-600)] font-bold self-center">→</div>
            <div><p className="text-[10px] text-[var(--text-muted)]">Sesudah</p><p className={`text-sm font-bold ${after < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{after}</p></div>
          </div>
          <div>
            <label className="field-label">Catatan (opsional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="mis. Inisialisasi stok awal" className="input-base text-xs"/>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving || after < 0} className="btn-primary flex-1">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
            Adjust Stok
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
function ProductModal({ product, allCategories, onClose, onSuccess }) {
  const isEdit = !!product;
  const [tab, setTab] = useState('basic');
  const [form, setForm] = useState(() => {
    if (!product) return { ...EMPTY };
    // Map API fields → form fields
    const p = product;
    return {
      ...EMPTY,
      ...p,
      // Basic
      branch_id:    p.branch_id   || 1,
      store_category_id:  p.category_id || '',
      name:         p.name        || '',
      sku:          p.sku         || '',
      barcode:      p.barcode     || '',
      unit:         p.unit        || 'pcs',
      buy_price:    p.buy_price   || 0,
      sell_price:   p.sell_price  || 0,
      sell_price_mp: p.sell_price_mp || '',
      sell_price_wa: p.sell_price_wa || '',
      stock_min:    p.stock_min   || 0,
      weight:       p.weight      || 0,
      notes:        p.notes       || '',
      // Store fields — map from erp_products store_* columns
      images:       Array.isArray(p.store_images)  ? p.store_images  : (p.images || []),
      variants:     typeof p.store_variants === 'object' && p.store_variants ? p.store_variants : (p.variants || {}),
      publish_gpdistro:  !!(p.store_active_gpd),
      publish_gpracing:  !!(p.store_active_gpr),
      store_price_gpdistro:    p.branch_id === 2 ? (p.store_price || p.sell_price_mp || '') : '',
      store_price_compare_gpdistro: p.branch_id === 2 ? (p.store_price_compare || '') : '',
      store_price_gpracing:    p.branch_id === 1 ? (p.store_price || p.sell_price_mp || '') : '',
      store_price_compare_gpracing: p.branch_id === 1 ? (p.store_price_compare || '') : '',
      store_category_gpdistro: p.branch_id === 2 ? String(p.category_id || '') : '',
      store_category_gpracing: p.branch_id === 1 ? String(p.category_id || '') : '',
      short_desc:   p.store_short_desc   || '',
      description:  p.store_description || '',
      meta_title:   p.store_meta_title   || '',
      meta_desc:    p.store_meta_desc    || '',
      store_slug:   p.store_slug         || '',
      store_featured: !!(p.store_featured),
      tags:         Array.isArray(p.store_tags) ? p.store_tags.join(', ') : (p.store_tags || ''),
    };
  });
  const [saving, setSaving] = useState(false);
  const [storeCategories, setStoreCategories] = useState({ gpdistro: [], gpracing: [] });

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([
      getStoreCategories('gpdistro').then(r => r.data.data.categories || []).catch(() => []),
      getStoreCategories('gpracing').then(r => r.data.data.categories || []).catch(() => []),
    ]).then(([gd, gr]) => setStoreCategories({ gpdistro: gd, gpracing: gr }));
  }, []);

  // Auto-fill store price from ERP price
  useEffect(() => {
    if (!form.store_price_gpdistro && form.sell_price_mp)
      sf('store_price_gpdistro', form.sell_price_mp);
    if (!form.store_price_gpracing && form.sell_price_mp)
      sf('store_price_gpracing', form.sell_price_mp);
  }, [form.sell_price_mp]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Nama produk wajib diisi'); setTab('basic'); return; }
    if (!form.sell_price) { toast.error('Harga jual wajib diisi'); setTab('pricing'); return; }
    setSaving(true);
    try {
      // 1. Save to ERP
      let erpId = product?.id;
      const erpPayload = {
        branch_id: form.branch_id, category_id: form.category_id || null,
        name: form.name, sku: form.sku, barcode: form.barcode,
        unit: form.unit, buy_price: parseFloat(form.buy_price) || 0,
        sell_price: parseFloat(form.sell_price) || 0,
        sell_price_mp: parseFloat(form.sell_price_mp) || null,
        sell_price_wa: parseFloat(form.sell_price_wa) || null,
        stock_min: parseInt(form.stock_min) || 0,
        weight: parseFloat(form.weight) || 0,
        notes: form.notes,
        // Store fields — saved directly to erp_products
        // category_id: use branch-specific store category
        category_id: (() => {
          const branchId = parseInt(form.branch_id) || 1;
          const cat = branchId === 2
            ? form.store_category_gpdistro
            : form.store_category_gpracing;
          return cat ? parseInt(cat) : (form.category_id ? parseInt(form.category_id) : null);
        })(),
        store_price:         parseFloat(
                               parseInt(form.branch_id) === 2
                                 ? (form.store_price_gpdistro || form.sell_price_mp || form.sell_price)
                                 : (form.store_price_gpracing || form.sell_price_mp || form.sell_price)
                             ) || 0,
        store_price_compare: parseFloat(
                               parseInt(form.branch_id) === 2
                                 ? form.store_price_compare_gpdistro
                                 : form.store_price_compare_gpracing
                             ) || 0,
        store_active_gpd:    form.publish_gpdistro ? 1 : 0,
        store_active_gpr:    form.publish_gpracing ? 1 : 0,
        store_images:        Array.isArray(form.images) ? form.images.filter(img => img && typeof img === 'string' && img.startsWith('http')) : [],
        store_variants:      form.variants || {},
        store_tags:          form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        store_short_desc:    form.short_desc || '',
        store_description:   form.description || '',
        store_meta_title:    form.meta_title || form.name,
        store_meta_desc:     form.meta_desc || '',
        store_slug:          toSlug(form.name) + '-' + (form.branch_id || 1),
        store_featured:      form.publish_gpdistro || form.publish_gpracing ? (form.store_featured || false) : false,
      };
      if (isEdit) await erpService.updateProduct(erpId, erpPayload);
      else {
        const r = await erpService.createProduct(erpPayload);
        erpId = r.data.data?.product?.id || r.data.data?.id;
      }

      // 2. Store fields sudah tersimpan di erp_products langsung
      toast.success(isEdit ? 'Produk diperbarui' : 'Produk ditambahkan');
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan produk');
    } finally { setSaving(false); }
  };

  const margin = calcMargin(form.sell_price, form.buy_price);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Package size={15}/>
            {isEdit ? 'Edit Produk' : 'Tambah Produk Baru'}
          </h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px flex-shrink-0 ${
                tab === t.id
                  ? 'border-[var(--brand-600)] text-[var(--brand-600)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}>
              {t.label}
              {t.id === 'store' && (form.publish_gpdistro || form.publish_gpracing) && (
                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-green-500 inline-block"/>
              )}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {/* ── Tab 1: Info Dasar ──────────────────────── */}
          {tab === 'basic' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Cabang / Brand</label>
                  <select value={form.branch_id}
                    onChange={e => sf('branch_id', parseInt(e.target.value))}
                    className="input-base text-sm">
                    <option value={1}>GP Racing</option>
                    <option value={2}>GP Distro</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Kategori ERP</label>
                  <select value={form.category_id}
                    onChange={e => sf('category_id', e.target.value)}
                    className="input-base text-sm">
                    <option value="">— Pilih Kategori —</option>
                    {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">Nama Produk *</label>
                <input value={form.name}
                  onChange={e => sf('name', e.target.value)}
                  className="input-base" autoFocus placeholder="Nama lengkap produk"/>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="field-label">SKU</label>
                  <input value={form.sku} onChange={e => sf('sku', e.target.value)}
                    className="input-base font-mono text-sm" placeholder="GPR-001"/>
                </div>
                <div>
                  <label className="field-label">Barcode</label>
                  <input value={form.barcode} onChange={e => sf('barcode', e.target.value)}
                    className="input-base font-mono text-sm"/>
                </div>
                <div>
                  <label className="field-label">Satuan</label>
                  <input value={form.unit} onChange={e => sf('unit', e.target.value)}
                    className="input-base" placeholder="pcs"/>
                </div>
              </div>
              <div>
                <label className="field-label">Catatan Internal</label>
                <textarea value={form.notes} onChange={e => sf('notes', e.target.value)}
                  rows={2} className="input-base resize-none text-sm"
                  placeholder="Catatan untuk tim internal (tidak tampil di toko)"/>
              </div>
            </div>
          )}

          {/* ── Tab 2: Harga & Stok ───────────────────── */}
          {tab === 'pricing' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Harga Beli / HPP (Rp)</label>
                  <input type="number" value={form.buy_price}
                    onChange={e => sf('buy_price', e.target.value)}
                    className="input-base" placeholder="0"/>
                </div>
                <div>
                  <label className="field-label">
                    Harga Jual (Rp) *
                    {margin !== null && (
                      <span className={`ml-2 text-xs font-bold ${margin >= 20 ? 'text-green-600' : margin >= 0 ? 'text-amber-600' : 'text-red-500'}`}>
                        {margin >= 0 ? '+' : ''}{margin}% margin
                      </span>
                    )}
                  </label>
                  <input type="number" value={form.sell_price}
                    onChange={e => sf('sell_price', e.target.value)}
                    className="input-base" placeholder="0"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Harga Marketplace (Rp)</label>
                  <input type="number" value={form.sell_price_mp}
                    onChange={e => sf('sell_price_mp', e.target.value)}
                    className="input-base" placeholder="Opsional"/>
                </div>
                <div>
                  <label className="field-label">Harga WA / Reseller (Rp)</label>
                  <input type="number" value={form.sell_price_wa}
                    onChange={e => sf('sell_price_wa', e.target.value)}
                    className="input-base" placeholder="Opsional"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Stok Minimum</label>
                  <input type="number" value={form.stock_min}
                    onChange={e => sf('stock_min', e.target.value)}
                    className="input-base" placeholder="0"/>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Alert saat stok ≤ angka ini</p>
                </div>
                <div>
                  <label className="field-label">Berat (kg)</label>
                  <input type="number" step="0.1" value={form.weight}
                    onChange={e => sf('weight', e.target.value)}
                    className="input-base" placeholder="0.5"/>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Untuk kalkulasi ongkir toko</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 3: Foto & Varian ──────────────────── */}
          {tab === 'media' && (
            <div className="space-y-5">
              <div>
                <label className="field-label mb-2 block">Foto Produk</label>
                <ImageUploader images={form.images} onChange={v => sf('images', v)}/>
              </div>
              <div>
                <label className="field-label mb-2 block">Atribut Varian</label>
                <p className="text-[11px] text-[var(--text-muted)] mb-3">
                  Definisikan grup atribut (mis. Ukuran, Warna). Setelah selesai, generate kombinasi di bawah.
                </p>
                <VariantEditor
                  variants={form.variants}
                  onChange={v => sf('variants', v)}
                  brand={form.branch_id === 2 ? 'gpdistro' : 'gpracing'}
                />
              </div>

              {/* Section baru: Kombinasi Varian (Phase 1) */}
              <div className="border-t border-[var(--border)] pt-5">
                <VariantCombinationsManager
                  productId={isEdit ? product?.id : null}
                  attributeSchema={form.variants}
                  sellPrice={form.sell_price}
                  branchId={form.branch_id}
                />
              </div>
            </div>
          )}

          {/* ── Tab 4: Toko Online ────────────────────── */}
          {tab === 'store' && (
            <div className="space-y-5">
              {/* Publish toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'gpdistro', label: 'GPDISTRO', sub: 'Fashion & Digital Printing', color: '#1a1a2e' },
                  { key: 'gpracing', label: 'GP RACING STORE', sub: 'Spare Part Motor Racing', color: '#dc2626' },
                ].map(b => (
                  <label key={b.key}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      form[`publish_${b.key}`]
                        ? 'border-[var(--brand-600)] bg-[var(--brand-600)]/5'
                        : 'border-[var(--border)] hover:border-[var(--brand-600)]/40'
                    }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ background: b.color }}/>
                        <div>
                          <p className="text-xs font-bold">{b.label}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{b.sub}</p>
                        </div>
                      </div>
                      <input type="checkbox"
                        checked={form[`publish_${b.key}`]}
                        onChange={e => sf(`publish_${b.key}`, e.target.checked)}
                        className="w-4 h-4 mt-0.5"/>
                    </div>

                    {form[`publish_${b.key}`] && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2"
                        onClick={e => e.preventDefault()}>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-[var(--text-muted)] mb-1">Harga Jual Toko *</p>
                            <input type="number"
                              value={form[`store_price_${b.key}`]}
                              onChange={e => sf(`store_price_${b.key}`, e.target.value)}
                              className="input-base text-sm py-1.5"
                              placeholder="Harga konsumen"/>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-muted)] mb-1">Harga Coret (Rp)</p>
                            <input type="number"
                              value={form[`store_price_compare_${b.key}`]}
                              onChange={e => sf(`store_price_compare_${b.key}`, e.target.value)}
                              className="input-base text-sm py-1.5"
                              placeholder="Opsional"/>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)] mb-1">Kategori Toko</p>
                          <select value={form[`store_category_${b.key}`]}
                            onChange={e => sf(`store_category_${b.key}`, e.target.value)}
                            className="input-base text-sm py-1.5">
                            <option value="">— Tanpa Kategori —</option>
                            {storeCategories[b.key].map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </label>
                ))}
              </div>

              {/* Description for store */}
              <div>
                <label className="field-label">Deskripsi Singkat (Toko)</label>
                <textarea value={form.short_desc}
                  onChange={e => sf('short_desc', e.target.value)}
                  rows={2} className="input-base mt-1 resize-none text-sm"
                  placeholder="Ringkasan produk untuk listing toko"/>
              </div>
              <div>
                <label className="field-label">Deskripsi Lengkap (Toko)</label>
                <textarea value={form.description}
                  onChange={e => sf('description', e.target.value)}
                  rows={4} className="input-base mt-1 resize-none text-sm"
                  placeholder="Spesifikasi, fitur, cara pemasangan, kompatibilitas motor..."/>
              </div>

              {/* SEO */}
              <div className="border border-[var(--border)] rounded-lg p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">SEO</p>
                <div>
                  <label className="field-label">Meta Title</label>
                  <input value={form.meta_title}
                    onChange={e => sf('meta_title', e.target.value)}
                    className="input-base mt-1 text-sm"
                    placeholder={form.name || 'Judul untuk Google (maks 60 karakter)'}
                    maxLength={60}/>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{(form.meta_title||'').length}/60</p>
                </div>
                <div>
                  <label className="field-label">Meta Description</label>
                  <textarea value={form.meta_desc}
                    onChange={e => sf('meta_desc', e.target.value)}
                    rows={2} className="input-base mt-1 resize-none text-sm"
                    placeholder="Deskripsi untuk Google (maks 160 karakter)" maxLength={160}/>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{(form.meta_desc||'').length}/160</p>
                </div>
                <div>
                  <label className="field-label">Tags (pisah dengan koma)</label>
                  <input value={form.tags}
                    onChange={e => sf('tags', e.target.value)}
                    className="input-base mt-1 text-sm"
                    placeholder="kampas rem, vario, beat, racing"/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          <div className="flex items-center gap-2 ml-auto">
            {/* Tab navigation */}
            {tab !== 'basic' && (
              <button type="button"
                onClick={() => setTab(TABS[TABS.findIndex(t => t.id === tab) - 1].id)}
                className="btn-outline text-xs py-2 px-4">← Sebelumnya</button>
            )}
            {tab !== 'store' ? (
              <button type="button"
                onClick={() => setTab(TABS[TABS.findIndex(t => t.id === tab) + 1].id)}
                className="btn-primary text-xs py-2 px-4">Selanjutnya →</button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="btn-primary gap-2 disabled:opacity-60">
                {saving
                  ? <Loader2 size={15} className="animate-spin"/>
                  : <CheckCircle2 size={15}/>}
                {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Produk'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Publish Modal ─────────────────────────────────────────
const BRAND_INFO = {
  gpdistro: { label: 'GPDISTRO',       sub: 'Fashion & Digital Printing', color: '#1a1a2e' },
  gpracing: { label: 'GP RACING STORE', sub: 'Spare Part Motor Racing',    color: '#dc2626' },
};

function BulkPublishModal({ products, onClose, onDone }) {
  const [brand,    setBrand]    = useState('gpracing');
  const [rows,     setRows]     = useState(() =>
    products.map(p => ({
      id:            p.id,
      name:          p.name,
      sku:           p.sku,
      buy_price:     p.buy_price || 0,
      weight:        p.weight || 0.5,
      stock:         p.stock?.qty || 0,
      unit:          p.unit,
      branch_id:     p.branch_id,
      // editable per-row
      store_price:   p.sell_price_mp || p.sell_price || '',
      price_compare: '',
      category_id:   '',
      skip:          false,
    }))
  );
  const [storeCategories, setStoreCategories] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [done,       setDone]       = useState([]); // ids that succeeded
  const [failed,     setFailed]     = useState([]); // ids that failed

  useEffect(() => {
    getStoreCategories(brand)
      .then(r => setStoreCategories(r.data.data.categories || []))
      .catch(() => {});
  }, [brand]);

  // Auto-set brand from majority branch_id
  useEffect(() => {
    const gpd = products.filter(p => p.branch_id === 2).length;
    const gpr = products.filter(p => p.branch_id === 1).length;
    setBrand(gpd >= gpr ? 'gpdistro' : 'gpracing');
  }, []);

  const setRow = (id, k, v) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [k]: v } : r));

  const activeRows = rows.filter(r => !r.skip);
  const margin = (sell, buy) => {
    if (!sell || !buy || buy <= 0) return null;
    return Math.round(((sell - buy) / buy) * 100);
  };

  const handlePublish = async () => {
    const targets = rows.filter(r => !r.skip && r.store_price);
    if (!targets.length) { toast.error('Tidak ada produk yang dipilih / harga belum diisi'); return; }

    setPublishing(true);
    const ok = [], fail = [];

    for (const r of targets) {
      try {
        // Update store fields on existing ERP product — no duplicate insert
        await erpService.updateProduct(r.id, {
          store_price:         parseFloat(r.store_price) || 0,
          store_price_compare: parseFloat(r.price_compare) || 0,
          store_active_gpd:    brand === 'gpdistro' ? 1 : (r.store_active_gpd ? 1 : 0),
          store_active_gpr:    brand === 'gpracing' ? 1 : (r.store_active_gpr ? 1 : 0),
          store_slug:          r.store_slug || (toSlug(r.name) + '-' + r.id),
          store_meta_title:    r.name,
          store_category_id:         r.category_id || null,
        });
        ok.push(r.id);
      } catch (e) {
        fail.push({ id: r.id, name: r.name, msg: e.response?.data?.message || e.message });
      }
    }

    setDone(ok);
    setFailed(fail);
    setPublishing(false);

    if (fail.length === 0) {
      toast.success(`${ok.length} produk berhasil dipublish ke ${BRAND_INFO[brand].label}!`);
      setTimeout(onDone, 1500);
    } else {
      toast.error(`${fail.length} produk gagal dipublish`);
    }
  };

  const info = BRAND_INFO[brand];
  const isFinished = done.length > 0 || failed.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-3xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Store size={16} className="text-[var(--brand-600)]"/>
            <h3 className="text-sm font-bold">
              Bulk Publish ke Toko Online
              <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                {activeRows.length} produk dipilih
              </span>
            </h3>
          </div>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>

        {/* Result screen */}
        {isFinished && (
          <div className="modal-body">
            <div className="text-center py-6">
              <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3"/>
              <h3 className="font-bold text-lg mb-1">
                {done.length} Produk Berhasil Dipublish
              </h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                ke toko <span className="font-bold" style={{ color: info.color }}>{info.label}</span>
              </p>
              {failed.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left mb-4">
                  <p className="text-xs font-bold text-red-700 mb-2">{failed.length} Gagal:</p>
                  {failed.map(f => (
                    <p key={f.id} className="text-xs text-red-600">• {f.name} — {f.msg}</p>
                  ))}
                </div>
              )}
              <p className="text-xs text-[var(--text-muted)]">
                Lengkapi foto & deskripsi di Toko Online → {brand === 'gpdistro' ? 'GPDISTRO' : 'GP RACING'} → Produk
              </p>
              <button onClick={onDone} className="btn-primary mt-5 px-8">Selesai</button>
            </div>
          </div>
        )}

        {!isFinished && (
          <>
            <div className="modal-body space-y-4">
              {/* Brand picker */}
              <div>
                <p className="field-label mb-2">Publish Semua ke Toko</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(BRAND_INFO).map(([key, b]) => (
                    <button key={key} type="button" onClick={() => setBrand(key)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        brand === key
                          ? 'border-[var(--brand-600)] bg-[var(--brand-600)]/5'
                          : 'border-[var(--border)] hover:border-[var(--brand-600)]/40'
                      }`}>
                      <div className="w-3 h-3 rounded-full mb-1.5" style={{ background: b.color }}/>
                      <p className="text-xs font-bold">{b.label}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{b.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-product table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="field-label">Atur Harga per Produk</p>
                  <div className="flex gap-3 text-xs text-[var(--text-muted)]">
                    <button type="button"
                      onClick={() => setRows(r => r.map(x => ({ ...x, skip: false })))}
                      className="hover:text-[var(--brand-600)]">Pilih Semua</button>
                    <button type="button"
                      onClick={() => setRows(r => r.map(x => ({ ...x, skip: true })))}
                      className="hover:text-red-500">Hapus Semua</button>
                  </div>
                </div>

                <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                  {/* Table head */}
                  <div className="grid grid-cols-[24px_1fr_120px_120px_140px] gap-2 px-3 py-2 bg-[var(--bg)] border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    <span/>
                    <span>Produk</span>
                    <span className="text-right">Harga Jual *</span>
                    <span className="text-right">Harga Coret</span>
                    <span>Kategori Toko</span>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto">
                    {rows.map(r => (
                      <div key={r.id}
                        className={`grid grid-cols-[24px_1fr_120px_120px_140px] gap-2 px-3 py-2.5 items-center transition-colors ${
                          r.skip ? 'opacity-40 bg-[var(--bg)]' : ''
                        }`}>
                        {/* Checkbox */}
                        <input type="checkbox" checked={!r.skip}
                          onChange={e => setRow(r.id, 'skip', !e.target.checked)}
                          className="w-3.5 h-3.5"/>

                        {/* Product name */}
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{r.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono">{r.sku || '—'}</p>
                        </div>

                        {/* Store price */}
                        <div className="relative">
                          <input type="number"
                            value={r.store_price}
                            onChange={e => setRow(r.id, 'store_price', e.target.value)}
                            disabled={r.skip}
                            className="input-base text-xs py-1 text-right w-full"
                            placeholder="0"/>
                          {margin(r.store_price, r.buy_price) !== null && (
                            <span className={`absolute -bottom-4 right-0 text-[9px] font-bold ${
                              margin(r.store_price, r.buy_price) >= 20 ? 'text-green-600'
                              : margin(r.store_price, r.buy_price) >= 0 ? 'text-amber-500'
                              : 'text-red-500'
                            }`}>
                              {margin(r.store_price, r.buy_price) >= 0 ? '+' : ''}
                              {margin(r.store_price, r.buy_price)}%
                            </span>
                          )}
                        </div>

                        {/* Price compare */}
                        <input type="number"
                          value={r.price_compare}
                          onChange={e => setRow(r.id, 'price_compare', e.target.value)}
                          disabled={r.skip}
                          className="input-base text-xs py-1 text-right"
                          placeholder="Opsional"/>

                        {/* Category */}
                        <select value={r.category_id}
                          onChange={e => setRow(r.id, 'category_id', e.target.value)}
                          disabled={r.skip}
                          className="input-base text-xs py-1">
                          <option value="">— Tanpa Kategori —</option>
                          {storeCategories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-2">
                  * Harga sudah diisi otomatis dari harga marketplace ERP. Ubah sesuai kebutuhan.
                </p>
              </div>

              {/* Info */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <strong>Catatan:</strong> Foto produk belum tersedia — bisa dilengkapi setelah publish
                melalui menu <strong>Toko Online → {brand === 'gpdistro' ? 'GPDISTRO' : 'GP RACING'} → Produk → Edit</strong>.
                Produk yang sudah pernah dipublish akan di-skip otomatis.
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
              <button type="button" onClick={handlePublish}
                disabled={publishing || activeRows.length === 0}
                className="btn-primary gap-2 disabled:opacity-60">
                {publishing
                  ? <><Loader2 size={15} className="animate-spin"/> Publishing {done.length}/{activeRows.length}...</>
                  : <><Store size={15}/> Publish {activeRows.length} Produk ke {info.label}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ProductsPage() {
  const [products,      setProducts]      = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [modal,         setModal]         = useState(null);
  const [selected,      setSelected]      = useState(new Set());
  const [bulkPublish,   setBulkPublish]   = useState(false);
  const [deleting,      setDeleting]      = useState(null);
  // Filters & search
  const [search,        setSearch]        = useState('');
  const [filterCat,     setFilterCat]     = useState('');
  const [filterBranch,  setFilterBranch]  = useState('');
  const [filterStock,   setFilterStock]   = useState(''); // low | out
  const [showVariants,  setShowVariants]  = useState({}); // expanded rows
  const [actionMenu,    setActionMenu]    = useState(null); // product id with open menu
  const [page,          setPage]          = useState(1);
  const [sortCol,       setSortCol]       = useState('');
  const [sortDir,       setSortDir]       = useState('asc');
  const PAGE_SIZE = 20;

  const getSortValue = (p, col) => {
    if (col === 'name')       return (p.name || '').toLowerCase();
    if (col === 'sku')        return (p.sku || '').toLowerCase();
    if (col === 'qty')        return p.stock_qty ?? p.stock?.qty ?? 0;
    if (col === 'buy_price')  return parseFloat(p.buy_price || 0);
    if (col === 'sell_price') return parseFloat(p.sell_price || 0);
    if (col === 'store_price')return parseFloat(p.store_price || p.sell_price_mp || 0);
    return '';
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronsUpDown size={11} className="opacity-30 group-hover:opacity-60 transition-opacity inline-block ml-1"/>;
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="text-[var(--brand-600)] inline-block ml-1"/>
      : <ChevronDown size={11} className="text-[var(--brand-600)] inline-block ml-1"/>;
  };

  const handleDelete = async (product) => {
    if (!confirm(`Hapus produk "${product.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await erpService.deleteProduct(product.id);
      toast.success('Produk dihapus');
      load();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus produk');
    } finally { setDeleting(null); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        erpService.getProducts({ limit: 500 }),
        erpService.getCategories({ limit: 200 }),
      ]);
      setProducts(pRes.data.data.products || []);
      setCategories(cRes.data.data.categories || []);
    } catch { toast.error('Gagal memuat produk'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });



  const selectedProducts = products.filter(p => selected.has(p.id));

  const columns = [
    // Checkbox column
    { key: 'id', label: (
        <input type="checkbox"
          className="w-3.5 h-3.5"
          checked={products.length > 0 && products.every(p => selected.has(p.id))}
          onChange={() => toggleAll(products)}/>
      ),
      width: '32px',
      render: (v) => (
        <input type="checkbox"
          className="w-3.5 h-3.5"
          checked={selected.has(v)}
          onChange={() => toggleSelect(v)}
          onClick={e => e.stopPropagation()}/>
      ),
    },
    { key: 'name', label: 'Nama Produk', sortable: true, render: (v, row) => {
      const thumb = Array.isArray(row.store_images) && row.store_images[0];
      return (
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-[var(--bg-secondary)] flex-shrink-0 border border-[var(--border)]">
            {thumb
              ? <img src={thumb} alt={v} className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                  <Package size={16}/>
                </div>}
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)] leading-tight">{v}</p>
            {row.sku && <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{row.sku}</p>}
          </div>
        </div>
      );
    }},
    { key: 'category', label: 'Kategori', nowrap: true,
      render: v => <span className="text-[var(--text-secondary)]">{v?.name || '—'}</span> },
    { key: 'sell_price', label: 'Harga Jual', sortable: true, align: 'right', nowrap: true,
      render: v => <span className="font-semibold">{toRpShort(v)}</span> },
    { key: 'buy_price', label: 'Harga Beli', sortable: true, align: 'right', nowrap: true,
      render: v => <span className="text-[var(--text-secondary)]">{toRpShort(v)}</span> },
    { key: 'stock', label: 'Stok', align: 'center', nowrap: true, render: (v, row) => {
      const qty = v?.qty || 0; const min = row.stock_min || 0;
      return (
        <span className={`font-bold text-sm ${qty <= min ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
          {qty < 0 ? <AlertTriangle size={14}/> : qty}{' '}
          <span className="text-[10px] font-normal text-[var(--text-muted)]">{row.unit}</span>
        </span>
      );
    }},
  ];

  // Filtered & searched products
  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    if (q && !p.name?.toLowerCase().includes(q) && !p.sku?.toLowerCase().includes(q) && !p.barcode?.toLowerCase().includes(q)) return false;
    if (filterCat && String(p.category_id) !== String(filterCat)) return false;
    if (filterBranch && String(p.branch_id) !== String(filterBranch)) return false;
    if (filterStock === 'low')  return (p.stock?.qty||p.stock_qty||0) <= (p.stock_min||0) && (p.stock?.qty||p.stock_qty||0) > 0;
    if (filterStock === 'out')  return (p.stock?.qty||p.stock_qty||0) <= 0;
    return true;
  });

  const sorted = sortCol ? [...filtered].sort((a, b) => {
    const av = getSortValue(a, sortCol), bv = getSortValue(b, sortCol);
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), 'id', { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  }) : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const allSelected = paged.length > 0 && paged.every(p => selected.has(p.id));
  const toggleAll = () => {
    const ns = new Set(selected);
    if (allSelected) paged.forEach(p => ns.delete(p.id));
    else paged.forEach(p => ns.add(p.id));
    setSelected(ns);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Produk</h1>
          <p className="page-subtitle">{filtered.length} dari {products.length} produk</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <button onClick={() => setBulkPublish(true)}
              className="btn-secondary gap-2 h-9 text-sm">
              <Store size={14}/> Publish ({selected.size})
            </button>
          )}
          <button onClick={() => setModal('new')} className="btn-primary gap-2 h-9">
            <Plus size={15}/> Tambah Produk
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari Produk / SKU / Barcode"
            className="input-base pl-8 h-9 text-sm w-full"/>
        </div>
        {/* Category filter */}
        <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}
          className="input-base h-9 text-sm w-36">
          <option value="">Semua Kategori</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {/* Branch filter */}
        <select value={filterBranch} onChange={e => { setFilterBranch(e.target.value); setPage(1); }}
          className="input-base h-9 text-sm w-36">
          <option value="">Semua Cabang</option>
          <option value="1">GP Racing</option>
          <option value="2">GP Distro</option>
        </select>
        {/* Stock filter */}
        <select value={filterStock} onChange={e => { setFilterStock(e.target.value); setPage(1); }}
          className="input-base h-9 text-sm w-36">
          <option value="">Semua Stok</option>
          <option value="low">Stok Menipis</option>
          <option value="out">Habis</option>
        </select>
        {/* Clear filters */}
        {(search || filterCat || filterBranch || filterStock) && (
          <button onClick={() => { setSearch(''); setFilterCat(''); setFilterBranch(''); setFilterStock(''); setPage(1); }}
            className="text-xs text-[var(--text-muted)] hover:text-red-500 flex items-center gap-1">
            <X size={13}/> Reset
          </button>
        )}
      </div>

      {/* Premium Product Table */}
      <div className="table-wrapper overflow-hidden" onClick={() => setActionMenu(null)}>
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 size={24} className="animate-spin text-[var(--brand-500)]"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto mb-3 text-[var(--text-muted)] opacity-30"/>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Tidak ada produk</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Coba ubah filter atau tambah produk baru</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--border)] bg-[var(--bg-secondary)]">
                  <th className="px-3 py-3 w-8">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 rounded"/>
                  </th>
                  <th className="px-3 py-3 w-14 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide text-center">Foto</th>
                  <th onClick={() => handleSort('name')} className="px-3 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide text-left cursor-pointer hover:text-[var(--text-secondary)] select-none group">
                    Nama Produk<SortIcon col="name"/>
                  </th>
                  <th className="px-3 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide text-left">Variant</th>
                  <th onClick={() => handleSort('sku')} className="px-3 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide text-left cursor-pointer hover:text-[var(--text-secondary)] select-none group">
                    SKU<SortIcon col="sku"/>
                  </th>
                  <th onClick={() => handleSort('qty')} className="px-3 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide text-center cursor-pointer hover:text-[var(--text-secondary)] select-none group">
                    Qty Stok<SortIcon col="qty"/>
                  </th>
                  <th className="px-3 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide text-left">Satuan</th>
                  <th onClick={() => handleSort('buy_price')} className="px-3 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide text-right cursor-pointer hover:text-[var(--text-secondary)] select-none group">
                    Harga Beli<SortIcon col="buy_price"/>
                  </th>
                  <th onClick={() => handleSort('sell_price')} className="px-3 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide text-right cursor-pointer hover:text-[var(--text-secondary)] select-none group">
                    Harga Jual<SortIcon col="sell_price"/>
                  </th>
                  <th onClick={() => handleSort('store_price')} className="px-3 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide text-right cursor-pointer hover:text-[var(--text-secondary)] select-none group">
                    Harga Toko<SortIcon col="store_price"/>
                  </th>
                  <th className="px-3 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => {
                  const thumb = Array.isArray(p.store_images) && p.store_images[0];
                  const qty = p.stock_qty ?? p.stock?.qty ?? 0;
                  const isLow = qty > 0 && qty <= (p.stock_min || 0);
                  const isOut = qty <= 0;
                  const variants = p.store_variants && typeof p.store_variants === 'object' && Object.keys(p.store_variants).length > 0
                    ? p.store_variants : null;
                  const menuOpen = actionMenu === p.id;

                  return (
                    <tr key={p.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]/40 group transition-colors">
                      {/* Checkbox */}
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selected.has(p.id)}
                          onChange={() => { const ns = new Set(selected); ns.has(p.id) ? ns.delete(p.id) : ns.add(p.id); setSelected(ns); }}
                          onClick={e => e.stopPropagation()} className="w-3.5 h-3.5 rounded"/>
                      </td>
                      {/* Foto */}
                      <td className="px-3 py-3 text-center">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border)] mx-auto flex items-center justify-center">
                          {thumb
                            ? <img src={thumb} alt={p.name} className="w-full h-full object-cover"/>
                            : <Package size={16} className="text-[var(--text-muted)] opacity-50"/>}
                        </div>
                      </td>
                      {/* Nama */}
                      <td className="px-3 py-3 max-w-[200px]">
                        <div>
                          <button onClick={() => setModal(p)}
                            className="font-semibold text-[var(--brand-600)] hover:underline text-left leading-tight truncate block max-w-full">
                            {p.name}
                          </button>
                          {p.category?.name && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{p.category.name}</p>}
                          {/* Variant expand toggle */}
                          {variants && (
                            <button onClick={() => setShowVariants(v => ({...v, [p.id]: !v[p.id]}))}
                              className="text-[10px] text-[var(--brand-600)] hover:underline mt-0.5 flex items-center gap-0.5">
                              <ChevronDown size={10} className={`transition-transform ${showVariants[p.id] ? 'rotate-180' : ''}`}/>
                              {Object.values(variants).flat().length} variant
                            </button>
                          )}
                        </div>
                      </td>
                      {/* Variant summary */}
                      <td className="px-3 py-3 text-xs text-[var(--text-muted)]">
                        {variants
                          ? <div className="flex flex-wrap gap-1 max-w-[120px]">
                              {Object.entries(variants).slice(0,1).map(([k,vals]) =>
                                (vals||[]).slice(0,3).map(v => (
                                  <span key={v} className="bg-[var(--bg-secondary)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[10px]">{v}</span>
                                ))
                              )}
                            </div>
                          : '—'}
                      </td>
                      {/* SKU */}
                      <td className="px-3 py-3 font-mono text-xs text-[var(--text-secondary)]">
                        {p.sku || '—'}
                      </td>
                      {/* Stok */}
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-10 h-6 rounded-lg text-xs font-bold
                          ${isOut ? 'bg-red-100 text-red-600' : isLow ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-700'}`}>
                          {qty}
                        </span>
                      </td>
                      {/* Satuan */}
                      <td className="px-3 py-3 text-xs text-[var(--text-muted)]">{p.unit || '—'}</td>
                      {/* Harga Beli */}
                      <td className="px-3 py-3 text-right text-xs text-[var(--text-secondary)]">
                        {p.buy_price ? toRpShort(p.buy_price) : '—'}
                      </td>
                      {/* Harga Jual */}
                      <td className="px-3 py-3 text-right text-xs font-semibold">
                        {toRpShort(p.sell_price)}
                      </td>
                      {/* Harga Toko */}
                      <td className="px-3 py-3 text-right text-xs text-[var(--text-secondary)]">
                        {p.store_price ? toRpShort(p.store_price) : '—'}
                      </td>
                      {/* Action menu */}
                      <td className="px-2 py-3 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setActionMenu(menuOpen ? null : p.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal size={15}/>
                        </button>
                        {menuOpen && (
                          <div className="absolute right-0 top-8 z-20 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl py-1 min-w-[160px]">
                            <button onClick={() => { setModal(p); setActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                              <Edit3 size={13}/> Edit Produk
                            </button>
                            <button onClick={() => { navigator.clipboard.writeText(p.sku||''); toast.success('SKU disalin'); setActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                              <Copy size={13}/> Salin SKU
                            </button>
                            <button onClick={() => { setModal(p); setActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                              <Eye size={13}/> Detail
                            </button>
                            <div className="border-t border-[var(--border)] my-1"/>
                            <button onClick={() => { handleDelete(p); setActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-red-50 text-red-600">
                              <Trash2 size={13}/> Hapus
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--bg)]">
            <p className="text-xs text-[var(--text-muted)]">
              {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} dari {filtered.length} produk
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-secondary)] disabled:opacity-30">
                <ChevronLeft size={13}/>
              </button>
              {[...Array(Math.min(5, totalPages))].map((_,i) => {
                const pg = Math.max(1, Math.min(page-2, totalPages-4)) + i;
                return pg <= totalPages ? (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors
                      ${pg===page ? 'bg-[var(--brand-600)] text-white' : 'border border-[var(--border)] hover:bg-[var(--bg-secondary)]'}`}>
                    {pg}
                  </button>
                ) : null;
              })}
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-secondary)] disabled:opacity-30">
                <ChevronRight size={13}/>
              </button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          allCategories={categories}
          onClose={() => setModal(null)}
          onSuccess={load}
        />
      )}

      {/* Bulk publish modal */}
      {bulkPublish && selectedProducts.length > 0 && (
        <BulkPublishModal
          products={selectedProducts}
          onClose={() => setBulkPublish(false)}
          onDone={() => {
            setBulkPublish(false);
            setSelected(new Set());
            load();
          }}
        />
      )}
    </div>
  );
}
