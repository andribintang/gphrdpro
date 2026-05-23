import { useState } from 'react';
import { Upload, Download, CheckCircle2, XCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService } from '../../utils/erp/erpService';

const TEMPLATE_PRODUCTS = [
  ['name','sku','barcode','category_id','buy_price','sell_price','unit','weight','initial_stock'],
  ['Contoh Produk','SKU001','8991234567890','','50000','75000','pcs','0.5','100'],
];

const TEMPLATE_CUSTOMERS = [
  ['name','phone','email','address','city','province','postal_code'],
  ['Nama Pelanggan','081234567890','email@example.com','Jl. Contoh No. 1','Jakarta','DKI Jakarta','12345'],
];

export default function ImportPage() {
  const [tab, setTab]       = useState('products');
  const [file, setFile]     = useState(null);
  const [branch, setBranch] = useState('1');
  const [result, setResult] = useState(null);
  const [loading, setLoad]  = useState(false);

  const downloadTemplate = (type) => {
    const data = type==='products' ? TEMPLATE_PRODUCTS : TEMPLATE_CUSTOMERS;
    const csv = data.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `template_${type}.csv`;
    a.click();
    toast.success('Template didownload!');
  };

  const handleImport = async() => {
    if (!file) { toast.error('Pilih file CSV dulu'); return; }
    setLoad(true); setResult(null);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l=>l.trim());
      const headers = lines[0].split(',').map(h=>h.trim().replace(/"/g,''));
      const rows = lines.slice(1).map(line=>{
        const vals = line.split(',').map(v=>v.trim().replace(/"/g,''));
        const obj = {};
        headers.forEach((h,i)=>{ if(vals[i]) obj[h]=vals[i]; });
        return obj;
      }).filter(r=>Object.keys(r).length>0);

      const res = tab==='products'
        ? await erpService.importProducts({ branch_id:parseInt(branch), rows, filename:file.name })
        : await erpService.importCustomers({ rows, filename:file.name });

      setResult(res.data.data);
      toast.success(`Import selesai: ${res.data.data.success} berhasil, ${res.data.data.failed} gagal`);
    } catch(e) { toast.error(e.response?.data?.message||'Gagal import'); }
    finally { setLoad(false); }
  };

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Import Data</h1><p className="body-sm text-[var(--text-muted)]">Import massal produk atau pelanggan via CSV</p></div>
      </div>

      <div className="flex gap-2 mb-6">
        {[{k:'products',l:'Produk'},{k:'customers',l:'Pelanggan'}].map(t=>(
          <button key={t.k} onClick={()=>{setTab(t.k);setFile(null);setResult(null);}}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${tab===t.k?'bg-[var(--brand-600)] text-white border-[var(--brand-600)]':'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]'}`}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-sm">Upload File CSV</h3>
          {tab==='products' && (
            <div><label className="field-label">Cabang</label>
              <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base text-sm">
                <option value="1">GP Racing</option><option value="2">GP Distro</option>
              </select>
            </div>
          )}
          <div>
            <label className="field-label">File CSV</label>
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${file?'border-[var(--brand-600)] bg-[var(--brand-50)]':'border-[var(--border)] hover:border-[var(--brand-600)]'}`}>
              <input type="file" accept=".csv" onChange={e=>setFile(e.target.files[0])} className="hidden" id="csv-upload"/>
              <label htmlFor="csv-upload" className="cursor-pointer">
                <FileSpreadsheet size={32} className="mx-auto mb-2 text-[var(--text-muted)]"/>
                {file ? <p className="text-sm font-semibold text-[var(--brand-600)]">{file.name}</p> : <p className="text-sm text-[var(--text-muted)]">Klik untuk pilih file CSV</p>}
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>downloadTemplate(tab)} className="btn-secondary flex-1 gap-2"><Download size={15}/> Download Template</button>
            <button onClick={handleImport} disabled={!file||loading} className="btn-primary flex-1 gap-2">
              {loading?<Loader2 size={15} className="animate-spin"/>:<Upload size={15}/>} Import
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-sm mb-4">Hasil Import</h3>
          {!result ? (
            <div className="text-center py-8"><Upload size={32} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30"/><p className="text-sm text-[var(--text-muted)]">Belum ada hasil import</p></div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-center">
                  <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-600"/>
                  <p className="text-2xl font-black text-emerald-600">{result.success}</p>
                  <p className="text-xs text-emerald-700">Berhasil</p>
                </div>
                <div className="flex-1 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-center">
                  <XCircle size={20} className="mx-auto mb-1 text-red-600"/>
                  <p className="text-2xl font-black text-red-600">{result.failed}</p>
                  <p className="text-xs text-red-700">Gagal</p>
                </div>
              </div>
              {result.errors?.length>0 && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 max-h-48 overflow-y-auto scrollbar-thin">
                  <p className="text-xs font-bold text-red-700 mb-2">Error:</p>
                  {(Array.isArray(result.errors)?result.errors:JSON.parse(result.errors||'[]')).map((e,i)=>(
                    <p key={i} className="text-xs text-red-600">• {e}</p>
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
