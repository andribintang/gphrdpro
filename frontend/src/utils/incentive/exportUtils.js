/**
 * EXPORT UTILITIES — PDF Slip Insentif
 * Desain profesional tanpa emoji (jsPDF tidak support emoji)
 */

import { toRp, toRpShort } from './incentiveService';

// ── Load jsPDF ────────────────────────────────────────────────
const loadJsPDF = () => new Promise((resolve, reject) => {
  if (window.jspdf?.jsPDF) { resolve(window.jspdf.jsPDF); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload = () => resolve(window.jspdf.jsPDF);
  s.onerror = () => reject(new Error('Gagal load jsPDF'));
  document.head.appendChild(s);
});

// ── Color palette ────────────────────────────────────────────
const C = {
  red:      [220,  38,  38],
  redDark:  [153,  27,  27],
  redLight: [254, 226, 226],
  navy:     [ 30,  58, 138],
  green:    [ 22, 163,  74],
  greenBg:  [240, 253, 244],
  gray:     [107, 114, 128],
  grayL:    [243, 244, 246],
  dark:     [ 17,  24,  39],
  white:    [255, 255, 255],
  line:     [229, 231, 235],
};

// ── Helper: rounded rect ──────────────────────────────────────
const rRect = (doc, x, y, w, h, r, color, style='F') => {
  doc.setFillColor(...color);
  doc.roundedRect(x, y, w, h, r, r, style);
};

// ── Format decimal cleanly ────────────────────────────────────
const fmt = n => toRp(n);

// ════════════════════════════════════════════════════════════════
// SINGLE SLIP PDF — Desain profesional
// ════════════════════════════════════════════════════════════════
export const exportSlipPDF = async (result, period, companyName = 'GPDISTRO HR Pro') => {
  const jsPDF = await loadJsPDF();
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const W     = doc.internal.pageSize.getWidth();   // 148mm
  const H     = doc.internal.pageSize.getHeight();  // 210mm
  const PAD   = 8;

  let y = 0;

  // ══════════════════════════════════════════════
  // HEADER — merah solid dengan info perusahaan
  // ══════════════════════════════════════════════
  doc.setFillColor(...C.red);
  doc.rect(0, 0, W, 48, 'F');

  // Decorative accent
  doc.setFillColor(...C.redDark);
  doc.circle(W + 4, -4, 22, 'F');
  doc.circle(-4, 48, 14, 'F');

  // Company name
  doc.setTextColor(...C.white);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  const compUpper = companyName.toUpperCase();
  doc.text(compUpper, W / 2, 10, { align: 'center' });

  // Divider line
  doc.setDrawColor(255, 255, 255, 0.3);
  doc.setLineWidth(0.3);
  doc.line(PAD + 10, 13, W - PAD - 10, 13);

  // Slip title
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text('SLIP INSENTIF', W / 2, 23, { align: 'center' });

  // Period
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(period?.name || '', W / 2, 30, { align: 'center' });

  // Status pill
  const statusLabel = {
    draft:'Draft', calculated:'Dihitung', approved:'Disetujui', locked:'Final'
  }[result.status] || '';
  const pillW = 28;
  doc.setFillColor(255, 255, 255, 0.18);
  doc.roundedRect(W/2 - pillW/2, 34, pillW, 8, 2, 2, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel, W / 2, 39.5, { align: 'center' });

  y = 54;

  // ══════════════════════════════════════════════
  // EMPLOYEE INFO CARD
  // ══════════════════════════════════════════════
  rRect(doc, PAD, y, W - PAD*2, 30, 3, C.grayL);

  // Avatar circle
  doc.setFillColor(...C.red);
  doc.circle(PAD + 12, y + 15, 9, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(
    (result.employee_name || '?')[0].toUpperCase(),
    PAD + 12, y + 18.5, { align: 'center' }
  );

  // Employee details
  const ex = PAD + 25;
  doc.setTextColor(...C.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(result.employee_name || '', ex, y + 9);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.gray);
  doc.text(result.position_name || '-', ex, y + 15);
  doc.text(result.branch_name   || '-', ex, y + 21);

  // No. ID kecil di kanan
  doc.setFontSize(6);
  doc.text(`ID: ${result.id}`, W - PAD, y + 9, { align: 'right' });

  y += 36;

  // ══════════════════════════════════════════════
  // TOTAL BOX — hijau
  // ══════════════════════════════════════════════
  rRect(doc, PAD, y, W - PAD*2, 20, 3, C.green);

  doc.setTextColor(...C.white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL INSENTIF', W / 2, y + 7, { align: 'center' });

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(result.total_incentive), W / 2, y + 16, { align: 'center' });

  y += 26;

  // ══════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ══════════════════════════════════════════════
  const d = result.details_json || {};

  // Section header
  const secHead = (title, textColor = C.navy) => {
    doc.setFillColor(...C.grayL);
    doc.rect(PAD, y, W - PAD*2, 7, 'F');
    // Left accent bar
    doc.setFillColor(...textColor);
    doc.rect(PAD, y, 2.5, 7, 'F');
    doc.setTextColor(...textColor);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), PAD + 5, y + 4.8);
    y += 9;
  };

  // Detail row
  const row = (label, value, valueColor = C.dark, isLast = false) => {
    doc.setTextColor(...C.dark);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(label, PAD + 3, y + 4);
    doc.setTextColor(...valueColor);
    doc.setFont('helvetica', 'bold');
    doc.text(value, W - PAD, y + 4, { align: 'right' });
    if (!isLast) {
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.2);
      doc.line(PAD, y + 7, W - PAD, y + 7);
    }
    y += 8;
  };

  // ══════════════════════════════════════════════
  // PERFORMANCE PENJUALAN
  // ══════════════════════════════════════════════
  const hasPerf = parseFloat(result.wa_sales_amount) > 0 ||
                  parseFloat(result.marketplace_performance) > 0 ||
                  parseFloat(result.web_performance) > 0;

  if (hasPerf) {
    secHead('Performance Penjualan');
    if (parseFloat(result.wa_sales_amount)        > 0) row('WhatsApp',    fmt(result.wa_sales_amount));
    if (parseFloat(result.marketplace_performance) > 0) row('Marketplace', fmt(result.marketplace_performance));
    if (parseFloat(result.web_performance)         > 0) row('Website',     fmt(result.web_performance));
    y += 2;
  }

  // ══════════════════════════════════════════════
  // RINCIAN INSENTIF
  // ══════════════════════════════════════════════
  secHead('Rincian Insentif', C.green);

  const pct = n => parseFloat(n || 0);
  const rows = [
    { label: `WhatsApp    (${pct(d.wa?.channel_pct)}%)`,          val: result.wa_incentive },
    { label: `Marketplace (${pct(d.marketplace?.channel_pct)}%)`, val: result.marketplace_incentive },
    { label: `Website     (${pct(d.web?.channel_pct)}%)`,         val: result.web_incentive },
    { label: 'Insentif Aktivitas',                                  val: result.activity_incentive },
    { label: `Bonus Target${d.bonus_target?.tier ? ` - ${d.bonus_target.tier.name}` : ''}`, val: result.bonus_target },
  ].filter(r => parseFloat(r.val) > 0);

  rows.forEach((r, i) => row(r.label, fmt(r.val), C.green, i === rows.length - 1));

  y += 2;

  // Total row
  rRect(doc, PAD, y, W - PAD*2, 11, 2, C.green);
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', PAD + 4, y + 7.5);
  doc.text(fmt(result.total_incentive), W - PAD, y + 7.5, { align: 'right' });
  y += 16;

  // ══════════════════════════════════════════════
  // DETAIL AKTIVITAS (jika ada)
  // ══════════════════════════════════════════════
  if (d.activities?.details?.length > 0) {
    // Check if we need a new page
    if (y > H - 60) {
      doc.addPage();
      y = 10;
      // Mini header on new page
      doc.setFillColor(...C.red);
      doc.rect(0, 0, W, 8, 'F');
      doc.setTextColor(...C.white);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(`${result.employee_name} — ${period?.name} (lanjutan)`, W/2, 5.5, { align:'center' });
      y = 14;
    }
    secHead('Detail Aktivitas', C.navy);
    d.activities.details.forEach((a, i, arr) => {
      doc.setTextColor(...C.dark);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(a.activity, PAD + 3, y + 3);
      doc.setFontSize(6);
      doc.setTextColor(...C.gray);
      doc.text(`${a.date} | ${a.qty} x ${fmt(a.nominal)}`, PAD + 3, y + 7.5);
      doc.setTextColor(...C.green);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(fmt(a.amount), W - PAD, y + 5, { align: 'right' });
      if (i < arr.length - 1) {
        doc.setDrawColor(...C.line); doc.setLineWidth(0.2);
        doc.line(PAD, y + 10, W - PAD, y + 10);
      }
      y += 11;
    });
    y += 3;
  }

  // ══════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════
  // Ensure footer doesn't overlap content
  if (y > H - 30) {
    doc.addPage();
    y = 10;
    doc.setFillColor(...C.red);
    doc.rect(0, 0, W, 8, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(`${result.employee_name} — ${period?.name}`, W/2, 5.5, { align:'center' });
    y = 14;
  }

  // Line
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.4);
  doc.line(PAD, y, W - PAD, y);
  y += 5;

  // Date + note
  doc.setTextColor(...C.gray);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  // QR on left side, text on right
  doc.text(`Dicetak: ${printDate}`, PAD + 16, y + 3);
  doc.text('Digenerate otomatis oleh sistem', W - PAD, y + 3, { align: 'right' });

  // ── QR Code — di sebelah kiri footer, tidak menimpa konten ──
  try {
    const QRCode = await import('qrcode');
    const qrData = `INCENTIVE|${result.id}|${result.employee_name}|${result.total_incentive}`;
    const qrUrl  = await QRCode.default.toDataURL(qrData, { width: 60, margin: 0, color: { dark:'#1e3a8a', light:'#ffffff' } });
    doc.addImage(qrUrl, 'PNG', PAD, y + 1, 12, 12);
    doc.setTextColor(...C.gray);
    doc.setFontSize(5);
    doc.text('Scan verifikasi', PAD + 6, y + 15, { align: 'center' });
  } catch { /* QR optional */ }

  // Bottom red bar — always at very bottom of page
  doc.setFillColor(...C.red);
  doc.rect(0, H - 3, W, 3, 'F');

  const filename = `slip_insentif_${(result.employee_name || 'karyawan').replace(/\s+/g,'_')}_${period?.month}_${period?.year}.pdf`;
  doc.save(filename);
  return filename;
};

// ════════════════════════════════════════════════════════════════
// BULK PDF — Semua karyawan, satu page per orang
// ════════════════════════════════════════════════════════════════
export const exportBulkPDF = async (results, period, companyName = 'GPDISTRO HR Pro', onProgress) => {
  const jsPDF = await loadJsPDF();
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const W     = doc.internal.pageSize.getWidth();
  const H     = doc.internal.pageSize.getHeight();
  const PAD   = 8;

  for (let idx = 0; idx < results.length; idx++) {
    if (idx > 0) doc.addPage();
    onProgress?.(idx + 1, results.length);
    const r = results[idx];
    const d = r.details_json || {};
    let y   = 0;

    // Header
    doc.setFillColor(...C.red);
    doc.rect(0, 0, W, 42, 'F');
    doc.setFillColor(...C.redDark);
    doc.circle(W + 2, -2, 18, 'F');

    doc.setTextColor(...C.white);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName.toUpperCase(), W / 2, 9, { align: 'center' });
    doc.setFontSize(15);
    doc.text('SLIP INSENTIF', W / 2, 19, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(period?.name || '', W / 2, 26, { align: 'center' });
    doc.setFontSize(6.5);
    doc.text(`${idx + 1} / ${results.length}`, W / 2, 33, { align: 'center' });

    y = 48;

    // Employee card
    rRect(doc, PAD, y, W - PAD*2, 26, 3, C.grayL);
    doc.setFillColor(...C.red);
    doc.circle(PAD + 11, y + 13, 8, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text((r.employee_name||'?')[0].toUpperCase(), PAD + 11, y + 16.5, { align:'center' });

    doc.setTextColor(...C.dark);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(r.employee_name || '', PAD + 23, y + 9);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.gray);
    doc.text(`${r.position_name || '-'} | ${r.branch_name || '-'}`, PAD + 23, y + 15);

    y += 32;

    // Total
    rRect(doc, PAD, y, W - PAD*2, 14, 2, C.green);
    doc.setTextColor(...C.white);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL INSENTIF', W / 2, y + 5.5, { align: 'center' });
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(fmt(r.total_incentive), W / 2, y + 12, { align: 'center' });
    y += 19;

    // Section header helper
    const sh = (title, color = C.navy) => {
      doc.setFillColor(...C.grayL);
      doc.rect(PAD, y, W - PAD*2, 6, 'F');
      doc.setFillColor(...color);
      doc.rect(PAD, y, 2, 6, 'F');
      doc.setTextColor(...color);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(title.toUpperCase(), PAD + 4, y + 4.3);
      y += 8;
    };

    // Row helper
    const rw = (label, val, col = C.dark) => {
      doc.setTextColor(...C.dark);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(label, PAD + 3, y + 3.5);
      doc.setTextColor(...col);
      doc.setFont('helvetica', 'bold');
      doc.text(fmt(val), W - PAD, y + 3.5, { align:'right' });
      doc.setDrawColor(...C.line); doc.setLineWidth(0.15);
      doc.line(PAD, y + 6, W - PAD, y + 6);
      y += 7;
    };

    // Incentive breakdown
    sh('Rincian Insentif', C.green);
    const pct = n => parseFloat(n || 0);
    if (parseFloat(r.wa_incentive)          > 0) rw(`WhatsApp (${pct(d.wa?.channel_pct)}%)`,           r.wa_incentive,          C.green);
    if (parseFloat(r.marketplace_incentive) > 0) rw(`Marketplace (${pct(d.marketplace?.channel_pct)}%)`,r.marketplace_incentive, C.green);
    if (parseFloat(r.web_incentive)         > 0) rw(`Website (${pct(d.web?.channel_pct)}%)`,            r.web_incentive,         C.green);
    if (parseFloat(r.activity_incentive)    > 0) rw('Aktivitas',                                         r.activity_incentive,    C.navy);
    if (parseFloat(r.bonus_target)          > 0) rw('Bonus Target',                                      r.bonus_target,          C.redDark);

    y += 1;
    // Total row
    rRect(doc, PAD, y, W - PAD*2, 10, 2, C.green);
    doc.setTextColor(...C.white);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', PAD + 4, y + 7);
    doc.text(fmt(r.total_incentive), W - PAD, y + 7, { align:'right' });
    y += 15;

    // Footer
    doc.setDrawColor(...C.line); doc.setLineWidth(0.3);
    doc.line(PAD, y, W - PAD, y);
    doc.setTextColor(...C.gray);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, PAD, y + 4);

    // Bottom bar
    doc.setFillColor(...C.red);
    doc.rect(0, H - 3, W, 3, 'F');
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
    'No':                       i + 1,
    'Nama Karyawan':            r.employee_name || '',
    'Cabang':                   r.branch_name   || '',
    'Jabatan':                  r.position_name || '',
    'Penjualan WA':             parseFloat(r.wa_sales_amount)           || 0,
    'Performance Marketplace':  parseFloat(r.marketplace_performance)   || 0,
    'Performance Web':          parseFloat(r.web_performance)           || 0,
    'Insentif WA':              parseFloat(r.wa_incentive)              || 0,
    'Insentif Marketplace':     parseFloat(r.marketplace_incentive)     || 0,
    'Insentif Web':             parseFloat(r.web_incentive)             || 0,
    'Insentif Aktivitas':       parseFloat(r.activity_incentive)        || 0,
    'Bonus Target':             parseFloat(r.bonus_target)              || 0,
    'TOTAL INSENTIF':           parseFloat(r.total_incentive)           || 0,
    'Status':                   r.status || '',
  }));

  // Totals
  rows.push({
    'No': '', 'Nama Karyawan': 'TOTAL', 'Cabang': '', 'Jabatan': '',
    'Penjualan WA':            results.reduce((s,r) => s+(parseFloat(r.wa_sales_amount)||0),          0),
    'Performance Marketplace': results.reduce((s,r) => s+(parseFloat(r.marketplace_performance)||0),  0),
    'Performance Web':         results.reduce((s,r) => s+(parseFloat(r.web_performance)||0),          0),
    'Insentif WA':             results.reduce((s,r) => s+(parseFloat(r.wa_incentive)||0),             0),
    'Insentif Marketplace':    results.reduce((s,r) => s+(parseFloat(r.marketplace_incentive)||0),    0),
    'Insentif Web':            results.reduce((s,r) => s+(parseFloat(r.web_incentive)||0),            0),
    'Insentif Aktivitas':      results.reduce((s,r) => s+(parseFloat(r.activity_incentive)||0),       0),
    'Bonus Target':            results.reduce((s,r) => s+(parseFloat(r.bonus_target)||0),             0),
    'TOTAL INSENTIF':          results.reduce((s,r) => s+(parseFloat(r.total_incentive)||0),          0),
    'Status': '',
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    {wch:4},{wch:22},{wch:16},{wch:18},
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
