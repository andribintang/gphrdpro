import { useState, useEffect, useCallback } from 'react';
import {
  Tag, ShoppingCart, Plus, Edit3, Trash2, X, Loader2,
  CheckCircle2, RefreshCw, LayoutGrid, Shirt, Wrench,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService } from '../../utils/erp/erpService';

// ── Identitas cabang ──────────────────────────────────────────
const BRANCH = {
  gpdistro: { id: 2, label: 'GPDISTRO', icon: Shirt,  color: '#db2777', bg: 'bg-pink-50 dark:bg-pink-950/30',   border: 'border-pink-200 dark:border-pink-800',   text: 'text-pink-700 dark:text-pink-300'   },
  gpracing: { id: 1, label: 'GP RACING', icon: Wrench, color: '#2563eb', bg: 'bg-blue-50 dark:bg-blue-950/30',   border: 'border-blue-200 dark:border-blue-800',   text: 'text-blue-700 dark:text-blue-300'   },
};

// ── Channel colors ────────────────────────────────────────────
const CH_COLORS = {
  wa:          'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
  marketplace: 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
  direct:      'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
};
const CH_LABELS = { wa: 'WhatsApp', marketplace: 'Marketplace', direct: 'Langsung' };

// ══════════════════════════════════════════════════════════════
// Modal Kategori
// ══════════════════════════════════════════════════════════════
function CategoryModal({ category, defaultBranchId, onClose, onSuccess }) {
  const isEdit = !!category;
  const [form, setForm] = useState({
    branch_id:   category?.branch_id   ?? defaultBranchId ?? '',
    name:        category?.name        ?? '',
    description: category?.description ?? '',
    sort_order:  category?.sort_order  ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!form.name.trim()) { toast.error('Nama kategori wajib'); return; }
    setSaving(true);
    try {
      if (isEdit) await erpService.updateCategory(category.id, form);
      else        await erpService.createCategory({ ...form, branch_id: form.branch_id || null });
      toast.success(isEdit ? 'Kategori diperbarui' : 'Kategori ditambahkan');
      onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const branchInfo = Object.values(BRANCH).find(b => b.id == form.branch_id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeftWidth: 3, borderLeftColor: branchInfo?.color || 'var(--brand-600)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Tag size={14}/> {isEdit ? 'Edit' : 'Tambah'} Kategori
          </h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body space-y-3">
          <div>
            <label className="field-label">Cabang</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(BRANCH).map(([key, b]) => {
                const Icon = b.icon;
                const sel  = String(form.branch_id) === String(b.id);
                return (
                  <button key={key} onClick={() => setForm(f => ({ ...f, branch_id: b.id }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      sel ? `${b.bg} ${b.border} ${b.text}` : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    }`}>
                    <Icon size={13}/> {b.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="field-label">Nama Kategori *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input-base" placeholder="Contoh: Spare Part Engine" autoFocus/>
          </div>
          <div>
            <label className="field-label">Urutan</label>
            <input type="number" value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              className="input-base"/>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1 gap-2">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
            {isEdit ? 'Simpan' : 'Tambah'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Modal SubChannel
// ══════════════════════════════════════════════════════════════
function SubChannelModal({ subChannel, defaultBranchId, onClose, onSuccess }) {
  const isEdit = !!subChannel;
  const [form, setForm] = useState({
    branch_id:   subChannel?.branch_id   ?? defaultBranchId ?? '',
    channel:     subChannel?.channel     ?? 'marketplace',
    name:        subChannel?.name        ?? '',
    description: subChannel?.description ?? '',
    sort_order:  subChannel?.sort_order  ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!form.name.trim()) { toast.error('Nama wajib'); return; }
    setSaving(true);
    try {
      const payload = { ...form, branch_id: form.branch_id ? parseInt(form.branch_id) : null };
      if (isEdit) await erpService.updateSubChannel(subChannel.id, payload);
      else        await erpService.createSubChannel(payload);
      toast.success(isEdit ? 'Sub channel diperbarui' : 'Sub channel ditambahkan');
      onSuccess(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop"/>
      <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ShoppingCart size={14}/> {isEdit ? 'Edit' : 'Tambah'} Sub Channel
          </h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={14}/></button>
        </div>
        <div className="modal-body space-y-3">
          <div>
            <label className="field-label">Cabang</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(BRANCH).map(([key, b]) => {
                const Icon = b.icon;
                const sel = String(form.branch_id) === String(b.id);
                return (
                  <button key={key} onClick={() => setForm(f => ({ ...f, branch_id: b.id }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      sel ? `${b.bg} ${b.border} ${b.text}` : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    }`}>
                    <Icon size={13}/> {b.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="field-label">Channel</label>
            <div className="grid grid-cols-3 gap-2">
              {[['wa','WhatsApp'],['marketplace','Marketplace'],['direct','Langsung']].map(([k, l]) => (
                <button key={k} onClick={() => setForm(f => ({ ...f, channel: k }))}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    form.channel === k ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">Nama Toko / Channel *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Contoh: TOKOPEDIA GPRACING" className="input-base" autoFocus/>
          </div>
          <div>
            <label className="field-label">Urutan</label>
            <input type="number" value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              className="input-base"/>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1 gap-2">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
            {isEdit ? 'Simpan' : 'Tambah'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Komponen panel per cabang — Kategori + SubChannel dalam subtab
// ══════════════════════════════════════════════════════════════
function BranchPanel({ branchKey, categories, subChannels, loading, onRefresh }) {
  const [subTab, setSubTab]     = useState('categories');
  const [catModal, setCatModal] = useState(null);
  const [scModal,  setScModal]  = useState(null);

  const b      = BRANCH[branchKey];
  const Icon   = b.icon;
  const cats   = categories.filter(c => String(c.branch_id) === String(b.id));
  const scs    = subChannels; // sudah difilter per cabang di parent

  const deleteCat = async (id, name) => {
    if (!confirm(`Hapus kategori "${name}"?`)) return;
    try { await erpService.deleteCategory(id); toast.success('Kategori dihapus'); onRefresh(); }
    catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  const deleteSC = async (id, name) => {
    if (!confirm(`Hapus permanen sub channel "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try { await erpService.deleteSubChannel(id); toast.success(`${name} berhasil dihapus permanen`); onRefresh(); }
    catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
  };

  const grouped = {
    marketplace: scs.filter(s => s.channel === 'marketplace'),
    wa:          scs.filter(s => s.channel === 'wa'),
    direct:      scs.filter(s => s.channel === 'direct'),
  };

  const SUBTABS = [
    { k: 'categories', l: 'Kategori',    icon: Tag,         count: cats.length },
    { k: 'subchannels',l: 'Sub Channel', icon: ShoppingCart, count: scs.length  },
  ];

  return (
    <div className="table-wrapper overflow-hidden">
      {/* Branch header */}
      <div className={`px-5 py-3 ${b.bg} border-b ${b.border} flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${b.color}20` }}>
            <Icon size={16} style={{ color: b.color }}/>
          </div>
          <div>
            <p className={`text-sm font-black ${b.text}`}>{b.label}</p>
            <p className="text-[11px] text-[var(--text-muted)]">{cats.length} kategori · {scs.length} sub channel</p>
          </div>
        </div>
        <button onClick={onRefresh} className="btn-icon" title="Refresh">
          <RefreshCw size={13}/>
        </button>
      </div>

      {/* Subtabs */}
      <div className="flex gap-0 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        {SUBTABS.map(t => {
          const TIcon = t.icon;
          return (
            <button key={t.k} onClick={() => setSubTab(t.k)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
                subTab === t.k
                  ? 'border-[var(--brand-600)] text-[var(--brand-600)] bg-[var(--bg-card)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}>
              <TIcon size={13}/>
              {t.l}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                subTab === t.k ? 'bg-[var(--brand-600)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
              }`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      <div className="p-5">
        {/* ── Tab: Kategori ─────────────────────────────────── */}
        {subTab === 'categories' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[var(--text-muted)]">{cats.length} kategori untuk {b.label}</p>
              <button onClick={() => setCatModal('new')} className="btn-primary gap-1.5 text-sm h-8 px-3">
                <Plus size={13}/> Tambah Kategori
              </button>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl"/>)}
              </div>
            ) : cats.length === 0 ? (
              <div className="text-center py-10">
                <Tag size={28} className="mx-auto mb-2 text-[var(--text-muted)]"/>
                <p className="text-sm text-[var(--text-muted)]">Belum ada kategori untuk {b.label}</p>
                <button onClick={() => setCatModal('new')} className="btn-primary mt-3 gap-1.5 text-sm">
                  <Plus size={13}/> Tambah Kategori Pertama
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {cats.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--brand-600)]/30 transition-colors group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${b.color}15` }}>
                      <Tag size={14} style={{ color: b.color }}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{cat.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">urutan #{cat.sort_order}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setCatModal(cat)} className="btn-icon-sm" title="Edit"><Edit3 size={12}/></button>
                      <button onClick={() => deleteCat(cat.id, cat.name)} className="btn-icon-sm hover:text-red-500" title="Hapus"><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tab: Sub Channel ──────────────────────────────── */}
        {subTab === 'subchannels' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[var(--text-muted)]">{scs.length} sub channel untuk {b.label}</p>
              <button onClick={() => setScModal('new')} className="btn-primary gap-1.5 text-sm h-8 px-3">
                <Plus size={13}/> Tambah Sub Channel
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">{[1,2].map(i => <div key={i} className="skeleton h-20 rounded-xl"/>)}</div>
            ) : scs.length === 0 ? (
              <div className="text-center py-10">
                <ShoppingCart size={28} className="mx-auto mb-2 text-[var(--text-muted)]"/>
                <p className="text-sm text-[var(--text-muted)]">Belum ada sub channel untuk {b.label}</p>
                <button onClick={() => setScModal('new')} className="btn-primary mt-3 gap-1.5 text-sm">
                  <Plus size={13}/> Tambah Sub Channel Pertama
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).filter(([,items]) => items.length > 0).map(([ch, items]) => (
                  <div key={ch}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${CH_COLORS[ch]}`}>
                        {CH_LABELS[ch]}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{items.length} channel</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {items.map(sc => (
                        <div key={sc.id} className={`flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--brand-600)]/30 transition-colors group ${!sc.is_active ? 'opacity-50' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${CH_COLORS[ch]}`}>
                            <LayoutGrid size={12}/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{sc.name}</p>
                            {!sc.is_active && <span className="text-[10px] text-[var(--text-muted)]">nonaktif</span>}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setScModal(sc)} className="btn-icon-sm" title="Edit"><Edit3 size={12}/></button>
                            <button onClick={() => deleteSC(sc.id, sc.name)} className="btn-icon-sm hover:text-red-500" title="Nonaktifkan"><Trash2 size={12}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {catModal && (
        <CategoryModal
          category={catModal === 'new' ? null : catModal}
          defaultBranchId={b.id}
          onClose={() => setCatModal(null)}
          onSuccess={onRefresh}
        />
      )}
      {scModal && (
        <SubChannelModal
          subChannel={scModal === 'new' ? null : scModal}
          defaultBranchId={b.id}
          onClose={() => setScModal(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════
export default function MasterDataPage() {
  const [categories,  setCats] = useState([]);
  const [subChannels, setSCs]  = useState([]);
  const [loading,   setLoading]= useState(true);
  const [branchTab, setBranch] = useState('gpdistro'); // tab cabang aktif

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        erpService.getCategories({ limit: 500 }),
        erpService.getAllSubChannels(),
      ]);
      setCats(cRes.data.data.categories || []);
      setSCs(sRes.data.data.sub_channels || []);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filter sub channel by branch_id (sekarang sudah ada kolom branch_id)
  // Sub channel tanpa branch_id (null) tampil di kedua cabang
  const scForBranch = (bKey) => {
    const b = BRANCH[bKey];
    return subChannels.filter(sc => sc.branch_id === b.id || sc.branch_id === null);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Data ERP</h1>
          <p className="page-subtitle">Kelola kategori produk & sub channel per cabang</p>
        </div>
        <button onClick={fetchAll} disabled={loading} className="btn-icon">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
        </button>
      </div>

      {/* Branch tabs */}
      <div className="flex gap-2">
        {Object.entries(BRANCH).map(([key, b]) => {
          const Icon = b.icon;
          const active = branchTab === key;
          const cats = categories.filter(c => String(c.branch_id) === String(b.id));
          const scs  = scForBranch(key);
          return (
            <button key={key} onClick={() => setBranch(key)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border font-semibold text-sm transition-all ${
                active
                  ? `${b.bg} ${b.border} ${b.text} shadow-sm`
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}>
              <Icon size={15}/>
              {b.label}
              <div className="flex gap-1.5 ml-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? b.text : 'text-[var(--text-muted)]'} bg-[var(--bg-card)]`}>
                  {cats.length} kat
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? b.text : 'text-[var(--text-muted)]'} bg-[var(--bg-card)]`}>
                  {scs.length} ch
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Branch panel */}
      {Object.entries(BRANCH).map(([key]) => (
        branchTab === key && (
          <BranchPanel
            key={key}
            branchKey={key}
            categories={categories}
            subChannels={scForBranch(key)}
            loading={loading}
            onRefresh={fetchAll}
          />
        )
      ))}
    </div>
  );
}
