/**
 * EXPORT UTILITIES — Slip Insentif PDF
 * Optimized: 1 halaman A5, header kompak
 */
import { toRp, toRpShort } from './incentiveService';

const loadJsPDF = () => new Promise((resolve, reject) => {
  if (window.jspdf?.jsPDF) { resolve(window.jspdf.jsPDF); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload = () => resolve(window.jspdf.jsPDF);
  s.onerror = () => reject(new Error('Gagal load jsPDF'));
  document.head.appendChild(s);
});

const C = {
  red:     [220,  38,  38],
  redDk:   [153,  27,  27],
  green:   [ 22, 163,  74],
  navy:    [ 30,  58, 138],
  gray:    [107, 114, 128],
  grayL:   [245, 245, 245],
  dark:    [ 17,  24,  39],
  white:   [255, 255, 255],
  line:    [229, 231, 235],
};

const fmt = n => toRp(n);
const pct = n => parseFloat(n || 0);

// ════════════════════════════════════════════════════════════════
// SINGLE SLIP — 1 halaman A5, semua muat
// ════════════════════════════════════════════════════════════════
export const exportSlipPDF = async (result, period, companyName = 'GPDISTRO HR Pro') => {
  const jsPDF = await loadJsPDF();
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();   // 148mm
  const H = doc.internal.pageSize.getHeight();  // 210mm
  const P = 7; // padding
  const d = result.details_json || {};

  // ── Pre-calculate content height to fit everything ───────────
  const rows = [
    parseFloat(result.wa_incentive)          > 0 && { l:`WhatsApp (${pct(d.wa?.channel_pct)}%)`,            v: result.wa_incentive,          c: C.green },
    parseFloat(result.marketplace_incentive) > 0 && { l:`Marketplace (${pct(d.marketplace?.channel_pct)}%)`,v: result.marketplace_incentive, c: C.green },
    parseFloat(result.web_incentive)         > 0 && { l:`Website (${pct(d.web?.channel_pct)}%)`,             v: result.web_incentive,         c: C.green },
    parseFloat(result.activity_incentive)    > 0 && { l:'Aktivitas',                                          v: result.activity_incentive,    c: C.navy  },
    parseFloat(result.bonus_target)          > 0 && { l:`Bonus Target${d.bonus_target?.tier?' - '+d.bonus_target.tier.name:''}`, v: result.bonus_target, c: C.redDk },
  ].filter(Boolean);

  const perfRows = [
    parseFloat(result.wa_sales_amount)        > 0 && { l:'WhatsApp',    v: result.wa_sales_amount },
    parseFloat(result.marketplace_performance)> 0 && { l:'Marketplace', v: result.marketplace_performance },
    parseFloat(result.web_performance)        > 0 && { l:'Website',     v: result.web_performance },
  ].filter(Boolean);

  const actRows = d.activities?.details || [];

  let y = 0;

  // ════════════════════════════
  // HEADER — kompak 28mm
  // ════════════════════════════
  doc.setFillColor(...C.red);
  doc.rect(0, 0, W, 28, 'F');
  // Accent circle kecil
  doc.setFillColor(...C.redDk);
  doc.circle(W - 2, 0, 14, 'F');

  doc.setTextColor(...C.white);
  // Company + title dalam satu area kompak
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), W / 2, 7, { align: 'center' });

  doc.setFontSize(14);
  doc.text('SLIP INSENTIF', W / 2, 15, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(period?.name || '', W / 2, 22, { align: 'center' });

  // Status pill kecil di kiri
  const statusLabel = { draft:'Draft', calculated:'Dihitung', approved:'Disetujui', locked:'Final' }[result.status] || '';
  doc.setFillColor(0, 0, 0, 0.25);
  doc.roundedRect(P, 23.5, 18, 5, 1, 1, 'F');
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel, P + 9, 27, { align: 'center' });

  y = 32;

  // ════════════════════════════
  // EMPLOYEE INFO — 1 baris kompak
  // ════════════════════════════
  doc.setFillColor(...C.grayL);
  doc.roundedRect(P, y, W - P*2, 18, 2, 2, 'F');

  // Avatar mini
  doc.setFillColor(...C.red);
  doc.circle(P + 9, y + 9, 7, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text((result.employee_name||'?')[0].toUpperCase(), P + 9, y + 12.5, { align:'center' });

  // Info
  const ex = P + 19;
  doc.setTextColor(...C.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(result.employee_name || '', ex, y + 7);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.gray);
  doc.text(`${result.position_name || '-'}  |  ${result.branch_name || '-'}`, ex, y + 12.5);

  // Total di kanan dalam employee card
  doc.setTextColor(...C.green);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(result.total_incentive), W - P, y + 8, { align: 'right' });
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.gray);
  doc.text('Total Insentif', W - P, y + 13, { align: 'right' });

  y += 22;

  // ════════════════════════════
  // HELPER: section head
  // ════════════════════════════
  const sh = (title, color = C.navy) => {
    doc.setFillColor(...color);
    doc.rect(P, y, 2, 6, 'F');
    doc.setFillColor(color[0], color[1], color[2], 0.08);
    doc.rect(P + 2, y, W - P*2 - 2, 6, 'F');
    doc.setTextColor(...color);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), P + 4, y + 4.2);
    y += 7.5;
  };

  // ════════════════════════════
  // HELPER: detail row (kompak)
  // ════════════════════════════
  const ROW_H = 6.5;
  const rw = (label, value, col = C.dark, last = false) => {
    doc.setTextColor(...C.dark);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(label, P + 3, y + 4.2);
    doc.setTextColor(...col);
    doc.setFont('helvetica', 'bold');
    doc.text(fmt(value), W - P, y + 4.2, { align: 'right' });
    if (!last) {
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.15);
      doc.line(P + 2, y + ROW_H, W - P, y + ROW_H);
    }
    y += ROW_H;
  };

  // ════════════════════════════
  // PERFORMANCE (jika ada)
  // ════════════════════════════
  if (perfRows.length > 0) {
    sh('Performance Penjualan', C.gray);
    perfRows.forEach((r, i) => rw(r.l, r.v, C.dark, i === perfRows.length - 1));
    y += 2;
  }

  // ════════════════════════════
  // RINCIAN INSENTIF
  // ════════════════════════════
  sh('Rincian Insentif', C.green);
  rows.forEach((r, i) => rw(r.l, r.v, r.c, i === rows.length - 1));

  y += 2;

  // Total bar
  doc.setFillColor(...C.green);
  doc.roundedRect(P, y, W - P*2, 9, 1.5, 1.5, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL INSENTIF', P + 3, y + 6);
  doc.text(fmt(result.total_incentive), W - P, y + 6, { align: 'right' });
  y += 13;

  // ════════════════════════════
  // DETAIL AKTIVITAS (kompak)
  // ════════════════════════════
  if (actRows.length > 0) {
    sh('Detail Aktivitas', C.navy);
    actRows.forEach((a, i) => {
      doc.setTextColor(...C.dark);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(a.activity, P + 3, y + 3.5);
      doc.setFontSize(5.5);
      doc.setTextColor(...C.gray);
      doc.text(`${a.date}  |  ${a.qty}x  @${toRpShort(a.nominal)}`, P + 3, y + 7);
      doc.setTextColor(...C.navy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(fmt(a.amount), W - P, y + 5, { align: 'right' });
      if (i < actRows.length - 1) {
        doc.setDrawColor(...C.line); doc.setLineWidth(0.15);
        doc.line(P + 2, y + 9, W - P, y + 9);
      }
      y += 9.5;
    });
    y += 2;
  }

  // ════════════════════════════
  // FOOTER — QR + tanggal
  // ════════════════════════════
  // Pastikan footer di posisi yang cukup dari bawah
  const footerY = Math.max(y + 2, H - 20);

  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.line(P, footerY, W - P, footerY);

  const printDate = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });

  // QR Code kecil di kanan
  try {
    const QRCode = await import('qrcode');
    const qrData = `INC|${result.id}|${result.employee_name}|${result.total_incentive}`;
    const qrUrl  = await QRCode.default.toDataURL(qrData, { width: 48, margin: 0, color: { dark:'#1e3a8a', light:'#fff' } });
    doc.addImage(qrUrl, 'PNG', W - P - 13, footerY + 2, 11, 11);
    doc.setFontSize(4.5);
    doc.setTextColor(...C.gray);
    doc.text('Scan verifikasi', W - P - 6.5, footerY + 15, { align:'center' });
  } catch {}

  doc.setTextColor(...C.gray);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dicetak: ${printDate}`, P, footerY + 5);
  doc.text('Dokumen digenerate otomatis', P, footerY + 10);

  // Bottom bar merah
  doc.setFillColor(...C.red);
  doc.rect(0, H - 2.5, W, 2.5, 'F');

  const filename = `slip_insentif_${(result.employee_name||'').replace(/\s+/g,'_')}_${period?.month}_${period?.year}.pdf`;
  doc.save(filename);
  return filename;
};

// ════════════════════════════════════════════════════════════════
// BULK PDF
// ════════════════════════════════════════════════════════════════
export const exportBulkPDF = async (results, period, companyName = 'GPDISTRO HR Pro', onProgress) => {
  const jsPDF = await loadJsPDF();
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const P = 7;

  for (let idx = 0; idx < results.length; idx++) {
    if (idx > 0) doc.addPage();
    onProgress?.(idx + 1, results.length);
    const r = results[idx];
    const d = r.details_json || {};
    let y = 0;

    // Header kompak 24mm
    doc.setFillColor(...C.red);
    doc.rect(0, 0, W, 24, 'F');
    doc.setFillColor(...C.redDk);
    doc.circle(W, 0, 12, 'F');

    doc.setTextColor(...C.white);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName.toUpperCase(), W / 2, 7, { align: 'center' });
    doc.setFontSize(13);
    doc.text('SLIP INSENTIF', W / 2, 15, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${period?.name || ''}  |  ${idx+1}/${results.length}`, W / 2, 21, { align: 'center' });

    y = 28;

    // Employee card kompak
    doc.setFillColor(...C.grayL);
    doc.roundedRect(P, y, W - P*2, 16, 2, 2, 'F');
    doc.setFillColor(...C.red);
    doc.circle(P + 8, y + 8, 6, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text((r.employee_name||'?')[0].toUpperCase(), P + 8, y + 11, { align:'center' });

    doc.setTextColor(...C.dark);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(r.employee_name||'', P + 17, y + 7);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.gray);
    doc.text(`${r.position_name||'-'}  |  ${r.branch_name||'-'}`, P + 17, y + 12);

    doc.setTextColor(...C.green);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(fmt(r.total_incentive), W - P, y + 8, { align:'right' });
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.gray);
    doc.text('Total Insentif', W - P, y + 13, { align:'right' });

    y += 20;

    // Section + Row helpers
    const sh = (title, col = C.navy) => {
      doc.setFillColor(...col);
      doc.rect(P, y, 2, 5.5, 'F');
      doc.setFillColor(col[0], col[1], col[2], 0.08);
      doc.rect(P+2, y, W-P*2-2, 5.5, 'F');
      doc.setTextColor(...col);
      doc.setFontSize(5.8);
      doc.setFont('helvetica', 'bold');
      doc.text(title.toUpperCase(), P + 4, y + 4);
      y += 7;
    };
    const rw = (label, val, col = C.dark) => {
      doc.setTextColor(...C.dark);
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'normal');
      doc.text(label, P + 3, y + 4);
      doc.setTextColor(...col);
      doc.setFont('helvetica', 'bold');
      doc.text(fmt(val), W - P, y + 4, { align:'right' });
      doc.setDrawColor(...C.line); doc.setLineWidth(0.15);
      doc.line(P+2, y+6, W-P, y+6);
      y += 6.5;
    };

    // Incentive rows
    sh('Rincian Insentif', C.green);
    const pct = n => parseFloat(n||0);
    if (parseFloat(r.wa_incentive)>0)          rw(`WhatsApp (${pct(d.wa?.channel_pct)}%)`,            r.wa_incentive,          C.green);
    if (parseFloat(r.marketplace_incentive)>0)  rw(`Marketplace (${pct(d.marketplace?.channel_pct)}%)`,r.marketplace_incentive, C.green);
    if (parseFloat(r.web_incentive)>0)           rw(`Website (${pct(d.web?.channel_pct)}%)`,            r.web_incentive,         C.green);
    if (parseFloat(r.activity_incentive)>0)      rw('Aktivitas',                                         r.activity_incentive,    C.navy);
    if (parseFloat(r.bonus_target)>0)            rw('Bonus Target',                                      r.bonus_target,          C.redDk);

    y += 1;
    // Total
    doc.setFillColor(...C.green);
    doc.roundedRect(P, y, W - P*2, 8.5, 1.5, 1.5, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', P + 3, y + 6);
    doc.text(fmt(r.total_incentive), W - P, y + 6, { align:'right' });
    y += 12;

    // Footer
    const fy = Math.max(y + 2, H - 16);
    doc.setDrawColor(...C.line); doc.setLineWidth(0.25);
    doc.line(P, fy, W-P, fy);
    doc.setFontSize(5.5);
    doc.setTextColor(...C.gray);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, P, fy + 5);

    doc.setFillColor(...C.red);
    doc.rect(0, H - 2.5, W, 2.5, 'F');
  }

  const filename = `slip_insentif_bulk_${period?.month}_${period?.year}.pdf`;
  doc.save(filename);
  return filename;
};

// ════════════════════════════════════════════════════════════════
// EXPORT EXCEL
// ════════════════════════════════════════════════════════════════
export const exportExcel = async (results, period) => {
  const XLSX = await import('xlsx');
  const rows = results.map((r, i) => ({
    'No': i+1, 'Nama': r.employee_name||'', 'Cabang': r.branch_name||'', 'Jabatan': r.position_name||'',
    'Penjualan WA':    parseFloat(r.wa_sales_amount)||0,
    'Perf. Marketplace': parseFloat(r.marketplace_performance)||0,
    'Perf. Web':       parseFloat(r.web_performance)||0,
    'Insentif WA':     parseFloat(r.wa_incentive)||0,
    'Insentif MP':     parseFloat(r.marketplace_incentive)||0,
    'Insentif Web':    parseFloat(r.web_incentive)||0,
    'Aktivitas':       parseFloat(r.activity_incentive)||0,
    'Bonus Target':    parseFloat(r.bonus_target)||0,
    'TOTAL':           parseFloat(r.total_incentive)||0,
    'Status':          r.status||'',
  }));
  rows.push({
    'No':'', 'Nama':'TOTAL', 'Cabang':'', 'Jabatan':'',
    'Penjualan WA':     results.reduce((s,r)=>s+(parseFloat(r.wa_sales_amount)||0),0),
    'Perf. Marketplace':results.reduce((s,r)=>s+(parseFloat(r.marketplace_performance)||0),0),
    'Perf. Web':        results.reduce((s,r)=>s+(parseFloat(r.web_performance)||0),0),
    'Insentif WA':      results.reduce((s,r)=>s+(parseFloat(r.wa_incentive)||0),0),
    'Insentif MP':      results.reduce((s,r)=>s+(parseFloat(r.marketplace_incentive)||0),0),
    'Insentif Web':     results.reduce((s,r)=>s+(parseFloat(r.web_incentive)||0),0),
    'Aktivitas':        results.reduce((s,r)=>s+(parseFloat(r.activity_incentive)||0),0),
    'Bonus Target':     results.reduce((s,r)=>s+(parseFloat(r.bonus_target)||0),0),
    'TOTAL':            results.reduce((s,r)=>s+(parseFloat(r.total_incentive)||0),0),
    'Status':'',
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{wch:4},{wch:22},{wch:14},{wch:16},{wch:14},{wch:16},{wch:12},{wch:13},{wch:13},{wch:12},{wch:11},{wch:13},{wch:14},{wch:10}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, period?.name||'Insentif');
  XLSX.writeFile(wb, `rekap_insentif_${period?.month}_${period?.year}.xlsx`);
};
