import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit3, Trash2, Eye, Heart, X, Save, Loader2,
  Globe, Lock, Image, Tag, RefreshCw, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { value:'pengumuman', label:'📢 Pengumuman', color:'bg-red-100 text-red-700' },
  { value:'event',      label:'🎉 Event',       color:'bg-purple-100 text-purple-700' },
  { value:'kebijakan',  label:'📋 Kebijakan',   color:'bg-blue-100 text-blue-700' },
  { value:'info',       label:'ℹ️ Info',         color:'bg-emerald-100 text-emerald-700' },
];

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'hrd_attendance';

export default function NewsPage() {
  const { user } = useAuth();
  const isHRAdmin = ['admin','hr'].includes(user?.role);
  const [news,    setNews]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(null); // null=list, {}=create, {id}=edit
  const [detail,  setDetail]  = useState(null);
  const [statsFor, setStatsFor] = useState(null);
  const [stats,   setStats]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/news', { params:{ published_only: isHRAdmin?'false':'true', limit:50 } });
      setNews(r.data.data?.news || []);
    } catch { toast.error('Gagal memuat news'); }
    finally { setLoading(false); }
  }, [isHRAdmin]);

  useEffect(() => { load(); }, [load]);

  const loadStats = async (newsId) => {
    try {
      const r = await api.get(`/news/${newsId}/stats`);
      setStats(r.data.data);
      setStatsFor(newsId);
    } catch { toast.error('Gagal memuat statistik'); }
  };

  const handleSave = async () => {
    if (!form.title || !form.content) { toast.error('Judul dan konten wajib'); return; }
    try {
      if (form.id) {
        await api.put(`/news/${form.id}`, form);
        toast.success('News diperbarui!');
      } else {
        await api.post('/news', form);
        toast.success('News berhasil dibuat!');
      }
      setForm(null);
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal menyimpan'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus news ini?')) return;
    try {
      await api.delete(`/news/${id}`);
      toast.success('News dihapus');
      load();
    } catch { toast.error('Gagal hapus'); }
  };

  const handleLike = async (id) => {
    try {
      const r = await api.post(`/news/${id}/like`);
      setNews(prev => prev.map(n => n.id===id ? {
        ...n,
        like_count: r.data.liked ? parseInt(n.like_count)+1 : parseInt(n.like_count)-1,
        user_liked: r.data.liked ? 1 : 0,
      } : n));
    } catch {}
  };

  const uploadCover = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method:'POST', body:fd });
    const d = await r.json();
    return d.secure_url;
  };

  const getCatStyle = (cat) => CATEGORIES.find(c=>c.value===cat)?.color || 'bg-gray-100 text-gray-600';
  const getCatLabel = (cat) => CATEGORIES.find(c=>c.value===cat)?.label || cat;

  // ── Form ──────────────────────────────────────────────────
  if (form !== null) return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={()=>setForm(null)} className="btn-icon"><X size={16}/></button>
        <h1 className="page-title">{form.id ? 'Edit News' : 'Buat News Baru'}</h1>
      </div>

      <div className="table-wrapper p-6 space-y-5">
        {/* Cover image */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-2">Cover Image (opsional)</label>
          {form.cover_url && (
            <img src={form.cover_url} alt="cover" className="w-full h-40 object-cover rounded-xl mb-2"/>
          )}
          <label className="flex items-center gap-2 cursor-pointer btn-secondary text-sm w-fit">
            <Image size={14}/>
            {form.cover_url ? 'Ganti Cover' : 'Upload Cover'}
            <input type="file" accept="image/*" className="sr-only" onChange={async e => {
              const f = e.target.files[0]; if (!f) return;
              const toastId = toast.loading('Mengupload...');
              try {
                const url = await uploadCover(f);
                setForm(p=>({...p, cover_url:url}));
                toast.success('Cover diupload!', { id:toastId });
              } catch { toast.error('Gagal upload', { id:toastId }); }
            }}/>
          </label>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Judul *</label>
          <input value={form.title||''} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
            placeholder="Judul pengumuman..." className="input-base text-sm w-full text-base font-semibold"/>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-2">Kategori</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat.value} onClick={()=>setForm(p=>({...p,category:cat.value}))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  (form.category||'pengumuman')===cat.value
                    ? 'border-[var(--brand-600)] bg-[var(--brand-600)] text-white'
                    : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Konten *</label>
          <textarea value={form.content||''} onChange={e=>setForm(p=>({...p,content:e.target.value}))}
            placeholder="Tulis isi pengumuman di sini..." rows={8}
            className="input-base text-sm w-full resize-none leading-relaxed"/>
        </div>

        {/* Publish toggle */}
        <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl">
          <div>
            <p className="text-sm font-semibold">{form.is_published ? '🌐 Dipublish' : '🔒 Draft'}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {form.is_published ? 'Semua karyawan dapat melihat news ini' : 'Hanya admin/HR yang dapat melihat'}
            </p>
          </div>
          <button onClick={()=>setForm(p=>({...p,is_published:!p.is_published}))}
            className={`w-12 h-6 rounded-full transition-colors relative ${form.is_published?'bg-[var(--brand-600)]':'bg-[var(--border)]'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_published?'right-1':'left-1'}`}/>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={()=>setForm(null)} className="btn-secondary flex-1">Batal</button>
          <button onClick={handleSave} className="btn-primary flex-1 gap-2">
            <Save size={14}/> {form.id ? 'Simpan Perubahan' : 'Buat News'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Detail modal ──────────────────────────────────────────
  if (detail) return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-2xl my-6 overflow-hidden">
        {detail.cover_url && (
          <img src={detail.cover_url} alt={detail.title} className="w-full h-52 object-cover"/>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${getCatStyle(detail.category)}`}>
                {getCatLabel(detail.category)}
              </span>
              <h2 className="font-black text-xl mt-2 leading-snug">{detail.title}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {detail.author_name} · {new Date(detail.published_at||detail.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}
              </p>
            </div>
            <button onClick={()=>setDetail(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg-secondary)]">
              <X size={16}/>
            </button>
          </div>
          <div className="text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap mb-5">
            {detail.content}
          </div>
          <div className="flex items-center gap-4 pt-4 border-t border-[var(--border)]">
            <button onClick={()=>handleLike(detail.id)}
              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${parseInt(detail.user_liked)?'text-red-500':'text-[var(--text-muted)] hover:text-red-400'}`}>
              <Heart size={16} fill={parseInt(detail.user_liked)?'currentColor':'none'}/>
              {detail.like_count} Suka
            </button>
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
              <Eye size={16}/> {detail.read_count} Dibaca
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Stats modal ───────────────────────────────────────────
  if (statsFor && stats) return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div>
            <h3 className="font-bold">Statistik Pembaca</h3>
            <p className="text-xs text-[var(--text-muted)]">{stats.readers.length} dibaca · {stats.likers.length} disukai</p>
          </div>
          <button onClick={()=>{setStatsFor(null);setStats(null);}} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg-secondary)]">
            <X size={16}/>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-2">
              👁 Sudah Membaca ({stats.readers.length})
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {stats.readers.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-xl bg-[var(--bg-secondary)]">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">{new Date(r.read_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              ))}
              {stats.readers.length === 0 && <p className="text-sm text-[var(--text-muted)] text-center py-3">Belum ada yang membaca</p>}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-2">
              ❤️ Yang Menyukai ({stats.likers.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {stats.likers.map(l => (
                <span key={l.id} className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">{l.name}</span>
              ))}
              {stats.likers.length === 0 && <p className="text-sm text-[var(--text-muted)]">Belum ada yang menyukai</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── List ──────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">📰 News & Pengumuman</h1>
          <p className="page-subtitle">{news.length} news tersedia</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-icon"><RefreshCw size={15}/></button>
          {isHRAdmin && (
            <button onClick={()=>setForm({ title:'', content:'', category:'pengumuman', is_published:false })}
              className="btn-primary gap-2">
              <Plus size={15}/> Buat News
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_,i) => <div key={i} className="skeleton h-64 rounded-2xl"/>)}
        </div>
      ) : news.length === 0 ? (
        <div className="table-wrapper p-16 text-center">
          <p className="text-4xl mb-3">📰</p>
          <p className="font-bold text-lg">Belum ada news</p>
          {isHRAdmin && <p className="text-sm text-[var(--text-muted)] mt-1">Klik "Buat News" untuk membuat pengumuman pertama</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.map(n => (
            <div key={n.id} className={`table-wrapper overflow-hidden hover:shadow-md transition-shadow group ${!n.is_published?'opacity-60':''}`}>
              {/* Cover */}
              {n.cover_url ? (
                <img src={n.cover_url} alt={n.title} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"/>
              ) : (
                <div className="w-full h-28 flex items-center justify-center text-5xl"
                  style={{background:'linear-gradient(135deg,var(--brand-600)20,var(--brand-600)10)'}}>
                  {CATEGORIES.find(c=>c.value===n.category)?.label?.split(' ')[0] || '📰'}
                </div>
              )}

              <div className="p-4">
                {/* Category + status */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getCatStyle(n.category)}`}>
                    {getCatLabel(n.category)}
                  </span>
                  {!n.is_published && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-500 flex items-center gap-1">
                      <Lock size={9}/> Draft
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm leading-snug line-clamp-2 mb-1">{n.title}</h3>
                <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">
                  {n.content.replace(/<[^>]*>/g,'')}
                </p>

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-3">
                  <span>{n.author_name}</span>
                  <span>{new Date(n.published_at||n.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</span>
                </div>

                {/* Stats + actions */}
                <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
                  <div className="flex gap-3">
                    <button onClick={()=>handleLike(n.id)}
                      className={`flex items-center gap-1 text-xs font-semibold transition-colors ${parseInt(n.user_liked)?'text-red-500':'text-[var(--text-muted)] hover:text-red-400'}`}>
                      <Heart size={13} fill={parseInt(n.user_liked)?'currentColor':'none'}/>
                      {n.like_count}
                    </button>
                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Eye size={13}/> {n.read_count}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={async()=>{ const r=await api.get(`/news/${n.id}`); setDetail(r.data.data.news); }}
                      className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--brand-600)]">
                      <Eye size={13}/>
                    </button>
                    {isHRAdmin && (<>
                      <button onClick={()=>loadStats(n.id)}
                        className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)] hover:text-purple-600">
                        <Users size={13}/>
                      </button>
                      <button onClick={()=>setForm({...n})}
                        className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--brand-600)]">
                        <Edit3 size={13}/>
                      </button>
                      <button onClick={()=>handleDelete(n.id)}
                        className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-[var(--text-muted)] hover:text-red-500">
                        <Trash2 size={13}/>
                      </button>
                    </>)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
