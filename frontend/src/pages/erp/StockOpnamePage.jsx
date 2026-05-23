import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, RefreshCw, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService, toRpShort } from '../../utils/erp/erpService';

export default function StockOpnamePage() {
  const [products, setProducts] = useState([]);
  const [opname, setOpname]     = useState({});
  const [loading, setLoad]      = useState(true);
  const [saving, setSave]       = useState(false);
  const [branch, setBranch]     = useState('1');

  const fetch = useCallback(async()=>{
    setLoad(true);
    try {
      const res = await erpService.getProducts({ branch_id:branch, limit:500 });
      setProducts(res.data.data.products||[]);
      const init = {};
      (res.data.data.products||[]).forEach(p=>{ init[p.id] = p.stock?.qty||0; });
      setOpname(init);
    } catch { toast.error('Gagal memuat produk'); }
    finally { setLoad(false); }
  },[branch]);

  useEffect(()=>{fetch();},[fetch]);

  const handleSubmit = async() => {
    const changes = products.filter(p => parseInt(opname[p.id]||0) !== (p.stock?.qty||0));
    if (!changes.length) { toast('Tidak ada perubahan stok'); return; }
    if (!confirm(`Update stok untuk ${changes.length} produk?`)) return;
    setSave(true);
    try {
      await erpService.submitStockOpname({ branch_id:parseInt(branch), items: changes.map(p=>({ product_id:p.id, actual_qty:parseInt(opname[p.id]||0) })) });
      toast.success(`${changes.length} produk stok diperbarui`);
      fetch();
    } catch(e) { toast.error(e.response?.data?.message||'Gagal'); }
    finally { setSave(false); }
  };

  const changesCount = products.filter(p=>parseInt(opname[p.id]||0)!==(p.stock?.qty||0)).length;

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Stok Opname</h1><p className="body-sm text-[var(--text-muted)]">Update stok aktual vs sistem</p></div>
        <div className="flex gap-2">
          <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base h-9 text-sm">
            <option value="1">GP Racing</option><option value="2">GP Distro</option>
          </select>
          <button onClick={fetch} className="btn-icon"><RefreshCw size={16}/></button>
          {changesCount>0 && (
            <button onClick={handleSubmit} disabled={saving} className="btn-primary gap-2">
              {saving?<Loader2 size={15} className="animate-spin"/>:<Save size={15}/>}
              Simpan ({changesCount} perubahan)
            </button>
          )}
        </div>
      </div>

      {changesCount>0 && (
        <div className="card-sm mb-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-semibold">⚠ {changesCount} produk memiliki perbedaan stok</p>
        </div>
      )}

      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)] sticky top-0">
              <tr>{['Produk','SKU','Stok Sistem','Stok Aktual','Selisih'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {loading ? [...Array(5)].map((_,i)=>(
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="skeleton h-8"/></td></tr>
              )) : products.map(p=>{
                const sistem = p.stock?.qty||0;
                const aktual = parseInt(opname[p.id]||0);
                const diff   = aktual - sistem;
                const changed = aktual !== sistem;
                return (
                  <tr key={p.id} className={`hover:bg-[var(--bg-secondary)] ${changed?'bg-amber-50/50 dark:bg-amber-950/20':''}`}>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{p.sku||'—'}</td>
                    <td className="px-4 py-3 text-center font-bold">{sistem}</td>
                    <td className="px-4 py-3">
                      <input type="number" min={0} value={opname[p.id]??sistem}
                        onChange={e=>setOpname(prev=>({...prev,[p.id]:parseInt(e.target.value)||0}))}
                        className={`input-base h-8 text-center w-24 text-sm ${changed?'border-amber-400 bg-amber-50 dark:bg-amber-950/30':''}`}/>
                    </td>
                    <td className={`px-4 py-3 text-center font-bold ${diff>0?'text-emerald-600':diff<0?'text-red-600':'text-[var(--text-muted)]'}`}>
                      {diff>0?'+':''}{diff===0?'—':diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
