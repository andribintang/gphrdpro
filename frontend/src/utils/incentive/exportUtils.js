/**
 * EXPORT UTILITIES
 * PDF via jsPDF (loaded from CDN)
 * Excel via SheetJS (xlsx)
 * QR Code via qrcode library
 */

import { toRp, toRpShort, MONTHS_ID } from './incentiveService';

// ── Load jsPDF from CDN ───────────────────────────────────────
let jsPDFLoaded = false;
const loadJsPDF = () => new Promise((resolve, reject) => {
  if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
  if (jsPDFLoaded) {
    const check = setInterval(() => {
      if (window.jspdf) { clearInterval(check); resolve(window.jspdf.jsPDF); }
    }, 100);
    return;
  }
  jsPDFLoaded = true;
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload = () => resolve(window.jspdf.jsPDF);
  s.onerror = () => reject(new Error('Gagal load jsPDF'));
  document.head.appendChild(s);
});

// ── Load QRCode from CDN ──────────────────────────────────────
const loadQRCode = () => new Promise((resolve, reject) => {
  if (window.QRCode) { resolve(window.QRCode); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  s.onload = () => resolve(window.QRCode);
  s.onerror = () => resolve(null); // QR optional
  document.head.appendChild(s);
});

// ── Generate QR data URL ──────────────────────────────────────
const generateQRDataUrl = async (text) => {
  return new Promise((resolve) => {
    try {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.left = '-9999px';
      document.body.appendChild(div);

      // Use canvas-based QR
      import('qrcode').then(QRCode => {
        QRCode.default.toDataURL(text, { width: 80, margin: 1, color: { dark: '#000', light: '#fff' } })
          .then(url => { document.body.removeChild(div); resolve(url); })
          .catch(() => { document.body.removeChild(div); resolve(null); });
      }).catch(() => { resolve(null); });
    } catch { resolve(null); }
  });
};

// ════════════════════════════════════════════════════════════════
// EXPORT SINGLE SLIP PDF
// ════════════════════════════════════════════════════════════════
export const exportSlipPDF = async (result, period, companyName = 'HRD Lite') => {
  const jsPDF = await loadJsPDF();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const W   = doc.internal.pageSize.getWidth();
  const H   = doc.internal.pageSize.getHeight();

  // ── Colors ──────────────────────────────────────────────────
  const purple    = [103,  58, 183];
  const darkPurple= [ 49,  27,  93];
  const emerald   = [ 16, 185, 129];
  const light     = [248, 248, 252];
  const gray      = [100, 116, 139];
  const dark      = [ 15,  23,  42];

  let y = 0;

  // ── Header gradient block ─────────────────────────────────
  doc.setFillColor(...purple);
  doc.rect(0, 0, W, 42, 'F');

  // Decorative circles
  doc.setFillColor(...darkPurple);
  doc.circle(W - 10, 5, 18, 'F');
  doc.circle(10, 35, 12, 'F');

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName.toUpperCase(), W / 2, 10, { align: 'center' });

  // Slip title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SLIP INSENTIF', W / 2, 20, { align: 'center' });

  // Period
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(period?.name || '', W / 2, 28, { align: 'center' });

  // Status badge
  const statusLabel = { draft:'Draft', calculated:'Dihitung', approved:'Disetujui', locked:'Final' }[result.status] || '';
  doc.setFillColor(255, 255, 255, 0.2);
  doc.roundedRect(W/2 - 15, 32, 30, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(statusLabel, W / 2, 37, { align: 'center' });

  y = 48;

  // ── Employee info card ────────────────────────────────────
  doc.setFillColor(...light);
  doc.roundedRect(6, y, W - 12, 28, 3, 3, 'F');

  // Avatar circle
  doc.setFillColor(...purple);
  doc.circle(18, y + 14, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text((result.employee_name || '?')[0].toUpperCase(), 18, y + 18, { align: 'center' });

  // Employee details
  doc.setTextColor(...dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(result.employee_name || '', 30, y + 10);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gray);
  doc.text(result.position_name || '-', 30, y + 16);
  doc.text(result.branch_name || '-',   30, y + 22);

  y += 34;

  // ── Total incentive highlight ────────────────────────────
  doc.setFillColor(...emerald);
  doc.roundedRect(6, y, W - 12, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL INSENTIF', W / 2, y + 6, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(toRp(result.total_incentive), W / 2, y + 14, { align: 'center' });

  y += 24;

  // ── Helper: section header ───────────────────────────────
  const sectionHeader = (title, color = gray) => {
    doc.setFillColor(240, 240, 248);
    doc.rect(6, y, W - 12, 7, 'F');
    doc.setTextColor(...color);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 10, y + 5);
    y += 9;
  };

  // ── Helper: detail row ───────────────────────────────────
  const detailRow = (label, value, valueColor = dark, isLast = false) => {
    doc.setTextColor(...dark);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 10, y + 4);
    doc.setTextColor(...valueColor);
    doc.setFont('helvetica', 'bold');
    doc.text(value, W - 8, y + 4, { align: 'right' });
    if (!isLast) {
      doc.setDrawColor(230, 230, 240);
      doc.line(6, y + 7, W - 6, y + 7);
    }
    y += 8;
  };

  const d = result.details_json || {};

  // ── Performance section ──────────────────────────────────
  sectionHeader('PERFORMANCE PENJUALAN');
  if (parseFloat(result.wa_sales_amount) > 0)
    detailRow('💬 Penjualan WA', toRp(result.wa_sales_amount));
  if (parseFloat(result.marketplace_performance) > 0)
    detailRow('🛒 Performance Marketplace', toRp(result.marketplace_performance));
  if (parseFloat(result.web_performance) > 0)
    detailRow('🌐 Performance Web', toRp(result.web_performance));

  y += 2;

  // ── Incentive section ─────────────────────────────────────
  sectionHeader('RINCIAN INSENTIF', emerald);
  if (parseFloat(result.wa_incentive) > 0)
    detailRow(`💬 WA (${parseFloat(d.wa?.channel_pct || 0)}%)`, toRp(result.wa_incentive), emerald);
  if (parseFloat(result.marketplace_incentive) > 0)
    detailRow(`🛒 Marketplace (${parseFloat(d.marketplace?.channel_pct || 0)}%)`, toRp(result.marketplace_incentive), emerald);
  if (parseFloat(result.web_incentive) > 0)
    detailRow(`🌐 Web (${parseFloat(d.web?.channel_pct || 0)}%)`, toRp(result.web_incentive), emerald);
  if (parseFloat(result.activity_incentive) > 0)
    detailRow('⭐ Insentif Aktivitas', toRp(result.activity_incentive), emerald);
  if (parseFloat(result.bonus_target) > 0)
    detailRow('🎯 Bonus Target', toRp(result.bonus_target), emerald);

  y += 2;

  // Total row
  doc.setFillColor(...emerald);
  doc.roundedRect(6, y, W - 12, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL INSENTIF', 10, y + 7);
  doc.text(toRp(result.total_incentive), W - 8, y + 7, { align: 'right' });
  y += 14;

  // ── Footer ────────────────────────────────────────────────
  doc.setDrawColor(...purple);
  doc.setLineWidth(0.5);
  doc.line(6, y, W - 6, y);
  y += 4;

  doc.setTextColor(...gray);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}`, W / 2, y + 3, { align: 'center' });
  doc.text('Dokumen ini dihasilkan secara otomatis oleh sistem', W / 2, y + 8, { align: 'center' });

  // QR Code (verification)
  try {
    const QRCode = await import('qrcode');
    const qrData = `INCENTIVE|${result.id}|${result.employee_name}|${result.total_incentive}|${period?.name}`;
    const qrUrl  = await QRCode.default.toDataURL(qrData, { width: 60, margin: 0 });
    doc.addImage(qrUrl, 'PNG', W - 20, H - 22, 14, 14);
    doc.setTextColor(...gray);
    doc.setFontSize(5);
    doc.text('Scan untuk verifikasi', W - 13, H - 6, { align: 'center' });
  } catch { /* QR optional */ }

  // Save
  const filename = `slip_insentif_${(result.employee_name || 'karyawan').replace(/\s+/g, '_')}_${period?.month}_${period?.year}.pdf`;
  doc.save(filename);
  return filename;
};

// ════════════════════════════════════════════════════════════════
// EXPORT ALL SLIPS — Bulk PDF (one page per employee)
// ════════════════════════════════════════════════════════════════
export const exportBulkPDF = async (results, period, companyName = 'HRD Lite', onProgress) => {
  const jsPDF = await loadJsPDF();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const W   = doc.internal.pageSize.getWidth();

  const purple  = [103,  58, 183];
  const emerald = [ 16, 185, 129];
  const gray    = [100, 116, 139];
  const dark    = [ 15,  23,  42];
  const light   = [248, 248, 252];

  for (let idx = 0; idx < results.length; idx++) {
    if (idx > 0) doc.addPage();
    onProgress?.(idx + 1, results.length);

    const result = results[idx];
    const d      = result.details_json || {};
    let y        = 0;

    // Header
    doc.setFillColor(...purple);
    doc.rect(0, 0, W, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(companyName.toUpperCase(), W/2, 9, { align: 'center' });
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('SLIP INSENTIF', W/2, 18, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(period?.name || '', W/2, 26, { align: 'center' });

    y = 44;

    // Employee info
    doc.setFillColor(...light);
    doc.roundedRect(6, y, W-12, 22, 3, 3, 'F');
    doc.setFillColor(...purple);
    doc.circle(16, y+11, 7, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(10);
    doc.setFont('helvetica','bold');
    doc.text((result.employee_name||'?')[0].toUpperCase(), 16, y+14.5, { align:'center' });
    doc.setTextColor(...dark);
    doc.setFontSize(9.5);
    doc.setFont('helvetica','bold');
    doc.text(result.employee_name||'', 27, y+8);
    doc.setFontSize(7);
    doc.setFont('helvetica','normal');
    doc.setTextColor(...gray);
    doc.text(`${result.position_name||'-'} · ${result.branch_name||'-'}`, 27, y+14);

    y += 28;

    // Total
    doc.setFillColor(...emerald);
    doc.roundedRect(6, y, W-12, 14, 3, 3, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(6.5);
    doc.text('TOTAL INSENTIF', W/2, y+5.5, { align:'center' });
    doc.setFontSize(13);
    doc.setFont('helvetica','bold');
    doc.text(toRp(result.total_incentive), W/2, y+12, { align:'center' });

    y += 20;

    // Rows helper
    const row = (label, val, color=dark) => {
      doc.setTextColor(...dark);
      doc.setFontSize(7);
      doc.setFont('helvetica','normal');
      doc.text(label, 10, y+4);
      doc.setTextColor(...color);
      doc.setFont('helvetica','bold');
      doc.text(val, W-8, y+4, { align:'right' });
      doc.setDrawColor(230,230,240);
      doc.line(6, y+6.5, W-6, y+6.5);
      y += 7.5;
    };

    // Performance
    doc.setFillColor(240,240,248);
    doc.rect(6,y,W-12,6.5,'F');
    doc.setTextColor(...gray);
    doc.setFontSize(6.5);
    doc.setFont('helvetica','bold');
    doc.text('INSENTIF', 10, y+4.5);
    y += 8;

    if (parseFloat(result.wa_incentive)>0)           row(`WA (${parseFloat(d.wa?.channel_pct||0)}%)`,           toRp(result.wa_incentive),          emerald);
    if (parseFloat(result.marketplace_incentive)>0)  row(`Marketplace (${parseFloat(d.marketplace?.channel_pct||0)}%)`, toRp(result.marketplace_incentive), emerald);
    if (parseFloat(result.web_incentive)>0)          row(`Web (${parseFloat(d.web?.channel_pct||0)}%)`,          toRp(result.web_incentive),          emerald);
    if (parseFloat(result.activity_incentive)>0)     row('Aktivitas',                                            toRp(result.activity_incentive),     [147,51,234]);
    if (parseFloat(result.bonus_target)>0)           row('Bonus Target',                                         toRp(result.bonus_target),           [217,119,6]);

    // Footer
    y += 2;
    doc.setTextColor(...gray);
    doc.setFontSize(6);
    doc.setFont('helvetica','normal');
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')} · ${idx+1}/${results.length}`, W/2, y+4, { align:'center' });
  }

  const filename = `slip_insentif_bulk_${period?.month}_${period?.year}.pdf`;
  doc.save(filename);
  return filename;
};

// ════════════════════════════════════════════════════════════════
// EXPORT EXCEL — Rekap semua karyawan
// ════════════════════════════════════════════════════════════════
export const exportExcel = async (results, period) => {
  // Dynamic import XLSX
  const XLSX = await import('xlsx');

  const rows = results.map((r, i) => ({
    'No':                       i + 1,
    'Nama Karyawan':            r.employee_name || '',
    'Cabang':                   r.branch_name || '',
    'Jabatan':                  r.position_name || '',
    'Penjualan WA':             parseFloat(r.wa_sales_amount) || 0,
    'Performance Marketplace':  parseFloat(r.marketplace_performance) || 0,
    'Performance Web':          parseFloat(r.web_performance) || 0,
    'Insentif WA':              parseFloat(r.wa_incentive) || 0,
    'Insentif Marketplace':     parseFloat(r.marketplace_incentive) || 0,
    'Insentif Web':             parseFloat(r.web_incentive) || 0,
    'Insentif Aktivitas':       parseFloat(r.activity_incentive) || 0,
    'Bonus Target':             parseFloat(r.bonus_target) || 0,
    'TOTAL INSENTIF':           parseFloat(r.total_incentive) || 0,
    'Status':                   r.status || '',
  }));

  // Totals row
  rows.push({
    'No': '',
    'Nama Karyawan': 'TOTAL',
    'Cabang': '', 'Jabatan': '',
    'Penjualan WA':            results.reduce((s,r) => s + (parseFloat(r.wa_sales_amount)||0), 0),
    'Performance Marketplace': results.reduce((s,r) => s + (parseFloat(r.marketplace_performance)||0), 0),
    'Performance Web':         results.reduce((s,r) => s + (parseFloat(r.web_performance)||0), 0),
    'Insentif WA':             results.reduce((s,r) => s + (parseFloat(r.wa_incentive)||0), 0),
    'Insentif Marketplace':    results.reduce((s,r) => s + (parseFloat(r.marketplace_incentive)||0), 0),
    'Insentif Web':            results.reduce((s,r) => s + (parseFloat(r.web_incentive)||0), 0),
    'Insentif Aktivitas':      results.reduce((s,r) => s + (parseFloat(r.activity_incentive)||0), 0),
    'Bonus Target':            results.reduce((s,r) => s + (parseFloat(r.bonus_target)||0), 0),
    'TOTAL INSENTIF':          results.reduce((s,r) => s + (parseFloat(r.total_incentive)||0), 0),
    'Status': '',
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    {wch:4}, {wch:22}, {wch:16}, {wch:18},
    {wch:16},{wch:20},{wch:16},
    {wch:14},{wch:18},{wch:14},{wch:18},{wch:14},
    {wch:18},{wch:12},
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, period?.name || 'Insentif');

  const filename = `rekap_insentif_${period?.month}_${period?.year}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
};

// ════════════════════════════════════════════════════════════════
// EXPORT WA SALES EXCEL
// ════════════════════════════════════════════════════════════════
export const exportWaSalesExcel = async (sales, periodName) => {
  const XLSX = await import('xlsx');

  const rows = sales.map((s, i) => ({
    'No':             i + 1,
    'Tanggal':        s.date,
    'Karyawan':       s.employee?.name || '',
    'Cabang':         s.branch?.name || '',
    'Customer':       s.customer_name || '',
    'Nominal':        parseFloat(s.sale_amount) || 0,
    'Insentif (%)':   parseFloat(s.channel_pct) || 0,
    'Insentif (Rp)':  parseFloat(s.incentive_amount) || 0,
    'Keterangan':     s.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{wch:4},{wch:12},{wch:20},{wch:14},{wch:20},{wch:16},{wch:12},{wch:16},{wch:20}];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'WA Sales');

  const filename = `wa_sales_${periodName?.replace(/\s+/g,'_') || 'export'}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
};
