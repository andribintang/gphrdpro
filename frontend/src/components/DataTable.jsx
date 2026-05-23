import { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search, X, SlidersHorizontal } from 'lucide-react';

export const StatusBadge = ({ label, color, dot }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />}
    {label}
  </span>
);

const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronsUpDown size={13} className="text-[var(--text-muted)] opacity-40" />;
  return sortDir === 'asc' ? <ChevronUp size={13} className="text-[var(--brand-600)]" /> : <ChevronDown size={13} className="text-[var(--brand-600)]" />;
};

export default function DataTable({
  columns=[], data=[], loading=false, filters=[], searchPlaceholder='Cari...',
  searchKeys=[], pageSize=20, emptyIcon, emptyText='Tidak ada data', emptyAction,
  onRowClick, rowKey='id', actions, zebra=false, stickyHeader=true, className='',
}) {
  const [search, setSearch]         = useState('');
  const [sortCol, setSortCol]       = useState('');
  const [sortDir, setSortDir]       = useState('asc');
  const [page, setPage]             = useState(1);
  const [activeFilters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let rows = [...data];
    if (search.trim() && searchKeys.length) {
      const q = search.toLowerCase();
      rows = rows.filter(row => searchKeys.some(key => String(row[key]||'').toLowerCase().includes(q)));
    }
    Object.entries(activeFilters).forEach(([key,val]) => { if (val) rows = rows.filter(row => String(row[key])===String(val)); });
    if (sortCol) {
      rows.sort((a,b) => {
        const av=a[sortCol]??'', bv=b[sortCol]??'';
        const cmp = typeof av==='number' ? av-bv : String(av).localeCompare(String(bv),'id');
        return sortDir==='asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, search, sortCol, sortDir, activeFilters, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length/pageSize));
  const paginated  = filtered.slice((page-1)*pageSize, page*pageSize);

  const handleSort = useCallback((col) => {
    if (!columns.find(c=>c.key===col)?.sortable) return;
    if (sortCol===col) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  }, [sortCol, columns]);

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  if (loading) return (
    <div className={`table-wrapper ${className}`}>
      <div className="p-4 border-b border-[var(--border)] flex gap-3">
        <div className="skeleton h-9 flex-1 rounded-xl"/><div className="skeleton h-9 w-24 rounded-xl"/>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {[...Array(5)].map((_,i)=>(
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="skeleton h-4 w-32 rounded"/><div className="skeleton h-4 w-24 rounded"/><div className="skeleton h-4 w-16 rounded ml-auto"/>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`table-wrapper ${className}`}>
      <div className="flex items-center gap-2 p-4 border-b border-[var(--border)] flex-wrap">
        {searchKeys.length>0 && (
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={searchPlaceholder} className="input-base pl-9 h-9 text-sm w-full"/>
            {search && <button onClick={()=>{setSearch('');setPage(1);}} className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-icon-sm"><X size={13}/></button>}
          </div>
        )}
        {filters.length>0 && (
          <button onClick={()=>setShowFilters(v=>!v)} className={`btn-secondary h-9 px-3 text-sm gap-1.5 ${showFilters?'bg-[var(--bg-tertiary)]':''}`}>
            <SlidersHorizontal size={14}/>Filter
            {activeFilterCount>0 && <span className="w-5 h-5 rounded-full bg-[var(--brand-600)] text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
          </button>
        )}
        <span className="text-xs text-[var(--text-muted)] ml-auto whitespace-nowrap">{filtered.length} hasil</span>
      </div>

      {showFilters && filters.length>0 && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] flex-wrap bg-[var(--bg-secondary)]">
          {filters.map(f=>(
            <div key={f.key} className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[var(--text-muted)]">{f.label}:</label>
              <select value={activeFilters[f.key]||''} onChange={e=>{setFilters(p=>({...p,[f.key]:e.target.value}));setPage(1);}} className="input-base h-8 text-xs pr-8 min-w-28">
                <option value="">Semua</option>
                {f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          {activeFilterCount>0 && <button onClick={()=>setFilters({})} className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors">Reset</button>}
        </div>
      )}

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm border-collapse" style={{minWidth:'600px'}}>
          <thead>
            <tr className={`border-b border-[var(--border)] bg-[var(--bg-secondary)] ${stickyHeader?'sticky top-0 z-10':''}`}>
              {columns.map(col=>(
                <th key={col.key} onClick={()=>col.sortable&&handleSort(col.key)} style={{width:col.width}}
                  className={`px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] whitespace-nowrap select-none
                    ${col.sortable?'cursor-pointer hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors':''}
                    ${col.align==='right'?'text-right':col.align==='center'?'text-center':''}`}>
                  <span className="flex items-center gap-1.5">
                    {col.label}{col.sortable&&<SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir}/>}
                  </span>
                </th>
              ))}
              {actions && <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] w-24">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length===0 ? (
              <tr><td colSpan={columns.length+(actions?1:0)} className="text-center py-16">
                {emptyIcon&&<div className="flex justify-center mb-3 opacity-30">{emptyIcon}</div>}
                <p className="text-sm text-[var(--text-muted)]">{emptyText}</p>
                {emptyAction&&<div className="mt-4 flex justify-center">{emptyAction}</div>}
              </td></tr>
            ) : paginated.map((row,idx)=>(
              <tr key={row[rowKey]??idx} onClick={()=>onRowClick?.(row)}
                className={`border-b border-[var(--border-subtle)] last:border-0 transition-colors duration-100
                  ${onRowClick?'cursor-pointer':''}
                  ${zebra&&idx%2===0?'bg-[var(--bg-secondary)]/40':''}
                  hover:bg-[var(--bg-secondary)]`}>
                {columns.map(col=>(
                  <td key={col.key} className={`px-5 py-4 text-sm text-[var(--text-primary)]
                    ${col.align==='right'?'text-right':''}${col.align==='center'?'text-center':''}
                    ${col.nowrap?'whitespace-nowrap':''}`}>
                    {col.render ? col.render(row[col.key],row) : (row[col.key]??'—')}
                  </td>
                ))}
                {actions&&(
                  <td className="px-5 py-4 text-right" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length>pageSize && (
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--text-muted)]">{((page-1)*pageSize)+1}–{Math.min(page*pageSize,filtered.length)} dari {filtered.length}</p>
          <div className="flex items-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="btn-icon-sm disabled:opacity-30"><ChevronLeft size={14}/></button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
              let pn; if(totalPages<=5) pn=i+1; else if(page<=3) pn=i+1; else if(page>=totalPages-2) pn=totalPages-4+i; else pn=page-2+i;
              return <button key={pn} onClick={()=>setPage(pn)} className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${page===pn?'bg-[var(--brand-600)] text-white':'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>{pn}</button>;
            })}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="btn-icon-sm disabled:opacity-30"><ChevronRight size={14}/></button>
          </div>
        </div>
      )}
    </div>
  );
}
