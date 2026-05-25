import { useState } from 'react';
import { Calendar } from 'lucide-react';

const getRange = (key) => {
  const n = new Date();
  const pad = (v) => String(v).padStart(2,'0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = fmt(n);

  switch(key) {
    case 'today':     return { from: today, to: today };
    case 'yesterday': { const d=new Date(n); d.setDate(d.getDate()-1); const s=fmt(d); return {from:s,to:s}; }
    case 'this_week': { const d=new Date(n); d.setDate(n.getDate()-n.getDay()+1); return {from:fmt(d),to:today}; }
    case 'this_month':return { from:`${n.getFullYear()}-${pad(n.getMonth()+1)}-01`, to:today };
    case 'last_month':{
      const f=new Date(n.getFullYear(),n.getMonth()-1,1);
      const t=new Date(n.getFullYear(),n.getMonth(),0);
      return {from:fmt(f),to:fmt(t)};
    }
    default: return null;
  }
};

const PRESETS = [
  { key:'today',      label:'Hari Ini' },
  { key:'yesterday',  label:'Kemarin' },
  { key:'this_week',  label:'Minggu Ini' },
  { key:'this_month', label:'Bulan Ini' },
  { key:'last_month', label:'Bulan Lalu' },
  { key:'custom',     label:'Custom' },
];

export default function PeriodFilter({ value, onChange, className='' }) {
  const [preset, setPreset] = useState('this_month');
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (key) => {
    setPreset(key);
    if (key === 'custom') { setShowCustom(true); return; }
    setShowCustom(false);
    const range = getRange(key);
    if (range) onChange(range);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button key={p.key} onClick={() => handlePreset(p.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${preset===p.key ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)]' : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
            {p.label}
          </button>
        ))}
      </div>
      {(showCustom || preset === 'custom') && (
        <div className="flex items-center gap-3 flex-wrap">
          <Calendar size={14} className="text-[var(--text-muted)]"/>
          <input type="date" value={value.from}
            onChange={e => onChange({ ...value, from: e.target.value })}
            className="input-base h-9 text-sm flex-1 min-w-32"/>
          <span className="text-xs text-[var(--text-muted)]">s/d</span>
          <input type="date" value={value.to}
            onChange={e => onChange({ ...value, to: e.target.value })}
            className="input-base h-9 text-sm flex-1 min-w-32"/>
        </div>
      )}
      <p className="text-[10px] text-[var(--text-muted)]">{value.from} — {value.to}</p>
    </div>
  );
}
