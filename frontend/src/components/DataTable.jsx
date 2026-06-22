import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, Search, X,
  SlidersHorizontal, Download, CheckSquare, Square, MinusSquare,
} from 'lucide-react';

// ── Status Badge ─────────────────────────────────────────────
export const StatusBadge = ({ label, color, dot }) => (
  <span className={`
    inline-flex items-center gap-1.5 px-2.5 py-[3px]
    rounded-full text-[11px] font-semibold tracking-wide border
    transition-all duration-150 ${color}
  `}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`}/>}
    {label}
  </span>
);

// ── Sort Icon ─────────────────────────────────────────────────
const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronsUpDown size={12} className="opacity-30 group-hover:opacity-60 transition-opacity"/>;
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-[var(--brand-600)]"/>
    : <ChevronDown size={12} className="text-[var(--brand-600)]"/>;
};

// ── Skeleton Row ──────────────────────────────────────────────
const SkeletonRow = ({ cols }) => (
  <tr className="border-b border-[var(--border-subtle)] last:border-0">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-5 py-[18px]">
        <div className="skeleton rounded-lg" style={{ height:'14px', width:`${[70,55,45,60,40,50][i%6]}%`, animationDelay:`${i*80}ms` }}/>
      </td>
    ))}
  </tr>
);

// ── Empty State ───────────────────────────────────────────────
const EmptyState = ({ icon, text, action }) => (
  <tr><td colSpan={99}>
    <div className="flex flex-col items-center justify-center py-20 px-6">
      {icon && (
        <div className="w-16 h-16 rounded-2xl mb-5 bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] opacity-40">
          {icon}
        </div>
      )}
      <p className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">{text}</p>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">Coba ubah filter atau tambah data baru</p>
      {action}
    </div>
  </td></tr>
);

// ── Pagination ────────────────────────────────────────────────
const Pagination = ({ page, totalPages, total, pageSize, onPage, pageSizeOptions, onPageSize }) => {
  const from = total === 0 ? 0 : (page-1)*pageSize+1;
  const to   = Math.min(page*pageSize, total);

  const getPages = () => {
    if (totalPages <= 7) return Array.from({length:totalPages},(_,i)=>i+1);
    if (page <= 4)             return [1,2,3,4,5,'...',totalPages];
    if (page >= totalPages-3)  return [1,'...',totalPages-4,totalPages-3,totalPages-2,totalPages-1,totalPages];
    return [1,'...',page-1,page,page+1,'...',totalPages];
  };

  if (total <= pageSize && !pageSizeOptions?.length) return null;

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--border)] bg-[var(--bg-card)] flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <p className="text-[12px] text-[var(--text-muted)] font-medium">
          <span className="font-semibold text-[var(--text-secondary)]">{from}–{to}</span> dari{' '}
          <span className="font-semibold text-[var(--text-secondary)]">{total}</span> data
        </p>
        {pageSizeOptions?.length > 0 && (
          <select value={pageSize} onChange={e => onPageSize(parseInt(e.target.value))}
            className="h-7 px-2 pr-6 text-[11px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)]/20 cursor-pointer">
            {pageSizeOptions.map(n => <option key={n} value={n}>{n} / halaman</option>)}
          </select>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={()=>onPage(p=>Math.max(1,p-1))} disabled={page===1}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-30 transition-all duration-150 disabled:cursor-not-allowed">
            <ChevronLeft size={15}/>
          </button>
          {getPages().map((p,i) => p==='...' ? (
            <span key={`e${i}`} className="w-8 text-center text-[12px] text-[var(--text-muted)]">···</span>
          ) : (
            <button key={p} onClick={()=>onPage(()=>p)}
              className={`h-8 min-w-[32px] px-1 rounded-lg text-[12px] font-semibold transition-all duration-150 ${page===p?'bg-[var(--brand-600)] text-white shadow-sm':'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'}`}>
              {p}
            </button>
          ))}
          <button onClick={()=>onPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-30 transition-all duration-150 disabled:cursor-not-allowed">
            <ChevronRight size={15}/>
          </button>
        </div>
      )}
    </div>
  );
};

// ── CSV Export Helper ────────────────────────────────────────
const escapeCsv = (val) => {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const exportToCsv = (columns, rows, filename) => {
  const headers = columns.map(c => c.exportLabel || c.label);
  const lines = [headers.map(escapeCsv).join(',')];
  rows.forEach(row => {
    const line = columns.map(c => {
      const raw = c.exportValue ? c.exportValue(row) : (row[c.key] ?? '');
      return escapeCsv(raw);
    });
    lines.push(line.join(','));
  });
  const csv = '\uFEFF' + lines.join('\n'); // BOM untuk Excel UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ════════════════════════════════════════════════════════════════
export default function DataTable({
  columns=[], data=[], loading=false, filters=[], searchPlaceholder='Cari...',
  searchKeys=[], searchFn, pageSize=20, pageSizeOptions, emptyIcon, emptyText='Tidak ada data', emptyAction,
  onRowClick, rowKey='id', actions, zebra=false, stickyHeader=true, className='', toolbar, rowClassName,
  selectable=false, onSelectionChange, bulkActions,
  exportable=false, exportFilename='data',
}) {
  const [search, setSearch]           = useState('');
  const [sortCol, setSortCol]         = useState('');
  const [sortDir, setSortDir]         = useState('asc');
  const [page, setPage]               = useState(1);
  const [pageSizeState, setPageSizeState] = useState(pageSize);
  const [activeFilters, setFilters]   = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredRow, setHoveredRow]   = useState(null);
  const [selected, setSelected]       = useState(new Set());
  const searchRef = useRef(null);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault(); searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filtered = useMemo(() => {
    let rows = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      if (searchFn) {
        rows = rows.filter(row => searchFn(row, q));
      } else if (searchKeys.length) {
        rows = rows.filter(row => searchKeys.some(key => String(row[key]||'').toLowerCase().includes(q)));
      }
    }
    Object.entries(activeFilters).forEach(([key,val]) => { if(val) rows=rows.filter(row=>String(row[key])===String(val)); });
    if (sortCol) {
      rows.sort((a,b) => {
        const av=a[sortCol]??'', bv=b[sortCol]??'';
        const cmp=typeof av==='number'?av-bv:String(av).localeCompare(String(bv),'id',{numeric:true});
        return sortDir==='asc'?cmp:-cmp;
      });
    }
    return rows;
  }, [data, search, sortCol, sortDir, activeFilters, searchKeys, searchFn]);

  const totalPages = Math.max(1, Math.ceil(filtered.length/pageSizeState));
  const paginated  = filtered.slice((page-1)*pageSizeState, page*pageSizeState);
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  const handleSort = useCallback((col) => {
    if (!columns.find(c=>c.key===col)?.sortable) return;
    if (sortCol===col) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  }, [sortCol, columns]);

  const handlePageSize = useCallback((n) => {
    setPageSizeState(n);
    setPage(1);
  }, []);

  // ── Selection logic ───────────────────────────────────────
  const getKey = useCallback((row, idx) => row[rowKey] ?? idx, [rowKey]);

  const pageKeys = useMemo(() => paginated.map((r,i) => getKey(r,i)), [paginated, getKey]);
  const allPageSelected = pageKeys.length > 0 && pageKeys.every(k => selected.has(k));
  const somePageSelected = pageKeys.some(k => selected.has(k));

  const emitSelection = useCallback((nextSet) => {
    setSelected(nextSet);
    onSelectionChange?.(Array.from(nextSet));
  }, [onSelectionChange]);

  const togglePageAll = useCallback(() => {
    const next = new Set(selected);
    if (allPageSelected) pageKeys.forEach(k => next.delete(k));
    else pageKeys.forEach(k => next.add(k));
    emitSelection(next);
  }, [selected, allPageSelected, pageKeys, emitSelection]);

  const toggleRow = useCallback((key) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    emitSelection(next);
  }, [selected, emitSelection]);

  const selectAllFiltered = useCallback(() => {
    const next = new Set(filtered.map((r,i) => getKey(r,i)));
    emitSelection(next);
  }, [filtered, getKey, emitSelection]);

  const clearSelection = useCallback(() => emitSelection(new Set()), [emitSelection]);

  const selectedRows = useMemo(() => {
    if (!selected.size) return [];
    return data.filter((r,i) => selected.has(getKey(r,i)));
  }, [data, selected, getKey]);

  const handleExport = () => exportToCsv(columns, filtered, exportFilename);

  return (
    <div className={`
      rounded-2xl overflow-hidden
      bg-[var(--bg-card)]
      border border-[var(--border)]
      shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)]
      dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.12)]
      ${className}
    `}>

      {/* Bulk action bar — replaces toolbar when selection active */}
      {selectable && selected.size > 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border)] bg-[var(--brand-600)]/[0.06] flex-wrap">
          <span className="text-[13px] font-semibold text-[var(--brand-600)]">
            {selected.size} dipilih
          </span>
          {selected.size < filtered.length && (
            <button onClick={selectAllFiltered} className="text-[12px] text-[var(--brand-600)] hover:underline font-medium">
              Pilih semua {filtered.length} hasil
            </button>
          )}
          <button onClick={clearSelection} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium flex items-center gap-1">
            <X size={11}/> Bersihkan
          </button>
          <div className="ml-auto flex items-center gap-2">
            {bulkActions?.(selectedRows, clearSelection)}
          </div>
        </div>
      ) : (
        /* Toolbar */
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--border)] flex-wrap bg-[var(--bg-card)]">
          {(searchKeys.length>0 || searchFn) && (
            <div className="relative flex-1 min-w-52">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"/>
              <input ref={searchRef} value={search}
                onChange={e=>{setSearch(e.target.value);setPage(1);}}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-9 pr-9 text-[13px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)]/20 focus:border-[var(--brand-600)]/50 transition-all duration-150"/>
              {search ? (
                <button onClick={()=>{setSearch('');setPage(1);searchRef.current?.focus();}}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-150">
                  <X size={12}/>
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] font-mono opacity-40 pointer-events-none">/</kbd>
              )}
            </div>
          )}

          {filters.length>0 && (
            <button onClick={()=>setShowFilters(v=>!v)}
              className={`h-9 px-3.5 rounded-xl text-[13px] font-medium flex items-center gap-2 border transition-all duration-150 ${showFilters||activeFilterCount>0?'bg-[var(--brand-600)]/8 border-[var(--brand-600)]/30 text-[var(--brand-600)]':'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}>
              <SlidersHorizontal size={14}/>
              Filter
              {activeFilterCount>0 && (
                <span className="w-5 h-5 rounded-full bg-[var(--brand-600)] text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
          )}

          {exportable && (
            <button onClick={handleExport}
              className="h-9 px-3.5 rounded-xl text-[13px] font-medium flex items-center gap-2 border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-150">
              <Download size={14}/>
              Export
            </button>
          )}

          {toolbar}

          <div className="ml-auto">
            <span className="text-[12px] text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-secondary)]">{search || activeFilterCount ? filtered.length : data.length}</span>
              {search || activeFilterCount ? ' hasil' : ' data'}
            </span>
          </div>
        </div>
      )}

      {/* Filter panel */}
      {showFilters && filters.length>0 && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]/60 flex-wrap">
          {filters.map(f=>(
            <div key={f.key} className="flex items-center gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{f.label}</label>
              <select value={activeFilters[f.key]||''} onChange={e=>{setFilters(p=>({...p,[f.key]:e.target.value}));setPage(1);}}
                className="h-8 px-3 pr-8 text-[12px] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)]/20 transition-all duration-150 min-w-32 cursor-pointer">
                <option value="">Semua</option>
                {f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          {activeFilterCount>0 && (
            <button onClick={()=>setFilters({})} className="text-[11px] font-semibold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1.5">
              <X size={11}/> Reset
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm border-collapse" style={{minWidth:'560px'}}>
          <thead>
            <tr className={`border-b border-[var(--border)] bg-[var(--bg-secondary)]/70 ${stickyHeader?'sticky top-0 z-10':''}`}>
              {selectable && (
                <th className="px-4 py-3.5 w-10">
                  <button onClick={togglePageAll} className="flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--brand-600)] transition-colors">
                    {allPageSelected ? <CheckSquare size={15} className="text-[var(--brand-600)]"/>
                      : somePageSelected ? <MinusSquare size={15} className="text-[var(--brand-600)]"/>
                      : <Square size={15}/>}
                  </button>
                </th>
              )}
              {columns.map(col=>(
                <th key={col.key} onClick={()=>col.sortable&&handleSort(col.key)} style={{width:col.width}}
                  className={`px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] whitespace-nowrap select-none group ${col.sortable?'cursor-pointer hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/60 transition-all duration-150':''} ${col.align==='right'?'text-right':col.align==='center'?'text-center':''}`}>
                  <span className={`inline-flex items-center gap-1.5 ${col.align==='right'?'justify-end':''}`}>
                    {col.label}{col.sortable&&<SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir}/>}
                  </span>
                </th>
              ))}
              {actions&&<th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] w-20">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({length:6}).map((_,i)=><SkeletonRow key={i} cols={columns.length+(actions?1:0)+(selectable?1:0)}/>)
            ) : paginated.length===0 ? (
              <EmptyState icon={emptyIcon} text={emptyText} action={emptyAction}/>
            ) : (
              paginated.map((row,idx)=>{
                const key=getKey(row,idx);
                const isHovered=hoveredRow===key;
                const isSelected=selected.has(key);
                return (
                  <tr key={key} onClick={()=>onRowClick?.(row)}
                    onMouseEnter={()=>setHoveredRow(key)} onMouseLeave={()=>setHoveredRow(null)}
                    className={`border-b border-[var(--border-subtle)] last:border-0 transition-colors duration-100 group ${onRowClick?'cursor-pointer':''} ${!isSelected&&!isHovered&&rowClassName?rowClassName(row,idx):''} ${zebra&&idx%2===0&&!rowClassName?'bg-[var(--bg-secondary)]/25':''} ${isSelected?'bg-[var(--brand-600)]/[0.05] dark:bg-[var(--brand-600)]/[0.09]':isHovered?'bg-[var(--brand-600)]/[0.035] dark:bg-[var(--brand-600)]/[0.07]':''}`}>
                    {selectable && (
                      <td className="px-4 py-[15px]" onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>toggleRow(key)} className="flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--brand-600)] transition-colors">
                          {isSelected ? <CheckSquare size={15} className="text-[var(--brand-600)]"/> : <Square size={15}/>}
                        </button>
                      </td>
                    )}
                    {columns.map(col=>(
                      <td key={col.key}
                        className={`px-5 py-[15px] text-[13.5px] leading-snug text-[var(--text-primary)] ${col.align==='right'?'text-right':''} ${col.align==='center'?'text-center':''} ${col.nowrap?'whitespace-nowrap':''}`}>
                        {col.render?col.render(row[col.key],row):(row[col.key]??<span className="text-[var(--text-muted)]">—</span>)}
                      </td>
                    ))}
                    {actions&&(
                      <td className="px-5 py-[15px] text-right" onClick={e=>e.stopPropagation()}>
                        <div className={`flex items-center justify-end gap-1 transition-opacity duration-150 ${isHovered?'opacity-100':'opacity-0 group-hover:opacity-100'}`}>
                          {actions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading&&<Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSizeState} onPage={setPage} pageSizeOptions={pageSizeOptions} onPageSize={handlePageSize}/>}
    </div>
  );
}
