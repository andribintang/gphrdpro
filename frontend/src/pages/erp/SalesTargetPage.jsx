import { useState, useEffect, useCallback } from 'react';
import {
  Target, TrendingUp, TrendingDown, CheckCircle2, RefreshCw,
  Edit3, Save, X, ChevronLeft, ChevronRight, Download, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, CartesianGrid, Cell,
} from 'recharts';
import { CHANNELS } from '../../utils/erp/erpService';
import DataTable from '../../components/DataTable';

const API = import.meta.env.VITE_API_URL || 'https://backend-gphrdpro.up.railway.app/api';
const auth = () => ({ Authorization: 'Bearer ' + localStorage.getItem('accessToken') });

const MONTHS_ID = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const toRp = v => {
  const n = parseFloat(v)||0;
  if (n>=1_000_000_000) return 'Rp '+(n/1e9).toFixed(1)+'M';
  if (n>=1_000_000)     return 'Rp '+(n/1e6).toFixed(1)+'jt';
  if (n>=1_000)         return 'Rp '+(n/1e3).toFixed(0)+'rb';
  return 'Rp '+n.toLocaleString('id-ID');
};

const pct = (actual, target) => target > 0 ? Math.min(200, (actual/target*100)) : 0;

const AchievementBar = ({ actual, target, showLabel = true }) => {
  const p = pct(actual, target);
  const color = p >= 100 ? 'bg-emerald-500' : p >= 70 ? 'bg-amber-500' : p >= 40 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, p)}%` }}/>
      </div>
      {showLabel && (
        <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>{toRp(actual)}</span>
          <span className={`font-bold ${p>=100?'text-emerald-600':p>=70?'text-amber-600':'text-red-500'}`}>
            {p.toFixed(0)}%
          </span>
          <span>{toRp(target)}</span>
        </div>
      )}
    </div>
  );
};

export default function SalesTargetPage() {
  const now = new Date();
  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [branch,  setBranch]  = useState('');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('dashboard'); // dashboard | set-target | history

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ year, month });
      if (branch) p.set('branch_id', branch);
      const r = await fetch(`${API}/erp/channel-targets/summary?${p}`, { headers: auth() });
      const d = await r.json();
      setData(d.data);
    } catch { toast.error('Gagal memuat data target'); }
    finally { setLoading(false); }
  }, [year, month, branch]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y=>y-1); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y=>y+1); } else setMonth(m=>m+1); };

  const exportExcel = () => {
    if (!data?.channels) return;
    const rows = data.channels.map(c => ({
      'Sub Channel': c.name, 'Channel': CHANNELS[c.channel]?.label || c.channel,
      'Target Revenue': parseFloat(c.target_revenue||0),
      'Aktual Revenue': parseFloat(c.actual_revenue||0),
      'Achievement %': pct(c.actual_revenue, c.target_revenue).toFixed(1) + '%',
      'Target Order': parseInt(c.target_orders||0),
      'Aktual Order': parseInt(c.actual_orders||0),
      'Gap': parseFloat(c.actual_revenue||0) - parseFloat(c.target_revenue||0),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [20,12,16,16,14,12,12,16].map(w=>({wch:w}));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Target ${MONTHS_ID[month]} ${year}`);
    XLSX.writeFile(wb, `sales_target_${year}_${month}.xlsx`);
    toast.success('Export berhasil');
  };

  const TABS = [
    { id:'dashboard',   label:'📊 Dashboard'   },
    { id:'set-target',  label:'🎯 Set Target'   },
    { id:'history',     label:'📈 Tren 6 Bulan' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Target Penjualan</h1>
          <p className="page-subtitle">Tracking pencapaian per sub channel</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm w-32">
            <option value="">Semua Cabang</option>
            <option value="1">GP Racing</option>
            <option value="2">GP Distro</option>
          </select>
          <button onClick={exportExcel} className="btn-secondary gap-2 h-9 text-sm">
            <Download size={14}/> Export
          </button>
          <button onClick={load} className="btn-icon"><RefreshCw size={15} className={loading?'animate-spin':''}/></button>
        </div>
      </div>

      {/* Period nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 rounded-xl border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-secondary)]">
            <ChevronLeft size={14}/>
          </button>
          <span className="font-bold text-base min-w-[160px] text-center">
            {MONTHS_ID[month]} {year}
          </span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-xl border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-secondary)]">
            <ChevronRight size={14}/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all
                ${tab===t.id?'border-[var(--brand-600)] text-[var(--brand-600)]':'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin"/></div>
      ) : !data ? null : (
        <>
          {tab === 'dashboard'  && <DashboardTab  data={data} year={year} month={month}/>}
          {tab === 'set-target' && <SetTargetTab  data={data} year={year} month={month} branch={branch} onSaved={load}/>}
          {tab === 'history'    && <HistoryTab    data={data}/>}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ════════════════════════════════════════════════════════════════
const DashboardTab = ({ data, year, month }) => {
  const { channels, totalTarget, totalActual, achievement } = data;
  const gap = totalActual - totalTarget;

  const SUMMARY = [
    { label:'Total Target',    value: toRp(totalTarget), icon:'🎯', color:'text-blue-600' },
    { label:'Total Aktual',    value: toRp(totalActual), icon:'💰', color:'text-emerald-600' },
    { label:`Achievement`,     value: achievement.toFixed(1)+'%', icon: achievement>=100?'🏆':'📈',
      color: achievement>=100?'text-emerald-600':achievement>=70?'text-amber-600':'text-red-500' },
    { label: gap>=0?'Surplus':'Gap', value: (gap>=0?'+':'')+toRp(gap), icon: gap>=0?'⬆️':'⬇️',
      color: gap>=0?'text-emerald-600':'text-red-500' },
  ];

  // Bar chart data
  const chartData = channels.map(c => ({
    name: c.name?.length > 12 ? c.name.slice(0,12)+'…' : c.name,
    target:  parseFloat(c.target_revenue||0),
    aktual:  parseFloat(c.actual_revenue||0),
    pct:     pct(c.actual_revenue, c.target_revenue),
  }));

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SUMMARY.map(s => (
          <div key={s.label} className="table-wrapper p-4 text-center">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Overall progress */}
      <div className="table-wrapper p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-sm">Overall Achievement {MONTHS_ID[month]} {year}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {achievement >= 100 ? '🏆 Target tercapai!' : achievement >= 70 ? '📈 Hampir mencapai target' : '⚠️ Perlu perhatian'}
            </p>
          </div>
          <span className={`text-2xl font-black ${achievement>=100?'text-emerald-600':achievement>=70?'text-amber-600':'text-red-500'}`}>
            {achievement.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${achievement>=100?'bg-emerald-500':achievement>=70?'bg-amber-500':achievement>=40?'bg-orange-500':'bg-red-500'}`}
            style={{ width: `${Math.min(100, achievement)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-[var(--text-muted)]">
          <span>{toRp(totalActual)}</span>
          <span>Target: {toRp(totalTarget)}</span>
        </div>
      </div>

      {/* Per sub-channel cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map(ch => {
          const p = pct(ch.actual_revenue, ch.target_revenue);
          const hasTarget = parseFloat(ch.target_revenue||0) > 0;
          const chInfo = CHANNELS[ch.channel] || CHANNELS.direct;
          return (
            <div key={ch.id} className={`table-wrapper p-4 border-t-4 ${
              p>=100?'border-emerald-500':p>=70?'border-amber-500':p>=40?'border-orange-500':'border-red-400'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-sm leading-tight">{ch.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${chInfo.bg} ${chInfo.color}`}>
                    {chInfo.label}
                  </span>
                </div>
                {hasTarget && (
                  <span className={`text-sm font-black px-2 py-0.5 rounded-lg
                    ${p>=100?'bg-emerald-100 text-emerald-700':p>=70?'bg-amber-100 text-amber-700':'bg-red-100 text-red-600'}`}>
                    {p.toFixed(0)}%
                  </span>
                )}
              </div>

              {hasTarget ? (
                <>
                  <AchievementBar actual={ch.actual_revenue} target={ch.target_revenue}/>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                    <div className="bg-[var(--bg-secondary)] rounded-lg p-2">
                      <p className="text-[10px] text-[var(--text-muted)]">Order Aktual</p>
                      <p className="font-bold text-sm">{ch.actual_orders}</p>
                      {parseInt(ch.target_orders||0) > 0 && (
                        <p className="text-[10px] text-[var(--text-muted)]">dari {ch.target_orders}</p>
                      )}
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-lg p-2">
                      <p className="text-[10px] text-[var(--text-muted)]">Gap Revenue</p>
                      <p className={`font-bold text-sm ${parseFloat(ch.actual_revenue)>=parseFloat(ch.target_revenue)?'text-emerald-600':'text-red-500'}`}>
                        {parseFloat(ch.actual_revenue)>=parseFloat(ch.target_revenue)?'+':''}
                        {toRp(parseFloat(ch.actual_revenue||0)-parseFloat(ch.target_revenue||0))}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-[var(--text-muted)]">Aktual: <b className="text-[var(--text-primary)]">{toRp(ch.actual_revenue)}</b></p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 italic">Target belum diset</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bar chart */}
      {chartData.some(d => d.target > 0 || d.aktual > 0) && (
        <div className="table-wrapper p-5">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Target vs Aktual per Sub Channel
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v=>toRp(v)} width={55}/>
              <Tooltip
                formatter={(v,n) => [toRp(v), n]}
                contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, fontSize:12 }}
              />
              <Bar dataKey="target" name="Target"  fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth={1} radius={[4,4,0,0]}/>
              <Bar dataKey="aktual" name="Aktual" radius={[4,4,0,0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.pct>=100?'#10b981':entry.pct>=70?'#f59e0b':'#ef4444'}/>
                ))}
              </Bar>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// SET TARGET TAB
// ════════════════════════════════════════════════════════════════
const SetTargetTab = ({ data, year, month, branch, onSaved }) => {
  const [targets, setTargets] = useState({});
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    const init = {};
    (data.channels || []).forEach(ch => {
      init[ch.id] = {
        target_revenue: parseFloat(ch.target_revenue||0) || '',
        target_orders:  parseInt(ch.target_orders||0)   || '',
        notes:          ch.notes || '',
      };
    });
    setTargets(init);
  }, [data]);

  const handleSave = async () => {
    const rows = Object.entries(targets)
      .filter(([,v]) => v.target_revenue !== '' || v.target_orders !== '')
      .map(([id, v]) => ({
        sub_channel_id: parseInt(id),
        target_revenue: parseFloat(v.target_revenue)||0,
        target_orders:  parseInt(v.target_orders)||0,
        notes:          v.notes,
      }));

    if (!rows.length) { toast.error('Isi minimal 1 target'); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API}/erp/channel-targets/bulk`, {
        method: 'POST',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, branch_id: branch||1, targets: rows }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); onSaved(); }
      else toast.error(d.message);
    } catch { toast.error('Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const totalTarget = Object.values(targets).reduce((s,v) => s + (parseFloat(v.target_revenue)||0), 0);

  // Data untuk DataTable — gabungkan channel info dengan target draft state
  const tableData = (data.channels || []).map(ch => ({
    ...ch,
    _target: targets[ch.id] || { target_revenue:'', target_orders:'', notes:'' },
  }));

  const columns = [
    { key: 'name', label: 'Sub Channel', sortable: true, render: v => <span className="font-semibold">{v}</span> },
    { key: 'channel', label: 'Channel', align: 'center', nowrap: true, render: v => {
      const chInfo = CHANNELS[v] || CHANNELS.direct;
      return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${chInfo.bg} ${chInfo.color}`}>{chInfo.label}</span>;
    }},
    { key: 'actual_revenue', label: 'Aktual Bulan Ini', sortable: true, align: 'right', nowrap: true,
      exportValue: row => parseFloat(row.actual_revenue||0),
      render: (v, row) => (
        <div>
          <span className="font-semibold text-emerald-600">{toRp(v)}</span>
          <p className="text-[10px] text-[var(--text-muted)] font-normal">{row.actual_orders} order</p>
        </div>
      )},
    { key: '_target_revenue', label: 'Target Revenue (Rp)', align: 'right', nowrap: true,
      exportValue: row => parseFloat(row._target.target_revenue || 0),
      render: (v, row) => (
        <input type="number" value={row._target.target_revenue}
          onClick={e => e.stopPropagation()}
          onChange={e => setTargets(prev => ({...prev, [row.id]: {...row._target, target_revenue: e.target.value}}))}
          placeholder="0" className="input-base text-sm text-right h-9 w-full"/>
      )},
    { key: '_target_orders', label: 'Target Order', align: 'center', nowrap: true,
      exportValue: row => parseInt(row._target.target_orders || 0),
      render: (v, row) => (
        <input type="number" value={row._target.target_orders}
          onClick={e => e.stopPropagation()}
          onChange={e => setTargets(prev => ({...prev, [row.id]: {...row._target, target_orders: e.target.value}}))}
          placeholder="0" className="input-base text-sm text-center h-9 w-24 mx-auto block"/>
      )},
    { key: '_target_notes', label: 'Catatan',
      exportValue: row => row._target.notes || '',
      render: (v, row) => (
        <input type="text" value={row._target.notes}
          onClick={e => e.stopPropagation()}
          onChange={e => setTargets(prev => ({...prev, [row.id]: {...row._target, notes: e.target.value}}))}
          placeholder="Catatan opsional..." className="input-base text-sm h-9 w-full"/>
      )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-[var(--text-muted)]">
          Set target untuk <b>{MONTHS_ID[month]} {year}</b>
        </p>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold">Total: <span className="text-[var(--brand-600)]">{toRp(totalTarget)}</span></p>
          <button onClick={handleSave} disabled={saving} className="btn-primary gap-2 h-9 text-sm">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={14}/>}
            Simpan Target
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tableData}
        searchKeys={['name']}
        searchPlaceholder="Cari sub channel..."
        filters={[{ key:'channel', label:'Channel', options:[
          { value:'wa', label:'WhatsApp' },
          { value:'marketplace', label:'Marketplace' },
          { value:'direct', label:'Langsung' },
        ]}]}
        exportable exportFilename={`target_${year}_${month}`}
        pageSizeOptions={[10,25,50]}
        pageSize={25}
        zebra
      />
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// HISTORY TAB — Tren 6 bulan
// ════════════════════════════════════════════════════════════════
const HistoryTab = ({ data }) => {
  const { trend } = data;
  if (!trend?.length) return (
    <div className="table-wrapper p-12 text-center text-[var(--text-muted)]">
      <TrendingUp size={36} className="mx-auto mb-3 opacity-30"/>
      <p>Belum ada data tren</p>
    </div>
  );

  // Build chart data — group by month, split by sub channel
  const monthMap = {};
  trend.forEach(r => {
    const key = `${r.year}-${String(r.month).padStart(2,'0')}`;
    const label = `${MONTHS_ID[r.month]?.slice(0,3)} ${r.year}`;
    if (!monthMap[key]) monthMap[key] = { key, label };
    const scName = (r.sub_channel||'Lainnya').slice(0,10);
    monthMap[key][scName] = (monthMap[key][scName]||0) + parseFloat(r.revenue||0);
  });

  const chartData = Object.values(monthMap);
  const subChannels = [...new Set(trend.map(r => (r.sub_channel||'Lainnya').slice(0,10)))];
  const COLORS = ['#f43f5e','#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

  return (
    <div className="space-y-5">
      <div className="table-wrapper p-5">
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Revenue per Sub Channel — 6 Bulan Terakhir</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
            <XAxis dataKey="label" tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v=>toRp(v)} width={55}/>
            <Tooltip
              formatter={(v,n) => [toRp(v), n]}
              contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, fontSize:12 }}
            />
            {subChannels.map((sc, i) => (
              <Bar key={sc} dataKey={sc} name={sc} fill={COLORS[i%COLORS.length]} radius={[3,3,0,0]} stackId="a"/>
            ))}
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      <div className="table-wrapper overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Detail per Bulan</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase text-left">Periode</th>
                {subChannels.map(sc => (
                  <th key={sc} className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase text-right">{sc}</th>
                ))}
                <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map(row => {
                const total = subChannels.reduce((s,sc) => s+(row[sc]||0), 0);
                return (
                  <tr key={row.key} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]">
                    <td className="px-4 py-3 font-semibold">{row.label}</td>
                    {subChannels.map((sc,i) => (
                      <td key={sc} className="px-4 py-3 text-right text-xs" style={{ color: COLORS[i%COLORS.length] }}>
                        {row[sc] ? toRp(row[sc]) : '—'}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-bold">{toRp(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
