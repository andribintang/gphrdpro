import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';

const QUICK_PROMPTS = [
  '👥 Siapa karyawan yang paling sering terlambat bulan ini?',
  '📊 Berapa headcount per departemen saat ini?',
  '📋 Ada berapa pengajuan cuti yang pending?',
  '💰 Berapa total gaji yang sudah dibayar tahun ini?',
  '🎂 Siapa yang ulang tahun bulan ini?',
  '📈 Bagaimana tren absensi 3 bulan terakhir?',
  '🏆 Karyawan baru bergabung bulan ini siapa saja?',
  '⚠️ Karyawan mana yang stok cutinya sudah habis?',
];

export default function HRAssistantPage() {
  const [messages,  setMessages]  = useState([
    { role:'assistant', content:'Halo! Saya **AI HR Assistant** GPDISTRO RACING ID. 🚀\n\nSaya bisa membantu menjawab pertanyaan seputar:\n- Data karyawan & absensi\n- Status cuti & payroll\n- Statistik HR\n- Dan banyak lagi!\n\nApa yang bisa saya bantu hari ini?' }
  ]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [context,   setContext]   = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Load HR context data once
  const loadContext = useCallback(async () => {
    try {
      const [empRes, leaveRes, attRes] = await Promise.all([
        api.get('/employees/stats'),
        api.get('/leaves/admin/all', { params:{ limit:100 } }),
        api.get('/attendance/admin/all', { params:{ limit:200, year:new Date().getFullYear(), month:new Date().getMonth()+1 } }),
      ]);
      setContext({
        employees: empRes.data.data,
        leaves:    leaveRes.data.data?.leaves||[],
        attendance: attRes.data.data?.records||attRes.data.data?.attendances||[],
        date:      new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),
      });
    } catch(e) { console.error('Context load failed', e); }
  }, []);

  useEffect(() => { loadContext(); }, [loadContext]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role:'user', content:msg }]);
    setLoading(true);

    try {
      const systemPrompt = `Kamu adalah AI HR Assistant untuk perusahaan GPDISTRO RACING ID, sebuah bisnis yang bergerak di bidang racing dan distro fashion di Indonesia.

Data HR terkini (${context?.date || new Date().toLocaleDateString('id-ID')}):

STATISTIK KARYAWAN:
${context ? JSON.stringify(context.employees?.summary || {}, null, 2) : 'Data tidak tersedia'}

DEPARTEMEN:
${context ? JSON.stringify(context.employees?.departments || {}, null, 2) : 'Data tidak tersedia'}

PENGAJUAN CUTI (${context?.leaves?.length || 0} total):
- Pending: ${context?.leaves?.filter(l=>l.status==='pending').length || 0}
- Disetujui: ${context?.leaves?.filter(l=>l.status==='approved').length || 0}
- Ditolak: ${context?.leaves?.filter(l=>l.status==='rejected').length || 0}
- Cuti bulan ini yang disetujui: ${context?.leaves?.filter(l=>l.status==='approved' && l.start_date?.startsWith(new Date().toISOString().slice(0,7))).map(l=>l.user?.name).join(', ') || 'Tidak ada'}

ABSENSI BULAN INI:
- Total records: ${context?.attendance?.length || 0}
- Hadir: ${context?.attendance?.filter(a=>a.status==='present').length || 0}
- Terlambat: ${context?.attendance?.filter(a=>a.status==='late').length || 0}
- Absen: ${context?.attendance?.filter(a=>a.status==='absent').length || 0}

Karyawan yang sering terlambat bulan ini:
${(() => {
  if (!context?.attendance) return 'Data tidak tersedia';
  const late = {};
  context.attendance.filter(a=>a.status==='late').forEach(a => { late[a.user?.name||a.employee_name||'?']=(late[a.user?.name||a.employee_name||'?']||0)+1; });
  return Object.entries(late).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,c])=>`- ${n}: ${c}x`).join('\n') || 'Tidak ada';
})()}

Instruksi:
- Jawab dalam Bahasa Indonesia yang ramah dan profesional
- Gunakan emoji untuk membuat respons lebih menarik
- Format respons dengan markdown (bold, bullet points)
- Jika data tidak tersedia, katakan dengan jujur
- Berikan insight dan saran yang berguna
- Maksimal 300 kata per respons`;

      const history = messages.slice(-8).map(m => ({ role:m.role, content:m.content }));

      const API_URL = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('accessToken'),
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [...history, { role:'user', content:msg }],
        }),
      });

      const data = await res.json();
      const reply = data.content?.[0]?.text || 'Maaf, saya tidak bisa menjawab saat ini.';
      setMessages(prev => [...prev, { role:'assistant', content:reply }]);
    } catch(e) {
      setMessages(prev => [...prev, { role:'assistant', content:'⚠️ Maaf, terjadi kesalahan. Coba lagi ya!' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const renderMessage = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc pl-4 space-y-0.5">$1</ul>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--brand-600)] to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles size={18} className="text-white"/>
          </div>
          <div>
            <h1 className="page-title">AI HR Assistant</h1>
            <p className="page-subtitle flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${context ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}/>
              {context ? 'Data HR tersambung' : 'Memuat data HR...'}
            </p>
          </div>
        </div>
        <button onClick={() => { setMessages([{ role:'assistant', content:'Chat direset. Ada yang bisa saya bantu? 😊' }]); }}
          className="btn-icon" title="Reset chat">
          <RefreshCw size={15}/>
        </button>
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 flex-wrap mb-3">
        {QUICK_PROMPTS.slice(0,4).map((p,i) => (
          <button key={i} onClick={()=>sendMessage(p)} disabled={loading}
            className="text-[11px] px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand-600)] hover:text-[var(--brand-600)] transition-colors disabled:opacity-50 whitespace-nowrap">
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role==='user'?'flex-row-reverse':''}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              m.role==='assistant'
                ? 'bg-gradient-to-br from-[var(--brand-600)] to-purple-600 shadow-sm'
                : 'bg-[var(--bg-secondary)] border border-[var(--border)]'
            }`}>
              {m.role==='assistant'
                ? <Sparkles size={14} className="text-white"/>
                : <User size={14} className="text-[var(--text-muted)]"/>}
            </div>
            {/* Bubble */}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role==='user'
                ? 'bg-[var(--brand-600)] text-white rounded-tr-sm'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-tl-sm'
            }`}>
              {m.role==='assistant'
                ? <div dangerouslySetInnerHTML={{__html: renderMessage(m.content)}}/>
                : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-600)] to-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-white animate-pulse"/>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
              </div>
              <span className="text-xs text-[var(--text-muted)]">Sedang menganalisis data HR...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* More quick prompts */}
      <div className="flex gap-2 flex-wrap mt-2 mb-2">
        {QUICK_PROMPTS.slice(4).map((p,i) => (
          <button key={i} onClick={()=>sendMessage(p)} disabled={loading}
            className="text-[11px] px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand-600)] hover:text-[var(--brand-600)] transition-colors disabled:opacity-50 whitespace-nowrap">
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()}
          placeholder="Tanya sesuatu tentang data HR..."
          disabled={loading}
          className="input-base flex-1 text-sm"
        />
        <button onClick={()=>sendMessage()} disabled={loading||!input.trim()}
          className="btn-primary px-4 disabled:opacity-50 gap-2">
          {loading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
        </button>
      </div>
    </div>
  );
}
