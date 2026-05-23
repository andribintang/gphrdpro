import { useState } from 'react';
import { Upload, Download, CheckCircle2, XCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpService } from '../../utils/erp/erpService';

export default function ImportPage() {
  const [tab, setTab]       = useState('products');
  const [file, setFile]     = useState(null);
  const [branch, setBranch] = useState('1');
  const [result, setResult] = useState(null);
  const [loading, setLoad]  = useState(false);

  const downloadTemplate = async (type) => {
    try {
      const XLSX = await import('xlsx');
      let headers, example, sheetName;
      if (type === 'products') {
        headers = ['name','sku','barcode','buy_price','sell_price','sell_price_mp','sell_price_wa','unit','weight','initial_stock','notes'];
        example = ['Contoh Produk','SKU001','8991234567890','50000','75000','80000','70000','pcs','0.5','100','catatan opsional'];
        sheetName = 'Template Produk';
      } else {
        headers = ['name','phone','email','address','city','province','postal_code','notes'];
        example = ['Nama Pelanggan','081234567890','email@example.com','Jl. Contoh No. 1','Jakarta','DKI Jakarta','12345',''];
        sheetName = 'Template Pelanggan';
      }
      const ws = XLSX.utils.aoa_to_sheet([headers, example]);
      ws['!cols'] = headers.map(() => ({ wch: 18 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `template_${type}.xlsx`);
      toast.success('Template Excel didownload!');
    } catch { toast.error('Gagal download template'); }
  };

  const handleImport = async () => {
    if (!file) { toast.error('Pilih file Excel dulu'); return; }
    setLoad(true); setResult(null);
    try {
      const XLSX = await import('xlsx');
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!rows.length) { toast.error('File kosong atau format salah'); setLoad(false); return; }
      const res = tab === 'products'
        ? await erpService.importProducts({ branch_id: parseInt(branch), rows, filename: file.name })
        : await erpService.importCustomers({ rows, filename: file.name });
      setResult(res.data.data);
      toast.success(`Import selesai: ${res.data.data.success} berhasil, ${res.data.data.failed} gagal`);
    } catch(e) { toast.error(e.response?.data?.message || 'Gagal import'); }
    finally { setLoad(false); }
  };

  return (
    <div className="section animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Import Data</h1><p className="body-sm text-[var(--text-muted)]">Import massal via Excel (.xlsx)</p></div>
      </div>
      <div className="flex gap-2 mb-6">
        {[{k:'products',l:'Produk'},{k:'customers',l:'Pelanggan'}].map(t=>(
          <button key={t.k} onClick={()=>{setTab(t.k);setFile(null);setResult(null);}}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${tab===t.k?'bg-[var(--brand-600)] text-white border-[var(--brand-600)]':'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]'}`}>{t.l}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-sm">Upload File Excel (.xlsx)</h3>
          {tab==='products'&&<div><label className="field-label">Cabang</label><select value={branch} onChange={e=>setBranch(e.target.value)} className="input-base text-sm"><option value="1">GP Racing</option><option value="2">GP Distro</option></select></div>}
          <div>
            <label className="field-label">File Excel</label>
            <label htmlFor="xlsx-upload" className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${file?'border-[var(--brand-600)] bg-[var(--brand-50)]':'border-[var(--border)] hover:border-[var(--brand-600)]'}`}>
              <input type="file" id="xlsx-upload" accept=".xlsx,.xls" onChange={e=>setFile(e.target.files[0])} className="hidden"/>
              <FileSpreadsheet size={32} className={`mb-2 ${file?'text-[var(--brand-600)]':'text-[var(--text-muted)]'}`}/>
              {file?<div className="text-center"><p className="text-sm font-semibold text-[var(--brand-600)]">{file.name}</p><p className="text-xs text-[var(--text-muted)]">{(file.size/1024).toFixed(1)} KB</p></div>:<div className="text-center"><p className="text-sm text-[var(--text-muted)]">Klik untuk pilih file Excel (.xlsx)</p></div>}
            </label>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200">
            <p className="text-xs text-blue-700 font-semibold mb-1">📋 Panduan</p>
            <ol className="text-xs text-blue-600 space-y-0.5 list-decimal list-inside">
              <li>Download template Excel</li><li>Isi data sesuai kolom</li><li>Upload & klik Import</li>
            </ol>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>downloadTemplate(tab)} className="btn-secondary flex-1 gap-2"><Download size={15}/> Download Template</button>
            <button onClick={handleImport} disabled={!file||loading} className="btn-primary flex-1 gap-2">{loading?<Loader2 size={15} className="animate-spin"/>:<Upload size={15}/>} Import</button>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="font-bold text-sm mb-4">Hasil Import</h3>
          {!result?<div className="text-center py-8"><Upload size={32} className="mx-auto mb-2 text-[var(--text-muted)] opacity-30"/><p className="text-sm text-[var(--text-muted)]">Belum ada hasil import</p></div>:(
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-center"><CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-600"/><p className="text-2xl font-black text-emerald-600">{result.success}</p><p className="text-xs text-emerald-700">Berhasil</p></div>
                <div className="flex-1 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-center"><XCircle size={20} className="mx-auto mb-1 text-red-600"/><p className="text-2xl font-black text-red-600">{result.failed}</p><p className="text-xs text-red-700">Gagal</p></div>
              </div>
              {result.errors?.length>0&&<div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 max-h-48 overflow-y-auto scrollbar-thin"><p className="text-xs font-bold text-red-700 mb-2">Detail Error:</p>{(Array.isArray(result.errors)?result.errors:JSON.parse(result.errors||'[]')).map((e,i)=><p key={i} className="text-xs text-red-600">• {e}</p>)}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
